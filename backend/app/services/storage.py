"""Supabase Storage service for file uploads and management."""

import mimetypes
from typing import BinaryIO
from uuid import uuid4

from supabase import Client, create_client

from app.core.config import settings


class StorageError(Exception):
    """Base class for storage-related errors."""


class UploadError(StorageError):
    """Raised when file upload fails."""


class DeleteError(StorageError):
    """Raised when file deletion fails."""


def get_supabase_client() -> Client:
    """Get a Supabase client instance."""
    return create_client(settings.supabase_project_url, settings.supabase_service_role_key)


def get_file_extension(filename: str) -> str:
    """Extract file extension from filename."""
    if "." in filename:
        return filename.rsplit(".", 1)[1].lower()
    return ""


def generate_unique_filename(original_filename: str) -> str:
    """Generate a unique filename while preserving the extension."""
    extension = get_file_extension(original_filename)
    unique_name = str(uuid4())
    return f"{unique_name}.{extension}" if extension else unique_name


def upload_file_to_bucket(
    file: BinaryIO,
    filename: str,
    bucket_name: str,
    folder: str = "",
    content_type: str | None = None,
) -> str:
    """
    Upload a file to a Supabase Storage bucket.

    Args:
        file: File-like object (binary mode)
        filename: Original filename
        bucket_name: Name of the bucket (products, invoices, branding)
        folder: Optional folder path within the bucket
        content_type: MIME type (auto-detected if not provided)

    Returns:
        Public URL of the uploaded file

    Raises:
        UploadError: If upload fails
    """
    try:
        supabase = get_supabase_client()

        # Generate unique filename
        unique_filename = generate_unique_filename(filename)

        # Build full path
        file_path = f"{folder}/{unique_filename}" if folder else unique_filename

        # Auto-detect content type if not provided
        if not content_type:
            content_type, _ = mimetypes.guess_type(filename)
            if not content_type:
                content_type = "application/octet-stream"

        # Read file content
        file_content = file.read()

        # Upload to Supabase Storage
        response = supabase.storage.from_(bucket_name).upload(
            path=file_path,
            file=file_content,
            file_options={"content-type": content_type, "upsert": "false"},
        )

        # Get public URL
        public_url = supabase.storage.from_(bucket_name).get_public_url(file_path)

        return public_url

    except Exception as exc:
        raise UploadError(f"Failed to upload file to {bucket_name}: {str(exc)}") from exc


def delete_file_from_bucket(file_path: str, bucket_name: str) -> bool:
    """
    Delete a file from a Supabase Storage bucket.

    Args:
        file_path: Path to the file in the bucket
        bucket_name: Name of the bucket

    Returns:
        True if deletion was successful

    Raises:
        DeleteError: If deletion fails
    """
    try:
        supabase = get_supabase_client()
        supabase.storage.from_(bucket_name).remove([file_path])
        return True
    except Exception as exc:
        raise DeleteError(f"Failed to delete file from {bucket_name}: {str(exc)}") from exc


def get_signed_url(file_path: str, bucket_name: str, expires_in: int = 3600) -> str:
    """
    Generate a signed URL for private file access.

    Args:
        file_path: Path to the file in the bucket
        bucket_name: Name of the bucket
        expires_in: URL expiration time in seconds (default 1 hour)

    Returns:
        Signed URL for the file
    """
    try:
        supabase = get_supabase_client()
        response = supabase.storage.from_(bucket_name).create_signed_url(
            path=file_path, expires_in=expires_in
        )
        return response["signedURL"]
    except Exception as exc:
        raise StorageError(f"Failed to generate signed URL: {str(exc)}") from exc


def extract_file_path_from_url(url: str, bucket_name: str) -> str | None:
    """
    Extract the file path from a Supabase public URL.

    Args:
        url: Full public URL
        bucket_name: Name of the bucket

    Returns:
        File path within the bucket, or None if URL is invalid
    """
    try:
        # Example URL: https://PROJECT.supabase.co/storage/v1/object/public/BUCKET/path/to/file.jpg
        if not url or bucket_name not in url:
            return None

        # Split by bucket name and take the part after it
        parts = url.split(f"/{bucket_name}/")
        if len(parts) < 2:
            return None

        return parts[1]
    except Exception:
        return None


# Convenience functions for specific buckets


def upload_product_image(file: BinaryIO, filename: str) -> str:
    """Upload a product image to the products bucket."""
    return upload_file_to_bucket(
        file=file, filename=filename, bucket_name=settings.supabase_products_bucket
    )


def delete_product_image(image_url: str) -> bool:
    """Delete a product image from the products bucket."""
    file_path = extract_file_path_from_url(image_url, settings.supabase_products_bucket)
    if not file_path:
        raise DeleteError("Invalid product image URL")
    return delete_file_from_bucket(file_path, settings.supabase_products_bucket)


def upload_invoice_pdf(file: BinaryIO, filename: str) -> str:
    """Upload an invoice PDF to the invoices bucket."""
    public_url = upload_file_to_bucket(
        file=file,
        filename=filename,
        bucket_name=settings.supabase_invoices_bucket,
        content_type="application/pdf",
    )
    # For invoices, we might want to use signed URLs instead
    # Convert to file path and generate signed URL
    file_path = extract_file_path_from_url(public_url, settings.supabase_invoices_bucket)
    if file_path:
        return get_signed_url(file_path, settings.supabase_invoices_bucket, expires_in=86400)
    return public_url


def upload_branding_asset(file: BinaryIO, filename: str) -> str:
    """Upload a branding asset (logo, etc.) to the branding bucket."""
    return upload_file_to_bucket(
        file=file, filename=filename, bucket_name=settings.supabase_branding_bucket
    )


def delete_branding_asset(asset_url: str) -> bool:
    """Delete a branding asset from the branding bucket."""
    file_path = extract_file_path_from_url(asset_url, settings.supabase_branding_bucket)
    if not file_path:
        raise DeleteError("Invalid branding asset URL")
    return delete_file_from_bucket(file_path, settings.supabase_branding_bucket)
