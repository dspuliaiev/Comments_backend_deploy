from django.urls import path, include
from . import views
from django.conf import settings
from django.conf.urls.static import static

app_name = 'comments'

urlpatterns = [
    path('', views.CommentListView.as_view(), name='comment_list'),  # Главная страница с комментариями
    path('captcha/', include('captcha.urls')),
    path('get_captcha/', views.get_captcha, name='get_captcha'),
    path('api/v1/comments/', views.CommentAPIView.as_view(), name='comment-list'),  # API для получения комментариев
    path('api/v1/comments/create/', views.CommentAPIView.as_view(), name='create-comment'),  # API для создания комментария
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT) + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)