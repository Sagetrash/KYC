export interface ExtractedDocumentData {
  document_type: string;
  full_name: string;
  dob: string;
  document_number: string;
  expiry_date: string;
  issuing_country: string;
  confidence_score: number;
}

export interface DocumentUploadResponse {
  success: boolean;
  data: ExtractedDocumentData | null;
  portrait_base64: string | null;
  error: string | null;
}

export interface FaceVerifyResponse {
  match: boolean | null;
  similarity: number;
  error: string | null;
}
export type StepId = 'document' | 'selfie' | 'voice' | 'call' | 'result';

export interface KYCSession {
  documentScore: number;
  faceScore: number;
  voiceScore: number;
  callScore: number;
  totalScore: number;
}
