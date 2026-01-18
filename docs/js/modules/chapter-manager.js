/**
 * Chapter Management Logic (DB Integrated)
 */

import { createChapter, updateChapter, incrementDailyProgress, deleteChapter } from "../core/db.js";
import { renderChapterList } from "./chapter-list.js";
import { WordCounter } from "./word-count.js";

class ChapterManager {
    constructor() {
        this.chapters = [];
        this.currentChapterId = null;
        this.workId = null;
        this.pendingSelectId = null;
    }

    setWorkId(id) {
        this.workId = id;
    }

    getCurrentChapter() {
        return this.chapters.find(c => c.id === this.currentChapterId);
    }

    /**
     * Called when DB updates the chapters list
     */
    setChapters(newChapters) {
        this.chapters = newChapters;

        // Render List
        this._render();

        // Validate selection
        if (this.currentChapterId && !this.chapters.find(c => c.id === this.currentChapterId)) {
            this.currentChapterId = null;
        }

        // Auto selection logic
        if (this.pendingSelectId) {
            const found = this.chapters.find(c => c.id === this.pendingSelectId);
            if (found) {
                this.selectChapter(found.id);
                this.pendingSelectId = null;
                return;
            }
        }

        if (!this.currentChapterId && this.chapters.length > 0) {
            this.selectChapter(this.chapters[0].id);
        }
    }

    selectChapter(id) {
        const chapter = this.chapters.find(c => c.id === id);
        if (chapter) {
            const isSame = this.currentChapterId === id;
            this.currentChapterId = id;
            this._render();

            // Only dispatch change if it's a different chapter, 
            // OR if strictly needed. Avoiding dispatch on same chapter prevents
            // overwriting editor state while typing if a background update happens.
            if (!isSame) {
                const event = new CustomEvent('chapterChanged', {
                    detail: { chapter: chapter }
                });
                window.dispatchEvent(event);
            }
        }
    }

    async addChapter() {
        if (!this.workId) return;
        if (this.chapters.length >= 1000) {
            alert("最大1000話までです。");
            return;
        }

        const nextOrder = this.chapters.length > 0 ? (this.chapters[this.chapters.length - 1].order + 1) : 1;

        // Optimistic UI update could happen here, but we rely on DB sub.
        try {
            const newId = await createChapter(this.workId, nextOrder);
            this.pendingSelectId = newId;
        } catch (e) {
            console.error("Failed to create chapter", e);
            alert("話の作成に失敗しました。");
        }
    }

    async updateCurrentChapter(data) {
        if (!this.workId || !this.currentChapterId) return;

        const current = this.getCurrentChapter();
        let delta = 0;

        // Calculate progress if content is updated
        if (current && typeof data.content === 'string') {
            const oldPure = WordCounter.countPure(current.content || "");
            const newPure = WordCounter.countPure(data.content);
            delta = newPure - oldPure;

            // CRITICAL FIX: Update local state IMMEDIATELY to prevent double-counting
            // caused by Firestore snapshot latency.
            current.content = data.content;
            if (data.title) current.title = data.title;
        }

        try {
            // Update Firestore (Debouncing might be better, but user asked for immediate fix)
            // Note: We are sending every keystroke to DB here? 
            // editor-ui.js calls this on 'input'. That is too frequent for DB writes!
            // But we must fix the logic first.
            await updateChapter(this.workId, this.currentChapterId, data);

            if (delta !== 0) {
                const { auth } = await import("../core/config.js");
                if (auth.currentUser) {
                    await incrementDailyProgress(auth.currentUser.uid, delta);
                }
            }

        } catch (e) {
            console.error("Update failed", e);
            const statusEl = document.getElementById('save-status-msg');
            if (statusEl) {
                statusEl.textContent = "保存失敗";
                statusEl.style.color = "red";
            }
        }
    }

    /**
     * Delete Mode Logic
     */
    toggleDeleteMode() {
        this.isDeleteMode = !this.isDeleteMode;
        this._render();
        return this.isDeleteMode;
    }

    async deleteChapter(chapterId) {
        if (!confirm("本当にこの話を削除しますか？\n※削除後は元に戻せません。")) return;

        try {
            await deleteChapter(this.workId, chapterId);
            // If current chapter was deleted, clear selection or logic handled by onSnapshot
            if (this.currentChapterId === chapterId) {
                this.currentChapterId = null;
                // Clearing editor content visually might be needed, 
                // but usually handled by openWork/renders
            }
        } catch (e) {
            console.error("Failed to delete chapter", e);
            alert("削除に失敗しました。");
        }
    }

    /**
     * Simple reorder: swap orders of two items
     */
    async reorderChapters(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;

        const itemA = this.chapters[fromIndex];
        const itemB = this.chapters[toIndex];

        if (!itemA || !itemB) return;

        // Swap orders in DB
        // Note: If orders are not continuous integers, this swap logic is still valid
        // as long as we swap the 'order' field values.
        const orderA = itemA.order;
        const orderB = itemB.order;

        // We update both. 
        // Ideally use a batch write, but updateChapter is single.
        // We'll just do two updates.
        await updateChapter(this.workId, itemA.id, { order: orderB });
        await updateChapter(this.workId, itemB.id, { order: orderA });
    }

    _render() {
        renderChapterList(this.chapters, this.currentChapterId, (id) => this.selectChapter(id), this.isDeleteMode);
        this._updateTotalCount();
    }

    _updateTotalCount() {
        // Calculate total pure characters across all chapters
        const total = this.chapters.reduce((sum, ch) => {
            return sum + WordCounter.countPure(ch.content || "");
        }, 0);

        const el = document.getElementById('metric-total-pure');
        if (el) el.textContent = total.toLocaleString();
    }
}

export const chapterManager = new ChapterManager();
window.chapterManager = chapterManager;
