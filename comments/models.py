from django.db import models


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
    image = models.ImageField(upload_to='comment_images', null=True, blank=True, verbose_name='Upload Image',
                              help_text='Upload an image (optional)')
    text_file = models.FileField(upload_to='comment_text_files', null=True, blank=True,
                                 verbose_name='Upload Text File', help_text='Upload a text file (optional)')
    client_info = models.ForeignKey(ClientInfo, on_delete=models.CASCADE, default='')

    def __str__(self):
        return f'Comment by {self.user_name} on {self.created_at}'

