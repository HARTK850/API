import { SYSTEM_CONSTANTS, AppConfig } from './config.js';
import { GeminiAIService } from './gemini.js';
import { YemotTextProcessor, YemotCompiler } from './yemot.js';
import { GlobalStatsManager, UserRepository, NoticeBoardManager, SharedChatsManager } from './redis.js';

export class DomainControllers {
    static async handleMainMenu(phone, choice, comp) {
        if (choice === '0') comp.requestDigits(SYSTEM_CONSTANTS.PROMPTS.INFO_MENU, SYSTEM_CONSTANTS.STATE_BASES.INFO_MENU_CHOICE, 1, 1, 'no');
        else if (choice === '1') {
            await GlobalStatsManager.recordEvent(phone);
            const p = await UserRepository.getProfile(phone);
            p.currentChatId = `chat_${Date.now()}`;
            p.chats.push({ id: p.currentChatId, messages:[] });
            await UserRepository.saveProfile(phone, p);
            comp.record(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO);
        }
        else if (choice === '2') await this.initHistory(phone, comp);
        else if (choice === '9') {
            if (phone === AppConfig.adminBypassPhone) this.serveAdmin(comp);
            else comp.requestDigits(SYSTEM_CONSTANTS.PROMPTS.ADMIN_AUTH, SYSTEM_CONSTANTS.STATE_BASES.ADMIN_AUTH, 8, 8);
        }
        else { comp.play(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE); this.serveMainMenu(comp); }
    }

    static serveMainMenu(comp) { comp.requestDigits(SYSTEM_CONSTANTS.PROMPTS.MAIN_MENU, SYSTEM_CONSTANTS.STATE_BASES.MAIN_MENU_CHOICE, 1, 1, 'no'); }
    static serveAdmin(comp) { comp.requestDigits(SYSTEM_CONSTANTS.PROMPTS.ADMIN_MENU, SYSTEM_CONSTANTS.STATE_BASES.ADMIN_MENU, 1, 1); }

    static async handleAdmin(choice, phone, comp) {
        if (choice === '1') {
            const stats = await GlobalStatsManager.getStats();
            comp.play(`t-נפתחו ${stats.totalSessions} שיחות. ויש ${stats.uniquePhones?.length || 0} משתמשים.`);
            this.serveAdmin(comp);
        } else if (choice === '3') {
            const stats = await GlobalStatsManager.getStats();
            const profile = await UserRepository.getProfile(phone);
            profile.adminListIndex = 0;
            profile.adminUsersList = stats.uniquePhones ||[];
            await UserRepository.saveProfile(phone, profile);
            await this.serveAdminList(phone, comp);
        } else if (choice === '4') {
            let s = "t-סטטוס מפתחות היום. ";
            const today = new Date().toISOString().split('T')[0];
            for (let k of AppConfig.geminiKeys) {
                const uses = await RedisService.get(`gemini_usage:${k.slice(-4)}:${today}`) || 0;
                s += `מפתח מסתיים ב ${k.slice(-4)} ביצע ${uses} מתוך 500 קריאות. `;
            }
            comp.play(s); this.serveAdmin(comp);
        } else { this.serveMainMenu(comp); }
    }

    static async serveAdminList(phone, comp) {
        const p = await UserRepository.getProfile(phone);
        const target = p.adminUsersList[p.adminListIndex];
        if (!target) { comp.play(SYSTEM_CONSTANTS.PROMPTS.ADMIN_LIST_END); return this.serveAdmin(comp); }
        comp.play(`d-${target}`).requestDigits(SYSTEM_CONSTANTS.PROMPTS.ADMIN_LIST_MENU, SYSTEM_CONSTANTS.STATE_BASES.ADMIN_LIST_USERS, 1, 1, 'no');
    }

    static async processChat(phone, base64Audio, comp) {
        const p = await UserRepository.getProfile(phone);
        const res = await GeminiAIService.processChatInteraction(base64Audio, p);
        
        let chat = p.chats.find(c => c.id === p.currentChatId);
        chat.messages.push({ q: res.transcription || "שאלה", a: res.answer, game: res.game });
        
        if (res.action === 'play_game' && res.game) {
            p.activeGame = { chatId: chat.id, msgIdx: chat.messages.length-1, qIdx: 0, score: 0 };
            await UserRepository.saveProfile(phone, p);
            return this.playGame(phone, comp, p);
        }
        
        await this.initPagination(phone, res.answer, comp, res.notice_phone_context);
    }

    static async playGame(phone, comp, profile) {
        const game = profile.activeGame;
        const chat = profile.chats.find(c => c.id === game.chatId);
        const qData = chat.messages[game.msgIdx].game.questions[game.qIdx];
        
        let p = game.qIdx === 0 ? SYSTEM_CONSTANTS.PROMPTS.GAME_START + "." : "";
        p += SYSTEM_CONSTANTS.PROMPTS.GAME_QUESTION + ".t-" + qData.q + ".";
        qData.options.forEach((opt, i) => { p += `${SYSTEM_CONSTANTS.PROMPTS.GAME_ANS_PREFIX}${i+1}.t-${opt}.`; });
        p += SYSTEM_CONSTANTS.PROMPTS.GAME_PROMPT_DIGIT;
        
        await UserRepository.saveProfile(phone, profile);
        comp.requestDigits(p, SYSTEM_CONSTANTS.STATE_BASES.GAME_ANSWER_INPUT, 1, 1, 'yes');
    }

    static async handleGameAns(phone, digit, comp) {
        const p = await UserRepository.getProfile(phone);
        const game = p.activeGame;
        const chat = p.chats.find(c => c.id === game.chatId);
        const gameObj = chat.messages[game.msgIdx].game;
        
        if (parseInt(digit) === gameObj.questions[game.qIdx].correct_index) {
            game.score++;
            comp.play(SYSTEM_CONSTANTS.PROMPTS.GAME_CORRECT);
        } else { comp.play(SYSTEM_CONSTANTS.PROMPTS.GAME_WRONG); }
        
        game.qIdx++;
        if (game.qIdx >= gameObj.questions.length) {
            comp.play(SYSTEM_CONSTANTS.PROMPTS.GAME_END_SCORE).play(`d-${game.score}`).play(SYSTEM_CONSTANTS.PROMPTS.GAME_AWESOME);
            p.activeGame = null;
            await UserRepository.saveProfile(phone, p);
            comp.record(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO);
        } else {
            await this.playGame(phone, comp, p);
        }
    }

    static async initPagination(phone, text, comp, phoneToCall) {
        const p = await UserRepository.getProfile(phone);
        const chunks = YemotTextProcessor.paginate(text);
        p.pagination = { chunks, idx: 0, phoneToCall };
        await UserRepository.saveProfile(phone, p);
        this.servePagination(p.pagination, comp);
    }

    static servePagination(pag, comp) {
        let p = pag.chunks[pag.idx] + ".";
        const isLast = pag.idx >= pag.chunks.length - 1;
        p += isLast ? SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU : SYSTEM_CONSTANTS.PROMPTS.CHAT_PAGINATION_MENU;
        let blockAst = 'yes';
        if (pag.phoneToCall && pag.phoneToCall.length >= 9) {
            p = "t-לחיוג חינם למפרסם המודעה הקישו כוכבית בכל עת." + p;
            blockAst = 'no';
        }
        comp.requestDigits(p, isLast ? SYSTEM_CONSTANTS.STATE_BASES.CHAT_ACTION_CHOICE : SYSTEM_CONSTANTS.STATE_BASES.PAGINATION_CHOICE, 1, 1, blockAst);
    }
}
