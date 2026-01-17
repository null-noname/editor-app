/**
 * Display Settings Manager
 */

export const DisplaySettings = {
    settings: {
        fontSize: 16,
        lineHeight: 1.8,
        editorWidth: 100,
        showSidebar: true
    },

    init() {
        this.loadSettings();
        this.bindEvents();
        this.applySettings();
    },

    loadSettings() {
        const saved = localStorage.getItem('editor-display-settings');
        if (saved) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            } catch (e) {
                console.error("Failed to load settings", e);
            }
        }
    },

    saveSettings() {
        localStorage.setItem('editor-display-settings', JSON.stringify(this.settings));
    },

    bindEvents() {
        // Toggle Button
        const btn = document.getElementById('btn-display-settings');
        const panel = document.getElementById('display-settings-panel');

        if (btn && panel) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                panel.classList.toggle('hidden');
            });

            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (!panel.classList.contains('hidden') &&
                    !panel.contains(e.target) &&
                    e.target !== btn) {
                    panel.classList.add('hidden');
                }
            });

            panel.addEventListener('click', e => e.stopPropagation());
        }

        // Inputs
        this.bindInput('setting-font-size', 'fontSize', 'val-font-size', 'px');
        this.bindInput('setting-line-height', 'lineHeight', 'val-line-height', '');
        this.bindInput('setting-editor-width', 'editorWidth', 'val-editor-width', '%');

        // Sidebar Toggle
        const sidebarCheck = document.getElementById('setting-show-sidebar');
        if (sidebarCheck) {
            sidebarCheck.checked = this.settings.showSidebar;
            sidebarCheck.addEventListener('change', () => {
                this.settings.showSidebar = sidebarCheck.checked;
                this.applySettings();
                this.saveSettings();
            });
        }
    },

    bindInput(id, key, displayId, unit) {
        const input = document.getElementById(id);
        const display = document.getElementById(displayId);

        if (input) {
            input.value = this.settings[key];
            if (display) display.textContent = this.settings[key] + unit;

            input.addEventListener('input', () => {
                this.settings[key] = input.value;
                if (display) display.textContent = input.value + unit;
                this.applySettings();
                this.saveSettings();
            });
        }
    },

    applySettings() {
        const editor = document.getElementById('main-editor');
        if (editor) {
            editor.style.fontSize = `${this.settings.fontSize}px`;
            editor.style.lineHeight = this.settings.lineHeight;
            editor.style.width = `${this.settings.editorWidth}%`;

            if (this.settings.editorWidth < 100) {
                editor.style.margin = "0 auto";
            } else {
                editor.style.margin = "0";
            }
        }

        const sidebar = document.getElementById('chapter-sidebar');
        if (sidebar) {
            sidebar.style.display = this.settings.showSidebar ? '' : 'none';
            // Empty string defaults to CSS file value (flex/block), none hides it.
        }
    }
};
