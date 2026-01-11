-- CLOSED LOOP: MISSION CODES SCHEMA (V2 - ALIGNED WITH DB)
-- This table maps short "Kahoot-style" codes to mission entries.

CREATE TABLE IF NOT EXISTS public.mission_codes (
    code TEXT PRIMARY KEY,                 -- e.g., "XYZ-123"
    mission_id TEXT NOT NULL,              -- Links to community_catalog.mission_id
    submission_url TEXT NOT NULL,          -- Teacher's Google Apps Script doPost URL
    teacher_id TEXT,                       -- For tracking/cleanup
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Index for instant student lookups
CREATE INDEX IF NOT EXISTS idx_mission_codes_lookup ON mission_codes(code);

-- RLS POLICY: Public can read codes to join, teachers can create.
ALTER TABLE mission_codes ENABLE ROW LEVEL SECURITY;

-- DROP EXISTING POLICIES IF REDEPLOYING
DROP POLICY IF EXISTS "Anyone can lookup a code" ON mission_codes;
DROP POLICY IF EXISTS "Authenticated users can create codes" ON mission_codes;

CREATE POLICY "Anyone can lookup a code" 
ON mission_codes FOR SELECT 
USING (true);

-- For prototype/demo, allowing anonymous insert so the user doesn't have to log in to Supabase dashboard
CREATE POLICY "Anyone can create codes" 
ON mission_codes FOR INSERT 
WITH CHECK (true);
