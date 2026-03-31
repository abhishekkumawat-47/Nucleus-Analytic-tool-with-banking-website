from typing import Optional, Dict, Any, List
from enum import Enum
from pydantic import BaseModel, Field, field_validator
import re

class ChannelEnum(str, Enum):
    web = "web"
    mobile = "mobile"
    api = "api"
    batch = "batch"

# Taxonomy regex: domain.feature.action (e.g. auth.login.success)
TAXONOMY_REGEX = re.compile(r'^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$')
# Legacy regex: simple flat name (e.g. login, view_feed)
LEGACY_REGEX = re.compile(r'^[a-z][a-z0-9_]*$')

class FeatureEvent(BaseModel):
    event_name: str = Field(..., description="Name of the tracked feature/interaction")
    tenant_id: str = Field(..., description="ID of the tenant/organization")
    user_id: str = Field(..., description="ID of the user interacting")
    timestamp: float = Field(..., description="Unix timestamp of the event")
    channel: ChannelEnum = Field(..., description="Source channel of the event")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Custom properties")

    @field_validator('event_name')
    @classmethod
    def validate_event_name(cls, v: str) -> str:
        v = v.strip().lower()
        if TAXONOMY_REGEX.match(v):
            return v  # New taxonomy format
        if LEGACY_REGEX.match(v):
            return v  # Legacy flat format (backward compatible)
        raise ValueError(
            f"Invalid event_name '{v}'. Must be either 'domain.feature.action' (e.g. auth.login.success) "
            f"or a legacy flat name (e.g. login, view_feed)."
        )

    class Config:
        json_schema_extra = {
            "example": {
                "event_name": "auth.login.success",
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

# ─────────────── License & Toggle Models ───────────────

class LicenseEntry(BaseModel):
    feature_name: str
    is_licensed: bool = True
    plan_tier: str = "pro"

class LicenseSyncRequest(BaseModel):
    tenant_id: str
    features: List[LicenseEntry]

class TrackingToggleRequest(BaseModel):
    tenant_id: str
    feature_name: str
    is_enabled: bool
    actor_email: str
