const MODEL_NAME = "openai/gpt-oss-120b";

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
        const systemPrompt = `You are the Chief of Staff. A junior advisor named ${studentName} is explaining their graphing decisions. 
        Be professional but firm. If their explanation is logical and uses correct economic reasoning (like the Law of Demand or Supply), praise them by name and tell them to proceed. 
        If it's wrong or too brief, correct them by name and ask them to try explaining again. 
        Return your response in JSON format: { "passed": boolean, "feedback": "your message" }`;

        const prompt = `Advisor ${studentName} just ${actionDescription}. Their explanation: "${studentExplanation}". Is this correct? Provide feedback.`;

        try {
            const data = await API.fetchAI(MODEL_NAME, [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ]);

            if (data && data.choices && data.choices[0]) {
                const content = data.choices[0].message.content;
                // Attempt to parse JSON from the AI response
                try {
                    const start = content.indexOf('{');
                    const end = content.lastIndexOf('}') + 1;
                    return JSON.parse(content.substring(start, end));
                } catch (e) {
                    // Fallback if AI doesn't return perfect JSON
                    return { passed: true, feedback: content };
                }
            }
            return { passed: true, feedback: "I'll let you proceed for now, Advisor." };
        } catch (error) {
            console.error("AI Socratic Error:", error);
            return { passed: true, feedback: "Error connecting to HQ. Proceed." };
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
