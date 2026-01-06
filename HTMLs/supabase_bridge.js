/**
 * SITUATION ROOM // SUPABASE BRIDGE (v0.50)
 * Abstracted data layer for missions and curriculums.
 */

const SupabaseBridge = {
    client: null,

    init(url, key) {
        if (!url || !key) {
            console.warn("SUPABASE_BRIDGE: Missing credentials. Falling back to local/legacy mode.");
            return false;
        }
        // Check if library is available
        if (typeof supabase === 'undefined') {
            console.error("SUPABASE_BRIDGE: Supabase library not found. Load script first.");
            return false;
        }
        this.client = supabase.createClient(url, key);
        console.log("SUPABASE_BRIDGE: Initialized operational capacity.");
        return true;
    },

    async toggleAI(missionId, enabled, teacherId) {
        if (!this.client) return false;
        let query = this.client
            .from('missions')
            .update({ ai_enabled: enabled, updated_at: new Date().toISOString() })
            .eq('mission_id', missionId);

        if (teacherId) query = query.eq('teacher_id', teacherId);

        const { error } = await query;
        if (error) throw error;
        return true;
    },

    async fetchMissionStatus(missionId) {
        if (!this.client) return null;
        const { data, error } = await this.client
            .from('missions')
            .select('ai_enabled, is_public, updated_at')
            .eq('mission_id', missionId)
            .single();

        if (error) return null;
        return data; // returns {ai_enabled: true/false, is_public: true/false}
    },

    // --- MISSION OPERATIONS ---
    async saveMission(missionId, name, payload, teacherId) {
        if (!this.client) return this.saveToLegacy(name, payload);

        const { data, error } = await this.client
            .from('missions')
            .upsert({
                mission_id: missionId,
                teacher_id: teacherId,
                title: name,
                blob_data: payload,
                is_public: true,
                ai_enabled: true, // v72 Default
                updated_at: new Date().toISOString()
            })
            .select();

        if (error) throw error;
        return data;
    },

    async fetchMissions(teacherId) {
        if (!this.client) return [];
        const { data, error } = await this.client
            .from('missions')
            .select('*')
            .eq('teacher_id', teacherId)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        // Map back to legacy format for UI compatibility
        return data.map(m => ({
            id: m.mission_id,
            name: m.title,
            payload: m.blob_data,
            thumb: m.blob_data?.metadata?.heroImage || m.blob_data?.metadata?.mediaURL, // REFINED EXTRACTION
            updated: m.updated_at,
            aiEnabled: m.ai_enabled !== false // Safeguard default true
        }));
    },

    async deleteMission(missionId, teacherId) {
        if (!this.client) return false;
        const { error } = await this.client
            .from('missions')
            .delete()
            .eq('mission_id', missionId)
            .eq('teacher_id', teacherId);

        if (error) throw error;
        return true;
    },

    // --- TELEMETRY / LOGGING OPERATIONS ---
    async logSubmission(logData) {
        if (!this.client) {
            console.warn("SUPABASE_BRIDGE: No client initialized. Caching locally.");
            return false;
        }

        const { data, error } = await this.client
            .from('simulation_logs')
            .insert({
                student_name: logData.studentName,
                class_period: logData.classPeriod,
                mission_id: logData.missionId,
                teacher_id: logData.teacherId,
                decision_json: logData.decisionJson,
                rationale: logData.rationale,
                score: logData.score
            })
            .select();

        if (error) throw error;
        return data;
    },

    async fetchLogs(teacherId, classCode) {
        if (!this.client) return [];
        let query = this.client.from('simulation_logs').select('*');

        if (teacherId) query = query.eq('teacher_id', teacherId);
        if (classCode) query = query.eq('class_period', classCode);

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    async deleteLogs(studentName, classCode) {
        if (!this.client) return false;
        const { error } = await this.client
            .from('simulation_logs')
            .delete()
            .eq('student_name', studentName)
            .eq('class_period', classCode);

        if (error) throw error;
        return true;
    },

    // --- CURRICULUM OPERATIONS ---
    async fetchOutcomes(country, region, course) {
        if (!this.client) return [];
        let query = this.client.from('curriculum_outcomes').select('*');

        if (country) query = query.eq('country', country);
        if (region) query = query.eq('region', region);
        if (course) query = query.eq('course', course);

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async saveCustomOutcome(country, region, course, description) {
        if (!this.client) return false;
        const { data, error } = await this.client
            .from('curriculum_outcomes')
            .insert({
                country,
                region,
                course,
                description,
                is_favorite: false
            })
            .select();

        if (error) throw error;
        return data;
    },

    async fetchAllOutcomes() {
        if (!this.client) return [];
        const { data, error } = await this.client
            .from('curriculum_outcomes')
            .select('*')
            .order('country, region, course');
        if (error) throw error;
        return data;
    },

    async bulkInsertOutcomes(outcomes) {
        if (!this.client) return false;
        const { data, error } = await this.client
            .from('curriculum_outcomes')
            .insert(outcomes);
        if (error) throw error;
        return data;
    },

    async fetchForgeConfig(configType = 'system_prompt') {
        if (!this.client) return null;
        const { data, error } = await this.client
            .from('forge_config')
            .select('content, version, updated_at')
            .eq('config_type', configType)
            .eq('active', true)
            .order('version', { ascending: false })
            .limit(1)
            .single();

        if (error) throw error;
        return data;
    },

    async saveStudentState(studentId, missionId, state, teacherId) {
        if (!this.client) return false;
        const { data, error } = await this.client
            .from('student_progress')
            .upsert({
                student_id: studentId,
                mission_id: missionId,
                teacher_id: teacherId,
                state_json: state,
                updated_at: new Date().toISOString()
            })
            .select();

        if (error) throw error;
        return data;
    },

    // --- CLASS OPERATIONS ---
    async fetchClassByCode(passcode) {
        if (!this.client) return null;
        const { data, error } = await this.client
            .from('classes')
            .select('*')
            .eq('passcode', passcode.toUpperCase())
            .single();

        if (error) {
            console.warn("SUPABASE_BRIDGE: Class lookup failed for code", passcode);
            return null;
        }
        return data;
    },

    async saveClass(teacherId, className, passcode) {
        if (!this.client) return false;
        const { data, error } = await this.client
            .from('classes')
            .upsert({
                teacher_id: teacherId,
                class_name: className,
                passcode: passcode.toUpperCase(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'passcode' })
            .select();

        if (error) throw error;
        return data;
    },

    // --- LEGACY FALLBACK (DEPRECATING) ---
    saveToLegacy(title, blobData) {
        console.warn("SUPABASE_BRIDGE: Legacy storage is deprecated.");
        return { id: null, status: 'deprecated' };
    },

    // --- IDEA (WIP SESSION) OPERATIONS ---
    async saveIdea(ideaId, teacherId, ideaData) {
        // ideaData contains: {name, forgeHistory, currentPhaseIndex, accumulatedData, curriculum, settings}
        if (!this.client) {
            // Local fallback
            localStorage.setItem(`TM_IDEA_${ideaId}`, JSON.stringify(ideaData));
            console.log("SUPABASE_BRIDGE: Idea saved to localStorage (offline mode)");
            return { id: ideaId, status: 'local' };
        }

        const { data, error } = await this.client
            .from('forge_ideas')
            .upsert({
                idea_id: ideaId,
                teacher_id: teacherId,
                name: ideaData.name || 'Untitled Idea',
                idea_data: ideaData,
                updated_at: new Date().toISOString()
            })
            .select();

        if (error) throw error;
        return data;
    },

    async fetchIdeas(teacherId) {
        if (!this.client) {
            // Local fallback - scan localStorage
            const ideas = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('TM_IDEA_')) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        ideas.push({
                            id: key.replace('TM_IDEA_', ''),
                            name: data.name || 'Untitled',
                            updated: data.savedAt || 'Unknown',
                            data: data
                        });
                    } catch (e) { }
                }
            }
            return ideas;
        }

        const { data, error } = await this.client
            .from('forge_ideas')
            .select('idea_id, name, updated_at')
            .eq('teacher_id', teacherId)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data.map(i => ({
            id: i.idea_id,
            name: i.name,
            updated: i.updated_at
        }));
    },

    async loadIdea(ideaId, teacherId) {
        if (!this.client) {
            // Local fallback
            const raw = localStorage.getItem(`TM_IDEA_${ideaId}`);
            return raw ? JSON.parse(raw) : null;
        }

        const { data, error } = await this.client
            .from('forge_ideas')
            .select('idea_data')
            .eq('idea_id', ideaId)
            .eq('teacher_id', teacherId)
            .single();

        if (error) throw error;
        return data?.idea_data || null;
    },

    async deleteIdea(ideaId, teacherId) {
        if (!this.client) {
            localStorage.removeItem(`TM_IDEA_${ideaId}`);
            return true;
        }

        const { error } = await this.client
            .from('forge_ideas')
            .delete()
            .eq('idea_id', ideaId)
            .eq('teacher_id', teacherId);

        if (error) throw error;
        return true;
    },

    async fetchClasses(teacherId) {
        if (!this.client) return [];
        try {
            const { data, error } = await this.client
                .from('classes')
                .select('*')
                .eq('teacher_id', teacherId)
                .order('class_name', { ascending: true });

            if (error) throw error;
            return data;
        } catch (e) {
            console.error("Supabase Bridge [fetchClasses] Error:", e);
            throw e;
        }
    },

    async updateClass(classId, updates) {
        if (!this.client) return false;
        if (updates.passcode) updates.passcode = updates.passcode.toUpperCase();
        const { data, error } = await this.client
            .from('classes')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', classId)
            .select();
        if (error) throw error;
        return data;
    },

    async deleteClass(classId) {
        if (!this.client) return false;
        const { error } = await this.client
            .from('classes')
            .delete()
            .eq('id', classId);
        if (error) throw error;
        return true;
    },

    // --- STUDENT MANAGEMENT ---
    async getOrCreateStudent(username, pin, teacherId) {
        if (!this.client) return null;
        try {
            // Check for existing
            const { data, error } = await this.client
                .from('students')
                .select('*')
                .eq('username', username)
                .eq('pin', pin)
                .eq('teacher_id', teacherId)
                .maybeSingle();

            if (error) throw error;
            if (data) return data;

            // Create new
            const { data: newData, error: createError } = await this.client
                .from('students')
                .insert([{ username, pin, teacher_id: teacherId, joined_codes: [] }])
                .select()
                .single();

            if (createError) throw createError;
            return newData;
        } catch (e) {
            console.error("Supabase Bridge [getOrCreateStudent] Error:", e);
            throw e;
        }
    },

    async isTeacherValid(teacherId) {
        // NOTE: Since students are scoped by teacher_id anyway, we allow any teacher code.
        // The system prevents username collisions across different teachers' "universes".
        // A stricter check (e.g., requiring teacher to have classes) can be re-enabled later.
        if (!this.client) return false;
        if (!teacherId || teacherId.trim() === '') return false;
        return true; // Allow any non-empty teacher code
    },

    async updateStudentJoinedCodes(studentId, codes) {
        if (!this.client) return false;
        const { error } = await this.client
            .from('students')
            .update({ joined_codes: codes })
            .eq('id', studentId);
        if (error) throw error;
        return true;
    },

    async fetchStudentsInClass(classCode) {
        if (!this.client) return [];
        try {
            // Use textSearch with array contains for compatibility with different column types
            // First, try to get all students and filter client-side (safer for mixed types)
            const { data, error } = await this.client
                .from('students')
                .select('*')
                .order('username', { ascending: true });

            if (error) throw error;

            // Filter client-side to handle both JSONB arrays and text arrays
            return (data || []).filter(s => {
                const codes = s.joined_codes;
                if (Array.isArray(codes)) return codes.includes(classCode);
                if (typeof codes === 'string') {
                    try {
                        const parsed = JSON.parse(codes);
                        return Array.isArray(parsed) && parsed.includes(classCode);
                    } catch { return codes === classCode; }
                }
                return false;
            });
        } catch (e) {
            console.error("Supabase Bridge [fetchStudentsInClass] Error:", e);
            throw e;
        }
    },

    async updateStudentProfile(studentId, updates) {
        if (!this.client) return false;
        const { data, error } = await this.client
            .from('students')
            .update(updates)
            .eq('id', studentId)
            .select();
        if (error) throw error;
        return data;
    },

    async removeStudentFromClass(studentId, classCode) {
        if (!this.client) return false;
        try {
            // Fetch current codes
            const { data, error } = await this.client
                .from('students')
                .select('joined_codes')
                .eq('id', studentId)
                .single();

            if (error) throw error;

            const newCodes = (data.joined_codes || []).filter(c => c !== classCode);
            return await this.updateStudentJoinedCodes(studentId, newCodes);
        } catch (e) {
            console.error("Supabase Bridge [removeStudentFromClass] Error:", e);
            throw e;
        }
    }
};
