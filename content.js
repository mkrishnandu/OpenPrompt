let lastClickedElement = null;
let lastSavedRange = null;

// Track the last actively focused text box globally
let globalLastActive = null;
document.addEventListener('focusin', (e) => {
    if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.isContentEditable)) {
        globalLastActive = e.target;
    }
});

// Track right-clicks for the context menu
document.addEventListener('contextmenu', (e) => {
    lastClickedElement = e.target;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
        lastSavedRange = selection.getRangeAt(0).cloneRange();
    } else {
        lastSavedRange = null;
    }
}, true);

// Listen for the context menu insert command
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "insertPrompt") {
        let target = lastClickedElement && (lastClickedElement.tagName === 'TEXTAREA' || lastClickedElement.tagName === 'INPUT' || lastClickedElement.isContentEditable) 
            ? lastClickedElement 
            : document.activeElement;

        processAndInsertPrompt(request.text, target);
        sendResponse({success: true});
    }
});

// Shared insertion logic (Variables + React Bypass)
function processAndInsertPrompt(rawText, targetElement) {
    if (!targetElement) return;
    
    let finalPrompt = rawText;
    const variableRegex = /\[(.*?)\]/g;
    let match;
    let variables = [];
    
    while ((match = variableRegex.exec(finalPrompt)) !== null) {
        variables.push(match[1]);
    }
    
    const uniqueVars = [...new Set(variables)];
    
    uniqueVars.forEach(variable => {
        const userInput = window.prompt(`Prompt Manager: Fill in [${variable}]`, "");
        if (userInput !== null) {
            finalPrompt = finalPrompt.split(`[${variable}]`).join(userInput);
        }
    });

    insertTextAtCursor(targetElement, finalPrompt);
}

function insertTextAtCursor(element, text) {
    if (!element) return;
    element.focus(); 

    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        const startPos = element.selectionStart !== undefined ? element.selectionStart : element.value.length;
        const endPos = element.selectionEnd !== undefined ? element.selectionEnd : element.value.length;
        
        const prototype = window[element.tagName === 'INPUT' ? 'HTMLInputElement' : 'HTMLTextAreaElement'].prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(prototype, "value").set;
        
        const newValue = element.value.substring(0, startPos) + text + element.value.substring(endPos, element.value.length);
        
        if (nativeSetter) {
            nativeSetter.call(element, newValue);
        } else {
            element.value = newValue;
        }
        
        element.selectionStart = element.selectionEnd = startPos + text.length;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        
    } else if (element.isContentEditable) {
        const selection = window.getSelection();
        if (lastSavedRange) {
            selection.removeAllRanges();
            selection.addRange(lastSavedRange);
        }
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        
        element.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

// --- Floating UI Logic ---
function initFloatingButton() {
    chrome.storage.sync.get(['prompts', 'enabledSites'], (data) => {
        const sites = data.enabledSites || ['chatgpt.com', 'gemini.google.com', 'copilot.microsoft.com', 'claude.ai', 'chat.qwen.ai', 'agent.minimax.io', 'chat.deepseek.com'];
        const currentHost = window.location.hostname;
        
        if (sites.some(site => currentHost.includes(site.trim()))) {
            injectFAB(data.prompts || []);
        }
    });
}


function injectFAB(prompts) {
    if (document.getElementById('prompt-manager-fab-host')) return;

    const host = document.createElement('div');
    host.id = 'prompt-manager-fab-host';
    document.documentElement.appendChild(host);
    const shadow = host.attachShadow({mode: 'open'});

    const style = document.createElement('style');
    style.textContent = `
        :host {
            --glass-bg: rgba(255, 255, 255, 0.3);
            --glass-border: rgba(255, 255, 255, 0.3);
            --text-main: #000000;
            --text-muted: #334155;
            --item-hover: rgba(255, 255, 255, 0.6);
            --cat-bg: rgba(255, 255, 255, 0.2);
            --cat-hover: rgba(255, 255, 255, 0.35);
        }
        
        @media (prefers-color-scheme: dark) {
            :host {
                --glass-bg: rgba(15, 23, 42, 0.3);
                --glass-border: rgba(255, 255, 255, 0.15);
                --text-main: #ffffff;
                --text-muted: #cbd5e1;
                --item-hover: rgba(255, 255, 255, 0.15);
                --cat-bg: rgba(0, 0, 0, 0.25);
                --cat-hover: rgba(0, 0, 0, 0.4);
            }
        }

        #fab-container { position: fixed; bottom: 30px; right: 30px; z-index: 999999; font-family: system-ui, sans-serif; }
        
        #fab-btn { 
            width: 50px; height: 50px; border-radius: 50%; 
            background: var(--glass-bg);
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(7px); -webkit-backdrop-filter: blur(7px);
            border: 1px solid var(--glass-border);
            color: var(--text-main); 
            cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center; 
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.27), background 0.2s ease; 
        }
        #fab-btn:hover { transform: scale(1.1); background: var(--item-hover); }
        #fab-btn:active { transform: scale(0.95); }
        
        /* Animated Menu Popup */
        #fab-menu { 
            /* Layout */
            position: absolute; bottom: 60px; right: 0; 
            width: 280px; max-height: 400px; overflow-y: auto; overflow-x: hidden;
            display: flex; flex-direction: column; 
            
            /* Glass Aesthetics */
            background: var(--glass-bg);
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(7px); -webkit-backdrop-filter: blur(7px);
            border: 1px solid var(--glass-border);
            
            /* Animation Starting State */
            opacity: 0;
            visibility: hidden;
            transform: translateY(20px) scale(0.95);
            transform-origin: bottom right;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.1);
        }
        /* Animation Ending State */
        #fab-menu.open { 
            opacity: 1;
            visibility: visible;
            transform: translateY(0) scale(1);
        }
        
        .category-wrapper { border-bottom: 1px solid var(--glass-border); }
        .category-wrapper:last-child { border-bottom: none; }

        .fab-category { 
            background: var(--cat-bg); 
            padding: 10px 12px; font-size: 11px; font-weight: bold; 
            color: var(--text-muted); 
            text-transform: uppercase; 
            cursor: pointer; display: flex; justify-content: space-between; align-items: center;
            user-select: none; transition: background 0.2s;
        }
        .fab-category:hover { background: var(--cat-hover); }
        
        /* Animated Arrow */
        .cat-arrow { font-size: 9px; opacity: 0.7; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .cat-arrow.open { transform: rotate(180deg); }

        /* Animated Accordion Folder using CSS Grid */
        .cat-items { 
            display: grid; 
            grid-template-rows: 0fr; 
            transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cat-items.open { 
            grid-template-rows: 1fr; 
        }
        .cat-items-inner { 
            overflow: hidden; 
            display: flex; 
            flex-direction: column;
        }
        
        .fab-item { 
            padding: 10px 12px; font-size: 13px; 
            color: var(--text-main); 
            font-weight: 500; 
            text-shadow: 0 1px 2px rgba(0,0,0,0.05); 
            cursor: pointer; 
            border-top: 1px solid var(--glass-border); 
            line-height: 1.4; white-space: normal; word-break: break-word; transition: background 0.2s;
        }
        .fab-item:first-child { border-top: none; }
        .fab-item:hover { background: var(--item-hover); }
        
        #fab-menu::-webkit-scrollbar { width: 6px; }
        #fab-menu::-webkit-scrollbar-thumb { background: rgba(150, 150, 150, 0.3); border-radius: 10px; }
    `;

    const container = document.createElement('div');
    container.id = 'fab-container';

    const btn = document.createElement('button');
    btn.id = 'fab-btn';
    btn.innerHTML = '✨';

    const menu = document.createElement('div');
    menu.id = 'fab-menu';

    if (prompts.length === 0) {
        menu.innerHTML = `
            <div class="fab-item" style="border:none; text-align: center; cursor: default;">
                <p style="margin: 0 0 10px 0;">No prompts saved. Add some from the dashboard!</p>
                <div style="height: 1px; background: var(--glass-border); margin: 10px 0;"></div>
                <p style="margin: 0 0 10px 0; font-size: 11px; color: var(--text-muted);">Or import starter prompts?</p>
                <button id="import-starters-btn" style="padding: 6px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; transition: background 0.2s; width: 100%;">Yes, Import</button>
            </div>
        `;

        menu.querySelector('#import-starters-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const btn = e.target;
            btn.textContent = "Loading...";
            btn.style.background = "#1d4ed8";

            // Fetch the JSON file included in your extension folder
            fetch(chrome.runtime.getURL("starter_prompt.json"))
                .then(response => response.json())
                .then(starterPrompts => {
                    chrome.storage.sync.get(['prompts'], (result) => {
                        const existingPrompts = result.prompts || [];
                        // Merge them just in case, though it should be empty
                        const mergedPrompts = [...starterPrompts, ...existingPrompts];
                        
                        chrome.storage.sync.set({ prompts: mergedPrompts }, () => {
                            // Your existing storage listener will automatically detect this 
                            // and rebuild the floating menu with the new folders!
                        });
                    });
                })
                .catch(error => {
                    console.error("Failed to load starter prompts:", error);
                    btn.textContent = "Error!";
                    btn.style.background = "#dc2626"; // Red error color
                });
        });
    } else {

        function buildCategoryAccordion(title, itemsData) {
            const wrapper = document.createElement('div');
            wrapper.className = 'category-wrapper';

            const header = document.createElement('div');
            header.className = 'fab-category';
            header.innerHTML = `<span>${title}</span> <span class="cat-arrow">▼</span>`;

            // The grid wrapper
            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'cat-items';
            
            // The inner content wrapper (required for smooth CSS Grid animation)
            const itemsInner = document.createElement('div');
            itemsInner.className = 'cat-items-inner';

            itemsData.forEach(p => appendFabItem(p, itemsInner, menu));

            itemsContainer.appendChild(itemsInner);

            // Click listener for expanding/collapsing
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                itemsContainer.classList.toggle('open');
                header.querySelector('.cat-arrow').classList.toggle('open');
            });

            wrapper.appendChild(header);
            wrapper.appendChild(itemsContainer);
            menu.appendChild(wrapper);
        }

        const favorites = prompts.filter(p => p.favorite);
        if (favorites.length > 0) {
            buildCategoryAccordion('⭐ Favorites', favorites);
        }

        const categories = [...new Set(prompts.map(p => p.category || 'Uncategorized'))];
        categories.forEach(cat => {
            const catPrompts = prompts.filter(p => !p.favorite && (p.category || 'Uncategorized') === cat);
            if (catPrompts.length > 0) {
                buildCategoryAccordion(cat, catPrompts);
            }
        });
    }

    function appendFabItem(p, containerNode, mainMenuNode) {
        const item = document.createElement('div');
        item.className = 'fab-item';
        item.textContent = p.title || p.text;
        
        item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            mainMenuNode.classList.remove('open');
            
            let targetBox = globalLastActive;
            if (!targetBox || !document.body.contains(targetBox)) {
                targetBox = document.querySelector('#prompt-textarea') || 
                            document.querySelector('div.ProseMirror') || 
                            document.querySelector('rich-textarea') || 
                            document.querySelector('div[contenteditable="true"]') || 
                            document.querySelector('textarea'); 
            }

            if (targetBox) {
                processAndInsertPrompt(p.text, targetBox);
            } else {
                alert("Prompt Manager: Could not detect the text box! Please click inside the chat box first, then try again.");
            }
        });
        containerNode.appendChild(item);
    }

    // Toggle menu with animation
    btn.addEventListener('click', () => {
        menu.classList.toggle('open');
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!host.contains(e.target)) {
            menu.classList.remove('open');
            
            // Optional: Auto-close all open folders when the menu closes
            host.shadowRoot.querySelectorAll('.cat-items.open').forEach(folder => folder.classList.remove('open'));
            host.shadowRoot.querySelectorAll('.cat-arrow.open').forEach(arrow => arrow.classList.remove('open'));
        }
    });

    container.appendChild(style);
    container.appendChild(menu);
    container.appendChild(btn);
    shadow.appendChild(container);
}

initFloatingButton();

// Listen for updates from popup to refresh UI immediately
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && (changes.prompts || changes.enabledSites)) {
        const existingHost = document.getElementById('prompt-manager-fab-host');
        if (existingHost) existingHost.remove();
        initFloatingButton();
    }
});