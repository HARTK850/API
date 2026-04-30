export const config = { runtime: 'edge' };

import { SYSTEM_CONSTANTS } from '../src/config.js';
import { YemotResponseCompiler } from '../src/yemot.js';
import { DomainControllers } from '../src/controllers.js';
import { GameEngine } from '../src/game.js';
import { GeminiAIService } from '../src/gemini.js';

export default async function handler(req) {
    const ivrCompiler = new YemotResponseCompiler();
    try {
        const url = new URL(req.url);
        let rawBody = {};
        if (req.method === 'POST') {
            const text = await req.text();
            rawBody = Object.fromEntries(new URLSearchParams(text));
        }
        const mergedQuery = { ...Object.fromEntries(url.searchParams.entries()), ...rawBody };
        const getParam = (key) => Array.isArray(mergedQuery[key]) ? mergedQuery[key].pop() : mergedQuery[key];

        const phone = getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.PHONE) || 'unknown';
        const callId = getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.CALL_ID) || 'sim';
        const isHangup = getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.HANGUP) === 'yes';

        let triggerBaseKey = null, triggerValue = null, highestTimestamp = 0;
        for (const [key, val] of Object.entries(mergedQuery)) {
            if (key.startsWith('State_')) {
                const parts = key.split('_');
                const ts = parseInt(parts.pop(), 10);
                if (!isNaN(ts) && ts > highestTimestamp) {
                    highestTimestamp = ts;
                    triggerBaseKey = parts.join('_');
                    triggerValue = decodeURIComponent(Array.isArray(val) ? val.pop() : val);
                }
            }
        }

        if (isHangup && !triggerBaseKey) return new Response("noop", { status: 200 });

        // Dispatcher
        if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.MAIN_MENU_CHOICE) {
            await DomainControllers.handleMainMenu(phone, callId, triggerValue, ivrCompiler);
        } else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO && triggerValue?.includes('.wav')) {
            await DomainControllers.processChatAudio(phone, callId, triggerValue, ivrCompiler, "today");
        } else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.ADMIN_MENU) {
            await DomainControllers.handleAdminMenu(triggerValue, phone, ivrCompiler);
        } else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.ADMIN_KEYS_MENU) {
            await DomainControllers.handleAdminKeysMenu(triggerValue, ivrCompiler);
        } else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.GAME_ANSWER_INPUT) {
            await GameEngine.processGameAnswer(phone, callId, triggerValue, ivrCompiler);
        } else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_MENU_CHOICE && triggerValue === '2') {
            ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.SETTINGS_INSTRUCTIONS_RECORD, SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_INSTRUCTIONS_AUDIO, callId);
        } else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_INSTRUCTIONS_AUDIO && triggerValue?.includes('.wav')) {
            // Fix for point 4 - processTranscriptionOnly added!
            const b64 = await import('../src/yemot.js').then(m => m.YemotAPIService.downloadAudioAsBase64(triggerValue));
            const text = await GeminiAIService.processTranscriptionOnly(b64);
            ivrCompiler.playChainedTTS(`t-הגדרת בהצלחה את התוכן: ${text}`);
            DomainControllers.serveMainMenu(phone, ivrCompiler);
        } else {
            DomainControllers.serveMainMenu(phone, ivrCompiler);
        }

        return new Response(ivrCompiler.compile(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

    } catch (e) {
        ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.SYSTEM_ERROR_FALLBACK).routeToFolder("hangup");
        return new Response(ivrCompiler.compile(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
}
