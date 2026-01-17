/**
 * Chapter List Rendering & Interaction
 */

import { escapeHtml } from "../core/utils.js";
import { WordCounter } from "./word-count.js";

// chapterManager is imported dynamically or via window to avoid circular dep if needed, 
// but here we just need to trigger reorder on manager.
// better to pass reorder callback. but let's assume usage of window.chapterManager for simple wiring for now
// or better, init interaction in main.

export function renderChapterList(chapters, activeId, onSelect) {
    const container = document.getElementById('chapter-list-container');
    if (!container) return;

    container.innerHTML = '';

    if (chapters.length === 0) {
        container.innerHTML = '<div class="empty-state">話がありません</div>';
        return;
    }

    chapters.forEach((chapter, index) => {
        const item = document.createElement('div');
        item.className = 'chapter-item-new';
        if (chapter.id === activeId) item.classList.add('active');
        item.draggable = true;
        item.dataset.index = index;
        item.dataset.id = chapter.id;

        const pureCount = WordCounter.countPure(chapter.content || "");

        item.innerHTML = `
            <span class="title">${escapeHtml(chapter.title)}</span>
            <span class="count">${pureCount}</span>
        `;

        item.onclick = () => onSelect(chapter.id);

        // Drag Events
        addDragEvents(item);

        container.appendChild(item);
    });
}

function addDragEvents(item) {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragenter', handleDragEnter);
    item.addEventListener('dragleave', handleDragLeave);
}

let dragSrcEl = null;

function handleDragStart(e) {
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    this.classList.add('dragging');
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    this.classList.add('over');
}

function handleDragLeave(e) {
    this.classList.remove('over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    // Don't do anything if dropping the same column we're dragging.
    if (dragSrcEl !== this) {
        const fromIndex = parseInt(dragSrcEl.dataset.index);
        const toIndex = parseInt(this.dataset.index);

        if (window.chapterManager) {
            window.chapterManager.reorderChapters(fromIndex, toIndex);
        }
    }

    // Cleanup
    const cols = document.querySelectorAll('.chapter-item-new');
    cols.forEach(col => {
        col.classList.remove('over');
        col.classList.remove('dragging');
    });

    return false;
}
