import { SYSTEM_CONSTANTS } from './config.js';

export class YemotTextProcessor {
    static sanitize(text) {
        if (!text) return "טקסט ריק";
        let cl = text.replace(/[.,\-=&^#!?:;()[\]{}]/g, ' '); 
        cl = cl.replace(/[\u{1F600}-\u{1F6FF}]/gu, ''); 
        cl = cl.replace(/[a-zA-Z]/g, ''); // מסיר כל אות באנגלית!
        return cl.replace(/\s{2,}/g, ' ').trim() || "טקסט ריק";
    }

    static formatForChainedTTS(text) {
        if (!text) return "t-טקסט ריק";
        let cl = this.sanitize(text);
        const parts = cl.split(/[\n\r]+/);
        const valid = parts.map(p => p.trim()).filter(p => p.length > 0);
        return valid.length === 0 ? "t-טקסט ריק" : "t-" + valid.join('.t-');
    }

    static paginate(text, maxLength = 800) {
        if (!text) return["טקסט ריק"];
        const words = text.split(/\s+/);
        const chunks =[];
        let curr = '';
        for (const w of words) {
            if ((curr.length + w.length + 1) > maxLength) {
                if (curr.length > 0) chunks.push(curr.trim());
                curr = w; 
            } else { curr += (curr.length > 0 ? ' ' : '') + w; }
        }
        if (curr.length > 0) chunks.push(curr.trim());
        return chunks;
    }
}

export class YemotCompiler {
    constructor() { this.chain =[]; this.command = null; }
    
    play(prompt) {
        if (prompt.startsWith('t-')) this.chain.push(YemotTextProcessor.formatForChainedTTS(prompt.substring(2)));
        else this.chain.push(prompt);
        return this;
    }
    
    read(prompt, baseVar, min=1, max=1, blockAsterisk='yes') {
        this.play(prompt);
        const pStr = this.chain.join('.');
        this.command = `read=${pStr}=${baseVar}_${Date.now()},no,${max},${min},7,No,${blockAsterisk},no`;
        return this;
    }

    record(prompt, baseVar) {
        this.play(prompt);
        const pStr = this.chain.join('.');
        this.command = `read=${pStr}=${baseVar}_${Date.now()},no,record,/ApiRecords,rec_${Date.now()},no,yes,no,1,120`;
        return this;
    }
    
    route(folder) { this.command = `go_to_folder=${folder}`; return this; }
    nitoviya(phone) { this.command = `type=nitoviya&nitoviya_dial_to=${phone}`; return this; }
    
    compile() {
        if (this.command) return this.command; 
        if (this.chain.length > 0) return `id_list_message=${this.chain.join('.')}`;
        return "go_to_folder=hangup";
    }
}
