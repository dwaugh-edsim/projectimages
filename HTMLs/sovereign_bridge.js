/**
 * SOVEREIGN BRIDGE v1.0
 * 
 * Replaces SupabaseBridge.js for the "Sovereign Teacher" architecture.
 * Communicates strictly with the teacher's own Google Apps Script deployment.
 */

const SovereignBridge = {
    scriptUrl: null,

    init(url) {
        if (!url) {
            console.warn("SOVEREIGN_BRIDGE: No Script URL provided.");
            return false;
        }
        this.scriptUrl = url;
        console.log("SOVEREIGN_BRIDGE: Connected to Teacher Node.");
        // Ping to verify
        this.ping();
        return true;
    },

    async ping() {
        try {
            const res = await fetch(this.scriptUrl);
            const data = await res.json();
            console.log("SOVEREIGN_BRIDGE: Status OK", data);
            return true;
        } catch (e) {
            console.error("SOVEREIGN_BRIDGE: Connection Failed", e);
            return false;
        }
    },

    // --- STUDENT OPERATIONS ---

    async logSubmission(logData) {
        if (!this.scriptUrl) return false;

        const payload = {
            action: 'log_decision',
            payload: {
                timestamp: new Date().toISOString(),
                studentId: logData.studentName || 'ANON',
                missionId: logData.missionId,
                stepIndex: logData.stepIndex,
                decision: logData.decision,
                rationale: logData.rationale || ''
            }
        };

        return this._post(payload);
    },

    async requestAI(prompt, context) {
        if (!this.scriptUrl) {
            return { ai_active: false, response: "AI Offline: No Bridge Connection." };
        }

        const payload = {
            action: 'ai_proxy',
            payload: {
                prompt: prompt,
                context: context
            }
        };

        try {
            const res = await this._post(payload);
            if (res.success) {
                return res.data; // { ai_active: true, response: "..." }
            } else {
                throw new Error(res.error);
            }
        } catch (e) {
            console.warn("SOVEREIGN_BRIDGE: AI Request Failed", e);
            return { ai_active: false, response: "AI unavailable. Please consult mission data." };
        }
    },

    // --- TEACHER OPERATIONS ---

    async fetchRoster() {
        if (!this.scriptUrl) return [];
        const payload = { action: 'get_roster', payload: {} };
        const res = await this._post(payload);
        return res.success ? res.data : [];
    },

    // --- INTERNAL HELPER ---

    async _post(data) {
        const check = await fetch(this.scriptUrl, {
            method: 'POST',
            body: JSON.stringify(data),
            mode: 'no-cors' // Google Apps Script quirk: often requires no-cors for simple logging, 
            // BUT 'no-cors' returns opaque response (cant read JSON).
            // For AI we need the response.
            // We must use standard CORS which GAS supports if `Content-Type` is text/plain (weirdly).
        });

        // GAS Web App CORS trick: Send as text/plain to avoid preflight issues sometimes, 
        // though modern GAS supports standard fetch well if the script is "Anyone, even anonymous" or "Anyone with Account".
        // Let's try standard JSON content type first.

        // REVISION: The standard way to POST to GAS with response is `redirect: follow`.

        return await fetch(this.scriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Avoids OPTIONS preflight annoyance
            body: JSON.stringify(data)
        }).then(r => r.json());
    }
};
