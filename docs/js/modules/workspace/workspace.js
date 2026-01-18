/**
 * エディタ画面（Workspace）専用ロジック (js/modules/workspace/workspace.js)
 */
import {
    subscribeChapters,
    createChapter,
    updateChapter,
    saveHistoryBackup
} from "../../core/db.js";
import {
    switchView,
    views,
    toggleElementVisibility,
    renderWorkInfo,
    showToast
} from "../../ui.js";
import { getAllWorks } from "../dashboard/dashboard.js";
import { initMemoList, refreshMemoList } from "../memo/memo-list.js";
import { initMemoEditor, setMemoWorkId } from "../memo/memo-editor.js";

// New Modules
import { EditorUI } from "../editor-ui.js";
import { chapterManager } from "../chapter-manager.js";

// Initialize Memo System
initMemoList();
initMemoEditor();

let chaptersUnsubscribe = null;
let currentWorkId = null;

/**
 * ワークスペースを開く
 */
export async function openWork(id, tab = 'editor') {
    currentWorkId = id;
    chapterManager.setWorkId(id);

    // URLハッシュの更新
    const hash = `${views.workspace}?id=${id}${tab ? '&tab=' + tab : ''}`;
    if (window.location.hash !== '#' + hash) {
        window.location.hash = hash;
    }

    switchView(views.workspace, true);
    setMemoWorkId(id);
    setupWorkspace(id);
    switchWorkspaceTab(tab);
}

/**
 * ワークスペース内のタブ切り替え
 */
export function switchWorkspaceTab(tab) {
    const tabEditor = document.getElementById('tab-editor');
    const tabInfo = document.getElementById('tab-info');
    const tabMemo = document.getElementById('tab-memo');
    const contentEditor = document.getElementById('ws-content-editor');
    const contentInfo = document.getElementById('ws-content-info');
    const contentMemo = document.getElementById('ws-content-memo');

    if (!tabEditor) return;

    // URLハッシュの更新
    const currentHash = window.location.hash;
    if (currentHash.includes(views.workspace)) {
        const params = new URLSearchParams(currentHash.split('?')[1] || '');
        if (params.get('tab') !== tab) {
            params.set('tab', tab);
            window.location.hash = `${views.workspace}?${params.toString()}`;
        }
    }

    // Reset active states
    [tabEditor, tabInfo, tabMemo].forEach(t => t?.classList.remove('active'));
    [contentEditor, contentInfo, contentMemo].forEach(c => c?.classList.remove('active'));

    if (tab === 'editor') {
        tabEditor.classList.add('active');
        contentEditor.classList.add('active');
    } else if (tab === 'info') {
        tabInfo.classList.add('active');
        contentInfo.classList.add('active');
        toggleWorkInfoMode('view');
    } else if (tab === 'memo') {
        tabMemo.classList.add('active');
        contentMemo.classList.add('active');
        refreshMemoList(currentWorkId);
        if (window.plotter_closeMemoEditor) window.plotter_closeMemoEditor();
    }
}

/**
 * ワークスペースを閉じる
 */
export function closeWorkspace() {
    console.log("Closing workspace...");
    if (chaptersUnsubscribe) chaptersUnsubscribe();

    const infoContainer = document.getElementById('ws-info-container');
    const setupForm = document.querySelector('#setup-view .form-panel');
    const infoPanel = document.querySelector('#info-view .form-panel');

    const setupContainer = document.querySelector('#setup-view .container-narrow');
    if (setupForm && setupContainer) {
        setupContainer.appendChild(setupForm);
        setupForm.classList.remove('workspace-full-form');
        toggleElementVisibility('setup-view-header', true);
    }

    const infoContainerNarrow = document.querySelector('#info-view .container-narrow');
    if (infoPanel && infoContainerNarrow) {
        infoContainerNarrow.appendChild(infoPanel);
        infoPanel.classList.remove('workspace-full-form');
    }

    if (infoContainer) infoContainer.innerHTML = '';

    currentWorkId = null;
    chapterManager.setWorkId(null);
    chapterManager.setChapters([]); // Clear chunks

    window.location.hash = views.top;
}

/**
 * チャプター管理とエディタのセットアップ
 */
function setupWorkspace(workId) {
    if (chaptersUnsubscribe) chaptersUnsubscribe();

    // エディタUIの初期化 (Input Binding等)
    EditorUI.init();

    // DB購読開始
    chaptersUnsubscribe = subscribeChapters(workId, async (chapters) => {
        // Migration Check
        if (chapters.length === 0) {
            const works = getAllWorks();
            const work = works.find(w => w.id === workId);
            let initialContent = "";
            if (work && work.content) {
                initialContent = work.content;
                console.log("Migrating legacy content...");
            }
            // Create Chapter 1 (Migration)
            await createChapter(workId, 1, initialContent);
            return;
        }

        // Update Manager with new data
        chapterManager.setChapters(chapters);
    });
}


/**
 * 作品情報の表示モード（プロッター同期・表示専用）
 */
export async function toggleWorkInfoMode(mode) {
    const infoContainer = document.getElementById('ws-info-container');
    const infoView = document.getElementById('info-view');

    if (!infoContainer || !infoView) return;

    const infoPanel = infoView.querySelector('.info-view-wrapper') || infoContainer.querySelector('.info-view-wrapper');

    if (infoPanel) {
        if (infoPanel.parentElement !== infoContainer) {
            infoContainer.appendChild(infoPanel);
        }
        let works = getAllWorks();
        if (works.length === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            works = getAllWorks();
        }
        const work = works.find(w => w.id === currentWorkId);
        if (work) {
            renderWorkInfo(work, infoContainer);
        }
    }
}

/**
 * Global calls delegated to modules
 */
export async function saveCurrentChapter() {
    EditorUI.triggerAutoSave();
    showToast("保存しました");
}

export async function addNewChapter() {
    chapterManager.addChapter();
}

/**
 * Editor features forwarded to EditorUI global exposure or implementation
 */
export const toggleVerticalMode = () => EditorUI.toggleVertical();
export const insertRuby = () => EditorUI.insertRuby();
export const insertDash = () => EditorUI.insertDash();
export const toggleChapterDeleteMode = () => chapterManager.toggleDeleteMode();

// Fallback: Manually register critical navigation functions to window avoid import timing issues
window.closeWorkspace = closeWorkspace;
window.openWork = openWork;
window.saveCurrentChapter = saveCurrentChapter;

