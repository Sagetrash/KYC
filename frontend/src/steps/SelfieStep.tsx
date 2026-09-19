import React, { useState, useRef, useEffect } from 'react';
import type { FaceVerifyResponse } from '../types';
import { Camera, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface SelfieStepProps {
  idFile: File | null;
  onComplete: (score: number) => void;
}

export const SelfieStep: React.FC<SelfieStepProps> = ({ idFile, onComplete }) => {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<FaceVerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera tracks on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Attach stream once the <video> element has rendered
  useEffect(() => {
    if (isCameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraOn]);
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsCameraOn(false);
  };

  // --- wiring: live camera stream from the person's device ---
  const startCamera = async () => {
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraOn(true);
    } catch {
      setError('Camera unavailable — please allow camera permission and try again.');
    }
  };

  // --- wiring: grab one frame from the live stream ---
  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      setError('Camera not ready yet — wait a second and retry.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('Capture failed — please retry.');
          return;
        }
        const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
        setSelfieFile(file);
        setPreview(URL.createObjectURL(blob));
        stopCamera();
      },
      'image/jpeg',
      0.92,
    );
  };

  const retake = () => {
    setSelfieFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    startCamera();
  };

  // --- wiring: POST id_file + selfie_file, must match face.py param names ---
  const handleVerify = async () => {
    if (!idFile) {
      setError('ID file missing — go back to step 1.');
      return;
    }
    if (!selfieFile) return;
    setIsVerifying(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('id_file', idFile);
      fd.append('selfie_file', selfieFile);
      const res = await fetch('/api/v1/face/verify', { method: 'POST', body: fd });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || 'Verification failed.');
      }
      const data: FaceVerifyResponse = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!idFile) {
    return (
      <div className="text-amber-300 bg-amber-500/10 p-6 rounded-2xl max-w-2xl w-full text-center">
        ID file missing — please complete step 1 first.
      </div>
    );
  }

  const score = result ? result.similarity * 100 : 0;

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto py-8 px-6 bg-slate-800/50 border border-indigo-500/30 rounded-3xl">
      <h2 className="text-2xl font-bold text-white mb-2">Selfie Verification</h2>
      <p className="text-slate-400 mb-6 text-center">
        Take a live selfie — compared against your ID via SFace embeddings.
      </p>

      {/* Oval live-camera HUD */}
      <div className="relative w-64 h-80 rounded-[50%] overflow-hidden border-4 border-indigo-500/40 bg-slate-900 flex items-center justify-center mb-4">
        {preview ? (
          <img src={preview} alt="Captured selfie" className="w-full h-full object-cover" />
        ) : isCameraOn ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Camera className="w-12 h-12 text-indigo-400" />
            <span className="text-slate-500 text-sm">Camera off</span>
          </div>
        )}
        {isVerifying && (
          <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-lg mb-4 w-full">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!result ? (
        <div className="w-full flex flex-col gap-3">
          {!isCameraOn && !preview && (
            <button
              onClick={startCamera}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" /> Start Camera
            </button>
          )}
          {isCameraOn && !preview && (
            <button
              onClick={captureFrame}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors"
            >
              Capture Selfie
            </button>
          )}
          {preview && (
            <>
              <button
                onClick={handleVerify}
                disabled={!selfieFile || isVerifying}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-semibold transition-colors"
              >
                {isVerifying ? 'Verifying...' : 'Verify Face'}
              </button>
              <button
                onClick={retake}
                disabled={isVerifying}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Retake
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="w-full flex flex-col items-center gap-4">
          <div
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-lg ${
              result.match ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
            }`}
          >
            {result.match ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
            {result.match ? 'MATCH' : 'NO MATCH'}
          </div>
          {result.error && <p className="text-amber-300 text-sm text-center">{result.error}</p>}
          <div className="flex gap-3 w-full">
            <button
              onClick={retake}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors"
            >
              Retake
            </button>
            <button
              onClick={() => onComplete(score)}
              disabled={!result.match}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold transition-colors"
            >
              Continue →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
