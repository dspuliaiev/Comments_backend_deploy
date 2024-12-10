from django.db import models
from cloudinary.models import CloudinaryField

class ClientInfo(models.Model):
    ip_address = models.GenericIPAddressField()
    user_agent = models.CharField(max_length=255)
    user_name = models.CharField(max_length=100, default='user')

class Comment(models.Model):
    user_name = models.CharField(max_length=100, default='user')
    email = models.EmailField()
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    parent_comment = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies_to')
    home_page = models.URLField(blank=True, verbose_name='Home Page')
    captcha = models.CharField(max_length=48, verbose_name='CAPTCHA', default='')
    image = CloudinaryField('image', null=True, blank=True,  # Убираем verbose_name здесь
                            help_text='Upload an image (optional)', resource_type='image')
    text_file = CloudinaryField('text_file', null=True, blank=True,  # Убираем verbose_name здесь
                                help_text='Upload a text file (optional)', resource_type='raw')
    client_info = models.ForeignKey(ClientInfo, on_delete=models.CASCADE, default='')

    def __str__(self):
        return f'Comment by {self.user_name} on {self.created_at}'
