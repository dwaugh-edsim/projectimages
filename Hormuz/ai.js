const MODEL_NAME = "qwen/qwen3-235b-a22b-2507";

const AI = {
    async getResponse(prompt, systemPrompt = "You are the Chief of Staff for the Premier of Nova Scotia during a global energy crisis. Provide concise, expert, and constructive feedback.") {
        try {
            const messages = [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ];

            const data = await API.fetchAI(MODEL_NAME, messages);

            if (data && data.choices && data.choices[0]) {
                return data.choices[0].message.content;
            }
            return null;
        } catch (error) {
            console.error("AI Error:", error);
            return null;
        }
    },

    async getHint(errorType, stageDescription) {
        const prompt = `Student made an error during: ${stageDescription}. Error type: ${errorType}. Give a short, helpful hint (max 2 sentences) to guide them without giving the answer away directly. Be encouraging.`;
        return await this.getResponse(prompt, "You are a helpful high school economics tutor. Be concise.");
    },

    async reviewPolicy(studentAdvice, predictions) {
        const prompt = `As the Premier's Chief of Staff, review this advisor's briefing on the Strait of Hormuz crisis. 
        Predictions: ${predictions}
        Policy Advice: ${studentAdvice}
        Provide 2-3 sentences of feedback. Be professional. Mention one realistic economic consequence they might have missed or praise a specific good point.`;
        return await this.getResponse(prompt);
    },

    async verifyComprehension(studentName, actionDescription, studentExplanation) {
        const systemPrompt = `You are the Chief of Staff evaluating a junior advisor named ${studentName} on the topic: "${actionDescription}". 
        STRICT EVALUATION RULES: 
        1. Use simple language appropriate for a 16-year-old, but hold HIGH STANDARDS for understanding.
        2. PASS ("passed": true) ONLY if the student shows they understand the 'why' behind the concept — not just a keyword.
        3. FAIL ("passed": false) for: vague one-liners, answers that only restate a word from the question, random text, or no real causal reasoning.
        4. If they fail, ask ONE short Socratic question to nudge them toward the key reasoning. Do not give the answer.
        5. Keep all feedback to 2-3 short sentences maximum.
        Return ONLY strictly parseable JSON: { "passed": boolean, "feedback": "your message" }`;


        const prompt = `Advisor ${studentName}'s explanation: "${studentExplanation}". Provide feedback in JSON.`;

        try {
            const data = await API.fetchAI(MODEL_NAME, [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ]);

            if (data && data.choices && data.choices[0]) {
                const content = data.choices[0].message.content;
                try {
                    const start = content.indexOf('{');
                    const end = content.lastIndexOf('}') + 1;
                    return JSON.parse(content.substring(start, end));
                } catch (e) {
                    // Fallback if AI doesn't return perfect JSON: Do NOT let them pass automatically.
                    return { passed: false, feedback: "HQ could not parse your transmission format. Please provide a clearer economic explanation." };
                }
            }

            // If data is returned but it's an API error
            let errorMsg = "Unknown API connection error.";
            if (data && data.status === 'error') {
                errorMsg = data.message || "Backend error without specific message.";
            } else if (data && data.error && data.error.message) {
                errorMsg = data.error.message;
            }
            return { passed: false, feedback: `HQ COMMS DOWN. Reason: ${errorMsg}` };
        } catch (error) {
            console.error("AI Socratic Error:", error);
            return { passed: false, feedback: "Error connecting to HQ. Re-evaluate and try again." };
        }
    },

    async getGeneralGuidance(studentName, currentStage, studentMessage) {
        const systemPrompt = `You are the Chief of Staff. Advisor ${studentName} is confused and asking: "${studentMessage}". 
        They are currently on Stage ${currentStage} of the training. 
        Provide a concise, encouraging, and authoritative response that guides them back to the task. 
        Refer to them by name. If they are on Stage 0, explain Scarcity. If they are graphing, explain the Law of Demand/Supply. 
        Keep it under 3 sentences.`;

        return await this.getResponse(studentMessage, systemPrompt);
    }
};
