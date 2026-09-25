from io import BytesIO
import qrcode
import cloudinary
import cloudinary.uploader

from core.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)


def make_qr_png(data: str) -> bytes:
    qr = qrcode.QRCode(
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


def upload_qr_to_cloudinary(image_bytes: bytes, public_id: str) -> str:
    result = cloudinary.uploader.upload(
        BytesIO(image_bytes),
        folder="medsync/prescriptions",
        public_id=public_id,
        resource_type="image",
        overwrite=True,
    )
    return result["secure_url"]
