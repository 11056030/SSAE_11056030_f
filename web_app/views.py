from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from .views_rag import ask_question

# 這是各畫面的連結
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

def join(request):
  return render(request, 'join.html')

def join_create(request):
  return render(request, 'join_create.html')

def ask_page(request):
    return render(request, "ask.html")

@csrf_exempt
def ask_view(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            question = data.get("question", "")
            if not question:
                return JsonResponse({"answer": "請輸入問題。"})
            answer = ask_question(question)
            return JsonResponse({"answer": answer})
        except Exception as e:
            return JsonResponse({"error": str(e)})
    return JsonResponse({"error": "僅支援 POST 請求"})