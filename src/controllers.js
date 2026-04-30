import { SYSTEM_CONSTANTS, AppConfig } from './config.js';
import { YemotTextProcessor } from './utils.js';
import { UserRepository, GlobalStatsManager, NoticeBoardManager, SharedChatsManager } from './db.js';
import { GeminiAIService } from './gemini.js';
import { YemotAPIService } from './yemot.js';
import { GameEngine } from './game.js';
import { redis } from './redis.js';

export class DomainControllers {
    static async serveMainMenu(phone, ivrCompiler) {
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.MAIN_MENU, SYSTEM_CONSTANTS.STATE_BASES.MAIN_MENU_CHOICE, 1, 1, 'no');
    }

    static async handleMainMenu(phone, callId, choice, ivrCompiler) {
        if (choice === '0') ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.INFO_MENU, SYSTEM_CONSTANTS.STATE_BASES.INFO_MENU_CHOICE, 1, 1, 'no');
        else if (choice === '1') {
            await GlobalStatsManager.recordEvent(phone, 'session');
            const profile = await UserRepository.getProfile(phone);
            const newChat = { id: `chat_${Date.now()}`, topic: "שיחה כללית", messages:[] };
            profile.chats.push(newChat);
            profile.currentChatId = newChat.id;
            await UserRepository.saveProfile(phone, profile);
            ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, callId);
        }
        else if (choice === '2') {
            const profile = await UserRepository.getProfile(phone);
            const chats = profile.chats ||[];
            if(chats.length === 0) {
                ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.NO_HISTORY);
                return this.serveMainMenu(phone, ivrCompiler);
            }
            let prompt = "t-היסטוריה. ";
            chats.forEach((c, i) => prompt += `לשיחה ${YemotTextProcessor.sanitizeForReadPrompt(c.topic)} הקישו ${i+1}. `);
            ivrCompiler.requestDigits(prompt, SYSTEM_CONSTANTS.STATE_BASES.CHAT_HISTORY_CHOICE, 1, 2, 'no');
        }
        else if (choice === '9') ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.ADMIN_AUTH, SYSTEM_CONSTANTS.STATE_BASES.ADMIN_AUTH, 8, 8);
        else if (choice === '*') {
            ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.SETTINGS_MENU, SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_MENU_CHOICE, 1, 1, 'no');
        }
        else this.serveMainMenu(phone, ivrCompiler);
    }

    // Admin Tools
    static async handleAdminMenu(choice, phone, ivrCompiler) {
        if (choice === '4') return this.serveAdminKeysMenu(ivrCompiler);
        this.serveMainMenu(phone, ivrCompiler);
    }

    static async serveAdminKeysMenu(ivrCompiler) {
        const today = new Date().toISOString().split('T')[0];
        let promptText = `t-ישנם ${AppConfig.geminiKeys.length} מפתחות. `;
        for(let i=0; i<AppConfig.geminiKeys.length; i++) {
            const shortKey = AppConfig.geminiKeys[i].slice(-4);
            const exhausted = redis ? await redis.get(`gemini_exhausted:${today}:${shortKey}`) : false;
            promptText += `למפתח המסתיים ב ${shortKey}, שהוא בסטטוס ${exhausted ? "חסום" : "פעיל"}, הקישו ${i+1}. `;
        }
        ivrCompiler.requestDigits(promptText, SYSTEM_CONSTANTS.STATE_BASES.ADMIN_KEYS_MENU, 1, 2, 'no');
    }

    static async handleAdminKeysMenu(choice, ivrCompiler) {
        const idx = parseInt(choice) - 1;
        if(idx >= 0 && idx < AppConfig.geminiKeys.length) {
            const shortKey = AppConfig.geminiKeys[idx].slice(-4);
            const today = new Date().toISOString().split('T')[0];
            const usage = redis ? (await redis.get(`gemini_usage:${today}:${shortKey}`) || 0) : 0;
            const exhausted = redis ? await redis.get(`gemini_exhausted:${today}:${shortKey}`) : false;
            ivrCompiler.playChainedTTS(`t-מפתח ${shortKey}. סטטוס: ${exhausted ? "חסום זמנית" : "פעיל"}. נוצלו ${usage} קריאות מתוך 500. יתאפס בחצות.`);
        }
        return this.serveAdminKeysMenu(ivrCompiler);
    }

    // Chat processing
    static async processChatAudio(phone, callId, audioPath, ivrCompiler, dateCtx) {
        try {
            const b64 = await YemotAPIService.downloadAudioAsBase64(audioPath);
            const profile = await UserRepository.getProfile(phone);
            const result = await GeminiAIService.processChatInteraction(b64, profile, dateCtx);
            
            const chatSession = profile.chats.find(c => c.id === profile.currentChatId);
            if(chatSession && !chatSession.messages) chatSession.messages =[];
            chatSession.messages.push({ q: result.transcription, a: result.answer, game: result.game });
            
            if(result.action === 'play_game' && result.game) {
                profile.activeGame = { chatId: profile.currentChatId, msgIndex: chatSession.messages.length - 1, qIndex: 0, score: 0 };
                await UserRepository.saveProfile(phone, profile);
                return GameEngine.startGame(phone, callId, ivrCompiler, profile);
            }

            await UserRepository.saveProfile(phone, profile);
            const chunks = YemotTextProcessor.paginateText(result.answer);
            profile.pagination = { chunks, currentIndex: 0 };
            await UserRepository.saveProfile(phone, profile);
            
            ivrCompiler.requestDigits(`t-${chunks[0]}. ${SYSTEM_CONSTANTS.PROMPTS.CHAT_PAGINATION_MENU}`, SYSTEM_CONSTANTS.STATE_BASES.PAGINATION_CHOICE, 1, 1, 'yes');
        } catch (e) {
            ivrCompiler.playChainedTTS("t-שגיאה בלתי צפויה. נסו שוב.");
            this.serveMainMenu(phone, ivrCompiler);
        }
    }
}
