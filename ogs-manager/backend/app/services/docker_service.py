import docker
from app.config import settings

client = docker.DockerClient(base_url="unix://var/run/docker.sock")


def list_nfs():
    containers = client.containers.list(all=True)
    result = []

    for name in settings.nf_names:
        c = None
        for ct in containers:
            if f"/{name}" in ct.attrs.get("Name", "") or name in ct.name:
                c = ct
                break

        if not c:
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
    container = client.containers.get(name)
    logs = container.logs(tail=tail)
    return logs.decode("utf-8", errors="ignore")


def ensure_ueransim_container(name: str, role: str, config_path: str):
    containers = client.containers.list(all=True)
    for ct in containers:
        if ct.name == name:
            return ct

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
