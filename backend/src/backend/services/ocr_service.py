# noqa: EXE002
import io
import logging

from google import genai
from google.genai import types
from PIL import Image

from backend.core.config import settings
from backend.models.document import ExtractedDocumentData

logger = logging.getLogger(__name__)

def extract_document_data(image_bytes: bytes) -> ExtractedDocumentData | None:
    try:
        if not settings.GEMINI_API_KEY:
            logger.error("GEMINI_API_KEY is not set in environment.")
            return None

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        image = Image.open(io.BytesIO(image_bytes))
        prompt = (
            "You are an automated KYC compliance engine. Extract all identity details from this document image: "
            "document type, full name, date of birth (DD-MM-YYYY), "
            "document number, expiry date (DD-MM-YYYY), issuing country, and your confidence score (0.0 to 1.0)."
        )
        response = client.models.generate_content(
            model=settings.OCR_MODEL_NAME,
            contents=[image, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ExtractedDocumentData,
            ),
        )
        if response.text:
            return ExtractedDocumentData.model_validate_json(response.text)
        return None
    except Exception as e:
        logger.error(f"Document OCR extraction failed: {e!s}", exc_info=True)
        return None