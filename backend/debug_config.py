from app.core.config import settings

print(f"BACKEND_CORS_ORIGINS type: {type(settings.BACKEND_CORS_ORIGINS)}")
print(f"BACKEND_CORS_ORIGINS raw: {settings.BACKEND_CORS_ORIGINS}")
print(f"Computed allow_origins: {[str(origin) for origin in settings.BACKEND_CORS_ORIGINS]}")
