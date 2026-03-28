from typing import Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field

class ChannelEnum(str, Enum):
    web = "web"
    mobile = "mobile"
    api = "api"
    batch = "batch"

class FeatureEvent(BaseModel):
    event_name: str = Field(..., description="Name of the tracked feature/interaction")
    tenant_id: str = Field(..., description="ID of the tenant/organization")
    user_id: str = Field(..., description="ID of the user interacting")
    timestamp: float = Field(..., description="Unix timestamp of the event")
    channel: ChannelEnum = Field(..., description="Source channel of the event")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Custom properties")

    class Config:
        json_schema_extra = {
            "example": {
                "event_name": "button_clicked_submit",
                "tenant_id": "tenant_xyz",
                "user_id": "user_123",
                "timestamp": 1718361234.56,
                "channel": "web",
                "metadata": {
                    "browser": "Chrome",
                    "plan": "premium"
                }
            }
        }
