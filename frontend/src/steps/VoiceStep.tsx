import React, { useState, useRef, useEffect } from 'react';
import type { VoiceVerifyResponse } from '../types';
import { Mic, Square, AlertCircle, CheckCircle, XCircle, RefreshCw, Play } from 'lucide-react';

interface VoiceStepProps {
  onComplete: () => void;
}

/** Encode mono AudioBuffer as 16-bit PCM WAV blob. */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numCh = 1;
  const sampleRate = buffer.sampleRate;
  const data = buffer.getChannelData(0);
  const dataLen = data.length * 2;
  const ab = new ArrayBuffer(44 + dataLen);
  const view = new DataView(ab);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataLen, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numCh * 2, true);
  view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataLen, true);
  for (let i = 0; i < data.length; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([ab], { type: 'audio/wav' });
}

/** Decode any recorded blob (webm/opus) and re-encode as 16kHz mono WAV. */
async function blobTo16kWav(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const targetRate = 16000;
    const offline = new OfflineAudioContext(
      1,
      Math.max(1, Math.ceil(decoded.duration * targetRate)),
      targetRate,
    );
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();
    return audioBufferToWav(rendered);
  } finally {
    await ctx.close().catch(() => {});
  }
}

type Phase = 'enroll' | 'verify';

const ENROLL_PHRASE = 'My voice is my password, and I am verifying my identity today';

export const VoiceStep: React.FC<VoiceStepProps> = ({ onComplete }) => {
  const [enrollUrl, setEnrollUrl] = useState<string | null>(null);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState<Phase | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VoiceVerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enrollBlob = useRef<Blob | null>(null);
  const verifyBlob = useRef<Blob | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<Phase>('enroll');
  // wav cache avoids re-decode on re-verify
  const enrollWav = useRef<Blob | null>(null);
  const verifyWav = useRef<Blob | null>(null);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      stopTracks();
      audioCtxRef.current?.close().catch(() => {});
      if (enrollUrl) URL.revokeObjectURL(enrollUrl);
      if (verifyUrl) URL.revokeObjectURL(verifyUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drawWave = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;
    const data = new Uint8Array(analyser.fftSize);
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(data);
      const { width, height } = canvas;
      ctx2d.fillStyle = '#0f172a';
      ctx2d.fillRect(0, 0, width, height);
      ctx2d.lineWidth = 2;
      ctx2d.strokeStyle = '#818cf8';
      ctx2d.beginPath();
      const step = width / data.length;
      for (let i = 0; i < data.length; i++) {
        const y = ((data[i] - 128) / 128) * (height / 2) + height / 2;
        if (i === 0) ctx2d.moveTo(0, y);
        else ctx2d.lineTo(i * step, y);
      }
      ctx2d.stroke();
    };
    draw();
  };

  const startRecording = async (phase: Phase) => {
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      phaseRef.current = phase;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        cancelAnimationFrame(rafRef.current);
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        if (phaseRef.current === 'enroll') {
          enrollBlob.current = blob;
          enrollWav.current = null;
          setEnrollUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        } else {
          verifyBlob.current = blob;
          verifyWav.current = null;
          setVerifyUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        }
        stopTracks();
        setRecording(null);
      };
      // live waveform
      const actx = new AudioContext();
      audioCtxRef.current = actx;
      const src = actx.createMediaStreamSource(stream);
      const analyser = actx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);
      analyserRef.current = analyser;
      setRecording(phase);
      drawWave();
      rec.start();
    } catch {
      setError('Microphone unavailable — please allow mic permission and try again.');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
  };

  const resetAll = () => {
    enrollBlob.current = null;
    verifyBlob.current = null;
    enrollWav.current = null;
    verifyWav.current = null;
    setEnrollUrl((p) => {
      if (p) URL.revokeObjectURL(p);
      return null;
    });
    setVerifyUrl((p) => {
      if (p) URL.revokeObjectURL(p);
      return null;
    });
    setResult(null);
    setError(null);
  };

  const handleVerify = async () => {
    if (!enrollBlob.current || !verifyBlob.current) return;
    setIsVerifying(true);
    setError(null);
    try {
      // Backend soundfile reads WAV only — convert webm in-browser, zero server deps.
      if (!enrollWav.current) enrollWav.current = await blobTo16kWav(enrollBlob.current);
      if (!verifyWav.current) verifyWav.current = await blobTo16kWav(verifyBlob.current);
      const fd = new FormData();
      fd.append('enroll_file', enrollWav.current, 'enroll.wav');
      fd.append('verify_file', verifyWav.current, 'verify.wav');
      const res = await fetch('/api/v1/voice/verify', { method: 'POST', body: fd });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || 'Verification failed.');
      }
      const data: VoiceVerifyResponse = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setIsVerifying(false);
    }
  };

  const score = result ? Math.max(0, Math.min(1, result.similarity)) * 100 : 0;

  const renderClip = (
    label: string,
    phase: Phase,
    url: string | null,
  ) => (
    <div className="w-full p-4 bg-slate-900/60 border border-slate-700 rounded-2xl">
      <p className="text-sm font-semibold text-slate-300 mb-2">{label}</p>
      {recording === phase ? (
        <button
          onClick={stopRecording}
          className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <Square className="w-4 h-4" /> Stop recording
        </button>
      ) : url ? (
        <div className="flex items-center gap-2">
          <audio controls src={url} className="flex-1 h-9" />
          <button
            onClick={() => startRecording(phase)}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" /> Re-record
          </button>
        </div>
      ) : (
        <button
          onClick={() => startRecording(phase)}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <Mic className="w-4 h-4" /> Record {phase === 'enroll' ? 'enrollment' : 'verification'} clip
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto py-8 px-6 bg-slate-800/50 border border-indigo-500/30 rounded-3xl">
      <h2 className="text-2xl font-bold text-white mb-2">Voice Biometrics</h2>
      <p className="text-slate-400 mb-4 text-center">
        Record the same phrase twice — compared via ECAPA speaker embeddings.
      </p>

      <div className="w-full p-4 mb-4 bg-indigo-500/10 border border-indigo-500/40 rounded-2xl">
        <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wide mb-1">
          Please read aloud
        </p>
        <p className="text-lg font-medium text-white text-center">“{ENROLL_PHRASE}”</p>
      </div>

      {recording && (
        <div className="w-full mb-4">
          <canvas ref={canvasRef} width={480} height={80} className="w-full h-20 rounded-xl border border-red-500/40" />
          <p className="text-red-300 text-sm text-center mt-1 animate-pulse">
            ● Recording {recording}… speak now
          </p>
        </div>
      )}

      <div className="w-full flex flex-col gap-3 mb-4">
        {renderClip('1. Enrollment clip', 'enroll', enrollUrl)}
        {renderClip('2. Verification clip (same phrase)', 'verify', verifyUrl)}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-lg mb-4 w-full">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!result ? (
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={handleVerify}
            disabled={!enrollUrl || !verifyUrl || isVerifying || recording !== null}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" /> {isVerifying ? 'Verifying…' : 'Verify Voice'}
          </button>
          {(enrollUrl || verifyUrl) && (
            <button
              onClick={resetAll}
              disabled={isVerifying}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors"
            >
              Start over
            </button>
          )}
          {isVerifying && (
            <div className="flex justify-center">
              <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
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
            {result.match ? 'MATCH' : 'NO MATCH'} · {score.toFixed(1)}%
          </div>
          <div className="flex gap-3 w-full">
            <button
              onClick={resetAll}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors"
            >
              Re-record
            </button>
            <button
              onClick={onComplete}
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
