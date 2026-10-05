# noqa: EXE002
import io
import logging

import librosa
import numpy as np
import onnxruntime as ort
import soundfile as sf

from backend.core.config import settings
from backend.models.voice import VoiceVerifyResponse

logger = logging.getLogger(__name__)

ASSETS_DIR = settings.ASSETS_DIR
VOICE_MODEL_PATH = ASSETS_DIR / "ecapa-speaker-v1.onnx"
FBANK_PATH = ASSETS_DIR / "fbank-80x201-f32.bin"

# Manifest: 16kHz mono, n_fft=400, win=400, hop=160, n_mels=80, mean norm
SAMPLE_RATE = 16000
N_FFT = 400
HOP = 160
WIN = 400
N_MELS = 80
MIN_DURATION_S = 1.0

_session = None
_fbank = None


def ensure_model_voice():
    if VOICE_MODEL_PATH.exists() and FBANK_PATH.exists():
        return
    raise RuntimeError(
        "ECAPA voice model missing in assets/ "
        "(ecapa-speaker-v1.onnx + fbank-80x201-f32.bin). "
        "Download from vedk00/ecapa-voxceleb-speaker-embedding-onnx."
    )


def get_embedder():
    global _session
    if _session is None:
        ensure_model_voice()
        _session = ort.InferenceSession(
            str(VOICE_MODEL_PATH), providers=["CPUExecutionProvider"]
        )
    return _session


def get_fbank_matrix() -> np.ndarray:
    global _fbank
    if _fbank is None:
        ensure_model_voice()
        raw = np.fromfile(str(FBANK_PATH), dtype=np.float32)
        _fbank = raw.reshape(N_MELS, N_FFT // 2 + 1)  # 80x201
    return _fbank


def decode_wav(audio_bytes: bytes) -> np.ndarray | None:
    try:
        wav, sr = sf.read(io.BytesIO(audio_bytes), dtype="float32", always_2d=False)
        if wav.ndim > 1:
            wav = wav.mean(axis=1)
        if sr != SAMPLE_RATE:
            wav = librosa.resample(wav, orig_sr=sr, target_sr=SAMPLE_RATE)
        if len(wav) < SAMPLE_RATE * MIN_DURATION_S:
            logger.info("Audio too short: %.2fs", len(wav) / SAMPLE_RATE)
            return None
        return wav.astype(np.float32)
    except Exception as e:
        logger.error(f"Wav decode failed: {e!s}", exc_info=True)  # noqa: G201
        return None


def wav_to_fbank(wav: np.ndarray) -> np.ndarray:
    # Power spectrum: (201, T)
    stft = librosa.stft(
        wav, n_fft=N_FFT, hop_length=HOP, win_length=WIN,
        window="hamming", center=False,
    )
    power = np.abs(stft) ** 2  # (201, T)
    mel = get_fbank_matrix() @ power  # (80, T)
    log_mel = np.log(np.maximum(mel, 1e-10))
    log_mel = log_mel - log_mel.mean(axis=1, keepdims=True)  # sentence mean norm
    return log_mel.T.astype(np.float32)  # (T, 80)


def get_embedding(wav: np.ndarray) -> np.ndarray | None:
    try:
        feats = wav_to_fbank(wav)  # (T, 80)
        feats = np.expand_dims(feats, 0)  # (1, T, 80)
        lens = np.array([1.0], dtype=np.float32)
        emb = get_embedder().run(None, {"features": feats, "feature_lens": lens})[0]
        emb = np.asarray(emb, dtype=np.float32).reshape(-1)
        n = np.linalg.norm(emb)
        if n < 1e-10:
            return None
        return emb / n
    except Exception as e:  # noqa: BLE001
        logger.error(f"Voice embedding failed: {e!s}", exc_info=True)  # noqa: G201
        return None


def embed_from_bytes(audio_bytes: bytes) -> tuple[np.ndarray | None, str | None]:
    wav = decode_wav(audio_bytes)
    if wav is None:
        return None, "invalid or too-short audio (need >=1s wav)"
    emb = get_embedding(wav)
    if emb is None:
        return None, "embedding failed"
    return emb, None


def verify_voices(enroll_bytes: bytes, verify_bytes: bytes) -> VoiceVerifyResponse:
    enroll_emb, enroll_err = embed_from_bytes(enroll_bytes)
    verify_emb, verify_err = embed_from_bytes(verify_bytes)
    response = VoiceVerifyResponse(match=None, similarity=0.0, error=None)
    if enroll_emb is None:
        response.error = enroll_err
        return response
    if verify_emb is None:
        response.error = verify_err
        return response
    sim = float(np.dot(enroll_emb, verify_emb))  # both L2-normalized
    response.match = sim >= settings.VOICE_REC_THRESHOLD
    response.similarity = sim
    return response
