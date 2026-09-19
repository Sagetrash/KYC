# noqa: EXE002
import logging
import urllib.request

import cv2 as cv
import numpy as np

from backend.core.config import settings
from backend.services.crop_service import get_detector

logger = logging.getLogger(__name__)

ASSETS_DIR = settings.ASSETS_DIR
SFACE_MODEL_PATH = ASSETS_DIR/'face_recognition_sface.onnx'
SFACE_MODEL_URL = 'https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx'
_recognizer = None

def ensure_model_sface(timeout: int = 15):
    if SFACE_MODEL_PATH.exists():
        return
    try:
        ASSETS_DIR.mkdir(parents=True, exist_ok=True)
        logger.info(f"Downloading sface model weights from {SFACE_MODEL_URL}...")
        # Download with timeout and user-agent header
        req = urllib.request.Request(
            SFACE_MODEL_URL, 
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req, timeout=timeout) as response, open(SFACE_MODEL_PATH, 'wb') as out_file:
            out_file.write(response.read())
        logger.info("sface ONNX model downloaded successfully.")
    except Exception as e:
        # Clean up partial/corrupted file if download failed mid-way
        if SFACE_MODEL_PATH.exists():
            SFACE_MODEL_PATH.unlink(missing_ok=True)
        logger.error(f"Failed to download sface face detection model: {e!s}")
        raise RuntimeError(f"sface model download failed: {e!s}") from e

def get_recognizer():
    global _recognizer
    if _recognizer is None:
        ensure_model_sface()
        _recognizer = cv.FaceRecognizerSF.create(str(SFACE_MODEL_PATH), "", cv.dnn.DNN_BACKEND_OPENCV, cv.dnn.DNN_TARGET_CPU)
    return _recognizer

def get_embedding(img_bgr: np.ndarray, face_row: np.ndarray) -> np.ndarray | None:
    try:
        aligned = get_recognizer().alignCrop(img_bgr, face_row)
        feat = get_recognizer().feature(aligned)  # 1x128
        return feat
    except Exception as e:  # noqa: BLE001
        logger.error(f"Failed to generate embeddings{e}")
        return None

def cosine_sim(a, b) -> float:
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0: return 0.0
    return float(np.clip(float(a @ b) / denom, -1.0, 1.0))
    

def decode_bgr(image_bytes: bytes):
    try:
        nparr = np.frombuffer(image_bytes,np.uint8)
        img = cv.imdecode(nparr,cv.IMREAD_COLOR)
        if img is None:
            logger.warning("OpenCV2 imdecode failed: Invalid or unreadable bytes")
            return None
        return img
    except Exception as e:
        logger.error(f"Unexpected error during decoding: {e!s}", exc_info=True)  # noqa: G201
        return None

def detect_face(img: np.ndarray):
    try:
        img_h, img_w = img.shape[:2]

        detector = get_detector(img_w,img_h)
        _,faces = detector.detect(img)
        if faces is None or len(faces) == 0:
            logger.info("No face detected")
            return None

        best_face = max(faces, key = lambda f: f[14])
        return best_face
    except Exception as e:
        logger.error(f"Unexpected error during face Detection: {e!s}", exc_info=True)  # noqa: G201
        return None

def embed_from_bytes(image_bytes: bytes)-> tuple[np.ndarray | None, str | None]:
    img = decode_bgr(image_bytes)
    if img is None:
        return None, "invalid image bytes"
    face = detect_face(img)
    if face is None:
        return None, "no face detected"
    emb = get_embedding(img, face)
    if emb is None:
        return None, "embedding failed"
    return emb, None

def verify_faces(id_bytes:bytes, selfie_bytes:bytes)-> dict:
    id_emb,id_err = embed_from_bytes(id_bytes)
    selfie_emb,selfie_err = embed_from_bytes(selfie_bytes)
    if id_emb is None:
        return {"match": None, "similarity": 0.0, "error": f"id {id_err}"}
    if selfie_emb is None:
        return {"match":None,"similarity":0.0, "error":f"selfie {selfie_err}"}
    sim = get_recognizer().match(id_emb,selfie_emb)
    return {"match": sim >= settings.FACE_REC_THRESHOLD, "similarity": sim, "error": None}