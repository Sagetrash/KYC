from pydantic import BaseModel, Field
from typing import Optional

class ExtractedDocumentData(BaseModel):
    document_type: str = Field(description="Type of document (passport, Driver's Licence, National ID")
    full_name: Optional[str] = Field(None, description="Full legal name of the individual")
    dob: Optional[str] = Field(None, description="Date of birth in DD-MM-YYYY format")
    document_number: Optional[str] = Field(None, description="Unique document / passport identification number")
    expiry_date: Optional[str] = Field(None, description="Expiration date in DD-MM-YYYY format")
    issuing_country: Optional[str] = Field(None, description="3-letter ISO country code or country name")
    confidence_score: float = Field(default=0.95, description="Extraction confidence score (0.0 to 1.0)")

class DocumentUploadResponse(BaseModel):
    success: bool
    data: ExtractedDocumentData
    portrait_base64: Optional[str] = Field(None, description="Base64 encoded cropped face photo from ID")
    error: Optional[str] = Field(None, description="Error message if processing failed")