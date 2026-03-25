from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import json

from app.api.routes import auth, tenants, monitors, incidents, subscribers, public, domains
from app.core.database import engine, Base
from app.core.redis import get_redis, subscribe_channel
from app.services.monitor_worker import start_monitor_scheduler, stop_monitor_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Start monitor scheduler
    start_monitor_scheduler()
    
    yield
    
    # Shutdown
    stop_monitor_scheduler()
    await engine.dispose()


app = FastAPI(
    title="Status Page SaaS API",
    description="Multi-tenant white-label Status Page & Uptime Monitor API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(tenants.router)
app.include_router(monitors.router)
app.include_router(incidents.router)
app.include_router(subscribers.router)
app.include_router(public.router)
app.include_router(domains.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {
        "message": "Status Page SaaS API",
        "version": "1.0.0",
        "docs": "/docs"
    }


# WebSocket for real-time status updates
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, tenant_id: str):
        await websocket.accept()
        if tenant_id not in self.active_connections:
            self.active_connections[tenant_id] = []
        self.active_connections[tenant_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, tenant_id: str):
        if tenant_id in self.active_connections:
            if websocket in self.active_connections[tenant_id]:
                self.active_connections[tenant_id].remove(websocket)
            if not self.active_connections[tenant_id]:
                del self.active_connections[tenant_id]
    
    async def broadcast(self, message: str, tenant_id: str):
        if tenant_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[tenant_id]:
                try:
                    await connection.send_text(message)
                except:
                    disconnected.append(connection)
            
            # Remove disconnected clients
            for conn in disconnected:
                self.disconnect(conn, tenant_id)


manager = ConnectionManager()


@app.websocket("/api/ws/{tenant_slug_or_domain}")
async def websocket_endpoint(websocket: WebSocket, tenant_slug_or_domain: str):
    from sqlalchemy.ext.asyncio import AsyncSession
    from app.core.database import AsyncSessionLocal
    from app.services.tenant_service import get_tenant_by_domain_or_slug
    
    async with AsyncSessionLocal() as db:
        tenant = await get_tenant_by_domain_or_slug(db, tenant_slug_or_domain)
        
        if not tenant:
            await websocket.close(code=4004, reason="Tenant not found")
            return
        
        tenant_id = str(tenant.id)
        await manager.connect(websocket, tenant_id)
        
        try:
            # Subscribe to Redis channel for this tenant
            pubsub = await subscribe_channel(f"tenant:{tenant_id}")
            
            # Send initial connection message
            await websocket.send_json({
                "type": "connected",
                "tenant_id": tenant_id
            })
            
            # Listen for Redis messages and forward to WebSocket
            async for message in pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        await manager.broadcast(json.dumps(data), tenant_id)
                    except json.JSONDecodeError:
                        await manager.broadcast(message["data"], tenant_id)
                        
        except WebSocketDisconnect:
            manager.disconnect(websocket, tenant_id)
        except Exception as e:
            print(f"[WebSocket Error] {e}")
            manager.disconnect(websocket, tenant_id)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": str(exc),
            "data": None
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
