import React, { useState, useRef } from 'react';
import type { DocumentUploadResponse, ExtractedDocumentData } from '../types';
import { Camera, Upload, AlertCircle, FileText, Calendar, Hash, Globe, User } from 'lucide-react';
import { FieldBadge } from '../components/FieldBadge';
import { ConfidenceDial } from '../components/ConfidenceDial';
import clsx from 'clsx';

interface DocumentStepProps {
  onComplete: (data: ExtractedDocumentData, portrait: string | null) => void;
}

export const DocumentStep: React.FC<DocumentStepProps> = ({ onComplete }) => {
  const [dragOver, setDragOver] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ data: ExtractedDocumentData; portrait_base64: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    setError(null);
    setSelectedFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleProcessDocument = async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    setError(null);
    // TODO: Replace mock with actual fetch() call to POST /api/v1/documents/upload
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await fetch('/api/v1/documents/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed.');
      }

      const data: DocumentUploadResponse = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || "Document Processing failed.");
      }

      setResult({
        data: data.data,
        portrait_base64: data.portrait_base64,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unexpected error occured');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl mx-auto">
      {/* LEFT COLUMN: Upload Zone */}
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-white mb-2">Upload ID Document</h2>
        <p className="text-slate-400 mb-4">Please upload a clear picture of your Passport, National ID, or Driver's License.</p>
        
        <div
          className={clsx(
            "relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px] transition-all overflow-hidden cursor-pointer",
            dragOver ? "border-indigo-500 bg-indigo-500/10" : "border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600",
            imagePreview && !dragOver ? "border-indigo-500/50" : ""
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !result &&!isProcessing && fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={isProcessing}
          />

          {imagePreview ? (
            <>
              <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-slate-900/40" />
              
              {isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
                  <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
                  <p className="text-indigo-400 font-medium animate-pulse">Analyzing document...</p>
                  <p className="text-slate-400 text-sm mt-2">Extracting OCR data & biometric face...</p>
                </div>
              )}
              
              {!isProcessing && !result && (
                <div className="relative z-10 flex flex-col items-center text-white bg-slate-900/60 px-6 py-3 rounded-full backdrop-blur-md">
                  <Upload className="w-6 h-6 mb-2" />
                  <span className="font-medium">Click to change image</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Camera className="w-8 h-8 text-indigo-400" />
              </div>
              <p className="text-lg font-medium text-white mb-2">Drag & drop your ID here</p>
              <p className="text-slate-400 text-sm">or click to browse files</p>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-4 rounded-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); handleProcessDocument(); }}
          disabled={!imagePreview || isProcessing || !!result}
          className="mt-2 w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {isProcessing ? 'Processing...' : 'Process Document'}
        </button>
      </div>

      {/* RIGHT COLUMN: Results */}
      {result && (
        <div className="flex flex-col gap-6 animate-fade-up">
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-6">Extraction Results</h3>
            
            <div className="flex items-center gap-6 mb-8 pb-6 border-b border-slate-700">
              <div className="w-24 h-24 rounded-full border-4 border-indigo-500/30 overflow-hidden flex-shrink-0 bg-slate-900 flex items-center justify-center relative group">
                {result.portrait_base64 ? (
                  <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                    {/*<User className="w-10 h-10 text-slate-400" />*/}
                    <img src={`data:image/jpeg;base64,${result.portrait_base64}`} alt="Portrait" className="w-full h-full object-cover" /> 
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 text-center px-2">No face detected</span>
                )}
                <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(99,102,241,0.5)] pointer-events-none rounded-full" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Document Type</p>
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-medium text-sm">
                      <FileText className="w-4 h-4 mr-2" />
                      {result.data.document_type}
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-xs text-slate-400 mb-1">Confidence</p>
                    <ConfidenceDial score={result.data.confidence_score * 100} size={56} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldBadge label="Full Name" value={result.data.full_name} icon={<User className="w-4 h-4" />} />
              <FieldBadge label="Date of Birth" value={result.data.dob} icon={<Calendar className="w-4 h-4" />} />
              <FieldBadge label="Document Number" value={result.data.document_number} icon={<Hash className="w-4 h-4" />} />
              <FieldBadge label="Expiry Date" value={result.data.expiry_date} icon={<Calendar className="w-4 h-4" />} />
              <FieldBadge label="Issuing Country" value={result.data.issuing_country} icon={<Globe className="w-4 h-4" />} />
            </div>
          </div>

          <button
            onClick={() => onComplete(result.data, result.portrait_base64)}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2"
          >
            Continue to Selfie Verification <span className="text-xl">→</span>
          </button>
        </div>
      )}
    </div>
  );
};
