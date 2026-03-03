document.addEventListener('DOMContentLoaded', () => {
    const titleInput = document.getElementById('title');
    const textInput = document.getElementById('text');
    const categoryInput = document.getElementById('category');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const searchInput = document.getElementById('search');
    const promptList = document.getElementById('promptList');
    const categoryFilters = document.getElementById('categoryFilters');
    
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');

    // Navigation Elements
    const mainView = document.getElementById('mainView');
    const settingsView = document.getElementById('settingsView');
    const settingsBtn = document.getElementById('settingsBtn');
    const backBtn = document.getElementById('backBtn');
    const sitesTextarea = document.getElementById('sitesTextarea');
    const saveSitesBtn = document.getElementById('saveSitesBtn');

    let editingId = null; 
    let activeCategory = "All";
    const storage = chrome.storage.sync;

    // --- Theme Logic ---
    const themeSelect = document.getElementById('themeSelect');
    
    // Load saved theme on startup
    storage.get(['appTheme'], (data) => {
        const theme = data.appTheme || 'system';
        document.documentElement.setAttribute('data-theme', theme);
        if(themeSelect) themeSelect.value = theme;
    });

    // Listen for theme changes in settings
    if(themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            const newTheme = e.target.value;
            document.documentElement.setAttribute('data-theme', newTheme);
            storage.set({appTheme: newTheme});
        });
    }
    // -------------------

    // --- Navigation Logic ---
    settingsBtn.addEventListener('click', () => {
        mainView.classList.add('hidden');
        settingsView.classList.remove('hidden');
        storage.get(['enabledSites'], (data) => {
            const sites = data.enabledSites || ['chatgpt.com', 'gemini.google.com', 'copilot.microsoft.com','chat.qwen.ai','agent.minimax.io'];
            sitesTextarea.value = sites.join('\n');
        });
    });

    backBtn.addEventListener('click', () => {
        settingsView.classList.add('hidden');
        mainView.classList.remove('hidden');
    });

    saveSitesBtn.addEventListener('click', () => {
        const sites = sitesTextarea.value.split('\n').map(s => s.trim()).filter(s => s);
        const selectedTheme = themeSelect.value;
        
        storage.set({enabledSites: sites, appTheme: selectedTheme}, () => {
            document.documentElement.setAttribute('data-theme', selectedTheme);
            saveSitesBtn.textContent = "Saved!";
            setTimeout(() => saveSitesBtn.textContent = "Save Settings", 1500);
        });
    });
    // ------------------------

    function renderCategories(prompts) {
        const categories = ["All", ...new Set(prompts.map(p => p.category || 'Uncategorized').filter(c => c.trim() !== ''))];
        categoryFilters.innerHTML = '';
        
        categories.forEach(cat => {
            const pill = document.createElement('button');
            pill.className = `filter-pill ${activeCategory === cat ? 'active' : ''}`;
            pill.textContent = cat;
            pill.addEventListener('click', () => {
                activeCategory = cat;
                renderPrompts(searchInput.value);
            });
            categoryFilters.appendChild(pill);
        });
    }

    function renderPrompts(filterText = "") {
        storage.get(['prompts'], (result) => {
            const prompts = result.prompts || [];
            
            renderCategories(prompts);
            promptList.innerHTML = '';
            
            let filtered = prompts.filter(p => {
                const matchesSearch = (p.title || '').toLowerCase().includes(filterText.toLowerCase()) || 
                                      (p.text || '').toLowerCase().includes(filterText.toLowerCase()) ||
                                      (p.category || '').toLowerCase().includes(filterText.toLowerCase());
                const matchesCategory = activeCategory === "All" || (p.category || 'Uncategorized') === activeCategory;
                return matchesSearch && matchesCategory;
            });

            // SORTING: Push favorites to the very top of the list
            filtered.sort((a, b) => (b.favorite === true) - (a.favorite === true));

            filtered.forEach(prompt => {
                const card = document.createElement('div');
                card.className = 'prompt-card';
                card.innerHTML = `
                    <div class="prompt-header">
                        <span class="prompt-title">${prompt.title}</span>
                        <span class="prompt-category">${prompt.category}</span>
                    </div>
                    <div class="prompt-text">${prompt.text}</div>
                    <div class="prompt-actions">
                        <button class="action-btn fav-btn ${prompt.favorite ? 'active' : ''}" data-id="${prompt.id}">${prompt.favorite ? '⭐ Fav' : '☆ Fav'}</button>
                        <button class="action-btn edit-btn" data-id="${prompt.id}">Edit</button>
                        <button class="action-btn copy-btn" data-text="${encodeURIComponent(prompt.text)}">Copy</button>
                        <button class="action-btn delete-btn" data-id="${prompt.id}">Delete</button>
                    </div>
                `;
                promptList.appendChild(card);
            });

            // Toggle Favorite Listener
            document.querySelectorAll('.fav-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.dataset.id;
                    const index = prompts.findIndex(p => p.id === id);
                    if (index !== -1) {
                        prompts[index].favorite = !prompts[index].favorite;
                        storage.set({prompts}, () => renderPrompts(searchInput.value));
                    }
                });
            });

            // Delete Listener
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => deletePrompt(e.target.dataset.id));
            });
            
            // Copy Listener
            document.querySelectorAll('.copy-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    navigator.clipboard.writeText(decodeURIComponent(e.target.dataset.text));
                    e.target.textContent = "Copied!";
                    setTimeout(() => e.target.textContent = "Copy", 1000);
                });
            });

            // Edit Listener
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    const prompt = prompts.find(p => p.id === id);
                    if (prompt) {
                        editingId = prompt.id;
                        titleInput.value = prompt.title || '';
                        textInput.value = prompt.text || '';
                        categoryInput.value = prompt.category || '';
                        saveBtn.textContent = "Update Prompt";
                        cancelBtn.classList.remove('hidden');
                        window.scrollTo(0, 0); 
                    }
                });
            });
        });
    }

    function deletePrompt(id) {
        storage.get(['prompts'], (result) => {
            const prompts = result.prompts.filter(p => p.id !== id);
            storage.set({prompts}, () => renderPrompts(searchInput.value));
        });
    }

    function resetForm() {
        editingId = null;
        titleInput.value = '';
        textInput.value = '';
        categoryInput.value = '';
        saveBtn.textContent = "Save Prompt";
        cancelBtn.classList.add('hidden');
    }

    cancelBtn.addEventListener('click', resetForm);

    saveBtn.addEventListener('click', () => {
        if (!textInput.value.trim()) return;
        
        storage.get(['prompts'], (result) => {
            let prompts = result.prompts || [];
            
            if (editingId) {
                const index = prompts.findIndex(p => p.id === editingId);
                if (index !== -1) {
                    prompts[index] = {
                        ...prompts[index],
                        title: titleInput.value.trim() || 'Untitled',
                        text: textInput.value.trim(),
                        category: categoryInput.value.trim() || 'General'
                    };
                }
            } else {
                prompts.unshift({
                    id: Date.now().toString(),
                    title: titleInput.value.trim() || 'Untitled',
                    text: textInput.value.trim(),
                    category: categoryInput.value.trim() || 'General',
                    favorite: false
                });
            }

            storage.set({prompts}, () => {
                resetForm();
                renderPrompts(searchInput.value);
            });
        });
    });

    exportBtn.addEventListener('click', () => {
        storage.get(['prompts'], (result) => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result.prompts || []));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "prompts_backup.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        });
    });

    importBtn.addEventListener('click', () => importFile.click());
    
    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedPrompts = JSON.parse(event.target.result);
                if (Array.isArray(importedPrompts)) {
                    storage.get(['prompts'], (result) => {
                        const existingPrompts = result.prompts || [];
                        const mergedPrompts = [...importedPrompts, ...existingPrompts].filter((v,i,a)=>a.findIndex(v2=>(v2.id===v.id))===i);
                        storage.set({prompts: mergedPrompts}, () => {
                            renderPrompts(searchInput.value);
                            alert("Prompts imported successfully!");
                        });
                    });
                }
            } catch (err) {
                alert("Invalid JSON file.");
            }
            importFile.value = ""; 
        };
        reader.readAsText(file);
    });

    searchInput.addEventListener('input', (e) => renderPrompts(e.target.value));
    renderPrompts();
});