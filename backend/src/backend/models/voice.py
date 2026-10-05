# noqa: EXE002
from pydantic import BaseModel


class VoiceVerifyResponse(BaseModel):
    match: bool | None
    similarity: float
    error: str| None
    