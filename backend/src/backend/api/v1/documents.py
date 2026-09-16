# noqa: EXE002
import logging

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from backend.models.document import DocumentUploadResponse
from backend.services.crop_service import crop_face_from_document
from backend.services.ocr_service import extract_document_data

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=['documents'])

@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_200_OK,
    summary = "Upload document for OCR and face extraction",
)
async def upload_document(file: UploadFile = File(...)):
    """Accepts an ID image file, runs Gemini Vision OCR, and crops the facial portrait."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File provided must be a valid image (JPEG/PNG).",
        )
    try:
        image_bytes = await file.read()
        ocr_result = extract_document_data(image_bytes)
        if not ocr_result:
            return DocumentUploadResponse(
                success = False,
                data = None,
                portrait_base64=None,
                error = "Failed to extract document meta data"
            )
        portrait_b64 = crop_face_from_document(image_bytes)

        return DocumentUploadResponse(
                    success=True,
                    data=ocr_result,
                    portrait_base64=portrait_b64,
                    error=None if portrait_b64 else "Document metadata extracted, but no face detected in document.",
                )
    except Exception as e:
        logger.error(f"Error processing document upload: {e!s}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error processing document: {e!s}",
        )