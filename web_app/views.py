from django.shortcuts import render

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

