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
    setupEditor,
    setEditorContent,
    getEditorContent,
    toggleVerticalMode,
    insertRuby,
    insertDash
} from "../../editor.js";
import {
    renderChapterList,
    switchView,
    views,
    populateWorkForm,
    toggleElementVisibility,
    renderWorkInfo
} from "../../ui.js";
import { adjustFormLayout } from "../setup/setup.js";
import { getAllWorks, setupDashBoard } from "../dashboard/dashboard.js";
import { initMemoList, refreshMemoList } from "../memo/memo-list.js";
import { initMemoEditor, setMemoWorkId } from "../memo/memo-editor.js";

// Initialize Memo System
initMemoList();
initMemoEditor();

let chaptersUnsubscribe = null;
let currentWorkId = null;
let currentChapterId = null;

/**
 * ワークスペースを開く
 */
export async function openWork(id, tab = 'editor') {
    currentWorkId = id;
    // URLハッシュの更新 (main.js経由でのルーティングを想定)
    const hash = `${views.workspace}?id=${id}${tab ? '&tab=' + tab : ''}`;
    if (window.location.hash !== '#' + hash) {
        window.location.hash = hash;
    }

    switchView(views.workspace, true);
    setMemoWorkId(id); // Update Memo module with new Work ID
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

    // URLハッシュの更新 (現在のタブを記憶させる)
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
        // Refresh Memo List with new Logic
        refreshMemoList(currentWorkId);
        // Ensure Editor is closed when entering tag
        if (window.plotter_closeMemoEditor) window.plotter_closeMemoEditor();
    }
}

/**
 * ワークスペースを閉じる
 */
export function closeWorkspace() {
    console.log("Closing workspace...");
    if (chaptersUnsubscribe) chaptersUnsubscribe();
    if (chaptersUnsubscribe) chaptersUnsubscribe();

    const infoContainer = document.getElementById('ws-info-container');
    const setupForm = document.querySelector('#setup-view .form-panel'); // 編集用フォーム
    const infoPanel = document.querySelector('#info-view .form-panel');   // 閲覧用パネル

    // 編集フォームの返却
    const setupContainer = document.querySelector('#setup-view .container-narrow');
    if (setupForm && setupContainer) {
        setupContainer.appendChild(setupForm);
        setupForm.classList.remove('workspace-full-form');
        toggleElementVisibility('setup-view-header', true);
    }

    // 閲覧パネルの返却
    const infoContainerNarrow = document.querySelector('#info-view .container-narrow');
    if (infoPanel && infoContainerNarrow) {
        infoContainerNarrow.appendChild(infoPanel);
        infoPanel.classList.remove('workspace-full-form');
    }

    // 執筆画面内の器を空にする
    if (infoContainer) infoContainer.innerHTML = '';

    currentWorkId = null;
    currentChapterId = null;

    // TOPへ戻る (ハッシュを書き換えて main.js のルーティングを走らせる)
    window.location.hash = views.top;
}

/**
 * チャプター管理とエディタのセットアップ
 */
function setupWorkspace(workId) {
    if (chaptersUnsubscribe) chaptersUnsubscribe();


    setupEditor(
        () => { }, // OnInput
        saveCurrentChapter
    );

    // Subscribe Chapters
    chaptersUnsubscribe = subscribeChapters(workId, (chapters) => {
        if (chapters.length === 0) {
            console.log("No chapters found, creating first chapter...");
            createChapter(workId, 1);
            return;
        }
        renderChapterList(chapters, currentChapterId, (id, content) => {
            currentChapterId = id;
            setEditorContent(content);
            renderChapterList(chapters, currentChapterId, null);
        });

        if (!currentChapterId) {
            currentChapterId = chapters[0].id;
            setEditorContent(chapters[0].content);
        }
    });


}


/**
 * 作品情報の表示モード（プロッター同期・表示専用）
 */
export async function toggleWorkInfoMode(mode) {
    const infoContainer = document.getElementById('ws-info-container');
    const infoView = document.getElementById('info-view');

    if (!infoContainer || !infoView) return;

    // パネルを探す
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
 * 現在のチャプターを保存
 */
export async function saveCurrentChapter() {
    if (currentWorkId && currentChapterId) {
        const content = getEditorContent();
        await updateChapter(currentWorkId, currentChapterId, content);
        await saveHistoryBackup(currentWorkId, currentChapterId, content);
    }
}

/**
 * 新規チャプター追加
 */
export async function addNewChapter() {
    if (currentWorkId) {
        const nextOrder = document.querySelectorAll('.chapter-item').length + 1;
        const newId = await createChapter(currentWorkId, nextOrder);
        currentChapterId = newId;
    }
}

// エディタ便利機能の委譲
export { toggleVerticalMode, insertRuby, insertDash };
