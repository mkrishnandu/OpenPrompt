# OpenPrompt ✨

**A lightweight, open-source prompt manager built for power users, developers, and prompt engineers.**

Tired of re-typing the same instructions into ChatGPT, Claude, Gemini, or GitHub Copilot? OpenPrompt allows you to create, organize, and instantly inject your best AI templates into any text box across the web. 


## Key Features

* **Floating Quick-Access Menu:** A non-intrusive, frosted-glass `✨` button appears automatically on popular AI websites. Click it to reveal a beautifully animated menu of your saved prompts and inject them without losing focus.
* **Dynamic Variables (`[Variable]`):** Supercharge your templates. If a prompt includes text in brackets (e.g., *Translate this to [Language]*), OpenPrompt will generate a pop-up asking you to fill in the blanks before pasting.
* **Smart Context Menus:** Highlight any text on the web, right-click, and select "Add selected text as prompt." You can also right-click inside *any* text box to insert your saved prompts.
* **Collapsible Folders & Favorites:** Keep massive prompt libraries organized. Prompts are grouped into clean, collapsible accordion folders. Star your most-used prompts to pin them to the top.
* **Glassmorphism UI & Themes:** A stunning, modern interface. Choose between a crisp Light theme, a sleek Dark theme, or let OpenPrompt automatically sync with your OS default settings.
* **Cloud Sync & Backups:** Prompts are securely saved to your browser's native sync storage, meaning they travel with you to any computer logged into your browser profile. Export your library as a JSON file to share with your team.

## Installation 

### Method 1: Chrome Web Store
[*Edge Extension Store Link*](https://microsoftedge.microsoft.com/addons/detail/openprompt/cgmjljfpipmffidheepgklhhbipaokpi?hl=en-GB)

### Method 2: Manual Installation (Developer Mode)
1. Download or clone this repository: `git clone https://github.com/mkrishnandu/OpenPrompt.git`
2. Open Chrome (or any Chromium-based browser like Edge, Brave).
3. Navigate to `chrome://extensions/`
4. Enable **Developer mode** using the toggle in the top right corner.
5. Click **Load unpacked** and select the `OpenPrompt` folder.

## How to Use

### 1. Creating a Prompt
Click the OpenPrompt icon in your browser toolbar to open the dashboard. Add a title, category, and your prompt text. 
* *Pro-tip: Include bracketed text like `[Code Language]` to create a fillable variable.*

### 2. Inserting a Prompt
* **Method A (The Floating Button):** Navigate to a supported AI site (like ChatGPT or Gemini). Click the floating `✨` button, open a folder, and select your prompt.
* **Method B (Right-Click):** Right-click inside any text input field on any website. Hover over **Insert Prompt**, navigate to your desired category, and select your prompt.

### 3. Settings & Customization
Open the extension dashboard and click the **⚙️ Settings** icon. Here you can:
* Force Light or Dark mode.
* Add or remove websites where the floating `✨` button is allowed to appear (one domain per line).

## Privacy & Security

OpenPrompt is fully open-source and respects your data. 
* **No tracking, no analytics, no external servers.** * All prompts are stored locally and synced via your browser's native, encrypted Google/Microsoft sync profile (`chrome.storage.sync`).
* The extension requests `<all_urls>` permission purely so it can inject your text into the text boxes of any website you choose to use it on.

## Contributing

Contributions, issues, and feature requests are welcome! 
If you have an idea to improve OpenPrompt, feel free to fork the repository, create a feature branch, and submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
