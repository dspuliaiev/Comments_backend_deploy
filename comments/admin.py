from django.contrib import admin
from .models import Comment, ClientInfo
from .forms import CommentForm

class CommentAdmin(admin.ModelAdmin):
    form = CommentForm
    list_display = ('user_name', 'email', 'text', 'created_at', 'active')
    list_filter = ('active', 'created_at', 'updated_at')
    search_fields = ('user_name', 'email', 'text')

    def save_model(self, request, obj, form, change):
        # Автоматически добавляем ClientInfo
        if not obj.client_info:
            client_info = ClientInfo.objects.create(
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT'),
                user_name=obj.user_name,
            )
            obj.client_info = client_info
        obj.save()

admin.site.register(Comment, CommentAdmin)



