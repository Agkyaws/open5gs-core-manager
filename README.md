# Open5GS Local 5G Core Manager

This project runs an Open5GS 5G Core with Docker. It also provides a web dashboard to monitor and control the Open5GS containers.

This project is for learning and local lab testing. It is not for a production mobile network.

<img width="1902" height="665" alt="image" src="https://github.com/user-attachments/assets/10b08c99-d3f0-48b0-9342-5804764d6d1f" />

<img width="1872" height="903" alt="image" src="https://github.com/user-attachments/assets/1b7e7b5e-fb8d-4563-bbe2-a6b6b6d7e3ca" />

<img width="1100" height="790" alt="image" src="https://github.com/user-attachments/assets/12a677ec-b088-48b7-9543-c9675f3bfac9" />


## Main Features

- View MongoDB and Open5GS Network Function status.
- View the 5G Core topology.
- Start, stop, and restart Open5GS containers.
- Read logs from the containers.
- Create and delete subscriber data.
- Save UE and RAN settings.
- Use light or dark mode in the web dashboard.

## Technology

- Open5GS for the 5G Core
- Docker for all services
- MongoDB for subscriber data
- FastAPI and Python for the backend
- React and Axios for the frontend

## Folder Structure

The project repository contains these folders:

```text
open5gs-core-manager/
|-- README.md
|-- Dockerfile.open5gs       Builds the Open5GS image
|-- Dockerfile.webui         Builds the original Open5GS WebUI image
|-- ogs-config/
|   |-- open5gs/             Open5GS configuration files
|   `-- webui/               WebUI configuration files
|-- ogs-log/
|   `-- open5gs/             Open5GS log files
`-- ogs-manager/
    |-- backend/             FastAPI backend and Dockerfile
    `-- frontend/            React frontend
```

The official Open5GS source is separate from this repository:

```text
~/open5gs/                   Official Open5GS Git repository
```

Do not add `~/open5gs` to this project repository. Clone it from the official Open5GS repository when you set up the project.

## Env Setup

This guide is for Ubuntu Linux. The backend and frontend source code are already included in this repository. You do not need to repeat the UI and backend coding steps from the development phases.

### 1. Update Linux

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. Install Git, Docker, and Basic Tools

```bash
sudo apt install -y git curl ca-certificates docker.io
sudo systemctl enable --now docker
```

Allow your Linux user to run Docker:

```bash
sudo usermod -aG docker "$USER"
newgrp docker
```

Check Docker:

```bash
docker --version
docker run --rm hello-world
```

### 3. Install Node.js 18

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt update
sudo apt install -y nodejs
```

Check Node.js and npm:

```bash
node --version
npm --version
```

### 4. Set the Project Path

Open the main folder of this project. Then save its path in a variable:

```bash
cd /path/to/open5gs-core-manager
export PROJECT_ROOT="$PWD"
```

Replace `/path/to/open5gs-core-manager` with the real project path.

### 5. Create the Docker Network and Start MongoDB

Create the shared Docker network:

```bash
docker network create ogs-net
```

Create a MongoDB data folder:

```bash
sudo mkdir -p /var/lib/mongo-open5gs
sudo chown "$USER:$USER" /var/lib/mongo-open5gs
```

Start MongoDB:

```bash
docker run -d \
  --name mongo-open5gs \
  --network ogs-net \
  -p 27017:27017 \
  -v /var/lib/mongo-open5gs:/data/db \
  mongo:6.0
```

### 6. Clone Open5GS

Clone the official Open5GS source into your Linux home folder:

```bash
cd ~
git clone https://github.com/open5gs/open5gs.git
cd ~/open5gs
git submodule update --init --recursive
```

The `open5gs` source folder is not part of this project repository.

### 7. Build the Open5GS Image

`Dockerfile.open5gs` is already included in the main project folder. Build it with the cloned Open5GS source as the build context:

```bash
docker build -t my-open5gs:latest \
  -f "$PROJECT_ROOT/Dockerfile.open5gs" \
  "$HOME/open5gs"

docker images | grep my-open5gs
```

### 8. Prepare Configuration and Log Folders

The repository already contains the Open5GS configuration files. Create the log folder if it does not exist:

```bash
mkdir -p "$PROJECT_ROOT/ogs-log/open5gs"
```

Set the MongoDB address in the Open5GS configuration files:

```bash
cd "$PROJECT_ROOT/ogs-config/open5gs"

for f in nrf.yaml udm.yaml udr.yaml ausf.yaml pcf.yaml nssf.yaml hss.yaml; do
  if [ -f "$f" ]; then
    sed -i 's|db_uri: .*|db_uri: mongodb://mongo-open5gs/open5gs|' "$f"
  fi
done

grep -n "db_uri" *.yaml
```

Set the folder variables:

```bash
export OGS_CFG="$PROJECT_ROOT/ogs-config/open5gs"
export OGS_LOG="$PROJECT_ROOT/ogs-log/open5gs"
```

### 9. Start the Open5GS Containers

Start NRF:

```bash
docker run -d --name ogs-nrf --network ogs-net \
  -v "$OGS_CFG:/open5gs/install/etc/open5gs" \
  -v "$OGS_LOG:/open5gs/install/var/log/open5gs" \
  my-open5gs:latest open5gs-nrfd
```

Start UDR:

```bash
docker run -d --name ogs-udr --network ogs-net \
  -v "$OGS_CFG:/open5gs/install/etc/open5gs" \
  -v "$OGS_LOG:/open5gs/install/var/log/open5gs" \
  my-open5gs:latest open5gs-udrd
```

Start UDM:

```bash
docker run -d --name ogs-udm --network ogs-net \
  -v "$OGS_CFG:/open5gs/install/etc/open5gs" \
  -v "$OGS_LOG:/open5gs/install/var/log/open5gs" \
  my-open5gs:latest open5gs-udmd
```

Start AUSF:

```bash
docker run -d --name ogs-ausf --network ogs-net \
  -v "$OGS_CFG:/open5gs/install/etc/open5gs" \
  -v "$OGS_LOG:/open5gs/install/var/log/open5gs" \
  my-open5gs:latest open5gs-ausfd
```

Start PCF:

```bash
docker run -d --name ogs-pcf --network ogs-net \
  -v "$OGS_CFG:/open5gs/install/etc/open5gs" \
  -v "$OGS_LOG:/open5gs/install/var/log/open5gs" \
  my-open5gs:latest open5gs-pcfd
```

Start NSSF:

```bash
docker run -d --name ogs-nssf --network ogs-net \
  -v "$OGS_CFG:/open5gs/install/etc/open5gs" \
  -v "$OGS_LOG:/open5gs/install/var/log/open5gs" \
  my-open5gs:latest open5gs-nssfd
```

Start AMF:

```bash
docker run -d --name ogs-amf --network ogs-net \
  -v "$OGS_CFG:/open5gs/install/etc/open5gs" \
  -v "$OGS_LOG:/open5gs/install/var/log/open5gs" \
  --cap-add=NET_ADMIN \
  my-open5gs:latest open5gs-amfd
```

Start SMF:

```bash
docker run -d --name ogs-smf --network ogs-net \
  -v "$OGS_CFG:/open5gs/install/etc/open5gs" \
  -v "$OGS_LOG:/open5gs/install/var/log/open5gs" \
  --cap-add=NET_ADMIN \
  my-open5gs:latest open5gs-smfd
```

Start UPF:

```bash
docker run -d --name ogs-upf --network ogs-net \
  -v "$OGS_CFG:/open5gs/install/etc/open5gs" \
  -v "$OGS_LOG:/open5gs/install/var/log/open5gs" \
  --cap-add=NET_ADMIN \
  --cap-add=SYS_ADMIN \
  --privileged \
  my-open5gs:latest open5gs-upfd
```

Check all containers:

```bash
docker ps
```

### 10. Build and Start the Original Open5GS WebUI

`Dockerfile.webui` is also included in the main project folder. Build it with the same Open5GS source:

```bash
docker build -t my-open5gs-webui:latest \
  -f "$PROJECT_ROOT/Dockerfile.webui" \
  "$HOME/open5gs"

docker images | grep my-open5gs-webui
```

Start the WebUI:

```bash
docker run -d --name ogs-webui --network ogs-net \
  -e DB_URI="mongodb://mongo-open5gs/open5gs" \
  -e PORT=3000 \
  -p 3000:3000 \
  my-open5gs-webui:latest
```

Open `http://localhost:3000` to use the original Open5GS WebUI.

### 11. Build and Start the Manager Backend

The backend code and its Dockerfile are already included in this repository.

```bash
cd "$PROJECT_ROOT/ogs-manager/backend"
docker build -t ogs-manager-api:latest .

docker run -d --name ogs-manager-api --network ogs-net \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -p 8080:8080 \
  ogs-manager-api:latest
```

The backend is available at:

- API: `http://localhost:8080`
- Swagger documentation: `http://localhost:8080/docs`

### 12. Start the Manager Frontend

The frontend code is already included in this repository. Port `3000` is used by the original Open5GS WebUI, so run the manager frontend on port `8081`:

```bash
cd "$PROJECT_ROOT/ogs-manager/frontend"
npm install
PORT=8081 npm start
```

Open `http://localhost:8081` to use the manager dashboard.

## Check the Services

Check the Docker containers:

```bash
docker ps
```

Check important logs:

```bash
docker logs ogs-nrf --tail 30
docker logs ogs-amf --tail 30
docker logs ogs-smf --tail 30
docker logs ogs-upf --tail 30
docker logs ogs-manager-api --tail 30
```

Check the manager API:

```bash
curl http://localhost:8080/health/db
curl http://localhost:8080/nf
```

## Rebuild the Manager Backend

Use these commands after changing backend code:

```bash
cd "$PROJECT_ROOT/ogs-manager/backend"
docker stop ogs-manager-api
docker rm ogs-manager-api
docker build -t ogs-manager-api:latest .
docker run -d --name ogs-manager-api --network ogs-net \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -p 8080:8080 \
  ogs-manager-api:latest
```

## Main API Routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health/db` | Check MongoDB status |
| `GET` | `/nf` | List Open5GS NF status |
| `POST` | `/nf/{name}/{action}` | Start, stop, or restart an NF |
| `GET` | `/nf/{name}/logs` | Read NF logs |
| `GET` | `/subscribers` | List subscribers |
| `POST` | `/subscribers` | Create a subscriber |
| `DELETE` | `/subscribers/{id}` | Delete a subscriber |
| `GET` | `/ueran/config` | Read UE/RAN settings |
| `POST` | `/ueran/config` | Save UE/RAN settings |

## Default Container Names

The manager checks these Docker container names:

```text
mongo-open5gs
ogs-nrf
ogs-udr
ogs-udm
ogs-ausf
ogs-pcf
ogs-nssf
ogs-amf
ogs-smf
ogs-upf
ogs-webui
```

Keep these names unless you also update the backend configuration.
