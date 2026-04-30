export const config = { runtime: 'edge' };

import { SYSTEM_CONSTANTS } from './config.js';
import { YemotAPIService } from './gemini.js';
import { YemotCompiler } from './yemot.js';
import { DomainControllers } from './controllers.js';

export default async function handler(req) {
    const comp = new YemotCompiler();
    try {
        const url = new URL(req.url);
        let rawBody = {};
        if (req.method === 'POST') {
            const text = await req.text();
            try { rawBody = Object.fromEntries(new URLSearchParams(text)); } catch(e){}
        }
        const query = { ...Object.fromEntries(url.searchParams.entries()), ...rawBody };
        const phone = query.ApiPhone || 'Unknown';
        const callId = query.ApiCallId || 'sim';
        const isHangup = query.hangup === 'yes';

        let tBase = null, tVal = null, highTs = 0;
        for (const [k, v] of Object.entries(query)) {
            if (k.startsWith('State_')) {
                const parts = k.split('_');
                const ts = parseInt(parts.pop(), 10);
                if (!isNaN(ts) && ts > highTs) {
                    highTs = ts;
                    tBase = parts.join('_');
                    tVal = decodeURIComponent(Array.isArray(v) ? v[v.length-1] : v);
                }
            }
        }

        if (isHangup) return new Response("noop=hangup", { status: 200 });

        // Goal 4: Intercept digits during Audio Record state!
        if (tBase === SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO && tVal && !tVal.includes('.wav')) {
            if (tVal === '8') { tBase = SYSTEM_CONSTANTS.STATE_BASES.CHAT_ACTION_CHOICE; tVal = '8'; }
            else if (tVal === '7') { tBase = SYSTEM_CONSTANTS.STATE_BASES.CHAT_ACTION_CHOICE; tVal = '7'; }
        }

        if (tBase === SYSTEM_CONSTANTS.STATE_BASES.MAIN_MENU_CHOICE) await DomainControllers.handleMainMenu(phone, callId, tVal, comp);
        else if (tBase === SYSTEM_CONSTANTS.STATE_BASES.INFO_MENU_CHOICE) await DomainControllers.handleInfoMenu(phone, tVal, comp);
        else if (tBase === SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO) {
            const b64 = await YemotAPIService.downloadAudioAsBase64(tVal);
            await DomainControllers.processChat(phone, b64, comp);
        }
        else if (tBase === SYSTEM_CONSTANTS.STATE_BASES.PAGINATION_CHOICE || tBase === SYSTEM_CONSTANTS.STATE_BASES.CHAT_ACTION_CHOICE) {
            if (tVal === '*') await DomainControllers.handlePaginationNavigation(phone, '*', callId, comp);
            else if (tVal === '1' || tVal === '7') comp.record(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO);
            else if (tVal === '8' || tVal === '0') DomainControllers.serveMainMenu(comp);
            else await DomainControllers.handlePaginationNavigation(phone, tVal, callId, comp);
        }
        else if (tBase === SYSTEM_CONSTANTS.STATE_BASES.GAME_ANSWER_INPUT) await DomainControllers.handleGameAns(phone, tVal, comp);
        else if (tBase === SYSTEM_CONSTANTS.STATE_BASES.ADMIN_MENU) await DomainControllers.handleAdmin(tVal, phone, comp);
        else DomainControllers.serveMainMenu(comp);

        return new Response(comp.compile(), { status: 200, headers: {'Content-Type': 'text/plain; charset=utf-8'} });
    } catch (e) {
        comp.play("t-אירעה שגיאה. נסו שוב.").route("hangup");
        return new Response(comp.compile(), { status: 200 });
    }
}
