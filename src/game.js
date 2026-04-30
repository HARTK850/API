import { SYSTEM_CONSTANTS } from './config.js';
import { UserRepository } from './db.js';

export class GameEngine {
    static async startGame(phone, callId, ivrCompiler, profile) {
        const game = profile.activeGame;
        const chat = profile.chats.find(c => c.id === game.chatId);
        const gameData = chat?.messages?.[game.msgIndex]?.game;
        
        if (!gameData || !gameData.questions) {
            profile.activeGame = null;
            await UserRepository.saveProfile(phone, profile);
            return ivrCompiler.playChainedTTS("t-שגיאה בטעינת המשחק").routeToFolder("hangup");
        }
        
        // Robust array parsing
        const questions = Array.isArray(gameData.questions) ? gameData.questions : Object.values(gameData.questions);
        if (questions.length === 0) return ivrCompiler.playChainedTTS("t-אין שאלות").routeToFolder("hangup");

        if (game.qIndex === 0) ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.GAME_START);
        
        await this.serveNextQuestion(phone, callId, ivrCompiler, profile, game, questions);
    }

    static async serveNextQuestion(phone, callId, ivrCompiler, profile, game, questions) {
        const q = questions[game.qIndex];
        ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.GAME_QUESTION);
        ivrCompiler.playChainedTTS(`t-${q.q}`); 
        
        let options = Array.isArray(q.options) ? q.options : Object.values(q.options || {});
        let chainedPrompt =[];
        options.forEach((opt, idx) => {
            chainedPrompt.push(SYSTEM_CONSTANTS.PROMPTS.GAME_ANS_PREFIX + (idx + 1)); 
            chainedPrompt.push(`t-${opt}`);
        });
        
        chainedPrompt.push(SYSTEM_CONSTANTS.PROMPTS.GAME_PROMPT_DIGIT); 
        chainedPrompt.push(SYSTEM_CONSTANTS.PROMPTS.GAME_CLOCK); 

        await UserRepository.saveProfile(phone, profile);
        ivrCompiler.requestDigits(chainedPrompt.join('.'), SYSTEM_CONSTANTS.STATE_BASES.GAME_ANSWER_INPUT, 1, 1, 'yes');
    }

    static async processGameAnswer(phone, callId, answerDigit, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        const game = profile.activeGame;
        if (!game) return ivrCompiler.routeToFolder("hangup");

        const chat = profile.chats.find(c => c.id === game.chatId);
        const questions = chat.messages[game.msgIndex].game.questions;
        const currentQ = Array.isArray(questions) ? questions[game.qIndex] : Object.values(questions)[game.qIndex];

        if (parseInt(answerDigit, 10) === currentQ.correct_index) {
            game.score++;
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.GAME_CORRECT).playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.GAME_GET_POINT).playChainedTTS("d-1").playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.GAME_POINT_WORD); 
        } else {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.GAME_WRONG); 
        }

        game.qIndex++;
        if (game.qIndex >= (Array.isArray(questions) ? questions.length : Object.keys(questions).length)) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.GAME_END_SCORE).playChainedTTS(`d-${game.score}`).playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.GAME_AWESOME); 
            profile.activeGame = null;
            await UserRepository.saveProfile(phone, profile);
            return ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, callId);
        } else {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.GAME_NEXT_Q);
            await this.serveNextQuestion(phone, callId, ivrCompiler, profile, game, Array.isArray(questions) ? questions : Object.values(questions));
        }
    }
}
