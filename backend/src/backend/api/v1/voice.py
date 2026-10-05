# noqa: EXE002
import logging

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from backend.models.voice import VoiceVerifyResponse
from backend.services.voice_service import verify_voices

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/voice", tags=["voice"])


@router.post(
    "/verify",
    response_model=VoiceVerifyResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify enroll and verify voice clips",
)
async def voice_verification(
    enroll_file: UploadFile = File(...), verify_file: UploadFile = File(...)
) -> VoiceVerifyResponse:
    """Accepts enrollment + verification audio clips, returns speaker similarity."""
    for f in (enroll_file, verify_file):
        if not f.content_type or not (
            f.content_type.startswith("audio/") or f.content_type == "application/octet-stream"
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Files provided must be valid audio",
            )
    try:
        enroll_bytes = await enroll_file.read()
        verify_bytes = await verify_file.read()
        return verify_voices(enroll_bytes, verify_bytes)
    except Exception as e:
        logger.error(f"Error verifying voices: {e!s}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {e!s}",
        )
