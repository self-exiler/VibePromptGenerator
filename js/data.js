// Default Data Configuration
const defaultData = {
    languages: [
        { 
            id: 'cpp', 
            name: 'C++', 
            wheels: ['Qt', 'Boost', 'OpenCV', 'Poco', 'FFmpeg', 'gRPC'] 
        },
        { 
            id: 'python', 
            name: 'Python', 
            wheels: ['Pandas', 'NumPy', 'FastAPI', 'Django', 'Flask', 'PyQt', 'TensorFlow', 'Scikit-learn'] 
        },
        { 
            id: 'csharp', 
            name: 'C#', 
            wheels: ['.NET Core', 'WPF', 'Entity Framework', 'Newtonsoft.Json', 'Serilog', 'SignalR'] 
        },
        { 
            id: 'js', 
            name: 'JavaScript/TypeScript', 
            wheels: ['React', 'Vue', 'Express', 'NestJS', 'TailwindCSS', 'Three.js'] 
        },
        { 
            id: 'java', 
            name: 'Java', 
            wheels: ['Spring Boot', 'MyBatis', 'Hibernate', 'Netty', 'Apache Commons'] 
        },
        {
            id: 'go',
            name: 'Go',
            wheels: ['Gin', 'Gorm', 'Viper', 'Zap', 'Cobra']
        }
    ],
    phrases: {
        frontend: [
            "界面响应式设计，适配不同分辨率",
            "支持深色模式/浅色模式切换",
            "交互操作需有明确的加载状态提示",
            "表单输入需包含完整的校验逻辑",
            "界面风格需符合Material Design规范",
            "关键操作需增加二次确认弹窗",
            "数据列表需支持分页、排序和筛选",
            "图表展示需支持动态数据更新"
        ],
        backend: [
            "API接口需遵循RESTful规范",
            "所有接口需包含统一的鉴权机制",
            "高并发场景下需通过Redis进行缓存",
            "数据库设计需满足第三范式",
            "关键业务日志需持久化存储",
            "接口响应时间需控制在200ms以内",
            "异常情况需返回统一的错误码结构",
            "敏感数据需加密存储"
        ]
    },
    architectures: [
        "B/S架构 (Browser/Server)",
        "C/S架构 (Client/Server)",
        "桌面应用程序 (Desktop App)",
        "命令行工具 (CLI)",
        "移动端App (Mobile App)",
        "微服务架构 (Microservices)",
        "嵌入式系统 (Embedded System)"
    ],
    environments: [
        "Linux (Bash)",
        "Windows (PowerShell)",
        "Windows (CMD)",
        "macOS (Zsh)",
        "Docker Container",
        "Kubernetes Cluster"
    ],
    // Draft content for auto-save
    draft: {
        selectedLang: "",
        selectedWheels: [],
        selectedArch: "",
        selectedEnv: "",
        generalDesc: "",
        modules: [
            { id: Date.now(), name: "核心模块", front: "", back: "" }
        ],
        notes: ""
    },
    // Network Config Defaults
    networkConfig: {
        url: "",
        strategy: "manual", // manual, network-first, local-first
        lastUpdated: null
    }
};

// Data Store Class
class DataStore {
    constructor() {
        this.init();
    }

    init() {
        if (!localStorage.getItem('vibe_config_langs')) {
            this.saveLanguages(defaultData.languages);
        }
        if (!localStorage.getItem('vibe_config_phrases')) {
            this.savePhrases(defaultData.phrases);
        }
        if (!localStorage.getItem('vibe_draft')) {
            this.saveDraft(defaultData.draft);
        }
        if (!localStorage.getItem('vibe_network_config')) {
            this.saveNetworkSettings(defaultData.networkConfig);
        }
    }

    // --- Network Config ---
    getNetworkSettings() {
        return JSON.parse(localStorage.getItem('vibe_network_config') || JSON.stringify(defaultData.networkConfig));
    }

    saveNetworkSettings(settings) {
        localStorage.setItem('vibe_network_config', JSON.stringify(settings));
    }

    async fetchNetworkConfig(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            // Validate basic structure
            if (!data.languages && !data.phrases) {
                throw new Error("Invalid config format: missing languages or phrases");
            }
            
            return data;
        } catch (error) {
            console.error("Network fetch failed:", error);
            throw error;
        }
    }

    // --- Defaults ---
    getDefaults() {
        return defaultData;
    }

    // --- Languages & Wheels ---
    getLanguages() {
        return JSON.parse(localStorage.getItem('vibe_config_langs') || '[]');
    }

    saveLanguages(data) {
        localStorage.setItem('vibe_config_langs', JSON.stringify(data));
    }

    // --- Phrases ---
    getPhrases() {
        return JSON.parse(localStorage.getItem('vibe_config_phrases') || '{}');
    }

    savePhrases(data) {
        localStorage.setItem('vibe_config_phrases', JSON.stringify(data));
    }

    // --- Constants ---
    getArchitectures() {
        return defaultData.architectures;
    }

    getEnvironments() {
        return defaultData.environments;
    }

    // --- Draft (Current Work) ---
    getDraft() {
        try {
            const draft = JSON.parse(localStorage.getItem('vibe_draft'));
            // Ensure basic structure exists if loaded from old version
            if (!draft || !draft.modules || draft.modules.length === 0) {
                // If corrupted or empty, re-init basic structure
                const newDraft = JSON.parse(JSON.stringify(defaultData.draft));
                newDraft.modules[0].id = Date.now();
                return newDraft;
            }
            return draft;
        } catch (e) {
            return defaultData.draft;
        }
    }

    saveDraft(data) {
        localStorage.setItem('vibe_draft', JSON.stringify(data));
    }
    
    resetDraft() {
        const cleanDraft = JSON.parse(JSON.stringify(defaultData.draft));
        // Give new ID to avoid conflict
        cleanDraft.modules[0].id = Date.now();
        this.saveDraft(cleanDraft);
        return cleanDraft;
    }

    // --- Data Management (New) ---

    getFullDump() {
        return {
            version: "1.0",
            timestamp: new Date().toISOString(),
            languages: this.getLanguages(),
            phrases: this.getPhrases(),
            draft: this.getDraft()
        };
    }

    restoreFullDump(data, mode = 'overwrite') {
        try {
            if (mode === 'overwrite') {
                if (data.languages) this.saveLanguages(data.languages);
                if (data.phrases) this.savePhrases(data.phrases);
                // We typically don't force restore draft unless user wants, but for full backup we do
                if (data.draft) this.saveDraft(data.draft);
            } else if (mode === 'merge') {
                // Merge Languages
                if (data.languages) {
                    const currentLangs = this.getLanguages();
                    data.languages.forEach(newLang => {
                        const existingIdx = currentLangs.findIndex(l => l.id === newLang.id);
                        if (existingIdx === -1) {
                            currentLangs.push(newLang);
                        } else {
                            // Optional: Merge wheels? For now, keep existing config to avoid conflict
                            // Or overwrite if name matches? Simpler to just add if ID different.
                            // If ID matches, we skip in merge mode to preserve local changes
                        }
                    });
                    this.saveLanguages(currentLangs);
                }

                // Merge Phrases
                if (data.phrases) {
                    const currentPhrases = this.getPhrases();
                    ['frontend', 'backend'].forEach(type => {
                        if (data.phrases[type]) {
                            if (!currentPhrases[type]) currentPhrases[type] = [];
                            const set = new Set(currentPhrases[type]);
                            data.phrases[type].forEach(p => set.add(p));
                            currentPhrases[type] = Array.from(set);
                        }
                    });
                    this.savePhrases(currentPhrases);
                }
            }
            return true;
        } catch (e) {
            console.error("Restore failed", e);
            return false;
        }
    }

    clearAllData() {
        localStorage.removeItem('vibe_config_langs');
        localStorage.removeItem('vibe_config_phrases');
        localStorage.removeItem('vibe_draft');
        // Re-init with defaults immediately to prevent crash
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

window.store = new DataStore();