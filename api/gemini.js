import { SYSTEM_CONSTANTS, AppConfig } from './config.js';
import { RedisService } from './redis.js';

export class GeminiAIService {
    static async getNextGeminiKey() {
        const keys = AppConfig.geminiKeys;
        if (keys.length === 0) throw new Error("No Gemini API keys.");
        const idx = await RedisService.incr('gemini_key_rotation_index') || Math.floor(Math.random() * keys.length);
        return keys[idx % keys.length];
    }

    static async trackKeyUsage(apiKey) {
        const shortKey = apiKey.slice(-4);
        const today = new Date().toISOString().split('T')[0];
        const redisKey = `gemini_usage:${shortKey}:${today}`;
        const count = await RedisService.incr(redisKey);
        if (count === 1) await RedisService.expire(redisKey, 86400); // 24 hours
        return count;
    }

    static async callGemini(payload, profile = null) {
        const keysCount = AppConfig.geminiKeys.length;
        for (let i = 0; i < keysCount; i++) {
            const apiKey = await this.getNextGeminiKey();
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${SYSTEM_CONSTANTS.MODELS.PRIMARY_GEMINI_MODEL}:generateContent?key=${apiKey}`;
                const response = await fetch(url, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                });
                
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                await this.trackKeyUsage(apiKey);
                const data = await response.json();
                
                // Function Calling Execution (Goal 1b)
                if (data.candidates?.[0]?.content?.parts?.[0]?.functionCall) {
                    const funcCall = data.candidates[0].content.parts[0].functionCall;
                    if (funcCall.name === "query_long_term_memory" && profile) {
                        const query = funcCall.args.search_query;
                        let searchResult = "לא נמצא מידע בהיסטוריה.";
                        const chatSession = profile.chats.find(c => c.id === profile.currentChatId);
                        if (chatSession && chatSession.messages) {
                            const found = chatSession.messages.find(m => m.q.includes(query) || m.a.includes(query));
                            if (found) searchResult = `נמצא בזיכרון: שאלת בעבר: "${found.q}", התשובה הייתה: "${found.a}".`;
                        }
                        
                        payload.contents.push(data.candidates[0].content); // Add AI function call request
                        payload.contents.push({
                            role: "function",
                            parts:[{ functionResponse: { name: "query_long_term_memory", response: { result: searchResult } } }]
                        });
                        return await this.callGemini(payload); // Recursive call with function response
                    }
                }

                if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    return data.candidates[0].content.parts[0].text;
                }
                throw new Error("Empty AI response.");
            } catch (error) { 
                await new Promise(resolve => setTimeout(resolve, 1000)); // Anti-Throttling Delay!
            }
        }
        return `{"answer": "מערכת הבינה המלאכותית עמוסה כעת. אנא נסו שוב בעוד מספר דקות.", "action": "none"}`;
    }

    static async processChatInteraction(base64Audio, profile) {
        const tools = [{
            functionDeclarations:[{
                name: "query_long_term_memory",
                description: "חפש בהיסטוריית השיחה הנוכחית של המשתמש מידע שנאמר בעבר.",
                parameters: { type: "OBJECT", properties: { search_query: { type: "STRING" } }, required: ["search_query"] }
            }]
        }];

        const payload = {
            systemInstruction: { parts:[{ text: SYSTEM_CONSTANTS.PROMPTS.GEMINI_SYSTEM_INSTRUCTION }] },
            tools: tools,
            contents:[
                { role: "user", parts:[{ inlineData: { mimeType: "audio/wav", data: base64Audio } }] }
            ],
            generationConfig: { temperature: 0.7, responseMimeType: "application/json" }
        };

        const rawJson = await this.callGemini(payload, profile);
        let cleanJson = rawJson.trim().replace(/^```json/, '').replace(/```$/, '').trim();
        try { return JSON.parse(cleanJson); } 
        catch (e) { return { answer: "אירעה שגיאה בחיבור, נסה שוב.", action: "none" }; }
    }
}
