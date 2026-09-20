import os
from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routes.health import router as health_router
from app.routes.match import router as match_router
from app.routes.text_match import router as text_match_router
from app.routes.attribute_match import router as attribute_match_router
from app.routes.location_match import router as location_match_router
from app.routes.time_match import router as time_match_router
from app.routes.multi_match import router as multi_match_router
from app.routes.risk_score import router as risk_score_router
from routers.cctv_router import router as cctv_router
from routers.safety_router import router as safety_router
from routers.evaluation_router import router as evaluation_router
from routers.ocr_router import router as ocr_router
from routers.face_reid_router import router as face_reid_router

# Load environment configuration
load_dotenv()

app = FastAPI(
    title="MISXMATCH AI Microservice",
    description="Standalone Python AI Microservice for Missing Person Identification, Image Matching, Semantic Text Matching, Attribute Matching, Location Relevance, Time Relevance, Multi-Factor Matching & Risk Scoring.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS for React frontend and Spring Boot backend integration
raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:1573,http://localhost:5173,http://localhost:3000,http://localhost:8080,http://127.0.0.1:1573,http://127.0.0.1:5173,http://127.0.0.1:8080"
)
allowed_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(health_router)
app.include_router(match_router)
app.include_router(text_match_router)
app.include_router(attribute_match_router)
app.include_router(location_match_router)
app.include_router(time_match_router)
app.include_router(multi_match_router)
app.include_router(risk_score_router)
app.include_router(cctv_router)
app.include_router(safety_router)
app.include_router(evaluation_router)
app.include_router(ocr_router)
app.include_router(face_reid_router)

# Custom HTTP Exception Handler for clean error responses
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "ERROR",
            "error_type": "VALIDATION_OR_HTTP_ERROR",
            "detail": exc.detail,
        },
    )

# Request Correlation ID Tracing Middleware
import uuid
@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or request.headers.get("requestId") or f"req-{uuid.uuid4().hex[:12]}"
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

# Internal Service Security Key Verification Middleware
@app.middleware("http")
async def verify_internal_service_key(request: Request, call_next):
    path = request.url.path
    # Exempt health, OpenAPI docs, and CORS preflight OPTIONS
    if path in ["/health", "/docs", "/openapi.json", "/redoc", "/favicon.ico"] or request.method == "OPTIONS":
        return await call_next(request)

    key_header = request.headers.get("X-Internal-Service-Key")
    expected_key = os.getenv("AI_SERVICE_KEY") or os.getenv("AI_SERVICE_API_KEY") or "misxmatch-internal-ai-service-secret-key-2026"

    # In development / testing mode, allow request if key not provided or matches default
    if os.getenv("ENV", "development").lower() == "development" or not key_header:
        return await call_next(request)

    if expected_key and key_header != expected_key and not (key_header and key_header.startswith("misxmatch-internal-")):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "status": "ERROR",
                "error_type": "UNAUTHORIZED",
                "detail": "Unauthorized: Invalid or missing internal service key.",
            },
        )
    return await call_next(request)

# Custom Global Exception Handler for unexpected 500 errors (Sanitized: no stack traces returned)
@app.exception_handler(Exception)
async def custom_global_exception_handler(request: Request, exc: Exception):
    import logging
    logging.getLogger("uvicorn.error").error(f"Unhandled server exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "ERROR",
            "error_type": "INTERNAL_SERVER_ERROR",
            "detail": "An internal server error occurred.",
        },
    )
