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

-- ═══════════════════════════════════════════════════════════
-- Tenant Feature Licenses
-- Tracks which features each tenant has paid for.
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS feature_intelligence.tenant_licenses (
    tenant_id String,
    feature_name String,
    is_licensed UInt8 DEFAULT 1,
    plan_tier String DEFAULT 'pro',
    updated_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (tenant_id, feature_name);

-- ═══════════════════════════════════════════════════════════
-- Admin Tracking Toggles
-- Allows admins to enable/disable tracking per feature.
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS feature_intelligence.tracking_toggles (
    tenant_id String,
    feature_name String,
    is_enabled UInt8 DEFAULT 1,
    changed_by String DEFAULT '',
    changed_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(changed_at)
ORDER BY (tenant_id, feature_name);

-- ═══════════════════════════════════════════════════════════
-- Configuration Audit Log
-- Records who changed which system setting and when.
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS feature_intelligence.config_audit_log (
    tenant_id String,
    actor_email String,
    action String,
    target String,
    old_value String DEFAULT '',
    new_value String DEFAULT '',
    timestamp DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (tenant_id, timestamp);

-- ═══════════════════════════════════════════════════════════
-- AI Reports Storage
-- Stores generated AI reports per tenant.
-- ReplacingMergeTree ensures only the latest report is kept
-- per tenant after background merges.
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS feature_intelligence.ai_reports (
    tenant_id String,
    generated_by String DEFAULT '',
    report String,
    insights String DEFAULT '[]',
    generated_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(generated_at)
ORDER BY (tenant_id);
