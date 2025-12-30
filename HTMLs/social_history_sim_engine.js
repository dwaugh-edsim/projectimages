/**
 * SocialHistorySim Engine
 * 
 * Handles state management, context injection, and the JSON handshake 
 * for the "Social History" simulation model.
 */

const SocialHistorySim = {
    // Current user state
    state: {
        health: 100,
        morale: 100,
        trust: 50, // For civilian scenarios
        inventory: ["Basic Kit"],
        history: [] // Narrative log
    },

    // Current historical backbone (The Moving Walkway)
    currentHistoricalContext: {
        date: "January 30, 1968",
        event: "The Tet Offensive begins; Saigon is in chaos.",
        goal: "Survive the night while protecting your moral integrity."
    },

    // To be set during initialization
    systemPrompt: "",

    /**
     * Initializes the simulation with a specific context and prompt.
     */
    init(context, prompt) {
        if (context) this.currentHistoricalContext = context;
        if (prompt) this.systemPrompt = prompt;
        console.log("[SIM] Initialized with goal:", this.currentHistoricalContext.goal);
    },

    /**
     * Sends the student's action to the LLM and processes the results.
     */
    async processTurn(studentInput) {
        console.log("[SIM] Processing student action:", studentInput);

        // Fallback if no prompt set
        const system = this.systemPrompt || "You are a social history educator. Roleplay the past. Return JSON.";

        // Wrap the student input with historical context and GOAL (Context Injection)
        const userPrompt = `
CURRENT CONTEXT:
- Date: ${this.currentHistoricalContext.date}
- Fixed Event: ${this.currentHistoricalContext.event}
- PRIMARY GOAL: ${this.currentHistoricalContext.goal}

USER CURRENT STATUS:
- Health: ${this.state.health}
- Morale: ${this.state.morale}
- Trust: ${this.state.trust}
- Inventory: ${this.state.inventory.join(", ")}

STUDENT ACTION:
"${studentInput}"

REMINDER: Return ONLY a valid JSON object as per instructions.
`;

        try {
            const rawResponse = await this.callOpenRouter(system, userPrompt);
            const data = typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse;

            // Apply consequences to internal state
            this.updateState(data);

            console.log("[SIM] Turn processed successfully:", data);
            return data;
        } catch (err) {
            console.error("[SIM] Error processing turn:", err);
            throw err;
        }
    },

    /**
     * Updates internal state based on LLM JSON response.
     */
    updateState(data) {
        if (data.status_updates) {
            this.state.health = Math.max(0, Math.min(100, this.state.health + (data.status_updates.health || 0)));
            this.state.morale = Math.max(0, Math.min(100, this.state.morale + (data.status_updates.morale || 0)));
            if (data.status_updates.trust) {
                this.state.trust = Math.max(0, Math.min(100, this.state.trust + data.status_updates.trust));
            }
        }

        if (data.inventory_updates && Array.isArray(data.inventory_updates)) {
            data.inventory_updates.forEach(item => {
                if (item.startsWith("+")) {
                    this.state.inventory.push(item.substring(1).trim());
                } else if (item.startsWith("-")) {
                    const itemName = item.substring(1).trim();
                    const index = this.state.inventory.indexOf(itemName);
                    if (index > -1) this.state.inventory.splice(index, 1);
                }
            });
        }
    },

    /**
     * Mocks the call to OpenRouter / local API.
     * In simroom_LIVE.html, this will hook into requestAIFeedback.
     */
    async callOpenRouter(system, user) {
        // This is a placeholder for the fetch logic in simroom_LIVE.html
        const TARGET_URL = 'https://nextjs-basic-lemon-one.vercel.app/api/chat';

        const response = await fetch(TARGET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system: system,
                message: user
            })
        });

        const data = await response.json();
        return data.reply || data.choices[0].message.content;
    }
};
