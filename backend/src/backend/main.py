# noqa: EXE002
import time

from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware

from backend.api.v1.documents import router as documents_router
from backend.api.v1.face import router as face_router
from backend.core.config import settings

app = FastAPI(
    title = settings.PROJECT_NAME,
    description = "MultiModal KYC Platform",
    version = "1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Process-Time-Ms"],
)

@app.middleware("http")
async def add_process_time_header(req: Request, call_next):
    start_time = time.perf_counter()
    response: Response = await call_next(req)
    process_time = (time.perf_counter() - start_time)*1000
    response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"
    return response

app.include_router(documents_router, prefix = "/api/v1")
app.include_router(face_router, prefix="/api/v1")
@app.get("/health",tags = ["health"])
async def health_check():
    return {"status": status.HTTP_200_OK, "service":settings.PROJECT_NAME}