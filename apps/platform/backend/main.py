from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

app = FastAPI()

# Define the path to your frontend build directory
# This assumes your FastAPI app is in 'backend/' and your React build ('dist') is in 'frontend/dist'
FRONTEND_DIST_PATH = Path("dist")

# 1. Serve static files from the frontend build
# Make sure this mount is done BEFORE any catch-all routes like the index.html fallback
app.mount(
    "/assets", StaticFiles(directory=FRONTEND_DIST_PATH / "assets"), name="assets"
)

# 2. API Endpoints (Commented out for now as per your request)
# @app.get("/api/hello")
# async def read_hello():
#     """A simple API endpoint to test the backend."""
#     return {"message": "Hello from FastAPI backend!"}

# @app.post("/api/conversation-flows")
# async def create_conversation_flow(flow_data: dict):
#     """
#     API endpoint to create a new conversation flow.
#     For now, it just echoes the received data.
#     In a real application, you would save this to a database.
#     """
#     print(f"Received new conversation flow: {flow_data}")
#     return {"message": "Conversation flow created successfully", "flow_id": "mock-123", "data": flow_data}


# 3. Serve the index.html for all other routes (for React Router)
# This must be the last route definition
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    """
    Serves the React frontend's index.html for all routes not handled by API or static files.
    This allows React Router to handle client-side routing.
    """
    html_file = FRONTEND_DIST_PATH / "index.html"
    if not html_file.is_file():
        # If index.html is not found, it means the frontend was not built
        raise HTTPException(
            status_code=404,
            detail="Frontend build not found. Please run `npm run build` in your frontend directory.",
        )
    return FileResponse(html_file, media_type="text/html")


# Root path should also serve index.html
@app.get("/")
async def serve_root():
    return await serve_frontend("index.html")
