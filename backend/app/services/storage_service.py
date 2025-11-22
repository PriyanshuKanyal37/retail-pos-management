"""
Supabase Storage Service
Handles all file upload, download, and management operations using Supabase Storage.
"""

import uuid
import logging
from typing import Optional, BinaryIO, Union
from supabase import Client
from app.core.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

class SupabaseStorageService:
    """Service for managing files in Supabase Storage buckets"""

    def __init__(self, supabase_client: Client = None):
        """Initialize storage service with Supabase client"""
        self.supabase = supabase_client or get_supabase_client()

    async def upload_invoice_pdf(
        self,
        pdf_content: bytes,
        sale_id: uuid.UUID,
        tenant_id: uuid.UUID
    ) -> str:
        """
        Upload invoice PDF to Supabase Storage

        Args:
            pdf_content: PDF file content as bytes
            sale_id: Sale ID for file organization
            tenant_id: Tenant ID for multi-tenant isolation

        Returns:
            Public URL of the uploaded file

        Raises:
            Exception: If upload fails
        """
        bucket_name = "invoices"
        file_path = f"{tenant_id}/{sale_id}/invoice_{sale_id}.pdf"

        try:
            # Upload file
            response = self.supabase.storage \
                .from_(bucket_name) \
                .upload(file_path, pdf_content, {
                    "content-type": "application/pdf"
                })

            if response.data is None:
                error_msg = f"Failed to upload invoice: {response}"
                logger.error(error_msg)
                raise Exception(error_msg)

            logger.info(f"Successfully uploaded invoice: {file_path}")

            # Get public URL
            file_url = self.supabase.storage \
                .from_(bucket_name) \
                .get_public_url(file_path)

            return file_url

        except Exception as e:
            error_msg = f"Error uploading invoice PDF: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)

    async def upload_product_image(
        self,
        image_content: bytes,
        product_id: uuid.UUID,
        tenant_id: uuid.UUID,
        filename: str
    ) -> str:
        """
        Upload product image to Supabase Storage

        Args:
            image_content: Image file content as bytes
            product_id: Product ID for file organization
            tenant_id: Tenant ID for multi-tenant isolation
            filename: Original filename

        Returns:
            Public URL of the uploaded image

        Raises:
            Exception: If upload fails
        """
        bucket_name = "products"
        file_path = f"{tenant_id}/{product_id}/{filename}"

        try:
            # Determine content type based on filename
            content_type = "image/jpeg"
            if filename.lower().endswith('.png'):
                content_type = "image/png"
            elif filename.lower().endswith('.gif'):
                content_type = "image/gif"
            elif filename.lower().endswith('.webp'):
                content_type = "image/webp"
            elif filename.lower().endswith('.jpg'):
                content_type = "image/jpeg"

            # Upload file
            response = self.supabase.storage \
                .from_(bucket_name) \
                .upload(file_path, image_content, {
                    "content-type": content_type
                })

            if response.data is None:
                error_msg = f"Failed to upload product image: {response}"
                logger.error(error_msg)
                raise Exception(error_msg)

            logger.info(f"Successfully uploaded product image: {file_path}")

            # Get public URL
            file_url = self.supabase.storage \
                .from_(bucket_name) \
                .get_public_url(file_path)

            return file_url

        except Exception as e:
            error_msg = f"Error uploading product image: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)

    async def upload_store_logo(
        self,
        logo_content: bytes,
        store_id: uuid.UUID,
        tenant_id: uuid.UUID
    ) -> str:
        """
        Upload store logo to Supabase Storage

        Args:
            logo_content: Logo file content as bytes
            store_id: Store ID for file organization
            tenant_id: Tenant ID for multi-tenant isolation

        Returns:
            Public URL of the uploaded logo

        Raises:
            Exception: If upload fails
        """
        bucket_name = "branding"
        file_path = f"{tenant_id}/stores/{store_id}/logo.png"

        try:
            # Upload logo
            response = self.supabase.storage \
                .from_(bucket_name) \
                .upload(file_path, logo_content, {
                    "content-type": "image/png"
                })

            if response.data is None:
                error_msg = f"Failed to upload store logo: {response}"
                logger.error(error_msg)
                raise Exception(error_msg)

            logger.info(f"Successfully uploaded store logo: {file_path}")

            # Get public URL
            file_url = self.supabase.storage \
                .from_(bucket_name) \
                .get_public_url(file_path)

            return file_url

        except Exception as e:
            error_msg = f"Error uploading store logo: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)

    async def delete_file(self, bucket_name: str, file_path: str) -> bool:
        """
        Delete file from Supabase Storage

        Args:
            bucket_name: Name of the bucket
            file_path: Path to the file within the bucket

        Returns:
            True if deletion successful, False otherwise
        """
        try:
            response = self.supabase.storage \
                .from_(bucket_name) \
                .remove([file_path])

            success = response.data is not None
            if success:
                logger.info(f"Successfully deleted file: {file_path}")
            else:
                logger.warning(f"Failed to delete file: {file_path}")

            return success

        except Exception as e:
            logger.error(f"Error deleting file {file_path}: {e}")
            return False

    async def download_file(self, bucket_name: str, file_path: str) -> Optional[bytes]:
        """
        Download file from Supabase Storage

        Args:
            bucket_name: Name of the bucket
            file_path: Path to the file within the bucket

        Returns:
            File content as bytes, or None if download fails
        """
        try:
            response = self.supabase.storage \
                .from_(bucket_name) \
                .download(file_path)

            return response

        except Exception as e:
            logger.error(f"Error downloading file {file_path}: {e}")
            return None

    def extract_file_path_from_url(self, url: str) -> Optional[str]:
        """
        Extract file path from Supabase public URL

        Args:
            url: Supabase public URL

        Returns:
            File path extracted from URL, or None if extraction fails
        """
        try:
            # Example URL: https://.../storage/v1/object/public/bucket-name/tenant/id/file.pdf
            parts = url.split('/storage/v1/object/public/')
            if len(parts) >= 2:
                return parts[1]
            return None
        except Exception as e:
            logger.error(f"Error extracting file path from URL {url}: {e}")
            return None

    async def update_product_image(
        self,
        product_id: uuid.UUID,
        tenant_id: uuid.UUID,
        old_image_url: Optional[str],
        new_image_content: bytes,
        new_filename: str
    ) -> str:
        """
        Update product image (delete old, upload new)

        Args:
            product_id: Product ID
            tenant_id: Tenant ID
            old_image_url: URL of old image to delete
            new_image_content: Content of new image
            new_filename: Filename of new image

        Returns:
            URL of newly uploaded image

        Raises:
            Exception: If upload fails
        """
        try:
            # Upload new image first
            new_image_url = await self.upload_product_image(
                image_content=new_image_content,
                product_id=product_id,
                tenant_id=tenant_id,
                filename=new_filename
            )

            # Delete old image if exists
            if old_image_url:
                old_file_path = self.extract_file_path_from_url(old_image_url)
                if old_file_path:
                    await self.delete_file("products", old_file_path)

            return new_image_url

        except Exception as e:
            error_msg = f"Error updating product image: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)

    async def list_files_in_bucket(self, bucket_name: str, prefix: str = None) -> list:
        """
        List files in a bucket with optional prefix filtering

        Args:
            bucket_name: Name of the bucket
            prefix: Optional prefix to filter files

        Returns:
            List of file information
        """
        try:
            response = self.supabase.storage \
                .from_(bucket_name) \
                .list(path=prefix)

            return response.data or []

        except Exception as e:
            logger.error(f"Error listing files in bucket {bucket_name}: {e}")
            return []