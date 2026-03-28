import os
from enum import Enum
from pydantic_settings import BaseSettings

class DeploymentMode(str, Enum):
    CLOUD = "CLOUD"
    ON_PREM = "ON_PREM"

class Settings(BaseSettings):
    # Deployment Strategy
    DEPLOYMENT_MODE: DeploymentMode = DeploymentMode.CLOUD
    
    # Kafka
    KAFKA_BROKER_URL: str = "broker:29092"
    KAFKA_TOPIC_EVENTS: str = "feature-events"
    
    # ClickHouse
    CLICKHOUSE_HOST: str = "clickhouse"
    CLICKHOUSE_PORT: int = 8123
    CLICKHOUSE_USER: str = "default"
    CLICKHOUSE_PASSWORD: str = ""
    CLICKHOUSE_DATABASE: str = "feature_intelligence"
    
    class Config:
        env_file = ".env"

# Global settings instance
settings = Settings()
