// ==================== State Management ====================
const state = {
    currentModuleId: null,
    activePhraseTarget: null,
    modules: [],
    pendingImportData: null
};

// ==================== Utility Functions ====================
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const Validator = {
    validateLanguageName: (name) => {
        const trimmed = (name || '').trim();
        if (!trimmed) return { valid: false, message: '语言名称不能为空' };
        return trimmed.length <= 50 ? { valid: true, value: trimmed } : { valid: false, message: '语言名称不能超过50个字符' };
    },
    validateUrl: (url) => {
        const trimmed = (url || '').trim();
        return trimmed && Utils.isValidUrl(trimmed) ? { valid: true, value: trimmed } : { valid: false, message: '请输入有效的 URL 格式' };
    },
    validateWheels: (wheelsStr) => {
        const wheels = (wheelsStr || '').split(/[,，]/).map(s => s.trim()).filter(s => s);
        return wheels.length && !wheels.some(w => w.length > 50) ? { valid: true, value: wheels } : { valid: false, message: wheels.length ? '轮子名称不能超过50个字符' : '请至少输入一个库/轮子' };
    }
};

// ==================== Toast Notification ====================
const Toast = {
    show(message, type = 'info') {
        const existing = $('.toast-container');
        const container = existing || document.createElement('div');
        
        if (!existing) {
            container.className = 'toast-container fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        toast.className = `${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3 animate-slideIn`;
        toast.innerHTML = `
            <i class="fas ${icons[type]}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('animate-slideOut');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// ==================== Modal ====================
const Modal = {
    open(id) { $(`#${id}`)?.classList.remove('hidden'); },
    close(id) { $(`#${id}`)?.classList.add('hidden'); },
    _create: (html) => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50';
        modal.innerHTML = html;
        document.body.appendChild(modal);
        return modal;
    },
    confirm(options) {
        return new Promise((resolve) => {
            const existing = $('#modal-confirm');
            if (existing) existing.remove();
            const html = `<div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"><div class="px-6 py-4 border-b border-gray-200"><h3 class="text-lg font-medium text-gray-900">${options.title || '确认操作'}</h3></div><div class="p-6"><p class="text-gray-700">${options.message}</p></div><div class="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3"><button id="modal-confirm-cancel" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">取消</button><button id="modal-confirm-ok" class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">确定</button></div></div>`;
            const modal = this._create(html);
            $('#modal-confirm-cancel').onclick = () => { modal.remove(); resolve(false); };
            $('#modal-confirm-ok').onclick = () => { modal.remove(); resolve(true); };
        });
    },
    prompt(options) {
        return new Promise((resolve) => {
            const existing = $('#modal-prompt');
            if (existing) existing.remove();
            const html = `<div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"><div class="px-6 py-4 border-b border-gray-200"><h3 class="text-lg font-medium text-gray-900">${options.title || '输入'}</h3></div><div class="p-6 space-y-4"><p class="text-gray-700">${options.message}</p><input type="text" id="modal-prompt-input" class="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" placeholder="${options.placeholder || ''}" value="${options.defaultValue || ''}"></div><div class="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3"><button id="modal-prompt-cancel" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">取消</button><button id="modal-prompt-ok" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">确定</button></div></div>`;
            const modal = this._create(html);
            const input = $('#modal-prompt-input');
            input.focus();
            $('#modal-prompt-cancel').onclick = () => { modal.remove(); resolve(null); };
            $('#modal-prompt-ok').onclick = () => { modal.remove(); resolve(input.value); };
            input.onkeydown = (e) => {
                if (e.key === 'Enter') $('#modal-prompt-ok').click();
                if (e.key === 'Escape') $('#modal-prompt-cancel').click();
            };
        });
    }
};

// ==================== Initialization ====================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Wait for store to be fully initialized
        await store.init();
        
        await initGeneratorTab();
        initLangTab();
        initPhrasesTab();
        initDataTab();
        loadDraft();
        
        // Auto-save listeners with debounce
        const debouncedSave = Utils.debounce(saveDraftState, 500);
        const inputs = $$('#tab-content-generator input, #tab-content-generator textarea, #tab-content-generator select');
        inputs.forEach(el => {
            el?.addEventListener?.('input', debouncedSave);
            el?.addEventListener?.('change', debouncedSave);
        });
    } catch (e) {
        console.error('Initialization error:', e);
        Toast.show('应用初始化失败，请刷新页面', 'error');
    }
});

// ==================== Tab Management ====================
function switchMainTab(tabName) {
    ['generator', 'langs', 'phrases', 'data'].forEach(t => {
        $(`#tab-content-${t}`).classList.toggle('hidden', t !== tabName);
        const btn = $(`#tab-btn-${t}`);
        if (t === tabName) {
            btn.classList.add('tab-active', 'border-b-2');
            btn.classList.remove('tab-inactive', 'border-transparent');
        } else {
            btn.classList.remove('tab-active', 'border-b-2');
            btn.classList.add('tab-inactive', 'border-transparent');
        }
    });
    if (tabName === 'generator') refreshGeneratorDropdowns();
    if (tabName === 'data') updateStats();
}

// Utility function to populate select dropdown
function populateSelect(selectEl, options, currentValue) {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    (options || []).forEach(opt => {
        const el = document.createElement('option');
        el.value = typeof opt === 'string' ? opt : opt.id || '';
        el.textContent = typeof opt === 'string' ? opt : opt.name || '';
        selectEl.appendChild(el);
    });
    if (currentValue) selectEl.value = currentValue;
}

// ==================== Generator Tab ====================
async function initGeneratorTab() {
    refreshGeneratorDropdowns();
    
    const archSelect = $('#select-arch');
    const envSelect = $('#select-env');
    
    populateSelect(archSelect, store?.getArchitectures?.() || []);
    populateSelect(envSelect, store?.getEnvironments?.() || []);

    const langSelect = $('#select-lang');
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            renderWheels(e.target.value);
        });
    }
}

function refreshGeneratorDropdowns() {
    const langSelect = $('#select-lang');
    if (!langSelect) return;
    
    const currentVal = langSelect.value;
    const languages = store?.getLanguages?.() || [];
    
    langSelect.innerHTML = '<option value="">请选择语言</option>';
    languages.forEach(lang => {
        const opt = document.createElement('option');
        opt.value = lang.id || '';
        opt.textContent = lang.name || '未命名';
        langSelect.appendChild(opt);
    });
    
    if (currentVal) langSelect.value = currentVal;
}

function renderWheels(langId) {
    const container = $('#wheels-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!langId) {
        container.innerHTML = '<span class="text-gray-400 text-sm col-span-full">请先选择开发语言</span>';
        return;
    }

    console.log('renderWheels called with langId:', langId);
    const languages = store?.getLanguages?.();
    console.log('Available languages:', languages);
    
    const lang = languages?.find(l => l.id === langId);
    console.log('Found language:', lang);
    
    if (!lang?.wheels?.length) {
        container.innerHTML = '<span class="text-gray-400 text-sm col-span-full">该语言无可用库/轮子</span>';
        return;
    }

    lang.wheels.forEach(wheel => {
        const wrapper = document.createElement('label');
        wrapper.className = 'inline-flex items-center space-x-2 cursor-pointer bg-white p-2 rounded shadow-sm border border-gray-100 hover:bg-gray-50';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = wheel || '';
        checkbox.className = 'form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500';
        
        const text = document.createElement('span');
        text.textContent = String(wheel || '未命名');
        text.className = 'text-sm text-gray-700';

        wrapper.appendChild(checkbox);
        wrapper.appendChild(text);
        container.appendChild(wrapper);
    });
}

// ==================== Module Management ====================
function renderModuleTabs() {
    const nav = $('#module-tabs-header');
    nav.innerHTML = '';

    state.modules.forEach(mod => {
        const btn = document.createElement('button');
        const isActive = mod.id === state.currentModuleId;
        
        btn.className = isActive 
            ? 'group inline-flex items-center px-4 py-2 border-b-2 border-blue-500 font-medium text-sm text-blue-600 bg-blue-50 rounded-t-md'
            : 'group inline-flex items-center px-4 py-2 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300';
            
        btn.innerHTML = `<span class="truncate max-w-[100px]">${mod.name || '未命名模块'}</span>`;
        btn.onclick = () => switchModule(mod.id);
        nav.appendChild(btn);
    });
}

function switchModule(id) {
    try {
        saveCurrentModule();
        const nextMod = state.modules.find(m => m.id === id);
        if (!nextMod) {
            console.warn(`Module ${id} not found`);
            return;
        }
        
        state.currentModuleId = id;
        const nameEl = $('#module-name');
        const frontEl = $('#module-front');
        const backEl = $('#module-back');
        
        if (nameEl && frontEl && backEl) {
            nameEl.value = nextMod.name || '';
            frontEl.value = nextMod.front || '';
            backEl.value = nextMod.back || '';
            renderModuleTabs();
        }
    } catch (e) {
        console.error('Error switching module:', e);
        Toast.show('切换模块失败', 'error');
    }
}

function saveCurrentModule() {
    if (!state.currentModuleId) return;
    
    const curr = state.modules.find(m => m.id === state.currentModuleId);
    if (!curr) return;
    
    const nameEl = $('#module-name');
    const frontEl = $('#module-front');
    const backEl = $('#module-back');
    
    curr.name = nameEl?.value || 'Unnamed';
    curr.front = frontEl?.value || '';
    curr.back = backEl?.value || '';
}


function addModule() {
    saveCurrentModule();
    
    const newId = Utils.generateId();
    state.modules.push({
        id: newId,
        name: `模块 ${state.modules.length + 1}`,
        front: '',
        back: ''
    });
    switchModule(newId);
    saveDraftState();
}

async function removeCurrentModule() {
    if (state.modules.length <= 1) {
        Toast.show('至少保留一个模块', 'warning');
        return;
    }
    
    const confirmed = await Modal.confirm({
        title: '删除模块',
        message: '确定删除当前模块？此操作不可撤销。'
    });
    
    if (!confirmed) return;

    state.modules = state.modules.filter(m => m.id !== state.currentModuleId);
    if (state.modules.length > 0) {
        switchModule(state.modules[0].id);
    } else {
        // Fallback: add a default module if all deleted
        addModule();
    }
    saveDraftState();
}

// ==================== Phrase Modal ====================
function openPhraseModal(type) {
    state.activePhraseTarget = type;
    Modal.open('modal-phrases');
    
    $('#modal-phrases-title').textContent = type === 'frontend' ? '选择前端/上层常用语' : '选择后端/底层常用语';
    
    const list = $('#modal-phrases-list');
    list.innerHTML = '';
    (store.getPhrases()[type] || []).forEach(p => {
        const div = document.createElement('div');
        div.className = 'flex items-start';
        div.innerHTML = `<div class="flex h-5"><input type="checkbox" value="${p}" class="h-4 w-4 text-blue-600 rounded phrase-checkbox"></div><div class="ml-3"><label class="text-sm font-medium text-gray-700">${p}</label></div>`;
        list.appendChild(div);
    });
}

function closeModal(id) {
    Modal.close(id);
}

function insertSelectedPhrases() {
    const checkboxes = $$('.phrase-checkbox:checked');
    const selected = Array.from(checkboxes).map(c => c.value);
    
    if (selected.length > 0) {
        const targetId = state.activePhraseTarget === 'frontend' ? 'module-front' : 'module-back';
        const textarea = $(`#${targetId}`);
        const currentVal = textarea.value;
        const prefix = currentVal ? '\n' : '';
        textarea.value = currentVal + prefix + selected.map(s => `- ${s}`).join('\n');
        
        const curr = state.modules.find(m => m.id === state.currentModuleId);
        if (curr) {
            if (state.activePhraseTarget === 'frontend') curr.front = textarea.value;
            else curr.back = textarea.value;
        }
        saveDraftState();
    }
    closeModal('modal-phrases');
}

// ==================== Lang Management ====================
function initLangTab() {
    renderLangList();
}

function renderLangList() {
    const container = $('#lang-list-container');
    container.innerHTML = '';
    store.getLanguages().forEach(lang => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center bg-gray-50 p-4 rounded border border-gray-200';
        div.innerHTML = `<div><h4 class="font-bold text-gray-900">${lang.name}</h4><p class="text-sm text-gray-500 mt-1">${lang.wheels.join(', ')}</p></div><div class="flex space-x-2"><button onclick="openLangModal('${lang.id}')" class="text-blue-600 hover:text-blue-800 text-sm">编辑</button><button onclick="deleteLang('${lang.id}')" class="text-red-600 hover:text-red-800 text-sm">删除</button></div>`;
        container.appendChild(div);
    });
}

function openLangModal(id = null) {
    Modal.open('modal-lang');
    
    const nameInput = $('#lang-edit-name');
    const wheelsInput = $('#lang-edit-wheels');
    const idInput = $('#lang-edit-id');

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
}

function saveLanguage() {
    const id = $('#lang-edit-id').value;
    const nameResult = Validator.validateLanguageName($('#lang-edit-name').value);
    
    if (!nameResult.valid) {
        Toast.show(nameResult.message, 'error');
        return;
    }

    const wheelsResult = Validator.validateWheels($('#lang-edit-wheels').value);
    const wheels = wheelsResult.value;
    const langs = store.getLanguages();

    if (id) {
        const idx = langs.findIndex(l => l.id === id);
        if (idx > -1) {
            langs[idx].name = nameResult.value;
            langs[idx].wheels = wheels;
        }
    } else {
        langs.push({
            id: `lang_${Utils.generateId()}`,
            name: nameResult.value,
            wheels: wheels
        });
    }

    store.saveLanguages(langs);
    renderLangList();
    closeModal('modal-lang');
    refreshGeneratorDropdowns();
    Toast.show('保存成功', 'success');
}

async function deleteLang(id) {
    const confirmed = await Modal.confirm({
        title: '删除语言',
        message: '确定删除该语言配置？'
    });
    
    if (!confirmed) return;
    
    const langs = store.getLanguages().filter(l => l.id !== id);
    store.saveLanguages(langs);
    renderLangList();
    refreshGeneratorDropdowns();
    Toast.show('删除成功', 'success');
}

// ==================== Phrases Management ====================
function initPhrasesTab() {
    renderPhrasesList();
}

function renderPhrasesList() {
    const data = store.getPhrases();
    ['frontend', 'backend'].forEach(type => {
        const list = $(`#phrases-list-${type}`);
        list.innerHTML = '';
        (data[type] || []).forEach((p, idx) => {
            const li = document.createElement('li');
            li.className = 'py-3 flex justify-between items-center';
            li.innerHTML = `<span class="text-gray-700 text-sm">${p}</span><button onclick="deletePhrase('${type}', ${idx})" class="text-red-500 hover:text-red-700"><i class="fas fa-trash w-4 h-4"></i></button>`;
            list.appendChild(li);
        });
    });
}

async function addPhrase(type) {
    const text = await Modal.prompt({
        title: '添加常用语',
        message: '请输入新的常用语句：',
        placeholder: '例如：支持深色模式切换'
    });
    
    if (text && text.trim()) {
        const data = store.getPhrases();
        if (!data[type]) data[type] = [];
        data[type].push(text.trim());
        store.savePhrases(data);
        renderPhrasesList();
        Toast.show('添加成功', 'success');
    }
}

function deletePhrase(type, index) {
    const data = store.getPhrases();
    data[type].splice(index, 1);
    store.savePhrases(data);
    renderPhrasesList();
}

// ==================== Data Management ====================
function initDataTab() {
    updateStats();
}

async function fetchNetworkPreview() {
    const url = $('#network-config-url').value;
    const validation = Validator.validateUrl(url);
    
    if (!validation.valid) {
        Toast.show(validation.message, 'error');
        return;
    }

    const btn = $('button[onclick="fetchNetworkPreview()"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> 加载中...';
    btn.disabled = true;

    try {
        const data = await store.fetchNetworkConfig(validation.value);
        state.pendingImportData = data;
        
        $('#import-preview-area').classList.remove('hidden');
        $('#import-preview-text').textContent = JSON.stringify(data, null, 2);
        
        Toast.show('配置加载成功', 'success');
    } catch (e) {
        Toast.show('获取配置失败: ' + e.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function updateStats() {
    const stats = store.getStats();
    const container = $('#stats-container');
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
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    downloadFile(`VibePromptGenerator_备份_${dateStr}.yaml`, store.toYAML(store.getFullDump()));
}

function exportDefaults() {
    const defaults = store.getDefaults();
    const yaml = store.toYAML(defaults);
    downloadFile('VibePrompt_DefaultConfig.yaml', yaml);
}

function handleFileSelect(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = store.parseYAML(e.target.result);
            
            if (!data || (!data.languages && !data.phrases && !data.draft)) {
                throw new Error('Invalid data format');
            }
            
            state.pendingImportData = data;
            $('#import-preview-area').classList.remove('hidden');
            $('#import-preview-text').textContent = store.toYAML(data);
        } catch (err) {
            Toast.show('文件格式错误或数据无效，仅支持 YAML 格式', 'error');
            console.error(err);
        }
    };
    reader.readAsText(file);
}

async function confirmImport(mode) {
    if (!state.pendingImportData) return;
    
    if (store.restoreFullDump(state.pendingImportData, mode)) {
        Toast.show('导入成功！', 'success');
        cancelImport();
        
        loadDraft();
        renderLangList();
        renderPhrasesList();
        updateStats();
        refreshGeneratorDropdowns();
    } else {
        Toast.show('导入失败，数据可能不完整', 'error');
    }
}

function cancelImport() {
    state.pendingImportData = null;
    $('#import-preview-area').classList.add('hidden');
    $('#import-file').value = '';
}

async function resetToDefaults() {
    const confirmed = await Modal.confirm({
        title: '恢复默认配置',
        message: '⚠️ 确定恢复默认配置？\n\n自定义的语言配置和常用语将被清除并重置为初始状态。当前草稿也会被重置。'
    });
    
    if (!confirmed) return;
    
    store.clearAllData();
    location.reload(); 
}

async function clearAllData() {
    const confirmed = await Modal.confirm({
        title: '清空所有数据',
        message: '🔥 严重警告：确定清空所有数据？\n\n这将永久删除所有本地存储的数据，包括语言配置、常用语和草稿！此操作不可撤销。'
    });
    
    if (!confirmed) return;
    
    localStorage.clear();
    location.reload();
}

// ==================== Draft Management ====================
function saveDraftState() {
    saveCurrentModule(); // Already saves to state.modules
    
    const langEl = $('#select-lang');
    const archEl = $('#select-arch');
    const envEl = $('#select-env');
    const descEl = $('#general-desc');
    const notesEl = $('#notes');
    
    const draft = {
        selectedLang: langEl?.value || '',
        selectedWheels: Array.from($$('#wheels-container input:checked')).map(cb => cb.value),
        selectedArch: archEl?.value || '',
        selectedEnv: envEl?.value || '',
        generalDesc: descEl?.value || '',
        notes: notesEl?.value || '',
        modules: state.modules
    };

    if (store) {
        store.saveDraft(draft);
    }
}

function loadDraft() {
    const draft = store.getDraft();
    
    $('#select-lang').value = draft.selectedLang || '';
    renderWheels(draft.selectedLang);
    
    if (draft.selectedWheels) {
        setTimeout(() => {
            draft.selectedWheels.forEach(val => {
                const cb = $(`#wheels-container input[value="${val}"]`);
                if (cb) cb.checked = true;
            });
        }, 50);
    }

    $('#select-arch').value = draft.selectedArch || '';
    $('#select-env').value = draft.selectedEnv || '';
    $('#general-desc').value = draft.generalDesc || '';
    $('#notes').value = draft.notes || '';

    state.modules = draft.modules || [];
    if (state.modules.length === 0) addModule();
    else switchModule(state.modules[0].id);
}

async function resetAll() {
    const confirmed = await Modal.confirm({
        title: '重置草稿',
        message: '确定重置当前草稿内容？'
    });
    
    if (!confirmed) return;
    
    store.resetDraft();
    loadDraft();
    Toast.show('草稿已重置', 'success');
}

// ==================== Generate Logic ====================
function generateMarkdown() {
    saveCurrentModule();

    try {
        const langSelect = $('#select-lang');
        const langName = langSelect?.options?.[langSelect?.selectedIndex]?.text || "未指定";
        const wheels = Array.from($$('#wheels-container input:checked'))
            .map(cb => cb.value)
            .filter(v => v)
            .join(', ') || "无";
        const arch = $('#select-arch')?.value || "未指定";
        const env = $('#select-env')?.value || "未指定";
        const desc = $('#general-desc')?.value || "无";
        const notes = $('#notes')?.value || "无";

        if (!state.modules || state.modules.length === 0) {
            Toast.show('至少需要一个模块', 'warning');
            return;
        }

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

        state.modules.forEach((mod, idx) => {
            const modName = mod.name || `模块 ${idx + 1}`;
            const frontContent = mod.front?.trim() || '暂无';
            const backContent = mod.back?.trim() || '暂无';
            
            md += `
### 3.${idx + 1} ${modName}
**前端/上层逻辑**:
${frontContent}

**后端/底层逻辑**:
${backContent}
`;
        });

        md += `
## 4. 其他注意事项
${notes}
`;

        downloadFile('Prompt.md', md);
        Toast.show('Prompt.md 已生成并下载', 'success');
    } catch (e) {
        console.error('Error generating markdown:', e);
        Toast.show('生成 Prompt.md 失败: ' + (e.message || '未知错误'), 'error');
    }
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

// ==================== Toast Animation Styles ====================
const style = document.createElement('style');
style.textContent = `
@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
@keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}
.animate-slideIn { animation: slideIn 0.3s ease-out; }
.animate-slideOut { animation: slideOut 0.3s ease-in; }
`;
document.head.appendChild(style);