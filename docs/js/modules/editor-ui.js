/**
 * Editor UI Controller
 * Manages the interaction in the right-hand editor pane.
 */

import { WordCounter } from "./word-count.js";
import { DisplaySettings } from "./settings-display.js";
import { HistoryManager } from "./history.js";
import { ExportManager } from "./export-manager.js";

// chapterManager is accessed via window.chapterManager or event

export const EditorUI = {
    init() {
        DisplaySettings.init();
        HistoryManager.init();
        ExportManager.init();
        this.titleInput = document.getElementById('chapter-subtitle');
        this.editor = document.getElementById('main-editor');
        this.pureCountEl = document.getElementById('count-pure');
        this.totalCountEl = document.getElementById('count-total');
        this.saveStatusEl = document.getElementById('save-status-msg');
        this.sidebar = document.getElementById('chapter-sidebar');

        this.autoSaveTimer = null;

        this.bindEvents();

        // Listen for chapter changes
        window.addEventListener('chapterChanged', (e) => {
            this.loadChapter(e.detail.chapter);
        });
    },

    bindEvents() {
        if (this.titleInput) {
            this.titleInput.addEventListener('input', () => {
                this.updateChapterData();
            });
        }

        if (this.editor) {
            this.editor.addEventListener('input', () => {
                this.updateCounts();
                this.updateChapterData();
                this.triggerAutoSave();
            });

            // Shortcuts
            this.editor.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'r') {
                    e.preventDefault();
                    this.insertRuby();
                }
                if (e.ctrlKey && e.key === 'd') {
                    e.preventDefault();
                    this.insertDash();
                }
            });

            // Preview Buttons
            const btnPreview = document.getElementById('btn-preview');
            if (btnPreview) {
                btnPreview.addEventListener('click', () => this.openPreview());
            }
        }
    },

    loadChapter(chapter) {
        if (!chapter) return;
        if (this.titleInput) this.titleInput.value = chapter.title || "";
        if (this.editor) this.editor.value = chapter.content || "";
        this.updateCounts();
    },

    updateCounts() {
        if (!this.editor) return;
        const text = this.editor.value;
        const pure = WordCounter.countPure(text);
        const total = WordCounter.countTotal(text);

        if (this.pureCountEl) this.pureCountEl.textContent = pure.toLocaleString();
        if (this.totalCountEl) this.totalCountEl.textContent = total.toLocaleString();

        // Update sidebar total via Manager (a bit circular, but manager handles aggregation)
        // Ideally manager observes change. But simple call is fine.
        if (window.chapterManager) {
            window.chapterManager._updateTotalCount();
        }
    },

    updateChapterData() {
        if (window.chapterManager) {
            window.chapterManager.updateCurrentChapter({
                title: this.titleInput.value,
                content: this.editor.value
            });
        }
    },

    triggerAutoSave() {
        if (this.saveStatusEl) this.saveStatusEl.textContent = "編集中...";

        clearTimeout(this.autoSaveTimer);
        this.autoSaveTimer = setTimeout(() => {
            if (window.chapterManager) {
                window.chapterManager._saveAndRender(); // Saves to memory/list
                // In a real app, you would call DB save here or in Manager.
                // For now, we simulate 'Saved'.
                this.showSavedStatus();
            }
        }, 1000);
    },

    showSavedStatus() {
        if (this.saveStatusEl) {
            this.saveStatusEl.textContent = "保存済み";
            this.saveStatusEl.style.color = "#4caf50";
            setTimeout(() => {
                this.saveStatusEl.style.color = ""; // reset
            }, 2000);
        }
    },

    // --- Editor Features ---
    toggleVertical() {
        if (this.editor) {
            this.editor.classList.toggle('vertical');
        }
    },

    insertRuby() {
        if (!this.editor) return;
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        const text = this.editor.value;
        const selected = text.substring(start, end);
        const ruby = `｜${selected}《》`;

        this.editor.value = text.substring(0, start) + ruby + text.substring(end);
        this.editor.focus();
        this.editor.selectionStart = this.editor.selectionEnd = start + selected.length + 2;

        // Trigger updates
        this.updateCounts();
        this.updateChapterData();
    },

    insertDash() {
        if (!this.editor) return;
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        const text = this.editor.value;

        this.editor.value = text.substring(0, start) + "――" + text.substring(end);
        this.editor.focus();
        this.editor.selectionStart = this.editor.selectionEnd = start + 2;

        this.updateCounts();
        this.updateChapterData();
        this.updateCounts();
        this.updateChapterData();
    },

    openPreview() {
        const modal = document.getElementById('preview-modal');
        const body = document.getElementById('preview-body');
        if (!modal || !body) return;

        // Get content and format checks (Ruby conversion)
        let content = this.editor ? this.editor.value : "";

        // Escape HTML first
        content = content.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Convert Ruby syntax: ｜漢字《かんじ》 -> <ruby>漢字<rt>かんじ</rt></ruby>
        // Regex: ｜(NotMarkers)《(NotMarkers)》
        content = content.replace(/｜([^｜《》]+?)《(.+?)》/g, '<ruby>$1<rt>$2</rt></ruby>');

        body.innerHTML = content;

        // Apply vertical mode if editor has it
        if (this.editor && this.editor.classList.contains('vertical')) {
            body.classList.add('vertical');
        } else {
            body.classList.remove('vertical');
        }

        modal.classList.remove('hidden');
    },

    closePreview() {
        const modal = document.getElementById('preview-modal');
        if (modal) modal.classList.add('hidden');
    }
};

// Global Exposure for HTML buttons
window.toggleVerticalMode = () => EditorUI.toggleVertical();
window.saveCurrentChapter = () => {
    EditorUI.triggerAutoSave();
    EditorUI.showSavedStatus();
};
// Re-export specific functions if needed by legacy
window.insertRuby = () => EditorUI.insertRuby();
window.insertDash = () => EditorUI.insertDash();
window.closePreview = () => EditorUI.closePreview();
