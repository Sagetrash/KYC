# noqa: EXE002
from pydantic import BaseModel


class FaceVerifyResponse(BaseModel):
    match: bool | None
    similarity: float
    error: str | None