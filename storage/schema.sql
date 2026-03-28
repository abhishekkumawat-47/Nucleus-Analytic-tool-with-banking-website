CREATE DATABASE IF NOT EXISTS feature_intelligence;

-- Raw Events Table
-- Using MergeTree and ordering by tenant_id first guarantees data locality per tenant, optimizing multi-tenant queries.
CREATE TABLE IF NOT EXISTS feature_intelligence.events_raw (
    tenant_id String,
    event_name String,
    user_id String,
    channel String,
    timestamp DateTime,
    metadata String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (tenant_id, event_name, timestamp)
SETTINGS index_granularity = 8192;

-- Pre-aggregated Daily Feature Usage Table
-- This is useful for fast dashboard loading where we only need counts.
CREATE TABLE IF NOT EXISTS feature_intelligence.daily_feature_usage (
    tenant_id String,
    event_name String,
    date Date,
    total_events UInt64,
    unique_users AggregateFunction(uniq, String)
) ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (tenant_id, event_name, date);

-- Materialized View to automatically populate daily_feature_usage from events_raw
CREATE MATERIALIZED VIEW IF NOT EXISTS feature_intelligence.mv_daily_feature_usage
TO feature_intelligence.daily_feature_usage AS
SELECT
    tenant_id,
    event_name,
    toDate(timestamp) AS date,
    count() AS total_events,
    uniqState(user_id) AS unique_users
FROM feature_intelligence.events_raw
GROUP BY tenant_id, event_name, date;
