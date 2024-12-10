from cloudinary.uploader import upload
import logging

logger = logging.getLogger(__name__)

def upload_image_to_cloudinary(image_file):
    try:
        upload_result = upload(image_file, resource_type="image")
        logger.info(f"Uploaded image URL: {upload_result['secure_url']}")
        return upload_result['secure_url'], None
    except Exception as e:
        logger.error(f"Ошибка при загрузке изображения в Cloudinary: {e}")
        return None, "Ошибка при загрузке изображения."

def upload_text_file_to_cloudinary(text_file):
    try:
        upload_result = upload(text_file, resource_type="raw")
        logger.info(f"Uploaded text file URL: {upload_result['secure_url']}")
        return upload_result['secure_url'], None
    except Exception as e:
        logger.error(f"Ошибка при загрузке текстового файла в Cloudinary: {e}")
        return None, "Ошибка при загрузке текстового файла."
