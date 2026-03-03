const storage = chrome.storage.sync;

function updateContextMenus() {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "savePrompt",
            title: "Add selected text as prompt",
            contexts: ["selection"]
        });

        storage.get(['prompts'], (result) => {
            const prompts = result.prompts || [];
            if (prompts.length > 0) {
                chrome.contextMenus.create({
                    id: "insertPromptMenu",
                    title: "Insert Prompt",
                    contexts: ["editable"]
                });
                
                // 1. Create Favorites Folder First (Appears at the top)
                const favorites = prompts.filter(p => p.favorite);
                if (favorites.length > 0) {
                    chrome.contextMenus.create({
                        id: `cat_favorites`,
                        parentId: "insertPromptMenu",
                        title: "⭐ Favorites",
                        contexts: ["editable"]
                    });
                    favorites.forEach((prompt) => {
                        chrome.contextMenus.create({
                            id: `insert_fav_${prompt.id}`,
                            parentId: `cat_favorites`,
                            title: prompt.title || prompt.text.substring(0, 20) + "...",
                            contexts: ["editable"]
                        });
                    });
                }

                // 2. Create Regular Folders
                const categories = [...new Set(prompts.map(p => p.category || 'Uncategorized'))];
                categories.forEach(cat => {
                    chrome.contextMenus.create({
                        id: `cat_${cat}`,
                        parentId: "insertPromptMenu",
                        title: cat,
                        contexts: ["editable"]
                    });
                });
                
                // 3. Add all prompts under their regular category
                prompts.forEach((prompt) => {
                    chrome.contextMenus.create({
                        id: `insert_reg_${prompt.id}`,
                        parentId: `cat_${prompt.category || 'Uncategorized'}`,
                        title: prompt.title || prompt.text.substring(0, 20) + "...",
                        contexts: ["editable"]
                    });
                });
            }
        });
    });
}

chrome.runtime.onInstalled.addListener(updateContextMenus);
chrome.storage.onChanged.addListener(updateContextMenus);

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "savePrompt") {
        let domainCategory = "Saved";
        try {
            if (tab.url) {
                const urlObj = new URL(tab.url);
                domainCategory = urlObj.hostname.replace(/^www\./, '');
                domainCategory = domainCategory.charAt(0).toUpperCase() + domainCategory.slice(1);
            }
        } catch (e) {
            console.warn("Could not parse URL");
        }

        let pageTitle = tab.title || "New Highlight";
        if (pageTitle.length > 40) pageTitle = pageTitle.substring(0, 40) + "...";

        const newPrompt = { 
            id: Date.now().toString(), 
            title: pageTitle, 
            text: info.selectionText, 
            category: domainCategory, 
            favorite: false 
        };
        
        storage.get(['prompts'], (result) => {
            const prompts = result.prompts || [];
            prompts.unshift(newPrompt);
            storage.set({prompts});
        });
        
    } else if (info.menuItemId.toString().startsWith("insert_")) {
        // Strip out the fav/reg prefixes to find the true ID
        const promptId = info.menuItemId.replace("insert_fav_", "").replace("insert_reg_", "");
        storage.get(['prompts'], (result) => {
            const prompts = result.prompts || [];
            const prompt = prompts.find(p => p.id === promptId);
            if (prompt && prompt.text) {
                chrome.tabs.sendMessage(tab.id, {
                    action: "insertPrompt",
                    text: prompt.text
                }, () => {
                    if (chrome.runtime.lastError) console.warn("Ensure page is refreshed.");
                });
            }
        });
    }
});