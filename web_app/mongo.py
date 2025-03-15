from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime
import os

# Get Mongo URI from environment variables or defaults to localhost
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://<your-mongo-credentials>@cluster0.mongodb.net/chatbot_db?retryWrites=true&w=majority")

client = MongoClient(MONGO_URI)
db = client["chatbot_db"]
collection = db["chat_history"]

def save_chat(user_id, question, answer):
    """
    Save chat history to MongoDB.
    """
    collection.insert_one({
        "user_id": user_id,
        "question": question,
        "answer": answer,
        "timestamp": datetime.utcnow()
    })

def get_chat_history(user_id):
    """
    Retrieve chat history for a specific user.
    """
    return list(collection.find({"user_id": user_id}).sort("timestamp", -1))

def delete_chat(chat_id):
    """
    Delete a specific chat history entry by its ID.
    """
    collection.delete_one({"_id": ObjectId(chat_id)})

def export_chat(user_id):
    """
    Export chat history for a specific user as a list.
    """
    return list(collection.find({"user_id": user_id}))
