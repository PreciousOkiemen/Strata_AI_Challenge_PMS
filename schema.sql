CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USERS & HIERARCHY
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    full_name VARCHAR(100) NOT NULL,

    email VARCHAR(100) UNIQUE NOT NULL,

    password_hash VARCHAR(255) NOT NULL,

    role_designation VARCHAR(50) NOT NULL CHECK (
        role_designation IN (
            'Intern',
            'Analyst',
            'Associate',
            'Senior Associate',
            'Assistant Manager',
            'Manager',
            'Partner',
            'Managing Partner'
        )
    ),

    line_manager_id UUID REFERENCES users(id),

    overall_manager_id UUID REFERENCES users(id),

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================
-- 2. PARENT GOALS
-- =====================================================

CREATE TABLE IF NOT EXISTS parent_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    code VARCHAR(20) UNIQUE NOT NULL,

    title VARCHAR(255) NOT NULL,

    category VARCHAR(50) NOT NULL,

    cycle_year INT NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================
-- 3. SCORECARDS
-- =====================================================

CREATE TABLE IF NOT EXISTS scorecards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    employee_id UUID NOT NULL REFERENCES users(id),

    cycle_year INT NOT NULL,

    checkpoint VARCHAR(10) NOT NULL CHECK (
        checkpoint IN ('Q1', 'Q2', 'Q3', 'Q4')
    ),

    is_formal BOOLEAN NOT NULL DEFAULT FALSE,

    calculated_score DECIMAL(3, 2) DEFAULT 0.00,

    rating_band VARCHAR(50) DEFAULT 'Pending',

    current_approval_stage INT DEFAULT 1 CHECK (
        current_approval_stage BETWEEN 1 AND 6
    ),

    status VARCHAR(30) DEFAULT 'Draft',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_employee_cycle_checkpoint
        UNIQUE (employee_id, cycle_year, checkpoint)
);


-- =====================================================
-- 4. INDIVIDUAL KPIs
-- =====================================================

CREATE TABLE IF NOT EXISTS kpis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    scorecard_id UUID NOT NULL
        REFERENCES scorecards(id)
        ON DELETE CASCADE,

    parent_goal_id UUID NOT NULL
        REFERENCES parent_goals(id),

    title VARCHAR(255) NOT NULL,

    notion_evidence_url TEXT,

    weight_percentage DECIMAL(5, 2) NOT NULL CHECK (
        weight_percentage BETWEEN 5.00 AND 40.00
    ),

    self_score INT CHECK (
        self_score BETWEEN 1 AND 5
    ),

    agreed_score INT CHECK (
        agreed_score BETWEEN 1 AND 5
    ),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================
-- 5. SIGNATURES
-- =====================================================

CREATE TABLE IF NOT EXISTS approval_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    scorecard_id UUID NOT NULL
        REFERENCES scorecards(id),

    signer_id UUID NOT NULL
        REFERENCES users(id),

    signer_role VARCHAR(50) NOT NULL CHECK (
        signer_role IN (
            'Employee',
            'Line Manager',
            'Overall Manager',
            'CEO'
        )
    ),

    signature_hash VARCHAR(255) NOT NULL,

    signed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_signer_per_scorecard
        UNIQUE (scorecard_id, signer_role)
);


-- =====================================================
-- 6. AUDIT TRAIL
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    actor_id UUID REFERENCES users(id),

    event_type VARCHAR(100) NOT NULL,

    target_entity VARCHAR(50) NOT NULL,

    entity_id UUID,

    payload JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================
-- 7. PERFORMANCE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_scorecards_employee
ON scorecards(employee_id);

CREATE INDEX IF NOT EXISTS idx_scorecards_cycle
ON scorecards(cycle_year);

CREATE INDEX IF NOT EXISTS idx_kpis_scorecard
ON kpis(scorecard_id);

CREATE INDEX IF NOT EXISTS idx_kpis_parent_goal
ON kpis(parent_goal_id);

CREATE INDEX IF NOT EXISTS idx_approval_signatures_scorecard
ON approval_signatures(scorecard_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
ON audit_logs(target_entity, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
ON audit_logs(actor_id);