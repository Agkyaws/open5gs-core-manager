# app/services/ueransim_service.py

import os
from textwrap import dedent
from pymongo import MongoClient
from app.config import settings
from app.services.mongo_service import get_ueran_config

# UERANSIM config files ကို သိမ်းမယ့် host folder
CONFIG_DIR = os.path.expanduser("~/ueransim-config")


def ensure_config_dir():
    """
    ~/ueransim-config directory ကို မရှိရင် create လုပ်မယ်။
    """
    os.makedirs(CONFIG_DIR, exist_ok=True)


def _get_client():
    """
    MongoDB client helper – settings.mongo_uri ကို သုံးမယ် (mongodb://mongo-open5gs/open5gs) [1][2]
    """
    return MongoClient(settings.mongo_uri)


def _list_subscribers():
    """
    open5gs.subscribers collection ထဲက subscribers list ကို ယူမယ် [3]।
    Subscriber schema နဲ့ ကိုက်ညီတဲ့ dict list ပြန်ပေးမယ်။
    """
    client = _get_client()
    db = client.get_default_database()  # "open5gs" from URI [1][2]
    col = db.get_collection("subscribers")
    docs = list(col.find())
    client.close()

    result = []
    for d in docs:
        result.append(
            {
                "imsi": d.get("imsi", ""),
                "msisdn": d.get("msisdn"),
                "k": d.get("k", ""),
                "opc": d.get("opc", ""),
                "dnn": d.get("dnn", "internet"),
                "sst": d.get("sst", 1),
                "sd": d.get("sd"),
            }
        )
    return result


def generate_gnb_config():
    """
    UE/RAN config (MCC/MNC/TAC/AMF IP/Port/gNB ID) ကို အခြေခံပြီး
    UERANSIM gNB YAML config (gnb.yaml) ကို ~/ueransim-config ထဲ generate လုပ်မယ်။

    Return: gnb.yaml full path (string)
    """
    ensure_config_dir()
    cfg = get_ueran_config()
    if not cfg:
        raise RuntimeError("UE/RAN config not set")

    mcc = cfg["mcc"]
    mnc = cfg["mnc"]
    tac = cfg["tac"]
    amf_ip = cfg["amf_ip"]
    amf_port = cfg["amf_port"]
    gnb_id = cfg["gnb_id"]

    # Basic UERANSIM gNB config (SA mode, single AMF)
    content = dedent(
        f"""
        gnbId: {gnb_id}
        mcc: "{mcc}"
        mnc: "{mnc}"

        tac: {tac}

        amfConfigs:
          - address: "{amf_ip}"
            port: {amf_port}

        n2Interface:
          bindAddress: "0.0.0.0"
          bindPort: 38412

        n3Interface:
          bindAddress: "0.0.0.0"
          bindPort: 2152
        """
    )

    gnb_path = os.path.join(CONFIG_DIR, "gnb.yaml")
    with open(gnb_path, "w") as f:
        f.write(content.strip() + "\n")

    return gnb_path


def generate_ue_config():
    """
    UE/RAN config ထဲက default_imsi + subscribers collection ကို သုံးပြီး
    UERANSIM UE YAML config (ue.yaml) ကို ~/ueransim-config ထဲ generate လုပ်မယ် [3]။

    Logic:
      - cfg.default_imsi သတ်မှတ်ထားလား စစ်
      - မရှိရင် subscribers list ထဲက ပထမ subscriber ကို default အနေနဲ့ သုံး
      - IMSI/K/OPc/DNN/SST/SD ကို UERANSIM UE config ထဲထည့်

    Return: ue.yaml full path (string)
    """
    ensure_config_dir()
    cfg = get_ueran_config()
    if not cfg:
        raise RuntimeError("UE/RAN config not set")

    subs = _list_subscribers()

    default_imsi = cfg.get("default_imsi")
    if not default_imsi and subs:
        default_imsi = subs[0]["imsi"]

    if not default_imsi:
        raise RuntimeError("No default IMSI and no subscribers found")

    # default_imsi နဲ့ match ဖြစ်တဲ့ subscriber ကိုရှာ
    sub = None
    for s in subs:
        if s["imsi"] == default_imsi:
            sub = s
            break
    if not sub and subs:
        # default_imsi မတွေ့ရင် ပထမ subscriber ကို fallback လုပ်
        sub = subs[0]

    mcc = cfg["mcc"]
    mnc = cfg["mnc"]

    dnn = sub.get("dnn", "internet")
    sst = sub.get("sst", 1)
    sd = sub.get("sd") or ""

    # Basic UERANSIM UE config
    content = dedent(
        f"""
        supi: "imsi-{sub["imsi"]}"
        mcc: "{mcc}"
        mnc: "{mnc}"

        key: "{sub["k"]}"
        opc: "{sub["opc"]}"

        dnn: "{dnn}"

        snssai:
          sst: {sst}
          sd: "{sd}"
        """
    )

    ue_path = os.path.join(CONFIG_DIR, "ue.yaml")
    with open(ue_path, "w") as f:
        f.write(content.strip() + "\n")

    return ue_path
