# noqa: EXE002
import base64
import logging
import urllib.request
from pathlib import Path

import cv2 as cv
import numpy as np

logger = logging.getLogger(__name__)


ASSETS_DIR = Path(__file__).parent.parent / "assets"
YUNET_MODEL_PATH = ASSETS_DIR / "face_detection_yunet_2023mar.onnx"
YUNET_MODEL_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"

def ensure_yunet_model_downloaded(timeout: int = 15):
    if YUNET_MODEL_PATH.exists():
        return
    try:
        ASSETS_DIR.mkdir(parents=True, exist_ok=True)
        logger.info(f"Downloading YuNet model weights from {YUNET_MODEL_URL}...")
        # Download with timeout and user-agent header
        req = urllib.request.Request(
            YUNET_MODEL_URL, 
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req, timeout=timeout) as response, open(YUNET_MODEL_PATH, 'wb') as out_file:
            out_file.write(response.read())
        logger.info("YuNet ONNX model downloaded successfully.")
    except Exception as e:
        # Clean up partial/corrupted file if download failed mid-way
        if YUNET_MODEL_PATH.exists():
            YUNET_MODEL_PATH.unlink(missing_ok=True)
        logger.error(f"Failed to download YuNet face detection model: {e!s}")
        raise RuntimeError(f"YuNet model download failed: {e!s}") from e


def crop_face_from_document(image_bytes:bytes, padding_ratio: float = 0.20) -> str | None:
    try:
        ensure_yunet_model_downloaded()
        
        # Read image and convert into a color image
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv.imdecode(nparr,cv.IMREAD_COLOR)

        if img is None:
            logger.warning("OpenCV2 imdecode failed: Invalid or unreadable bytes")
            return None

        img_h, img_w = img.shape[:2]

        detector = cv.FaceDetectorYN.create(
            model=str(YUNET_MODEL_PATH),
            config="",
            input_size=(img_w, img_h),
            score_threshold=0.6,
            nms_threshold=0.3
        )
        _,faces = detector.detect(img)
        if faces is None or len(faces) == 0:
            logger.info("No face detected")
            return None

        best_face = max(faces, key = lambda f: f[14])
        x,y,w,h = map(int, best_face[:4])
        pad_w = int(w*padding_ratio)
        pad_h = int(h*padding_ratio)
        
        x1 = max(0,x-pad_w)
        y1 = max(0,y-pad_h)
        x2 = min(img_w, x + w + pad_w)
        y2 = min(img_h, y + h + pad_h)

        cropped_face = img[y1:y2, x1:x2]
        success, buffer = cv.imencode('.jpg', cropped_face)
        if not success:
            return None
        return base64.b64encode(buffer).decode('utf-8')
    except Exception as e:
        logger.error(f"Unexpected error during face cropping: {e!s}", exc_info=True)  # noqa: G201
        return None