from django.shortcuts import render

# 這是各畫面的連結
def index(request):
  return render(request, 'index.html')

def login(request):
  return render(request, 'login.html')