import docker
from app.config import settings

# Docker client (host docker.sock ကို သုံးမယ်)
client = docker.DockerClient(base_url="unix://var/run/docker.sock")


def list_nfs():
    """
    settings.nf_names ထဲမှာ သတ်မှတ်ထားတဲ့ NF container name တွေကို
    Docker မှာ ရှိ/မရှိ, running/stop ဖြစ်နေသလား စစ်ပြီး
    NFStatus schema နဲ့ ကိုက်ညီတဲ့ dict list ပြန်ပေးမယ်။ [2][3]
    """
    containers = client.containers.list(all=True)
    result = []

    for name in settings.nf_names:
        c = None
        for ct in containers:
            # ct.name or attrs.Name ထဲမှာ name ပါလား စစ်
            if f"/{name}" in ct.attrs.get("Name", "") or name in ct.name:
                c = ct
                break

        if not c:
            # container မရှိသေး
            result.append(
                {
                    "name": name,
                    "status": "not_created",
                    "running": False,
                    "status_text": "not found",
                    "id": None,
                }
            )
        else:
            # container ရှိပြီးသား
            result.append(
                {
                    "name": name,
                    "status": c.status,
                    "running": c.status == "running",
                    "status_text": c.attrs.get("State", {}).get(
                        "Status", c.status
                    ),
                    "id": c.short_id,
                }
            )

    return result


def control_nf(name: str, action: str):
    """
    Open5GS NF container တစ်ခုကို start/stop/restart လုပ်မယ်။ [2][3]
    name: container name (e.g. 'ogs-amf')
    action: 'start' | 'stop' | 'restart'
    """
    container = client.containers.get(name)

    if action == "start":
        container.start()
    elif action == "stop":
        container.stop()
    elif action == "restart":
        container.restart()
    else:
        raise ValueError("Invalid action")

    return True


def get_logs(name: str, tail: int = 200):
    """
    Container logs ကို tail နဲ့ယူပြီး string အနေနဲ့ ပြန်ပေးမယ်။ [2][3]
    """
    container = client.containers.get(name)
    logs = container.logs(tail=tail)
    return logs.decode("utf-8", errors="ignore")


# ---------- Optional: UERANSIM specific control (Phase 3 UE/RAN integration) ----------

def ensure_ueransim_container(name: str, role: str, config_path: str):
    """
    UERANSIM gNB/UE container ကို မရှိရင် create, ရှိပြီးသားဆိုရင် 그대로 return.

    name: 'ueransim-gnb' or 'ueransim-ue'
    role: 'gnb' or 'ue'
    config_path: host path to YAML (e.g. /home/USER/ueransim-config/gnb.yaml)
    """
    containers = client.containers.list(all=True)
    for ct in containers:
        if ct.name == name:
            return ct  # already exists

    if role == "gnb":
        cmd = ["./nr-gnb", "-c", "/config/gnb.yaml"]
        bind_path = "/config/gnb.yaml"
    else:
        cmd = ["./nr-ue", "-c", "/config/ue.yaml"]
        bind_path = "/config/ue.yaml"

    ct = client.containers.run(
        "ueransim:latest",
        cmd,
        name=name,
        network="ogs-net",
        volumes={
            config_path: {"bind": bind_path, "mode": "ro"},
        },
        detach=True,
    )
    return ct


def control_ueransim(name: str, action: str):
    """
    UERANSIM container (ueransim-gnb / ueransim-ue) ကို start/stop/restart လုပ်မယ်။
    """
    container = client.containers.get(name)

    if action == "start":
        container.start()
    elif action == "stop":
        container.stop()
    elif action == "restart":
        container.restart()
    else:
        raise ValueError("Invalid action")

    return True

def get_ueransim_status():
    """
    UERANSIM gNB/UE container status ကို ပြန်ပေးမယ်။
    Return example:
    {
      "gnb": {"exists": True, "running": True, "status": "running"},
      "ue":  {"exists": False, "running": False, "status": "not_created"}
    }
    """
    result = {
        "gnb": {"exists": False, "running": False, "status": "not_created"},
        "ue": {"exists": False, "running": False, "status": "not_created"},
    }

    containers = client.containers.list(all=True)
    for ct in containers:
        if ct.name == "ueransim-gnb":
            result["gnb"] = {
                "exists": True,
                "running": ct.status == "running",
                "status": ct.status,
            }
        elif ct.name == "ueransim-ue":
            result["ue"] = {
                "exists": True,
                "running": ct.status == "running",
                "status": ct.status,
            }

    return result