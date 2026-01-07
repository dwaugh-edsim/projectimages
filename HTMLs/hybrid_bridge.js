/**
 * HYBRID BRIDGE v1.0
 * 
 * Transition layer for the Sovereign Teacher architecture.
 * - READS missions from Supabase (content stays centralized).
 * - WRITES student data to Google Sheets (data stays with the teacher).
 * 
 * Usage:
 *   HybridBridge.init(SUPABASE_URL, SUPABASE_KEY, SHEET_SCRIPT_URL);
 *   await HybridBridge.fetchMissions(teacherId);
 *   await HybridBridge.logDecision({...});
 */

const HybridBridge = {
    // Supabase client (for reads)
    supabase: null,

    // Google Apps Script URL (for writes)
    sheetScriptUrl: null,

    /**
     * Initialize the bridge with both backends.
     * @param {string} supabaseUrl - Supabase project URL
     * @param {string} supabaseKey - Supabase anon key
     * @param {string} sheetScriptUrl - Deployed Google Apps Script URL
     */
    init(supabaseUrl, supabaseKey, sheetScriptUrl) {
        // Initialize Supabase client
        if (window.supabase && supabaseUrl && supabaseKey) {
            this.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
            console.log("HYBRID_BRIDGE: Supabase connected (read).");
        } else {
            console.warn("HYBRID_BRIDGE: Supabase not initialized. Mission reads will fail.");
        }

        // Store Sheet Script URL
        if (sheetScriptUrl) {
            this.sheetScriptUrl = sheetScriptUrl;
            console.log("HYBRID_BRIDGE: Google Sheet connected (write).");
        } else {
            console.warn("HYBRID_BRIDGE: No Sheet Script URL. Writes will fail.");
        }
    },

    // =========================================
    // READ OPERATIONS (Supabase)
    // =========================================

    /**
     * Fetch missions from Supabase for a given teacher.
     */
    async fetchMissions(teacherId) {
        if (!this.supabase) throw new Error("Supabase not initialized.");

        const { data, error } = await this.supabase
            .from('missions')
            .select('mission_id, mission_name, thumb_url, payload')
            .eq('teacher_id', teacherId);

        if (error) throw error;

        return (data || []).map(m => ({
            id: m.mission_id,
            name: m.mission_name,
            thumb: m.thumb_url,
            payload: m.payload
        }));
    },

    /**
     * Fetch a single mission by ID.
     */
    async fetchMission(missionId, teacherId) {
        if (!this.supabase) throw new Error("Supabase not initialized.");

        const { data, error } = await this.supabase
            .from('missions')
            .select('*')
            .eq('mission_id', missionId)
            .eq('teacher_id', teacherId)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Fetch classes by passcodes.
     */
    async fetchClassesByCodes(codes) {
        if (!this.supabase) throw new Error("Supabase not initialized.");

        const { data, error } = await this.supabase
            .from('classes')
            .select('*')
            .in('passcode', codes);

        if (error) throw error;
        return data || [];
    },

    /**
     * Fetch a class by passcode.
     */
    async fetchClassByCode(code) {
        if (!this.supabase) throw new Error("Supabase not initialized.");

        const { data, error } = await this.supabase
            .from('classes')
            .select('*')
            .eq('passcode', code)
            .single();

        if (error) throw error;
        return data;
    },

    // =========================================
    // WRITE OPERATIONS (Google Sheet)
    // =========================================

    /**
     * Log a student decision to Google Sheets.
     */
    async logDecision(logData) {
        if (!this.sheetScriptUrl) {
            console.warn("HYBRID_BRIDGE: No Sheet URL. Logging skipped.");
            return { success: false, reason: "no_sheet" };
        }

        const payload = {
            action: 'log_decision',
            payload: {
                timestamp: new Date().toISOString(),
                studentId: logData.studentName || logData.studentId || 'ANON',
                missionId: logData.missionId,
                stepIndex: logData.stepIndex,
                decision: logData.decision,
                rationale: logData.rationale || ''
            }
        };

        return this._postToSheet(payload);
    },

    /**
     * Request AI (Devil's Advocate) via the teacher's Sheet backend.
     */
    async requestAI(prompt, context) {
        if (!this.sheetScriptUrl) {
            return { ai_active: false, response: "AI Offline: No Sheet connection." };
        }

        const payload = {
            action: 'ai_proxy',
            payload: { prompt, context }
        };

        try {
            const res = await this._postToSheet(payload);
            return res.success ? res.data : { ai_active: false, response: res.error };
        } catch (e) {
            return { ai_active: false, response: "AI Error: " + e.message };
        }
    },

    // =========================================
    // INTERNAL HELPERS
    // =========================================

    async _postToSheet(data) {
        try {
            const res = await fetch(this.sheetScriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(data)
            });
            return await res.json();
        } catch (e) {
            console.error("HYBRID_BRIDGE: Sheet POST failed", e);
            return { success: false, error: e.message };
        }
    }
};
