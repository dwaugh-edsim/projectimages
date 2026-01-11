-- CLOSED LOOP: MISSION CODES SCHEMA
-- This table maps short "Kahoot-style" codes to mission content and submission targets.

CREATE TABLE IF NOT EXISTS mission_codes (
    code VARCHAR(10) PRIMARY KEY, -- e.g., "XYZ-123"
    mission_id UUID REFERENCES community_catalog(id),
    submission_url TEXT NOT NULL, -- Teacher's Google Apps Script doPost URL
    teacher_id TEXT, -- For tracking/cleanup
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Index for instant student lookups
CREATE INDEX IF NOT EXISTS idx_mission_codes_lookup ON mission_codes(code);

-- RLS POLICY: Public can read codes to join, teachers can create.
ALTER TABLE mission_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can lookup a code" 
ON mission_codes FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create codes" 
ON mission_codes FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');
