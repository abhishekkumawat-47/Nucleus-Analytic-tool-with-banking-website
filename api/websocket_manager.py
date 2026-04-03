import asyncio
import json
import logging
from typing import Dict, Set
from fastapi import WebSocket
from aiokafka import AIOKafkaConsumer

from core.config import settings

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, tenant_id: str):
        await websocket.accept()
        if tenant_id not in self.active_connections:
            self.active_connections[tenant_id] = set()
        self.active_connections[tenant_id].add(websocket)
        logger.info(f"WebSocket connected for tenant: {tenant_id}")

    def disconnect(self, websocket: WebSocket, tenant_id: str):
        if tenant_id in self.active_connections:
            self.active_connections[tenant_id].discard(websocket)
            if not self.active_connections[tenant_id]:
                del self.active_connections[tenant_id]
        logger.info(f"WebSocket disconnected for tenant: {tenant_id}")

    async def broadcast_to_tenant(self, tenant_id: str, message: dict):
        if tenant_id in self.active_connections:
            dead_sockets = set()
            for connection in self.active_connections[tenant_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead_sockets.add(connection)
            for dead in dead_sockets:
                self.disconnect(dead, tenant_id)

manager = ConnectionManager()

async def consume_kafka_events():
    """Reads from Kafka in real-time and pushes simple events (Option B)."""
    kafka_url = getattr(settings, "KAFKA_BROKER_URL", "broker:29092")
    topic = getattr(settings, "KAFKA_TOPIC_EVENTS", "feature-events")
    
    # Simple retry block since Kafka might not be ready immediately
    consumer = None
    for _ in range(5):
        try:
            consumer = AIOKafkaConsumer(
                topic,
                bootstrap_servers=kafka_url,
                group_id="websocket-broadcaster-group",
                auto_offset_reset="latest"
            )
            await consumer.start()
            break
        except Exception as e:
            logger.warning(f"Kafka consumer connection failed, retrying... {e}")
            await asyncio.sleep(5)
            
    if not consumer:
        logger.error("Failed to connect to Kafka for WebSockets.")
        return

    try:
        async for msg in consumer:
            try:
                event = json.loads(msg.value.decode('utf-8'))
                tenant_id = event.get("tenant_id")
                
                # Only broadcast if there is an active tenant socket listener
                if tenant_id and tenant_id in manager.active_connections:
                    await manager.broadcast_to_tenant(tenant_id, {
                        "type": "REALTIME_EVENT", 
                        "payload": event
                    })
            except json.JSONDecodeError:
                continue
    finally:
        await consumer.stop()

async def poll_dashboard_metrics():
    """Polls ClickHouse every 10 seconds and pushes metrics (Option A)."""
    # Import needed metrics query functions
    from api.main import get_kpi_metrics, get_realtime_users
    
    while True:
        await asyncio.sleep(10)
        loop = asyncio.get_event_loop()
        
        tenants_to_update = list(manager.active_connections.keys())
        for tenant_id in tenants_to_update:
            try:
                # Wrap sync database calls in executor to avoid blocking the event loop
                # IMPORTANT: pass days=7 explicitly — without it, the FastAPI Query() default
                # object leaks into the SQL string instead of the integer 7.
                kpi = await loop.run_in_executor(None, lambda: get_kpi_metrics(tenant_id, 7))
                rt_users = await loop.run_in_executor(None, get_realtime_users, tenant_id)
                
                payload = {
                    "type": "METRICS_UPDATE",
                    "payload": {
                        "kpiMetrics": kpi,
                        "realtimeUsers": rt_users
                    }
                }
                await manager.broadcast_to_tenant(tenant_id, payload)
                
            except Exception as e:
                logger.error(f"Error polling metrics for tenant {tenant_id}: {e}")

async def start_websocket_background_tasks():
    # Execute both real-time kafka listening and interval DB polling
    asyncio.create_task(consume_kafka_events())
    asyncio.create_task(poll_dashboard_metrics())
