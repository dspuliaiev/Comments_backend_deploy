from cloudinary.uploader import upload
from PIL import Image
import logging
import os
from django.core.files.uploadedfile import InMemoryUploadedFile

def resize_image(image_path, max_width, max_height):
    """
    Resizes the image proportionally to fit within the specified dimensions.
    """
    with Image.open(image_path) as img:
        img_format = img.format  # Preserve the original format
        img.thumbnail((max_width, max_height))
        resized_path = f"resized_{os.path.basename(image_path)}"
        img.save(resized_path, format=img_format)
        return resized_path

logger = logging.getLogger(__name__)

def save_temporary_file(uploaded_file):
    """
    Saves an InMemoryUploadedFile to a temporary file on disk.
    """
    temp_path = f"temp_{uploaded_file.name}"
    with open(temp_path, 'wb') as temp_file:
        for chunk in uploaded_file.chunks():
            temp_file.write(chunk)
    return temp_path

def upload_image_to_cloudinary(image_file):
    try:
        # If image_file is InMemoryUploadedFile, save it to a temporary file
        if isinstance(image_file, InMemoryUploadedFile):
            temp_path = save_temporary_file(image_file)
            image_file = temp_path
        else:
            temp_path = None

        # Check file format
        allowed_formats = ["JPEG", "JPG", "PNG", "GIF"]
        with Image.open(image_file) as img:
            if img.format not in allowed_formats:
                logger.error("Invalid image format. Allowed formats: JPG, PNG, GIF.")
                return None, "Invalid image format."

        # Always resize image
        max_width, max_height = 320, 240
        resized_image = resize_image(image_file, max_width, max_height)

        # Upload to Cloudinary with original file name
        file_name = os.path.basename(image_file)
        upload_result = upload(resized_image, resource_type="image", public_id=file_name)

        # Clean up temporary and resized files
        os.remove(resized_image)
        if temp_path:
            os.remove(temp_path)

        logger.info(f"Uploaded image URL: {upload_result['secure_url']}")
        return upload_result['secure_url'], None
    except Exception as e:
        logger.error(f"Error uploading image to Cloudinary: {e}")
        return None, "Error uploading image."

def upload_text_file_to_cloudinary(text_file):
    try:
        # If text_file is InMemoryUploadedFile, save it to a temporary file
        if isinstance(text_file, InMemoryUploadedFile):
            temp_path = save_temporary_file(text_file)
            text_file = temp_path
        else:
            temp_path = None

        # Check file format and size
        if not text_file.endswith(".txt"):
            logger.error("Invalid text file format. Only TXT is allowed.")
            if temp_path:
                os.remove(temp_path)
            return None, "Invalid text file format."

        file_size = os.path.getsize(text_file)
        max_size = 100 * 1024  # 100 KB
        if file_size > max_size:
            logger.error("Text file size exceeds the 100 KB limit.")
            if temp_path:
                os.remove(temp_path)
            return None, "Text file size exceeds the limit."

        # Upload to Cloudinary with original file name
        file_name = os.path.basename(text_file)
        upload_result = upload(text_file, resource_type="raw", public_id=file_name)

        # Clean up temporary file
        if temp_path:
            os.remove(temp_path)

        logger.info(f"Uploaded text file URL: {upload_result['secure_url']}")
        return upload_result['secure_url'], None
    except Exception as e:
        logger.error(f"Error uploading text file to Cloudinary: {e}")
        return None, "Error uploading text file."

