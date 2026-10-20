import os
import uuid
from urllib.parse import urlparse

from django.conf import settings
from dotenv import load_dotenv
from supabase import create_client

# Load variables from .env
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

BUCKET_NAME = "style-mirror"

supabase = None

if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase = create_client(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
    )


def storage_available():
    return supabase is not None


def get_local_media_url(relative_path):
    relative_path = relative_path.lstrip("/")
    return f"http://127.0.0.1:8000/media/{relative_path}"


def upload_file(local_file_path, folder, filename=None):
    """
    Upload a local file to storage and return a URL.
    Falls back to local media storage when Supabase is not configured.
    """

    if filename is None:
        filename = os.path.basename(local_file_path)

    unique_filename = f"{uuid.uuid4().hex}_{filename}"
    storage_path = f"{folder}/{unique_filename}"

    if not supabase:
        destination_dir = os.path.join(settings.MEDIA_ROOT, folder)
        os.makedirs(destination_dir, exist_ok=True)

        destination_path = os.path.join(destination_dir, unique_filename)

        with open(local_file_path, "rb") as src_file:
            with open(destination_path, "wb") as dest_file:
                dest_file.write(src_file.read())

        return get_local_media_url(storage_path)

    with open(local_file_path, "rb") as file:
        file_data = file.read()

    supabase.storage.from_(BUCKET_NAME).upload(
        storage_path,
        file_data,
        {
            "content-type": "image/jpeg",
            "upsert": "true",
        },
    )

    public_url = supabase.storage.from_(
        BUCKET_NAME
    ).get_public_url(storage_path)

    return public_url


def download_file(storage_path, local_file_path):
    """
    Download a file from storage to a local temporary file.
    """

    if not storage_path:
        raise ValueError("No storage path was provided.")

    if not supabase:
        parsed = urlparse(storage_path)

        if parsed.scheme and parsed.netloc:
            source_path = storage_path
        else:
            cleaned = storage_path.lstrip("/")
            source_path = os.path.join(settings.MEDIA_ROOT, cleaned)

        if source_path.startswith("http://") or source_path.startswith("https://"):
            import requests

            response = requests.get(source_path, timeout=60)
            response.raise_for_status()
            content = response.content
        else:
            with open(source_path, "rb") as source:
                content = source.read()

        with open(local_file_path, "wb") as file:
            file.write(content)

        return local_file_path

    file_data = (
        supabase.storage
        .from_(BUCKET_NAME)
        .download(storage_path)
    )

    with open(local_file_path, "wb") as file:
        file.write(file_data)

    return local_file_path