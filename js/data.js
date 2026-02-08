// Storage Keys Constants
const STORAGE_KEYS = {
    LANGS: 'vibe_config_langs',
    PHRASES: 'vibe_config_phrases',
    DRAFT: 'vibe_draft',
    NETWORK_CONFIG: 'vibe_network_config'
};

const DEFAULT_DATA = {
    version: "1.2.0",
    languages: [],
    phrases: { frontend: [], backend: [] },
    architectures: [],
    environments: [],
    draft: {
        selectedLang: "",
        selectedWheels: [],
        selectedArch: "",
        selectedEnv: "",
        generalDesc: "",
        modules: [{ id: Date.now(), name: "核心模块", front: "", back: "" }],
        notes: ""
    },
    networkConfig: { url: "", strategy: "manual", lastUpdated: null }
};

const Utils = {
    isEmpty: (v) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0),
    debounce: (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    },
    generateId: () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    isValidUrl: (string) => {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
};

// Data Store Class
class DataStore {
    constructor() {
        this.defaultData = null;
        this.init();
    }

    async init() {
        try {
            // Load default data from data.yaml
            await this.loadDefaultData();

            // Initialize localStorage with defaults if empty
            if (!localStorage.getItem(STORAGE_KEYS.LANGS)) {
                this.saveLanguages(this.defaultData?.languages || []);
            }
            if (!localStorage.getItem(STORAGE_KEYS.PHRASES)) {
                this.savePhrases(this.defaultData?.phrases || { frontend: [], backend: [] });
            }
            if (!localStorage.getItem(STORAGE_KEYS.DRAFT)) {
                this.saveDraft(this.defaultData?.draft || DEFAULT_DATA.draft);
            }
        } catch (e) {
            console.error('DataStore initialization error:', e);
            // Fallback: ensure defaults exist
            this.defaultData = DEFAULT_DATA;
        }
    }

    async loadDefaultData() {
        const possiblePaths = [
            'data.yaml',
            './data.yaml',
            '/data.yaml'
        ];
        
        let lastError = null;
        
        for (const path of possiblePaths) {
            try {
                console.log(`Attempting to load data.yaml from: ${path}`);
                const response = await fetch(path);
                if (response.ok) {
                    const text = await response.text();
                    console.log(`Successfully loaded data.yaml from: ${path}`);
                    this.defaultData = this.parseYAML(text);
                    return;
                }
            } catch (e) {
                console.warn(`Failed to load from ${path}:`, e.message);
                lastError = e;
            }
        }
        
        console.error('Failed to load data.yaml from all paths, using fallback:', lastError);
        this.defaultData = DEFAULT_DATA;
    }

    parseYAML(yamlText) {
        const lines = yamlText.split('\n');
        const result = { version: '', languages: [], phrases: { frontend: [], backend: [] }, architectures: [], environments: [] };
        
        let currentSection = null;
        let currentLang = null;
        let currentList = null;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (!trimmed || trimmed.startsWith('#')) continue;
            
            if (trimmed.startsWith('version:')) {
                result.version = trimmed.split(':')[1].trim().replace(/"/g, '');
                continue;
            }
            
            if (trimmed.startsWith('languages:')) { currentSection = 'languages'; continue; }
            if (trimmed.startsWith('phrases:')) { currentSection = 'phrases'; continue; }
            if (trimmed.startsWith('architectures:')) { currentSection = 'architectures'; currentList = []; continue; }
            if (trimmed.startsWith('environments:')) { currentSection = 'environments'; currentList = []; continue; }
            
            const indent = line.search(/\S/);
            
            if (currentSection === 'languages') {
                if (indent === 2 && trimmed.startsWith('- id:')) {
                    if (currentLang) result.languages.push(currentLang);
                    currentLang = { id: trimmed.split(':')[1].trim(), name: '', wheels: [] };
                } else if (currentLang && indent === 4) {
                    if (trimmed.startsWith('name:')) currentLang.name = trimmed.split(':')[1].trim();
                } else if (currentLang && indent === 6 && trimmed.startsWith('-')) {
                    currentLang.wheels.push(trimmed.substring(2).trim());
                }
            } else if (currentSection === 'phrases') {
                if (indent === 2 && trimmed.startsWith('frontend:')) {
                    currentList = result.phrases.frontend;
                } else if (indent === 2 && trimmed.startsWith('backend:')) {
                    currentList = result.phrases.backend;
                } else if (indent === 4 && trimmed.startsWith('-')) {
                    currentList.push(trimmed.substring(2).trim());
                }
            } else if ((currentSection === 'architectures' || currentSection === 'environments') && trimmed.startsWith('-')) {
                currentList.push(trimmed.substring(2).trim());
            }
        }
        
        if (currentLang) result.languages.push(currentLang);
        if (currentSection === 'architectures') result.architectures = currentList;
        if (currentSection === 'environments') result.environments = currentList;
        
        return result;
    }

    toYAML(data) {
        const lines = [`version: "${data.version}"`, '', 'languages:'];
        
        data.languages?.forEach(lang => {
            lines.push(`  - id: ${lang.id}`, `    name: ${lang.name}`, '    wheels:');
            lang.wheels?.forEach(w => lines.push(`      - ${w}`));
        });
        
        lines.push('', 'phrases:', '  frontend:');
        data.phrases?.frontend?.forEach(p => lines.push(`    - ${p}`));
        lines.push('  backend:');
        data.phrases?.backend?.forEach(p => lines.push(`    - ${p}`));
        
        lines.push('', 'architectures:');
        data.architectures?.forEach(a => lines.push(`  - ${a}`));
        
        lines.push('', 'environments:');
        data.environments?.forEach(e => lines.push(`  - ${e}`));
        
        return lines.join('\n');
    }

    // --- Network Config ---
    getNetworkSettings() {
        const stored = localStorage.getItem(STORAGE_KEYS.NETWORK_CONFIG);
        return stored ? JSON.parse(stored) : this.defaultData.networkConfig;
    }

    saveNetworkSettings(settings) {
        localStorage.setItem(STORAGE_KEYS.NETWORK_CONFIG, JSON.stringify(settings));
    }

    async fetchNetworkConfig(url) {
        if (!Utils.isValidUrl(url)) {
            throw new Error('Invalid URL format');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
            console.log("Fetching config from:", url);
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { 'Accept': 'text/yaml, text/plain, application/yaml' },
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const text = await response.text();
            const data = this.parseYAML(text);
            
            // Validate basic structure
            if (!data.languages && !data.phrases) {
                throw new Error("Invalid config format: missing languages or phrases");
            }
            
            return data;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout (10s exceeded)');
            }
            console.error("Network fetch failed:", error);
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    // --- Defaults ---
    getDefaults() {
        return this.defaultData;
    }

    // --- Languages & Wheels ---
    getLanguages() {
        const stored = localStorage.getItem(STORAGE_KEYS.LANGS);
        return stored ? JSON.parse(stored) : [];
    }

    saveLanguages(data) {
        localStorage.setItem(STORAGE_KEYS.LANGS, JSON.stringify(data));
    }

    // --- Phrases ---
    getPhrases() {
        const stored = localStorage.getItem(STORAGE_KEYS.PHRASES);
        return stored ? JSON.parse(stored) : {};
    }

    savePhrases(data) {
        localStorage.setItem(STORAGE_KEYS.PHRASES, JSON.stringify(data));
    }

    // --- Constants ---
    getArchitectures() {
        return this.defaultData.architectures || [];
    }

    getEnvironments() {
        return this.defaultData.environments || [];
    }

    // --- Draft (Current Work) ---
    getDraft() {
        const stored = localStorage.getItem(STORAGE_KEYS.DRAFT);
        if (!stored) return this.defaultData.draft;

        const draft = JSON.parse(stored);
        if (!draft?.modules?.length) {
            const newDraft = JSON.parse(JSON.stringify(this.defaultData.draft));
            newDraft.modules[0].id = Utils.generateId();
            return newDraft;
        }
        return draft;
    }

    saveDraft(data) {
        localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(data));
    }
    
    resetDraft() {
        const cleanDraft = JSON.parse(JSON.stringify(this.defaultData.draft));
        cleanDraft.modules[0].id = Utils.generateId();
        this.saveDraft(cleanDraft);
        return cleanDraft;
    }

    // --- Data Management ---

    getFullDump() {
        return {
            version: this.defaultData.version,
            timestamp: new Date().toISOString(),
            languages: this.getLanguages(),
            phrases: this.getPhrases(),
            draft: this.getDraft(),
            networkConfig: this.getNetworkSettings()
        };
    }

    // mode: 'overwrite' | 'merge'
    restoreFullDump(data, mode = 'overwrite') {
        try {
            console.log(`Restoring data in ${mode} mode`, data);
            
            if (mode === 'overwrite') {
                if (data.languages) this.saveLanguages(data.languages);
                if (data.phrases) this.savePhrases(data.phrases);
                if (data.draft) this.saveDraft(data.draft);
            } else if (mode === 'merge') {
                this.mergeLanguages(data.languages);
                this.mergePhrases(data.phrases);
            }
            return true;
        } catch (e) {
            console.error("Restore failed", e);
            return false;
        }
    }

    mergeLanguages(newLangs) {
        if (!newLangs || !Array.isArray(newLangs)) return;
        
        const currentLangs = this.getLanguages();
        const langMap = new Map(currentLangs.map(l => [l.id, l]));
        let changed = false;

        newLangs.forEach(newLang => {
            if (!newLang.id) return;
            
            if (langMap.has(newLang.id)) {
                // Merge wheels
                const existing = langMap.get(newLang.id);
                if (newLang.wheels && Array.isArray(newLang.wheels)) {
                    const wheelSet = new Set(existing.wheels || []);
                    newLang.wheels.forEach(w => {
                        if (!wheelSet.has(w)) {
                            existing.wheels.push(w);
                            changed = true;
                        }
                    });
                }
            } else {
                // Add new language
                langMap.set(newLang.id, { ...newLang });
                changed = true;
            }
        });

        if (changed) {
            this.saveLanguages(Array.from(langMap.values()));
        }
    }

    mergePhrases(newPhrases) {
        if (!newPhrases) return;
        
        const currentPhrases = this.getPhrases();
        let changed = false;

        ['frontend', 'backend'].forEach(type => {
            if (newPhrases[type] && Array.isArray(newPhrases[type])) {
                if (!currentPhrases[type]) currentPhrases[type] = [];
                const set = new Set(currentPhrases[type]);
                newPhrases[type].forEach(p => {
                    if (!set.has(p)) {
                        set.add(p);
                        changed = true;
                    }
                });
                currentPhrases[type] = Array.from(set);
            }
        });

        if (changed) {
            this.savePhrases(currentPhrases);
        }
    }

    clearAllData() {
        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
        this.init();
    }

    getStats() {
        const langs = this.getLanguages();
        const phrases = this.getPhrases();
        const draft = this.getDraft();

        return {
            langCount: langs.length,
            wheelCount: langs.reduce((acc, l) => acc + (l.wheels ? l.wheels.length : 0), 0),
            frontPhraseCount: (phrases.frontend || []).length,
            backPhraseCount: (phrases.backend || []).length,
            draftModules: (draft.modules || []).length
        };
    }
}

// Initialize global store
window.store = new DataStore();