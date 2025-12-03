#!/usr/bin/env python
"""檢查當前活躍的 Django 用戶"""

import os
import sys
import django

# 設定 Django 環境
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_system.settings')
django.setup()

from django.contrib.sessions.models import Session
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import connection

User = get_user_model()

print("=" * 60)
print("當前活躍的 Django 用戶")
print("=" * 60)

# 獲取所有未過期的 session
active_sessions = Session.objects.filter(expire_date__gte=timezone.now()).order_by('-expire_date')

print(f"\n📊 總共有 {active_sessions.count()} 個活躍 Session\n")

# 解析每個 session
user_sessions = []
for session in active_sessions:
    try:
        session_data = session.get_decoded()
        user_id = session_data.get('_auth_user_id')
        
        if user_id:
            try:
                user = User.objects.get(id=user_id)
                
                # 從 User 表查詢學號
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SELECT student_id, name FROM `User` WHERE mail = %s",
                        [user.email]
                    )
                    row = cursor.fetchone()
                    student_id = row[0] if row else user.username
                    name = row[1] if row and len(row) > 1 else '未知'
                
                user_sessions.append({
                    'username': user.username,
                    'email': user.email,
                    'student_id': student_id,
                    'name': name,
                    'expire': session.expire_date
                })
            except User.DoesNotExist:
                pass
    except Exception as e:
        pass

# 顯示結果
if user_sessions:
    print("最近登入的用戶：\n")
    for i, us in enumerate(user_sessions[:10], 1):
        print(f"{i}. 👤 {us['name']} ({us['student_id']})")
        print(f"   Django username: {us['username']}")
        print(f"   Email: {us['email']}")
        print(f"   Session 過期時間: {us['expire']}")
        print()
else:
    print("❌ 沒有找到活躍的用戶 Session")

print("=" * 60)
