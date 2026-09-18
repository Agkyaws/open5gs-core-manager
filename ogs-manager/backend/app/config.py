from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    mongo_uri: str = "mongodb://mongo-open5gs/open5gs"
    nf_names: list[str] = [
        "ogs-nrf","ogs-udr","ogs-udm","ogs-ausf",
        "ogs-pcf","ogs-nssf","ogs-amf","ogs-smf","ogs-upf",
        "ogs-webui",
    ]

class Config:
    env_file = ".env"

settings = Settings()
