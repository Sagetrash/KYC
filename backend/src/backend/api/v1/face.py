# noqa: EXE002
import logging

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from backend.models.face import FaceVerifyResponse
from backend.services.face_service import verify_faces

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/face', tags=["face"])

@router.post(
    "/verify",
    response_model=FaceVerifyResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify Id and Live Face",
)
async def face_verification(id_file: UploadFile = File(...), selfie_file: UploadFile = File(...))-> FaceVerifyResponse:
    """Accepts an Id Image and the live selfie to determine face similarity"""
    for f in (id_file, selfie_file):
        if not f.content_type or not f.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail = "File provided must be a valid image"
            )
    try:
        id_bytes = await id_file.read()
        selfie_bytes = await selfie_file.read()
        verification_result = verify_faces(id_bytes,selfie_bytes)
        return verification_result
    except Exception as e:
        logger.error(f"Error verifying faces: {e!s}",exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail = f"Internal server error: {e!s}",
        )