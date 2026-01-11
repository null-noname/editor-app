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

let chaptersUnsubscribe = null;
let memosUnsubscribe = null;
let currentWorkId = null;
let currentChapterId = null;
let editingMemoId = null; // 現在編集中のメモID（nullなら新規）
let currentMemosList = []; // 現在のメモリストを保持

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
        if (typeof window.closeMemoEdit === 'function') window.closeMemoEdit();
    }
}

/**
 * ワークスペースを閉じる
 */
export function closeWorkspace() {
    console.log("Closing workspace...");
    if (chaptersUnsubscribe) chaptersUnsubscribe();
    if (memosUnsubscribe) memosUnsubscribe();

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
    if (memosUnsubscribe) memosUnsubscribe();

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

    // Subscribe Memos
    memosUnsubscribe = import("../../core/db.js").then(m => m.subscribeMemos(workId, (memos) => {
        currentMemosList = memos;
        renderMemoList(memos);
    }));
}

function renderMemoList(memos) {
    const listEl = document.getElementById('memo-list');
    if (!listEl) return;

    if (memos.length === 0) {
        listEl.innerHTML = '<p style="text-align:center; color:#666; padding: 20px;">メモがありません</p>';
        return;
    }

    // orderプロパティで昇順ソート（手動並び替え用）
    const sortedMemos = [...memos].sort((a, b) => (a.order || 0) - (b.order || 0));

    // コンテナを一旦クリア
    listEl.innerHTML = '';

    sortedMemos.forEach((memo, index) => {
        const escapedTitle = (memo.title || "無題のメモ").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const escapedContent = (memo.content || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        const card = document.createElement('div');
        card.className = 'memo-card collapsed'; // 初期状態は閉じている（CSSで制御）
        card.innerHTML = `
            <div class="memo-header" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
                <h4 class="memo-title" style="margin:0; flex:1;">${escapedTitle}</h4>
                <div class="memo-actions" style="display:flex; gap:8px; align-items:center;">
                    <button class="btn-retro edit blue" style="padding:4px 10px; font-size:0.75rem;">編集</button>
                    <button class="btn-retro move-up" style="padding:4px 8px; font-size:0.75rem;">▲</button>
                    ${index < sortedMemos.length - 1 ? `<button class="btn-retro move-down" style="padding:4px 8px; font-size:0.75rem;">▼</button>` : ''}
                </div>
            </div>
            <div class="memo-content" style="display:none; margin-top:12px; padding-top:12px; border-top:1px dashed #444; white-space:pre-wrap; font-size:0.95rem; line-height:1.6; color:#ddd;">
                ${escapedContent || '内容なし'}
            </div>
        `;

        // クリックで開閉（ヘッダー部分のみ）
        card.querySelector('.memo-header').addEventListener('click', (e) => {
            if (e.target.closest('button')) return; // ボタンクリック時は無視
            const content = card.querySelector('.memo-content');
            const isHidden = content.style.display === 'none';
            content.style.display = isHidden ? 'block' : 'none';
        });

        // 編集ボタン
        card.querySelector('.edit').addEventListener('click', (e) => {
            e.stopPropagation();
            editMemo(memo.id, memo.title, memo.content);
        });

        // 移動ボタン
        card.querySelector('.move-up').addEventListener('click', (e) => {
            e.stopPropagation();
            moveMemoUp(index);
        });

        const moveDownBtn = card.querySelector('.move-down');
        if (moveDownBtn) {
            moveDownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                moveMemoDown(index);
            });
        }

        listEl.appendChild(card);
    });
}




/**
 * メモを上に移動
 */
export async function moveMemoUp(index) {
    if (index <= 0) return;
    const { updateMemoOrder } = await import("../../core/db.js");
    const m1 = currentMemosList[index];
    const m2 = currentMemosList[index - 1];
    await updateMemoOrder(currentWorkId, m1.id, m1.order, m2.id, m2.order);
}

/**
 * メモを下に移動
 */
export async function moveMemoDown(index) {
    if (index >= currentMemosList.length - 1) return;
    const { updateMemoOrder } = await import("../../core/db.js");
    const m1 = currentMemosList[index];
    const m2 = currentMemosList[index + 1];
    await updateMemoOrder(currentWorkId, m1.id, m1.order, m2.id, m2.order);
}

/**
 * 新規メモ作成画面を開く
 */
export function addNewMemo() {
    editingMemoId = null;
    document.getElementById('memo-title-input').value = "";
    document.getElementById('memo-content-input').value = "";
    document.getElementById('memo-delete-btn').classList.add('hidden');

    toggleMemoSubview('edit');
}

/**
 * メモ編集画面を開く
 */
export const editMemo = (memoId, title, content) => {
    editingMemoId = memoId;
    document.getElementById('memo-title-input').value = title || "";
    document.getElementById('memo-content-input').value = content || "";
    document.getElementById('memo-delete-btn').classList.remove('hidden');

    toggleMemoSubview('edit');
};

/**
 * メモ編集画面を閉じて一覧に戻る
 */
export const closeMemoEdit = () => {
    toggleMemoSubview('list');
};

/**
 * メモの保存
 */
export const saveMemoCurrent = async () => {
    const title = document.getElementById('memo-title-input').value.trim() || "無題のメモ";
    const content = document.getElementById('memo-content-input').value;
    const { createMemo, updateMemo } = await import("../../core/db.js");

    if (editingMemoId) {
        await updateMemo(currentWorkId, editingMemoId, { title, content });
    } else {
        await createMemo(currentWorkId, title, content);
    }

    closeMemoEdit();
};

// 全体から現在の作品IDを参照できるようにする（保存ミス防止）
window.getCurrentWorkId = () => currentWorkId;

/**
 * 作品情報の表示モード（プロッター同期・表示専用）
 */
export async function toggleWorkInfoMode(mode) {
    const infoContainer = document.getElementById('ws-info-container');
    const infoView = document.getElementById('info-view');

    if (!infoContainer || !infoView) return;

    // パネルを探す（テンプレート内または移動済みのコンテナ内）
    const infoPanel = infoView.querySelector('.card-retro') || infoContainer.querySelector('.card-retro');

    if (infoPanel) {
        // コンテナへ移動（まだ移動していない場合のみ）
        if (infoPanel.parentElement !== infoContainer) {
            infoContainer.appendChild(infoPanel);
        }

        // データの流し込み（キャッシュがない場合は少し待機してみる）
        let works = getAllWorks();
        if (works.length === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            works = getAllWorks();
        }

        const work = works.find(w => w.id === currentWorkId);
        if (work) {
            // 第2引数にコンテナを渡し、名指しで描画させる
            renderWorkInfo(work, infoContainer);
        }
    }
}

/**
 * 現在編集中のメモを削除
 */
export const deleteMemoCurrent = async () => {
    if (editingMemoId && confirm("このメモを削除してもよろしいですか？")) {
        const { deleteMemo } = await import("../../core/db.js");
        await deleteMemo(currentWorkId, editingMemoId);
        closeMemoEdit();
    }
};

/**
 * メモのサブビュー（一覧/編集）を切り替え
 */
function toggleMemoSubview(view) {
    const listView = document.getElementById('memo-view-list');
    const editView = document.getElementById('memo-view-edit');

    if (view === 'list') {
        listView?.classList.add('active-subview');
        listView?.classList.remove('hidden');
        editView?.classList.add('hidden');
    } else {
        listView?.classList.remove('active-subview');
        listView?.classList.add('hidden');
        editView?.classList.remove('hidden');
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

// エディタ便利機能の委譲
export { toggleVerticalMode, insertRuby, insertDash };
