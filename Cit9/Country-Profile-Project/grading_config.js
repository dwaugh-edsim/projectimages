// Grading Dashboard Configuration
// Edit this file to reuse the grading dashboard for other assignments or courses.

const gradingConfig = {
    // Basic Course and Assignment Info
    courseName: "Citizenship 9",
    assignmentName: "Country Profile Project",
    
    // Google Apps Script Web App URL for Sheets integration
    // Replace this string with your deployed Web App URL
    gasUrl: "https://script.google.com/macros/s/AKfycbxbSHTsBbUD1bB9zI7iyRxsgDOlCzvedisgJDeQYSDLaFVGN99Oa_vB8ne3y3q4Dx4M/exec",
    
    // Rubric criteria definition (1-4 scale)
    // You can add or remove items here. They will render dynamically in the dashboard.
    rubric: [
        { 
            key: "intro", 
            name: "1. Introduction & Issue", 
            description: "Country and global issue are clearly introduced with relevant background information." 
        },
        { 
            key: "actions", 
            name: "2. Actions & Evidence", 
            description: "Thorough analysis of how the country has responded (or not) with factual evidence." 
        },
        { 
            key: "consequences", 
            name: "3. Consequences", 
            description: "Details intended vs unintended outcomes AND short-term vs long-term consequences." 
        },
        { 
            key: "canada", 
            name: "4. Canada Comparison", 
            description: "Meaningful comparison between the selected country's response and Canada's actions." 
        },
        { 
            key: "reflection", 
            name: "5. Reflection", 
            description: "Clear, thoughtful explanation of why Canadians should care about this global issue." 
        }
    ],
    
    // Checklist items (Yes/No flags)
    checklist: [
        { 
            key: "citations", 
            name: "2+ Credible Sources per Slide",
            feedbackActive: "Your citations are well-researched and formatted correctly at the bottom of the slides.",
            feedbackInactive: "Ensure you have at least 2 credible sources cited in proper APA format at the bottom of each slide."
        },
        { 
            key: "visuals", 
            name: "Concise Language & Visuals",
            feedbackActive: "Slides are clean, visually engaging, and use bullet points instead of dense paragraphs.",
            feedbackInactive: "Clean up slide text. Avoid giant paragraphs; use concise bullet points and add more relevant images/graphs."
        }
    ]
};
