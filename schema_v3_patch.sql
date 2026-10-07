-- Phase 3 Non-Breaking Database Enhancements

-- 1. Extend KPIs table for Nested Categories & Sub-weights
ALTER TABLE kpis 
ADD COLUMN IF NOT EXISTS kpi_category VARCHAR(100) DEFAULT 'Core role delivery',
ADD COLUMN IF NOT EXISTS category_weight DECIMAL(5,2) DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS sub_weight DECIMAL(5,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS reason_for_change TEXT;

-- 2. Scorecard Journey & Calibration Stage Tracking
ALTER TABLE scorecards 
ADD COLUMN IF NOT EXISTS line_manager_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS calibration_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS overall_manager_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS cos_approval_status VARCHAR(30) DEFAULT 'Pending',
ADD COLUMN IF NOT EXISTS ceo_approval_status VARCHAR(30) DEFAULT 'Pending';

-- 3. Evaluation Comment Thread
CREATE TABLE IF NOT EXISTS evaluation_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scorecard_id UUID NOT NULL REFERENCES scorecards(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    author_role VARCHAR(50) NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Practice & Team Goals (Expanded Goal Cascade)
CREATE TABLE IF NOT EXISTS organizational_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_level VARCHAR(20) NOT NULL CHECK (goal_level IN ('Company', 'Practice', 'Team')),
    practice_area VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    target_description TEXT,
    cycle_year INT DEFAULT 2026,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Interoperable External API Keys
CREATE TABLE IF NOT EXISTS external_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_name VARCHAR(100) NOT NULL,
    api_key_hash VARCHAR(255) NOT NULL,
    permissions JSONB DEFAULT '["read:scorecards", "write:evidence"]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);