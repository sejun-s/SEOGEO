-- SEO & GEO Analyzer Production Database Schema (v3.0 Modular Monolith)
-- RDBMS: PostgreSQL

-- 1. Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Organization Members
CREATE TABLE IF NOT EXISTS organization_members (
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (organization_id, user_id)
);

-- 4. Projects
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    default_language TEXT DEFAULT 'ko',
    default_region TEXT DEFAULT 'KR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Sites
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    canonical_origin TEXT,
    display_name TEXT,
    industry TEXT,
    site_type TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, domain)
);
CREATE INDEX IF NOT EXISTS idx_sites_domain ON sites(domain);
CREATE INDEX IF NOT EXISTS idx_sites_project_id ON sites(project_id);

-- 6. Site Competitors
CREATE TABLE IF NOT EXISTS site_competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    competitor_domain TEXT NOT NULL,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (site_id, competitor_domain)
);

-- 7. Analysis Runs
CREATE TABLE IF NOT EXISTS analysis_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    requested_url TEXT NOT NULL,
    normalized_url TEXT,
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'partial_success', 'completed', 'failed', 'cancelled')),
    analysis_type TEXT NOT NULL DEFAULT 'single_page',
    score_model_version TEXT DEFAULT 'v0.6-r1',
    crawler_version TEXT DEFAULT 'v1.0',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failure_code TEXT,
    failure_message TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_site_id ON analysis_runs(site_id);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_status ON analysis_runs(status);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_requested_at ON analysis_runs(requested_at);

-- 8. Analysis Stages
CREATE TABLE IF NOT EXISTS analysis_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
    stage_key TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    error_code TEXT,
    error_message TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (analysis_run_id, stage_key)
);

-- 9. Page Snapshots
CREATE TABLE IF NOT EXISTS page_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    final_url TEXT,
    http_status INTEGER,
    content_type TEXT,
    response_time_ms INTEGER,
    response_size_bytes INTEGER,
    title TEXT,
    meta_description TEXT,
    canonical_url TEXT,
    robots_meta TEXT,
    word_count INTEGER,
    h1_count INTEGER,
    h2_count INTEGER,
    image_count INTEGER,
    image_alt_count INTEGER,
    internal_link_count INTEGER,
    external_link_count INTEGER,
    rendered BOOLEAN NOT NULL DEFAULT FALSE,
    raw_measurements JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_page_snapshots_run_id ON page_snapshots(analysis_run_id);

-- 10. Resource Checks
CREATE TABLE IF NOT EXISTS resource_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('robots_txt', 'sitemap', 'schema', 'page_render', 'pagespeed', 'crux', 'search_console', 'bing_webmaster')),
    requested_url TEXT,
    status TEXT NOT NULL,
    http_status INTEGER,
    parsed_result JSONB,
    raw_evidence JSONB,
    error_code TEXT,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Rules
CREATE TABLE IF NOT EXISTS rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    evidence_type TEXT NOT NULL,
    official_source_url TEXT,
    current_version TEXT NOT NULL DEFAULT 'v0.6-r1',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Rule Versions
CREATE TABLE IF NOT EXISTS rule_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES rules(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    description TEXT,
    severity TEXT,
    maximum_score_effect NUMERIC,
    applicable_page_types JSONB,
    evaluation_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (rule_id, version)
);

-- 13. Rule Results
CREATE TABLE IF NOT EXISTS rule_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
    page_snapshot_id UUID REFERENCES page_snapshots(id) ON DELETE SET NULL,
    rule_id UUID REFERENCES rules(id) ON DELETE CASCADE,
    rule_version_id UUID REFERENCES rule_versions(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('pass', 'warning', 'fail', 'unknown', 'not_applicable')),
    applicable BOOLEAN NOT NULL DEFAULT TRUE,
    severity TEXT,
    score_effect NUMERIC,
    observed_value JSONB,
    raw_evidence JSONB,
    recommendation TEXT,
    verification_method TEXT,
    limitations TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (analysis_run_id, page_snapshot_id, rule_version_id)
);
CREATE INDEX IF NOT EXISTS idx_rule_results_run_id ON rule_results(analysis_run_id);

-- 14. Score Results
CREATE TABLE IF NOT EXISTS score_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
    model_version TEXT NOT NULL DEFAULT 'v0.6-r1',
    search_eligibility TEXT NOT NULL,
    seo_foundation_score NUMERIC,
    ai_citation_readiness_score NUMERIC,
    measurement_confidence TEXT,
    legacy_score NUMERIC,
    score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (analysis_run_id, model_version)
);

-- 15. Recommendation Actions
CREATE TABLE IF NOT EXISTS recommendation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
    rule_result_id UUID REFERENCES rule_results(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'planned', 'claimed_completed', 'verification_pending', 'verified', 'verification_failed', 'dismissed')),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    user_note TEXT,
    marked_completed_at TIMESTAMPTZ,
    verified_analysis_run_id UUID REFERENCES analysis_runs(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Integration Credentials
CREATE TABLE IF NOT EXISTS integration_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    encrypted_secret TEXT NOT NULL,
    secret_last_four TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rotated_at TIMESTAMPTZ,
    UNIQUE (organization_id, provider)
);

-- 17. Prompt Sets (GEO Monitoring)
CREATE TABLE IF NOT EXISTS prompt_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    language TEXT DEFAULT 'ko',
    region TEXT DEFAULT 'KR',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_set_id UUID REFERENCES prompt_sets(id) ON DELETE CASCADE,
    cluster_key TEXT,
    prompt_text TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. AI Visibility Observations
CREATE TABLE IF NOT EXISTS ai_visibility_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    prompt_set_id UUID REFERENCES prompt_sets(id) ON DELETE SET NULL,
    status TEXT NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_visibility_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ai_visibility_run_id UUID REFERENCES ai_visibility_runs(id) ON DELETE CASCADE,
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
    engine TEXT NOT NULL,
    model_or_service_version TEXT,
    language TEXT,
    region TEXT,
    brand_mentioned BOOLEAN DEFAULT FALSE,
    directly_cited BOOLEAN DEFAULT FALSE,
    recommendation_strength TEXT,
    citation_urls JSONB,
    competitors JSONB,
    answer_accuracy_status TEXT,
    raw_response_reference TEXT,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
