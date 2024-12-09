import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)

class CommentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_group_name = "chat_room"

        # Присоединяемся к группе
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )

        # Принимаем WebSocket-соединение
        await self.accept()

    async def disconnect(self, close_code):
        # Отключаемся от группы
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name,
        )

    async def broadcast_new_comment(self, event):
        try:
            # Проверка типа события
            if event.get("type") != "broadcast_new_comment":
                logger.warning(f"Некорректный тип события: {event.get('type')}")
                return

            # Проверка структуры данных
            if "data" not in event:
                logger.error(f"Отсутствует ключ 'data' в событии: {event}")
                return

            # Обработка комментария
            comment = event["data"]
            logger.info(f"Отправка комментария на фронт: {comment}")

            # Отправка данных на клиент
            await self.send(text_data=json.dumps({
                "type": "new_comment",
                "data": comment,
            }))
        except Exception as e:
            logger.error(f"Ошибка в broadcast_new_comment: {e}. Полученные данные: {event}")


