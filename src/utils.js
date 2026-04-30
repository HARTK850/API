import { SYSTEM_CONSTANTS } from './config.js';

export class Logger {
    static getTimestamp() { return new Date().toISOString(); }
    static info(context, message) { console.log(`[INFO][${this.getTimestamp()}][${context}] ${message}`); }
    static warn(context, message) { console.warn(`[WARN][${this.getTimestamp()}][${context}] ${message}`); }
    static error(context, message, errorObj = null) {
        console.error(`[ERROR][${this.getTimestamp()}][${context}] ${message}`);
        if (errorObj) console.error(`[TRACE] ${errorObj.stack || errorObj.message || errorObj}`);
    }
}

export class AppError extends Error {
    constructor(message, statusCode = 500, errorCode = "APP_ERR") {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.errorCode = errorCode;
    }
}
export class GeminiAPIError extends AppError { constructor(msg) { super(`Gemini Error: ${msg}`, 502, "GEMINI_ERR"); } }

export class YemotTextProcessor {
    static applyPhonetics(text) { return text; /* Phonetics map omitted for brevity, add back if needed */ }

    static addSpaceBetweenNumbersAndLetters(text) {
        return text.replace(/([א-תa-zA-Z])(\d)/g, '$1 $2').replace(/(\d)([א-תa-zA-Z])/g, '$1 $2');
    }

    static sanitizeForReadPrompt(rawText) {
        if (!rawText || typeof rawText !== 'string') return "טקסט_ריק";
        let cleanText = this.applyPhonetics(rawText);
        cleanText = this.addSpaceBetweenNumbersAndLetters(cleanText);
        // Do NOT remove English letters. Just remove breaking punctuation!
        cleanText = cleanText.replace(/[.,\-=&^#!?:;()[\]{}]/g, ' '); 
        cleanText = cleanText.replace(/[\u{1F600}-\u{1F6FF}]/gu, ''); 
        cleanText = cleanText.replace(/[\n\r]/g, ' ');
        return cleanText.replace(/\s{2,}/g, ' ').trim() || "טקסט_ריק";
    }

    static formatForChainedTTS(text) {
        if (!text) return "t-טקסט_ריק";
        let cleanText = this.applyPhonetics(text);
        cleanText = this.addSpaceBetweenNumbersAndLetters(cleanText);
        cleanText = cleanText.replace(/[*#=&^\[\]{},]/g, ' '); 
        cleanText = cleanText.replace(/[\u{1F600}-\u{1F6FF}]/gu, '');
        cleanText = cleanText.replace(/"/g, ''); 
        const parts = cleanText.split(/[\n\r.]+/);
        const validParts = parts.map(p => p.trim()).filter(p => p.length > 0);
        if (validParts.length === 0) return "t-טקסט_ריק";
        return "t-" + validParts.join('.t-');
    }

    static paginateText(text, maxLength = SYSTEM_CONSTANTS.IVR_DEFAULTS.MAX_CHUNK_LENGTH) {
        if (!text) return["טקסט ריק"];
        const words = text.split(/[\s\n\r]+/);
        const chunks =[];
        let currentChunk = '';
        for (const word of words) {
            if ((currentChunk.length + word.length + 1) > maxLength) {
                if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
                currentChunk = word; 
            } else {
                currentChunk += (currentChunk.length > 0 ? ' ' : '') + word;
            }
        }
        if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
        return chunks.length > 0 ? chunks : ["טקסט ריק"];
    }
}
