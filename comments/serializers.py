from rest_framework import serializers
from .models import Comment, ClientInfo

class CommentSerializer(serializers.ModelSerializer):
    is_root = serializers.SerializerMethodField()
    parent_comment_id = serializers.SerializerMethodField()
    children = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            'id', 'user_name', 'email', 'text', 'created_at',
            'home_page', 'is_root', 'parent_comment_id', 'image',
            'text_file', 'children'
        ]

    def get_is_root(self, obj):
        return obj.parent_comment is None

    def get_parent_comment_id(self, obj):
        return obj.parent_comment.id if obj.parent_comment else None

    def get_children(self, obj):
        # Используем 'replies_to' для получения дочерних комментариев
        children = obj.replies_to.all()
        return CommentSerializer(children, many=True).data



class ClientInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientInfo
        fields = ['ip_address', 'user_agent', 'user_name']
