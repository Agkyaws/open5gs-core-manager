from fastapi import FastAPI, HTTPException, Path
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.schemas import (
    NFStatus,
    NFActionResponse,
    MongoHealth,
    Subscriber,
    UERANConfig,
)
from app.services.docker_service import (
    list_nfs,
    control_nf,
    get_logs,
    ensure_ueransim_container,
    control_ueransim,
    get_ueransim_status,
)
from app.services.mongo_service import (
    check_mongo,
    list_subscribers,
    create_subscriber,
    delete_subscriber,
    get_ueran_config,
    upsert_ueran_config,
)
from app.services.ueransim_service import generate_gnb_config, generate_ue_config


app = FastAPI(
    title="OGS 5G Core Manager API",
    description="API for managing Open5GS 5G Core containers, subscribers, UE/RAN config and UERANSIM.",
    version="1.0.0",
)

# CORS (frontend localhost:3000 + 8081) [2][3]
origins = [
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*",  # dev only; tighten in prod
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Health ----------

@app.get("/health/db", response_model=MongoHealth, tags=["Health"])
def health_db():
    ok = check_mongo()
    if ok is True:
        return MongoHealth(status="OK")
    else:
        status, err = ok
        return MongoHealth(status="FAIL", error=err)


# ---------- NF Management (Phase 2) [2] ----------

@app.get("/nf", response_model=list[NFStatus], tags=["NF"])
def get_nf_list():
    return list_nfs()


@app.post(
    "/nf/{name}/{action}",
    response_model=NFActionResponse,
    tags=["NF"],
)
def nf_action(
    name: str = Path(..., description="NF container name, e.g. ogs-amf"),
    action: str = Path(..., description="Action: start/stop/restart"),
):
    if name not in settings.nf_names:
        raise HTTPException(status_code=400, detail="Unknown NF")
    if action not in ("start", "stop", "restart"):
        raise HTTPException(status_code=400, detail="Invalid action")

    try:
        control_nf(name, action)
        return NFActionResponse(name=name, action=action, result="OK")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/nf/{name}/logs", tags=["NF"])
def nf_logs(
    name: str = Path(..., description="NF container name"),
    tail: int = 200,
):
    if name not in settings.nf_names:
        raise HTTPException(status_code=400, detail="Unknown NF")
    try:
        logs = get_logs(name, tail=tail)
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------- Subscribers API (Phase 3) [3] ----------

@app.get("/subscribers", response_model=list[Subscriber], tags=["Subscribers"])
def get_subscribers():
    try:
        data = list_subscribers()
        return [Subscriber(**d) for d in data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/subscribers", response_model=Subscriber, tags=["Subscribers"])
def create_sub(sub: Subscriber):
    try:
        new_id = create_subscriber(sub.dict())
        sub.id = new_id
        return sub
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/subscribers/{sub_id}", tags=["Subscribers"])
def delete_sub(sub_id: str):
    try:
        deleted = delete_subscriber(sub_id)
        if deleted == 0:
            raise HTTPException(status_code=404, detail="Subscriber not found")
        return {"result": "OK"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------- UE/RAN Config API ----------

@app.get("/ueran/config", response_model=UERANConfig | None, tags=["UE/RAN"])
def read_ueran_config():
    try:
        cfg = get_ueran_config()
        if not cfg:
            return None
        return UERANConfig(**cfg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ueran/config", response_model=UERANConfig, tags=["UE/RAN"])
def write_ueran_config(cfg: UERANConfig):
    try:
        saved = upsert_ueran_config(cfg.dict())
        return UERANConfig(**saved)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------- UERANSIM Integration API ----------

@app.post("/ueransim/config/generate", tags=["UERANSIM"])
def ueransim_generate_configs():
    """
    Generate gNB and UE YAML configs based on UE/RAN config + subscribers.
    """
    try:
        gnb_path = generate_gnb_config()
        ue_path = generate_ue_config()
        return {"result": "OK", "gnb_path": gnb_path, "ue_path": ue_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ueransim/gnb/{action}", tags=["UERANSIM"])
def ueransim_gnb_action(action: str):
    """
    Start/stop/restart gNB container (ueransim-gnb).
    """
    if action not in ("start", "stop", "restart"):
        raise HTTPException(status_code=400, detail="Invalid action")
    try:
        gnb_path = generate_gnb_config()
        ensure_ueransim_container("ueransim-gnb", "gnb", gnb_path)
        control_ueransim("ueransim-gnb", action)
        return {"result": "OK"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ueransim/ue/{action}", tags=["UERANSIM"])
def ueransim_ue_action(action: str):
    """
    Start/stop/restart UE container (ueransim-ue).
    """
    if action not in ("start", "stop", "restart"):
        raise HTTPException(status_code=400, detail="Invalid action")
    try:
        ue_path = generate_ue_config()
        ensure_ueransim_container("ueransim-ue", "ue", ue_path)
        control_ueransim("ueransim-ue", action)
        return {"result": "OK"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ueransim/logs/{role}", tags=["UERANSIM"])
def ueransim_logs(role: str, tail: int = 200):
    """
    Get logs for gNB or UE.
    role: 'gnb' or 'ue'
    """
    name = "ueransim-gnb" if role == "gnb" else "ueransim-ue"
    try:
        logs = get_logs(name, tail=tail)
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ueransim/status", tags=["UERANSIM"])
def ueransim_status():
    """
    Get UERANSIM gNB/UE container status.
    """
    try:
        status = get_ueransim_status()
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
