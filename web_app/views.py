import os
import json
import zipfile
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .views_rag import ask_question, create_vector_store, load_pdf_documents, split_documents
from .mongo import get_chat_history, save_chat  # ✅ 新增：匯入儲存函式

# 各畫面
def base(request):
    return render(request, 'base.html')

def welcome(request):
    return render(request, 'welcome.html')

def index(request):
    return render(request, 'index.html')

def login(request):
    return render(request, 'login.html')

def chat(request):
    return render(request, 'chat.html')


def navbar2(request):
  return render(request, 'navbar(2).html')

def join(request):
    return render(request, 'join.html')

def join_create(request):
    return render(request, 'join_create.html')

def ask_page(request):
    return render(request, "ask.html")

def add_comment(request):
    return render(request, "add_comment.html")

@csrf_exempt
def ask_view(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            question = data.get("question", "")
            if not question:
                return JsonResponse({"answer": "請輸入問題。"})

            answer = ask_question(question)

            # ✅ 新增：儲存對話到 MongoDB
            user_id = request.session.get("user_id", "anonymous")
            save_chat(user_id, question, answer)

            return JsonResponse({"answer": answer})
        except Exception as e:
            return JsonResponse({"error": str(e)})
    return JsonResponse({"error": "僅支援 POST 請求"})

@csrf_exempt
def upload_zip(request):
    if request.method == "POST":
        zip_file = request.FILES.get("zip_file")
        if not zip_file or not zip_file.name.endswith(".zip"):
            return JsonResponse({"error": "請上傳 zip 檔"})

        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            upload_dir = os.path.abspath(os.path.join(current_dir, "..", "uploaded_files"))
            os.makedirs(upload_dir, exist_ok=True)
            temp_zip_path = os.path.join(upload_dir, "temp_upload.zip")

            with open(temp_zip_path, "wb") as f:
                for chunk in zip_file.chunks():
                    f.write(chunk)

            with zipfile.ZipFile(temp_zip_path, "r") as zip_ref:
                for member in zip_ref.infolist():
                    if member.filename.endswith(".pdf") and not member.is_dir():
                        filename = os.path.basename(member.filename)
                        if filename:
                            data = zip_ref.read(member.filename)
                            with open(os.path.join(upload_dir, filename), "wb") as out_file:
                                out_file.write(data)

            os.remove(temp_zip_path)

        except Exception as e:
            return JsonResponse({"error": f"解壓縮失敗：{str(e)}"})

        try:
            docs = load_pdf_documents()
            splits = split_documents(docs)
            create_vector_store(splits)
            return JsonResponse({"message": "✅ 上傳並建立資料庫完成"})
        except Exception as e:
            return JsonResponse({"error": f"建立向量資料庫失敗：{str(e)}"})

    return JsonResponse({"error": "僅支援 POST 請求"})


def chat_history_view(request):
    user_id = request.session.get("user_id", "anonymous")
    chat_history = get_chat_history(user_id)
    
    # Convert MongoDB ObjectId to string for JSON serialization
    for chat in chat_history:
        chat["_id"] = str(chat["_id"])

    return JsonResponse({"chat_history": chat_history})