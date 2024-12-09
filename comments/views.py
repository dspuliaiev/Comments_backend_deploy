from django.shortcuts import render, get_object_or_404
from .models import Comment
from .forms import CommentForm
from bleach import clean
from django.conf import settings
from lxml import etree
from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import CommentSerializer, ClientInfoSerializer
import json
from rest_framework import pagination
from PIL import Image
from io import BytesIO
from django.core.files.uploadedfile import InMemoryUploadedFile
from datetime import datetime
from django.views import View
from django_user_agents.utils import get_user_agent
from django.http import JsonResponse
from captcha.models import CaptchaStore
from captcha.helpers import captcha_image_url
from urllib.parse import unquote
import logging
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)

BLEACH_ALLOWED_TAGS = settings.BLEACH_ALLOWED_TAGS
BLEACH_ALLOWED_ATTRIBUTES = settings.BLEACH_ALLOWED_ATTRIBUTES


# Функция для генерации CAPTCHA
def get_captcha(request):
    if request.method == 'GET':
        captcha = CaptchaStore.generate_key()
        image_url = captcha_image_url(captcha)
        request.session['expected_captcha'] = captcha
        return JsonResponse({'key': captcha, 'image_url': image_url})


class CommentAPIView(APIView):
    def get(self, request):
        sort_by = request.GET.get('sort_by')
        order = request.GET.get('order', 'asc')

        if sort_by == 'user_name':
            comments = Comment.objects.order_by('-user_name' if order == 'desc' else 'user_name')
        elif sort_by == 'email':
            comments = Comment.objects.order_by('-email' if order == 'desc' else 'email')
        elif sort_by == 'date_added':
            comments = Comment.objects.order_by('-created_at' if order == 'desc' else 'created_at')
        else:
            comments = Comment.objects.order_by('-created_at')

        comments_dict = {comment.id: CommentSerializer(comment).data for comment in comments}

        parent_to_children = {}
        for comment in comments_dict.values():
            comment['created_at'] = datetime.strptime(comment['created_at'], "%Y-%m-%dT%H:%M:%S.%fZ").strftime("%H:%M %d.%m.%Y")
            parent_id = comment.get('parent_comment_id')
            if parent_id:
                parent_to_children.setdefault(parent_id, []).append(comment)

        root_comments = [c for c in comments_dict.values() if not c.get('parent_comment_id')]

        def add_children_to_parent(comment):
            children = parent_to_children.get(comment['id'], [])
            comment['children'] = children
            for child in children:
                add_children_to_parent(child)

        for comment in root_comments:
            add_children_to_parent(comment)

        paginator = pagination.PageNumberPagination()
        paginator.page_size = 25
        page = paginator.paginate_queryset(root_comments, request)

        return Response({
            'comments': page,
            'page': request.GET.get('page', 1),
            'total_pages': paginator.page.paginator.num_pages,
        })

    def post(self, request):
        try:
            data = request.data
            c_key = data.get('captcha_key', '')
            captcha_store = CaptchaStore.objects.filter(hashkey=c_key).first()
            c_value = data.get('captcha_value', '')

            if not captcha_store or captcha_store.response.upper() != c_value.upper():
                return JsonResponse({'success': False, 'message': 'Неправильная CAPTCHA'}, status=400)

            form = CommentForm(data, request.FILES)
            if not form.is_valid():
                return JsonResponse({'success': False, 'message': 'Неверные данные формы'}, status=400)

            parent_id = data.get('parent_comment')
            parent_comment = get_object_or_404(Comment, id=parent_id) if parent_id else None

            comment = form.save(commit=False)
            comment.parent_comment = parent_comment

            client_info_serializer = ClientInfoSerializer(data={
                'ip_address': request.META.get('REMOTE_ADDR'),
                'user_agent': str(get_user_agent(request)),
                'user_name': comment.user_name
            })
            if client_info_serializer.is_valid():
                comment.client_info = client_info_serializer.save()
            else:
                return JsonResponse({'success': False, 'message': 'Ошибка сохранения данных клиента'}, status=400)

            cleaned_text = clean(comment.text, tags=BLEACH_ALLOWED_TAGS, attributes=BLEACH_ALLOWED_ATTRIBUTES)
            comment.text = cleaned_text

            if not validate_xhtml(comment.text):
                return JsonResponse({'success': False, 'message': 'Invalid XHTML markup'}, status=400)

            # Обработка изображения
            try:
                image_tmp_file = request.FILES.get('image')
                if image_tmp_file:
                    valid_formats = ['image/jpeg', 'image/png', 'image/gif']
                    if image_tmp_file.content_type not in valid_formats:
                        return JsonResponse({'success': False, 'message': 'Недопустимый формат изображения'}, status=400)

                    img = Image.open(image_tmp_file)
                    width, height = img.size
                    max_size = (320, 240)
                    if width > max_size[0] or height > max_size[1]:
                        img = img.resize(max_size)
                        output_buffer = BytesIO()
                        img.save(output_buffer, format=image_tmp_file.content_type.split('/')[-1].upper())
                        image_tmp_file = InMemoryUploadedFile(output_buffer, 'ImageField', f'{image_tmp_file.name}',
                                                              image_tmp_file.content_type, output_buffer.tell, None)

                    comment.image = image_tmp_file

            except Exception as e:
                print(f"Ошибка при сохранении изображения: {e}")

            # Обработка текстового файла
            try:
                file_tmp_file = request.FILES.get('text_file')
                if not file_tmp_file:
                    print("Файл text_file не передан в запросе.")
                else:
                    print(f"Получен файл: {file_tmp_file.name}, размер: {file_tmp_file.size} байт")
                if file_tmp_file:
                    if not file_tmp_file.name.endswith('.txt'):
                        return JsonResponse({'success': False, 'message': 'Недопустимый формат файла. Разрешены только .txt файлы.'}, status=400)
                    if file_tmp_file.size > 102400:  # 100 КБ
                        return JsonResponse({'success': False, 'message': 'Файл слишком большой'}, status=400)

                    comment.text_file = file_tmp_file
                    new_name = comment.text_file.name.split('/')[-1]
                    comment.text_file.name = new_name
            except Exception as e:
                print(f"Ошибка при сохранении файла: {e}")


            comment.save()


            serialized_comment = CommentSerializer(comment).data
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "chat_room",
                {"type": "broadcast_new_comment", "data": serialized_comment}
            )

            return JsonResponse({'success': True, 'comment_id': comment.id})
        except Exception as e:
            logger.error(f"Ошибка при обработке комментария: {e}")
            return JsonResponse({'success': False, 'message': 'Ошибка на сервере'}, status=500)


class CommentListView(View):
    def get(self, request):
        comments = Comment.objects.filter(parent_comment__isnull=True).order_by('-created_at')
        return render(request, 'comments/index.html', {'comments': comments})


def validate_xhtml(text):
    try:
        etree.fromstring(f"<root>{text}</root>")
        return True
    except etree.XMLSyntaxError:
        return False






