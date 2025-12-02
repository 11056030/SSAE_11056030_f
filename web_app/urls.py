from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from . import views

urlpatterns = [
    # 課表相關 API
    path('api/sync-schedule/', csrf_exempt(views.sync_class_schedule), name='sync_class_schedule'),
    path('api/class-schedule/', views.get_class_schedule, name='get_class_schedule'),
    path('schedule/', views.class_schedule_page, name='class_schedule_page'),
    
    # 其他路由...
]
