from pymongo import MongoClient
from bson.objectid import ObjectId
from bson.errors import InvalidId  # 新增
from datetime import datetime
import os

MONGO_URI = os.getenv("MONGO_URI")
# 建議加上 connect=False 避免多執行緒問題
client = MongoClient(MONGO_URI, connect=False)
db = client["chatbot_db"]
col = db["conversations"]

def create_conversation(user_id, title="新對話"):
    doc = {
        "user_id": user_id,
        "title": title,
        "messages": [],
        "created_at": datetime.utcnow()
    }
    result = col.insert_one(doc)
    return str(result.inserted_id)

def add_message(conversation_id, question, answer, sources=None):
    message_data = {
        "question": question,
        "answer": answer,
        "timestamp": datetime.utcnow(),
    }
    if sources:
        message_data["sources"] = sources

    try:
        col.update_one(
            {"_id": ObjectId(conversation_id)},
            {"$push": {"messages": message_data}}
        )
    except InvalidId:
        pass

def get_messages(conversation_id):
    try:
        doc = col.find_one({"_id": ObjectId(conversation_id)})
        if not doc: return []
        return sorted(doc.get("messages", []), key=lambda m: m["timestamp"])
    except InvalidId:
        return []

def update_conversation_title(conversation_id, new_title):
    try:
        col.update_one(
            {"_id": ObjectId(conversation_id)},
            {"$set": {"title": new_title}}
        )
    except InvalidId:
        pass

def delete_conversation(conversation_id):
    try:
        col.delete_one({"_id": ObjectId(conversation_id)})
    except InvalidId:
        pass

def get_conversation_by_id(conversation_id):
    """取得單一對話（用於權限檢查）"""
    try:
        return col.find_one({"_id": ObjectId(conversation_id)})
    except InvalidId:
        return None

def get_conversations(user_id):
    if user_id == "guest":
        return []
    
    docs = col.find({"user_id": user_id}).sort("created_at", -1)
    return [
        {"id": str(d["_id"]), "title": d.get("title", "新對話")}
        for d in docs
    ]