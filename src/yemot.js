import { AppConfig, SYSTEM_CONSTANTS } from './config.js';
import { YemotTextProcessor } from './utils.js';

export class YemotAPIService {
    static async downloadAudioAsBase64(rawFilePath) {
        const fullPath = rawFilePath.startsWith('ivr2:') ? rawFilePath : `ivr2:${rawFilePath}`;
        const url = `https://www.call2all.co.il/ym/api/DownloadFile?token=${AppConfig.yemotToken}&path=${encodeURIComponent(fullPath)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        return Buffer.from(buffer).toString('base64');
    }
}

export class YemotResponseCompiler {
    constructor() { 
        this.chain =[]; 
        this.readCommand = null;
        this.routeCommand = null;
    }
    
    _processPrompt(prompt) {
        if (!prompt) return null;
        if (prompt.startsWith('f-') || prompt.startsWith('d-') || prompt.startsWith('m-')) return prompt; 
        let textToProcess = prompt.startsWith('t-') ? prompt.substring(2) : prompt;
        return YemotTextProcessor.formatForChainedTTS(textToProcess);
    }

    playChainedTTS(prompt) {
        const processed = this._processPrompt(prompt);
        if (processed) this.chain.push(processed);
        return this;
    }
    
    requestDigits(prompt, baseVar, min = 1, max = 1, blockAsterisk = 'yes') {
        const processed = this._processPrompt(prompt);
        if (processed) this.chain.push(processed);
        const promptString = this.chain.join('.');
        this.readCommand = `read=${promptString}=${baseVar}_${Date.now()},no,${max},${min},7,No,${blockAsterisk},no`;
        return this;
    }
    
    requestHebrewKeyboard(prompt, baseVar) {
        const processed = this._processPrompt(prompt);
        if (processed) this.chain.push(processed);
        const promptString = this.chain.join('.');
        this.readCommand = `read=${promptString}=${baseVar}_${Date.now()},no,100,2,40,HebrewKeyboard,yes,no`;
        return this;
    }

    requestAudioRecord(prompt, baseVar, callId) {
        const processed = this._processPrompt(prompt);
        if (processed) this.chain.push(processed);
        const promptString = this.chain.join('.');
        const fileName = `rec_${callId}_${Date.now()}`;
        this.readCommand = `read=${promptString}=${baseVar}_${Date.now()},no,record,/ApiRecords,${fileName},no,yes,no,1,120`;
        return this;
    }
    
    routeToFolder(folder) {
        this.routeCommand = `go_to_folder=${folder}`;
        return this;
    }

    compile() {
        if (this.readCommand) return this.readCommand; 
        let res =[];
        if (this.chain.length > 0) res.push(`id_list_message=${this.chain.join('.')}`);
        if (this.routeCommand) res.push(this.routeCommand);
        if (res.length === 0) return "go_to_folder=hangup";
        return res.join('&');
    }
}
