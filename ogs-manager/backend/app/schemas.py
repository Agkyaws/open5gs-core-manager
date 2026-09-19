from pydantic import BaseModel

class NFStatus(BaseModel):
    name: str
    status: str
    running: bool
    status_text: str | None = None
    id: str | None = None


class NFActionResponse(BaseModel):
    name: str
    action: str
    result: str


class MongoHealth(BaseModel):
    status: str
    error: str | None = None


class Subscriber(BaseModel):
    id: str | None = None
    imsi: str
    msisdn: str | None = None
    k: str
    opc: str
    dnn: str = "internet"
    sst: int = 1
    sd: str | None = None


class UERANConfig(BaseModel):
    id: str | None = None
    mcc: str = "001"
    mnc: str = "01"
    tac: int = 1
    gnb_id: int = 1
    amf_ip: str = "10.0.0.1"
    amf_port: int = 38412
    default_imsi: str | None = None
