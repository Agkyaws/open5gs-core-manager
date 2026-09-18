from pymongo import MongoClient
from bson.objectid import ObjectId
from app.config import settings


def _get_client():
    return MongoClient(settings.mongo_uri)


def check_mongo():
    try:
        client = _get_client()
        client.server_info()  # will raise if cannot connect
        client.close()
        return True
    except Exception as e:
        return False, str(e)


# ---------- Subscriber CRUD ----------

def list_subscribers():
    client = _get_client()
    db = client.get_default_database()  # "open5gs" from URI [1][2]
    col = db.get_collection("subscribers")
    docs = list(col.find())
    client.close()
    result = []
    for d in docs:
        result.append({
            "id": str(d.get("_id")),
            "imsi": d.get("imsi", ""),
            "msisdn": d.get("msisdn"),
            "k": d.get("k", ""),
            "opc": d.get("opc", ""),
            "dnn": d.get("dnn", "internet"),
            "sst": d.get("sst", 1),
            "sd": d.get("sd"),
        })
    return result


def create_subscriber(data: dict):
    client = _get_client()
    db = client.get_default_database()
    col = db.get_collection("subscribers")
    res = col.insert_one({
        "imsi": data["imsi"],
        "msisdn": data.get("msisdn"),
        "k": data["k"],
        "opc": data["opc"],
        "dnn": data.get("dnn", "internet"),
        "sst": data.get("sst", 1),
        "sd": data.get("sd"),
    })
    client.close()
    return str(res.inserted_id)


def delete_subscriber(sub_id: str):
    client = _get_client()
    db = client.get_default_database()
    col = db.get_collection("subscribers")
    res = col.delete_one({"_id": ObjectId(sub_id)})
    client.close()
    return res.deleted_count


# ---------- UE/RAN Config CRUD ----------

def get_ueran_config():
    """
    Read single UE/RAN config document from open5gs.ueran_config.
    """
    client = _get_client()
    db = client.get_default_database()
    col = db.get_collection("ueran_config")
    doc = col.find_one({})
    client.close()
    if not doc:
        return None
    return {
        "id": str(doc.get("_id")),
        "mcc": doc.get("mcc", "001"),
        "mnc": doc.get("mnc", "01"),
        "tac": doc.get("tac", 1),
        "gnb_id": doc.get("gnb_id", 1),
        "amf_ip": doc.get("amf_ip", "10.0.0.1"),
        "amf_port": doc.get("amf_port", 38412),
        "default_imsi": doc.get("default_imsi"),
    }


def upsert_ueran_config(data: dict):
    """
    Insert/update single UE/RAN config document (upsert).
    """
    client = _get_client()
    db = client.get_default_database()
    col = db.get_collection("ueran_config")
    col.update_one(
        {},
        {
            "$set": {
                "mcc": data.get("mcc", "001"),
                "mnc": data.get("mnc", "01"),
                "tac": data.get("tac", 1),
                "gnb_id": data.get("gnb_id", 1),
                "amf_ip": data.get("amf_ip", "10.0.0.1"),
                "amf_port": data.get("amf_port", 38412),
                "default_imsi": data.get("default_imsi"),
            }
        },
        upsert=True,
    )
    doc = col.find_one({})
    client.close()
    return {
        "id": str(doc.get("_id")),
        "mcc": doc.get("mcc", "001"),
        "mnc": doc.get("mnc", "01"),
        "tac": doc.get("tac", 1),
        "gnb_id": doc.get("gnb_id", 1),
        "amf_ip": doc.get("amf_ip", "10.0.0.1"),
        "amf_port": doc.get("amf_port", 38412),
        "default_imsi": doc.get("default_imsi"),
    }
