  # noqa: EXE002

from pydantic import BaseModel, Field


class ExtractedDocumentData(BaseModel):
    document_type: str = Field(description="Type of document (passport, Driver's Licence, National ID")
    full_name: str | None = Field(None, description="Full legal name of the individual")
    dob: str | None = Field(None, description="Date of birth in DD-MM-YYYY format")
    document_number: str | None = Field(None, description="Unique document / passport identification number")
    expiry_date: str | None = Field(None, description="Expiration date in DD-MM-YYYY format")
    issuing_country: str | None = Field(None, description="3-letter ISO country code or country name")
    confidence_score: float = Field(default=0.95, description="Extraction confidence score (0.0 to 1.0)")

class DocumentUploadResponse(BaseModel):
    success: bool
    data: ExtractedDocumentData | None
    portrait_base64: str | None = Field(None, description="Base64 encoded cropped face photo from ID")
    error: str | None = Field(None, description="Error message if processing failed")