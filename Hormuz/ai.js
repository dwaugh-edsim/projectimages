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
    }
};
