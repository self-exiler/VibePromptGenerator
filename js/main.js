// State Management
let currentModuleId = null;
let activePhraseTarget = null; // 'front' or 'back' (for current module)

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initGeneratorTab();
    initLangTab();
    initPhrasesTab();
    initDataTab(); // New
    loadDraft();
    
    // Auto-save listeners
    document.querySelectorAll('#tab-content-generator input, #tab-content-generator textarea, #tab-content-generator select').forEach(el => {
        el.addEventListener('input', saveDraftState);
        el.addEventListener('change', saveDraftState);
    });
});

function switchMainTab(tabName) {
    // Hide all contents
    ['generator', 'langs', 'phrases', 'data'].forEach(t => {
        document.getElementById(`tab-content-${t}`).classList.add('hidden');
        document.getElementById(`tab-btn-${t}`).classList.remove('tab-active', 'border-b-2');
        document.getElementById(`tab-btn-${t}`).classList.add('tab-inactive', 'border-transparent');
    });

    // Show active
    document.getElementById(`tab-content-${tabName}`).classList.remove('hidden');
    const btn = document.getElementById(`tab-btn-${tabName}`);
    btn.classList.add('tab-active', 'border-b-2');
    btn.classList.remove('tab-inactive', 'border-transparent');

    // Refresh data if switching to generator
    if (tabName === 'generator') {
        refreshGeneratorDropdowns();
    }
    // Refresh stats if switching to data
    if (tabName === 'data') {
        updateStats();
    }
}

// --- Generator Tab Logic ---

function initGeneratorTab() {
    refreshGeneratorDropdowns();
    
    // Arch & Env options
    const archSelect = document.getElementById('select-arch');
    store.getArchitectures().forEach(opt => {
        const el = document.createElement('option');
        el.value = opt;
        el.textContent = opt;
        archSelect.appendChild(el);
    });

    const envSelect = document.getElementById('select-env');
    store.getEnvironments().forEach(opt => {
        const el = document.createElement('option');
        el.value = opt;
        el.textContent = opt;
        envSelect.appendChild(el);
    });

    // Language Change Listener -> Update Wheels
    document.getElementById('select-lang').addEventListener('change', (e) => {
        renderWheels(e.target.value);
    });
}

function refreshGeneratorDropdowns() {
    const langSelect = document.getElementById('select-lang');
    const currentVal = langSelect.value;
    langSelect.innerHTML = '<option value="">请选择语言</option>';
    
    store.getLanguages().forEach(lang => {
        const opt = document.createElement('option');
        opt.value = lang.id;
        opt.textContent = lang.name;
        langSelect.appendChild(opt);
    });
    
    if (currentVal) langSelect.value = currentVal;
}

function renderWheels(langId) {
    const container = document.getElementById('wheels-container');
    container.innerHTML = '';
    
    if (!langId) {
        container.innerHTML = '<span class="text-gray-400 text-sm col-span-full">请先选择开发语言</span>';
        return;
    }

    const lang = store.getLanguages().find(l => l.id === langId);
    if (!lang || !lang.wheels) return;

    lang.wheels.forEach(wheel => {
        const wrapper = document.createElement('label');
        wrapper.className = 'inline-flex items-center space-x-2 cursor-pointer bg-white p-2 rounded shadow-sm border border-gray-100 hover:bg-gray-50';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = wheel;
        checkbox.className = 'form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500';
        // Check draft logic later
        
        const text = document.createElement('span');
        text.textContent = wheel;
        text.className = 'text-sm text-gray-700';

        wrapper.appendChild(checkbox);
        wrapper.appendChild(text);
        container.appendChild(wrapper);
    });
}

// --- Module Management ---

let modules = [];

function renderModuleTabs() {
    const nav = document.getElementById('module-tabs-header');
    nav.innerHTML = '';

    modules.forEach((mod, index) => {
        const btn = document.createElement('button');
        const isActive = mod.id === currentModuleId;
        
        btn.className = isActive 
            ? 'group inline-flex items-center px-4 py-2 border-b-2 border-blue-500 font-medium text-sm text-blue-600 bg-blue-50 rounded-t-md'
            : 'group inline-flex items-center px-4 py-2 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300';
            
        btn.innerHTML = `<span class="truncate max-w-[100px]">${mod.name || '未命名模块'}</span>`;
        btn.onclick = () => switchModule(mod.id);
        nav.appendChild(btn);
    });
}

function switchModule(id) {
    // Save current fields to memory before switching
    if (currentModuleId) {
        const curr = modules.find(m => m.id === currentModuleId);
        if (curr) {
            curr.name = document.getElementById('module-name').value;
            curr.front = document.getElementById('module-front').value;
            curr.back = document.getElementById('module-back').value;
        }
    }

    currentModuleId = id;
    const nextMod = modules.find(m => m.id === id);
    if (nextMod) {
        document.getElementById('module-name').value = nextMod.name;
        document.getElementById('module-front').value = nextMod.front;
        document.getElementById('module-back').value = nextMod.back;
        renderModuleTabs();
    }
}

function addModule() {
    // Save current first
    if (currentModuleId) {
        const curr = modules.find(m => m.id === currentModuleId);
        if (curr) {
            curr.name = document.getElementById('module-name').value;
            curr.front = document.getElementById('module-front').value;
            curr.back = document.getElementById('module-back').value;
        }
    }

    const newId = Date.now();
    modules.push({
        id: newId,
        name: `模块 ${modules.length + 1}`,
        front: '',
        back: ''
    });
    switchModule(newId);
    saveDraftState();
}

function removeCurrentModule() {
    if (modules.length <= 1) {
        alert("至少保留一个模块");
        return;
    }
    if (!confirm("确定删除当前模块？")) return;

    modules = modules.filter(m => m.id !== currentModuleId);
    switchModule(modules[0].id);
    saveDraftState();
}

// --- Phrase Modal Logic ---

function openPhraseModal(type) {
    activePhraseTarget = type; // 'frontend' or 'backend' matching the list keys, but UI calls 'frontend' -> input id 'module-front'
    const modal = document.getElementById('modal-phrases');
    const list = document.getElementById('modal-phrases-list');
    const title = document.getElementById('modal-phrases-title');
    
    title.textContent = type === 'frontend' ? '选择前端/上层常用语' : '选择后端/底层常用语';
    list.innerHTML = '';

    const phrases = store.getPhrases()[type] || [];
    phrases.forEach(p => {
        const div = document.createElement('div');
        div.className = "flex items-start";
        div.innerHTML = `
            <div class="flex items-center h-5">
                <input type="checkbox" value="${p}" class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded phrase-checkbox">
            </div>
            <div class="ml-3 text-sm">
                <label class="font-medium text-gray-700">${p}</label>
            </div>
        `;
        list.appendChild(div);
    });

    modal.classList.remove('hidden');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function insertSelectedPhrases() {
    const checkboxes = document.querySelectorAll('.phrase-checkbox:checked');
    const selected = Array.from(checkboxes).map(c => c.value);
    
    if (selected.length > 0) {
        const targetId = activePhraseTarget === 'frontend' ? 'module-front' : 'module-back';
        const textarea = document.getElementById(targetId);
        const currentVal = textarea.value;
        // Append with newlines
        const prefix = currentVal ? '\n' : '';
        textarea.value = currentVal + prefix + selected.map(s => `- ${s}`).join('\n');
        
        // Update current module memory immediately
        const curr = modules.find(m => m.id === currentModuleId);
        if (curr) {
            if (activePhraseTarget === 'frontend') curr.front = textarea.value;
            else curr.back = textarea.value;
        }
        saveDraftState();
    }
    closeModal('modal-phrases');
}

// --- Lang & Phrase Management (Tab 2 & 3) ---

function initLangTab() {
    renderLangList();
}

function renderLangList() {
    const container = document.getElementById('lang-list-container');
    container.innerHTML = '';
    
    store.getLanguages().forEach(lang => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-gray-50 p-4 rounded border border-gray-200";
        div.innerHTML = `
            <div>
                <h4 class="font-bold text-gray-900">${lang.name}</h4>
                <p class="text-sm text-gray-500 mt-1">${lang.wheels.join(', ')}</p>
            </div>
            <div class="flex space-x-2">
                <button onclick="openLangModal('${lang.id}')" class="text-blue-600 hover:text-blue-800 text-sm">编辑</button>
                <button onclick="deleteLang('${lang.id}')" class="text-red-600 hover:text-red-800 text-sm">删除</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// Alias for backward compatibility if needed, but fixing the call above is better
function editLang(id) {
    openLangModal(id);
}

function openLangModal(id = null) {
    const modal = document.getElementById('modal-lang');
    const nameInput = document.getElementById('lang-edit-name');
    const wheelsInput = document.getElementById('lang-edit-wheels');
    const idInput = document.getElementById('lang-edit-id');

    if (id) {
        const lang = store.getLanguages().find(l => l.id === id);
        nameInput.value = lang.name;
        wheelsInput.value = lang.wheels.join(', ');
        idInput.value = lang.id;
    } else {
        nameInput.value = '';
        wheelsInput.value = '';
        idInput.value = '';
    }
    modal.classList.remove('hidden');
}

function saveLanguage() {
    const id = document.getElementById('lang-edit-id').value;
    const name = document.getElementById('lang-edit-name').value;
    const wheelsStr = document.getElementById('lang-edit-wheels').value;
    
    if (!name) return alert('语言名称不能为空');

    const wheels = wheelsStr.split(/[,，]/).map(s => s.trim()).filter(s => s);
    const langs = store.getLanguages();

    if (id) {
        // Edit
        const idx = langs.findIndex(l => l.id === id);
        if (idx > -1) {
            langs[idx].name = name;
            langs[idx].wheels = wheels;
        }
    } else {
        // Add
        langs.push({
            id: 'lang_' + Date.now(),
            name: name,
            wheels: wheels
        });
    }

    store.saveLanguages(langs);
    renderLangList();
    closeModal('modal-lang');
    refreshGeneratorDropdowns(); // Update Tab 1
}

function deleteLang(id) {
    if (!confirm('确定删除该语言配置？')) return;
    const langs = store.getLanguages().filter(l => l.id !== id);
    store.saveLanguages(langs);
    renderLangList();
    refreshGeneratorDropdowns();
}

// Phrases CRUD
function initPhrasesTab() {
    renderPhrasesList();
}

function renderPhrasesList() {
    const data = store.getPhrases();
    
    ['frontend', 'backend'].forEach(type => {
        const list = document.getElementById(`phrases-list-${type}`);
        list.innerHTML = '';
        (data[type] || []).forEach((p, idx) => {
            const li = document.createElement('li');
            li.className = "py-3 flex justify-between items-center";
            li.innerHTML = `
                <span class="text-gray-700 text-sm">${p}</span>
                <button onclick="deletePhrase('${type}', ${idx})" class="text-red-500 hover:text-red-700">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
            `;
            list.appendChild(li);
        });
    });
}

function addPhrase(type) {
    const text = prompt("请输入新的常用语句：");
    if (text) {
        const data = store.getPhrases();
        if (!data[type]) data[type] = [];
        data[type].push(text);
        store.savePhrases(data);
        renderPhrasesList();
    }
}

function deletePhrase(type, index) {
    const data = store.getPhrases();
    data[type].splice(index, 1);
    store.savePhrases(data);
    renderPhrasesList();
}

// --- Data Management (New) ---

function initDataTab() {
    updateStats();
}

function updateStats() {
    const stats = store.getStats();
    const container = document.getElementById('stats-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="bg-blue-50 p-3 rounded text-center">
            <div class="text-2xl font-bold text-blue-600">${stats.langCount}</div>
            <div class="text-xs text-gray-500">语言配置</div>
        </div>
        <div class="bg-indigo-50 p-3 rounded text-center">
            <div class="text-2xl font-bold text-indigo-600">${stats.wheelCount}</div>
            <div class="text-xs text-gray-500">轮子/库</div>
        </div>
        <div class="bg-purple-50 p-3 rounded text-center">
            <div class="text-2xl font-bold text-purple-600">${stats.frontPhraseCount + stats.backPhraseCount}</div>
            <div class="text-xs text-gray-500">常用语条目</div>
        </div>
        <div class="bg-gray-50 p-3 rounded text-center">
            <div class="text-2xl font-bold text-gray-600">${stats.draftModules}</div>
            <div class="text-xs text-gray-500">当前模块</div>
        </div>
    `;
}

function exportData() {
    const data = store.getFullDump();
    // Format: VibePromptGenerator_备份_YYYYMMDD_HHMMSS.json
    const now = new Date();
    const dateStr = now.getFullYear() +
                    String(now.getMonth() + 1).padStart(2, '0') +
                    String(now.getDate()).padStart(2, '0') + '_' +
                    String(now.getHours()).padStart(2, '0') +
                    String(now.getMinutes()).padStart(2, '0') +
                    String(now.getSeconds()).padStart(2, '0');
    
    downloadFile(`VibePromptGenerator_备份_${dateStr}.json`, JSON.stringify(data, null, 2));
}

let pendingImportData = null;

function handleFileSelect(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const json = JSON.parse(e.target.result);
            // Basic validation
            if (!json.languages && !json.phrases && !json.draft) {
                throw new Error("Invalid data format");
            }
            
            pendingImportData = json;
            
            // Show preview
            document.getElementById('import-preview-area').classList.remove('hidden');
            document.getElementById('import-preview-text').textContent = JSON.stringify(json, null, 2);
        } catch (err) {
            alert("文件格式错误或数据无效，请确保是本工具导出的JSON文件。");
            console.error(err);
        }
    };
    reader.readAsText(file);
}

function confirmImport(mode) {
    if (!pendingImportData) return;
    
    if (store.restoreFullDump(pendingImportData, mode)) {
        alert("导入成功！");
        cancelImport();
        
        // Refresh all UIs
        loadDraft();
        renderLangList();
        renderPhrasesList();
        updateStats();
        refreshGeneratorDropdowns();
    } else {
        alert("导入失败，数据可能不完整");
    }
}

function cancelImport() {
    pendingImportData = null;
    document.getElementById('import-preview-area').classList.add('hidden');
    document.getElementById('import-file').value = '';
}

function resetToDefaults() {
    if (confirm("⚠️ 确定恢复默认配置？\n\n自定义的语言配置和常用语将被清除并重置为初始状态。当前草稿也会被重置。")) {
        store.clearAllData(); // clearAllData calls init() which restores defaults
        location.reload(); 
    }
}

function clearAllData() {
    if (confirm("🔥 严重警告：确定清空所有数据？\n\n这将永久删除所有本地存储的数据，包括语言配置、常用语和草稿！此操作不可撤销。")) {
        localStorage.clear();
        location.reload();
    }
}

// --- Auto Save & Draft ---

function saveDraftState() {
    // Collect current data
    const draft = {
        selectedLang: document.getElementById('select-lang').value,
        selectedWheels: Array.from(document.querySelectorAll('#wheels-container input:checked')).map(cb => cb.value),
        selectedArch: document.getElementById('select-arch').value,
        selectedEnv: document.getElementById('select-env').value,
        generalDesc: document.getElementById('general-desc').value,
        notes: document.getElementById('notes').value,
        modules: modules // modules array is kept updated by switchModule/add/remove
    };

    // Update current module text in array before saving (incase user is typing)
    if (currentModuleId) {
        const curr = draft.modules.find(m => m.id === currentModuleId);
        if (curr) {
            curr.name = document.getElementById('module-name').value;
            curr.front = document.getElementById('module-front').value;
            curr.back = document.getElementById('module-back').value;
        }
    }
    
    store.saveDraft(draft);
}

function loadDraft() {
    const draft = store.getDraft();
    
    // Restore UI
    document.getElementById('select-lang').value = draft.selectedLang || '';
    renderWheels(draft.selectedLang); // Render checkboxes first
    
    // Check checkboxes
    if (draft.selectedWheels) {
        setTimeout(() => { // slight delay to ensure DOM is ready
            draft.selectedWheels.forEach(val => {
                const cb = document.querySelector(`#wheels-container input[value="${val}"]`);
                if (cb) cb.checked = true;
            });
        }, 50);
    }

    document.getElementById('select-arch').value = draft.selectedArch || '';
    document.getElementById('select-env').value = draft.selectedEnv || '';
    document.getElementById('general-desc').value = draft.generalDesc || '';
    document.getElementById('notes').value = draft.notes || '';

    // Restore Modules
    modules = draft.modules || [];
    if (modules.length === 0) addModule();
    else switchModule(modules[0].id);
}

function resetAll() {
    if (confirm("确定重置当前草稿内容？")) {
        const clean = store.resetDraft();
        loadDraft();
    }
}

// --- Generate Logic ---

function generateMarkdown() {
    // Ensure current module data is saved
    if (currentModuleId) {
        const curr = modules.find(m => m.id === currentModuleId);
        if (curr) {
            curr.name = document.getElementById('module-name').value;
            curr.front = document.getElementById('module-front').value;
            curr.back = document.getElementById('module-back').value;
        }
    }

    const langSelect = document.getElementById('select-lang');
    const langName = langSelect.options[langSelect.selectedIndex]?.text || "未指定";
    const wheels = Array.from(document.querySelectorAll('#wheels-container input:checked')).map(cb => cb.value).join(', ') || "无";
    const arch = document.getElementById('select-arch').value || "未指定";
    const env = document.getElementById('select-env').value || "未指定";
    const desc = document.getElementById('general-desc').value || "无";
    const notes = document.getElementById('notes').value || "无";

    let md = `# 软件开发需求说明书

## 1. 项目概况
- **开发语言**: ${langName}
- **关键库/轮子**: ${wheels}
- **软件架构**: ${arch}
- **运行环境**: ${env}

## 2. 总体描述
${desc}

## 3. 模块详细需求
`;

    modules.forEach((mod, idx) => {
        md += `
### 3.${idx + 1} ${mod.name}
**前端/上层逻辑**:
${mod.front || '暂无'}

**后端/底层逻辑**:
${mod.back || '暂无'}
`;
    });

    md += `
## 4. 其他注意事项
${notes}
`;

    downloadFile('Prompt.md', md);
}

function downloadFile(filename, content) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}