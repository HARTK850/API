import { AppConfig, SYSTEM_CONSTANTS } from './config.js';
import { Logger, GeminiAPIError } from './utils.js';
import { redis } from './redis.js';
import { NoticeBoardManager } from './db.js';

export class GeminiAIService {
    
    static async getNextValidKey(todayDate) {
        for (const key of AppConfig.geminiKeys) {
            const shortKey = key.slice(-4);
            const isExhausted = redis ? await redis.get(`gemini_exhausted:${todayDate}:${shortKey}`) : false;
            if (!isExhausted) return key;
        }
        return null; // All keys exhausted
    }

    static async executeGeminiRequest(payload, chatSession = null) {
        const today = new Date().toISOString().split('T')[0];
        let lastError = null;

        for (let i = 0; i < AppConfig.geminiKeys.length; i++) {
            const apiKey = await this.getNextValidKey(today);
            if (!apiKey) throw new GeminiAPIError("כל המפתחות חסומים להיום.");

            const shortKey = apiKey.slice(-4);
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${SYSTEM_CONSTANTS.MODELS.PRIMARY_GEMINI_MODEL}:generateContent?key=${apiKey}`;
                const response = await fetch(url, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    if (response.status === 429) {
                        Logger.warn("GeminiAPI", `Key ${shortKey} rate limited (429). Marking exhausted.`);
                        if (redis) await redis.set(`gemini_exhausted:${today}:${shortKey}`, "true", { ex: 86400 });
                        continue; 
                    }
                    throw new Error(`HTTP ${response.status} - ${await response.text()}`);
                }
                
                if (redis) await redis.incr(`gemini_usage:${today}:${shortKey}`);
                const data = await response.json();
                
                const functionCall = data.candidates?.[0]?.content?.parts?.[0]?.functionCall;
                if (functionCall && functionCall.name === "query_long_term_memory") {
                    Logger.info("GeminiAPI", "Executing Tool: query_long_term_memory");
                    const query = functionCall.args.search_query || "";
                    let foundText = "לא נמצא מידע מתאים בהיסטוריה.";
                    
                    if (chatSession && chatSession.messages) {
                        const matches = chatSession.messages.filter(m => m.q.includes(query) || m.a.includes(query)).slice(-5);
                        if (matches.length > 0) foundText = matches.map(m => `שאלה: ${m.q}\nתשובה: ${m.a}`).join("\n");
                    }
                    
                    payload.contents.push({ role: "model", parts: [{ functionCall }] });
                    payload.contents.push({ role: "user", parts:[{ functionResponse: { name: functionCall.name, response: { result: foundText } } }] });
                    
                    // Recursive call to resolve tool
                    return await this.executeGeminiRequest(payload, chatSession);
                }

                if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    return data.candidates[0].content.parts[0].text;
                }
                throw new Error("Empty AI response.");
            } catch (error) { 
                lastError = error;
                Logger.warn("GeminiAPI", `Key ${shortKey} failed: ${error.message}`); 
            }
        }
        throw new GeminiAPIError(lastError ? lastError.message : "Limits reached.");
    }

    static async processTranscriptionOnly(base64Audio) {
        const payload = {
            contents: [{ role: "user", parts:[{ text: "תמלל את האודיו הבא במדויק לעברית:" }, { inlineData: { mimeType: "audio/wav", data: base64Audio } }] }],
            generationConfig: { temperature: 0.1 }
        };
        const text = await this.executeGeminiRequest(payload);
        return text || "לא זוהה דיבור";
    }

    static async generateTopic(text) {
        const payload = {
            contents: [{ role: "user", parts:[{ text: `תן כותרת של 2 מילים (ללא מרכאות/אמוג'י) לנושא: ${text.substring(0, 500)}` }] }],
            generationConfig: { temperature: 0.3 }
        };
        const topic = await this.executeGeminiRequest(payload);
        return topic.replace(/[a-zA-Z"'*#\n\r]/g, '').trim() || "שיחה כללית";
    }

    static async processChatInteraction(base64Audio, profile, yemotDateContext) {
        const transcriptText = await this.processTranscriptionOnly(base64Audio);
        const notices = await NoticeBoardManager.getNotices();
        let boardText = notices.length > 0 ? "\n[לוח מודעות]:\n" + notices.map((n, i) => `מודעה ${i+1}: ${n.text}`).join('\n') : "";
        
        let systemInstructions = SYSTEM_CONSTANTS.PROMPTS.GEMINI_SYSTEM_INSTRUCTION_CHAT;
        systemInstructions += `\n[הנחיות]: רמת פירוט: ${profile.aiDetailLevel}. פרופיל: ${profile.personalProfile}\n${boardText}`;

        let chatSession = profile.chats.find(c => c.id === profile.currentChatId);
        let historyContext = chatSession?.messages?.slice(-1).map(msg => ({
            role: "user", parts:[{ text: `שאלה קודמת:\n${msg.q}\nתשובה קודמת: ${msg.a}`}]
        })) ||[];

        const payload = {
            systemInstruction: { parts: [{ text: systemInstructions }] },
            tools: [{
                functionDeclarations:[{
                    name: "query_long_term_memory",
                    description: "Search the conversation history for past details if the user refers to past context.",
                    parameters: {
                        type: "OBJECT", properties: { search_query: { type: "STRING" } }, required:["search_query"]
                    }
                }]
            }],
            contents: [...historyContext, { role: "user", parts:[{ inlineData: { mimeType: "audio/wav", data: base64Audio } }] }],
            generationConfig: { temperature: 0.7, responseMimeType: "application/json" }
        };

        const rawJson = await this.executeGeminiRequest(payload, chatSession);
        let cleanJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
        
        try {
            return JSON.parse(cleanJson);
        } catch (jsonErr) {
            return { transcription: transcriptText, answer: cleanJson, action: "none" };
        }
    }
}
