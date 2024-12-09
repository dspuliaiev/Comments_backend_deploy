from django.contrib import admin
from django.urls import path, include
from captcha import urls as captcha_urls


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('comments.urls', namespace='comments')),
    path('captcha/', include(captcha_urls)),
]
