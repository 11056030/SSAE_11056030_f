from pymongo import MongoClient
from datetime import datetime

client = MongoClient(MONGO_URI)
db = client.get_database()

def save_chat(user_id, question, answer):
    chat_collection = db.chat_history

    chat_data = {
        "user_id": user_id,
        "question": question,
        "answer": answer,
        "timestamp": datetime.utcnow()
    }

    # 儲存對話到 MongoDB
    chat_collection.insert_one(chat_data)
