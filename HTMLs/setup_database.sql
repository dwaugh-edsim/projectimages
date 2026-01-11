-- =====================================================
-- SITUATION ROOM // DATABASE SETUP (v76)
-- Run this in your Supabase SQL Editor to initialize or update.
-- =====================================================

-- 1. CLASSES TABLE (For streamlined student onboarding)
CREATE TABLE IF NOT EXISTS public.classes (
    id SERIAL PRIMARY KEY,
    passcode TEXT UNIQUE NOT NULL, -- The 5-letter unique code (e.g. XJ9KT)
    teacher_id TEXT NOT NULL,      -- Email of the teacher/creator
    class_name TEXT NOT NULL,      -- Display name (e.g. Period 1 - History)
    mission_ids JSONB DEFAULT '[]'::jsonb, -- Array of assigned mission IDs
    sb_url TEXT,                   -- (Optional) Override Supabase URL
    sb_key TEXT,                   -- (Optional) Override Supabase Key
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Anyone can read class config by passcode
CREATE POLICY "Anyone can read class config by passcode"
    ON public.classes FOR SELECT
    USING (true);

-- Teachers can register new classes (permissive for prototype)
CREATE POLICY "Anyone can register a class"
    ON public.classes FOR INSERT
    WITH CHECK (true);

-- Teachers can update their own classes
CREATE POLICY "Teachers can update their own classes"
    ON public.classes FOR UPDATE
    USING (teacher_id = current_setting('request.jwt.claim.email', true) OR teacher_id = 'GUEST');

-- Teachers can delete their own classes
CREATE POLICY "Teachers can delete their own classes"
    ON public.classes FOR DELETE
    USING (teacher_id = current_setting('request.jwt.claim.email', true) OR teacher_id = 'GUEST');

-- 2. MISSION LOGS (For student submissions)
CREATE TABLE IF NOT EXISTS public.simulation_logs (
    id SERIAL PRIMARY KEY,
    student_name TEXT NOT NULL,
    class_period TEXT, -- Stores the class_name or code
    mission_id TEXT NOT NULL,
    teacher_id TEXT,
    decision_json JSONB,
    rationale TEXT,
    score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.simulation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert logs"
    ON public.simulation_logs FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Teachers can view their own logs"
    ON public.simulation_logs FOR SELECT
    USING (teacher_id = current_setting('request.jwt.claim.email', true));

-- 3. FORGE IDEAS (For work-in-progress saves)
CREATE TABLE IF NOT EXISTS public.forge_ideas (
    id SERIAL PRIMARY KEY,
    idea_id TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    name TEXT,
    idea_data JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(idea_id, teacher_id)
);

ALTER TABLE public.forge_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage their own ideas"
    ON public.forge_ideas FOR ALL
    USING (teacher_id = current_setting('request.jwt.claim.email', true));

-- 4. STUDENTS TABLE (For persistent identity and multi-class membership)
CREATE TABLE IF NOT EXISTS public.students (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    pin TEXT NOT NULL,
    teacher_id TEXT NOT NULL, -- Scoped to a specific teacher
    joined_codes JSONB DEFAULT '[]'::jsonb, -- Array of 5-letter codes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(username, pin, teacher_id)
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage their student profile"
    ON public.students FOR ALL
    USING (true);

-- =====================================================
-- SEED DATA EXAMPLE
-- = : INSERT INTO public.classes (passcode, teacher_id, class_name) 
--     VALUES ('XJ9KT', 'your-email@example.com', 'History 101');
-- =====================================================

-- 5. COMMUNITY CATALOG (For shared mission hub)
CREATE TABLE IF NOT EXISTS public.community_catalog (
    id SERIAL PRIMARY KEY,
    mission_id TEXT UNIQUE NOT NULL,       -- The mission ID from missions table
    title TEXT NOT NULL,
    author TEXT NOT NULL,                  -- Email or handle of who published it
    description TEXT,
    thumb TEXT,                            -- Hero image URL
    download_url TEXT,                     -- Direct link to the .blob file, or inline JSON
    blob_data JSONB,                       -- Full mission data (stored inline for simplicity)
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.community_catalog ENABLE ROW LEVEL SECURITY;

-- Anyone can read the community catalog
CREATE POLICY "Anyone can read community catalog"
    ON public.community_catalog FOR SELECT
    USING (true);

-- Any authenticated user can publish (add) their mission
CREATE POLICY "Anyone can publish to community"
    ON public.community_catalog FOR INSERT
    WITH CHECK (true);

-- Only the author can remove their own entry
CREATE POLICY "Authors can remove their own entries"
    ON public.community_catalog FOR DELETE
    USING (true); -- Permissive for prototype; in production use author = jwt.email

-- 6. MISSION JOIN CODES (For Kahoot-style access)
CREATE TABLE IF NOT EXISTS public.mission_codes (
    code TEXT PRIMARY KEY,                 -- The 6-7 char code (e.g. QAR-UYZ)
    mission_id TEXT NOT NULL,              -- Links to community_catalog.mission_id
    teacher_id TEXT,                       -- Email of the teacher
    submission_url TEXT,                   -- Where student work is POSTed
    class_name TEXT,                       -- Optional: Period name
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + interval '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for lightning-fast join lookup
CREATE INDEX IF NOT EXISTS idx_mission_codes_code ON public.mission_codes(code);

-- Enable RLS
ALTER TABLE public.mission_codes ENABLE ROW LEVEL SECURITY;

-- Students can read codes to join (Public)
CREATE POLICY "Anyone can lookup mission code" 
    ON public.mission_codes FOR SELECT 
    USING (true);

-- Teachers can create new codes
CREATE POLICY "Anyone can create mission codes" 
    ON public.mission_codes FOR INSERT 
    WITH CHECK (true);
