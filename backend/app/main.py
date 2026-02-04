from fastapi import FastAPI

app = FastAPI(title="StallEasy POS API")

@app.get("/health")
def health():
    return {"status": "ok"}
