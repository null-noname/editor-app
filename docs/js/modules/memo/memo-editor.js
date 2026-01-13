/**
 * memo-editor.js - メモ編集ロジック (Modular SDK版)
 */

import { db } from '../../core/config.js';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, writeBatch, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { escapeHtml, autoResizeTextarea } from '../../core/utils.js';

let currentMemoId = null;
let currentWorkId = null;

/**
 * メモエディタの初期化
 */
export function initMemoEditor() {
    // グローバルブリッジ
    window.plotter_openMemoEditor = openMemoEditor;
    window.plotter_deleteMemo = deleteMemo;
    window.plotter_moveMemo = moveMemo;
    window.plotter_closeMemoEditor = closeMemoEditor;

    // イベントリスナー: 新規作成 (ワークスペース側のボタンも想定)
    const newBtn = document.getElementById('memo-new-btn');
    if (newBtn) newBtn.addEventListener('click', () => openMemoEditor(null));

    // イベントリスナー: 保存
    const saveBtn = document.querySelector('#memo-edit-view .btn-retro.save');
    if (saveBtn) saveBtn.addEventListener('click', saveMemo);

    // イベントリスナー: 戻る
    // (HTML側でonclick="window.plotter_closeMemoEditor()"されている場合もあるが、JSでも拾う)
    const backBtn = document.querySelector('#memo-edit-view .btn-retro.back');
    if (backBtn) backBtn.addEventListener('click', closeMemoEditor);

    const contentInput = document.getElementById('memo-content');
    if (contentInput) {
        contentInput.addEventListener('input', (e) => autoResizeTextarea(e.target));
    }
}

/**
 * 作業対象の作品IDを設定 (ワークスペース切り替え時に呼ぶ)
 */
export function setMemoWorkId(workId) {
    currentWorkId = workId;
}

/**
 * エディタを開く
 */
export async function openMemoEditor(id = null) {
    console.log('Target ID:', id, 'Current Work ID:', currentWorkId);

    if (!currentWorkId) {
        console.error("WorkID not set for Memo Editor");
        return;
    }
    currentMemoId = id;
    const listEl = document.getElementById('memo-list-view');
    const editEl = document.getElementById('memo-edit-view');
    if (listEl) listEl.style.display = 'none';
    if (editEl) {
        editEl.style.display = 'block';
        editEl.classList.remove('hidden'); // Force remove hidden class
        console.log('Memo Editor Visible:', editEl.style.display, 'Hidden Class Removed:', !editEl.classList.contains('hidden'));
    }

    const titleInput = document.getElementById('memo-title');
    const tagsInput = document.getElementById('memo-tags');
    const contentInput = document.getElementById('memo-content');

    if (id) {
        try {
            const memoRef = doc(db, "works", currentWorkId, "memos", id);
            const snap = await getDoc(memoRef);
            if (snap.exists()) {
                const data = snap.data();
                titleInput.value = data.title || "";
                tagsInput.value = (data.tags || []).join(', ');
                contentInput.value = data.content || "";
                setTimeout(() => autoResizeTextarea(contentInput), 0);
            }
        } catch (e) {
            console.error("Memo Load Error:", e);
        }
    } else {
        titleInput.value = "";
        tagsInput.value = "";
        contentInput.value = "";
        autoResizeTextarea(contentInput);
    }
}

/**
 * メモを閉じる
 */
export function closeMemoEditor() {
    const listEl = document.getElementById('memo-list-view');
    const editEl = document.getElementById('memo-edit-view');
    if (listEl) listEl.style.display = 'block';
    if (editEl) editEl.style.display = 'none';
}

/**
 * 保存処理
 */
export async function saveMemo() {
    if (!currentWorkId) return;

    const titleInput = document.getElementById('memo-title');
    const tagsInput = document.getElementById('memo-tags');
    const contentInput = document.getElementById('memo-content');

    const title = titleInput.value.trim();
    const tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);
    const content = contentInput.value;

    if (!title) {
        alert("タイトルを入力してください");
        return;
    }

    // Modular SDK use serverTimestamp imported
    const data = {
        title: title || "無題",
        tags: tags,
        content: content,
        updatedAt: serverTimestamp()
    };

    // User ID is technically needed for rules, but Plotter logic relied on 'state'. 
    // Editor uses `auth.currentUser`.
    // In strict rules, we might need uid. 
    // For now assuming existing rules allow write if auth.

    try {
        const memosCol = collection(db, "works", currentWorkId, "memos");

        if (currentMemoId) {
            await updateDoc(doc(memosCol, currentMemoId), data);
        } else {
            // New doc: get order
            const q = query(memosCol); // Count all? or verify logic. Plotter used snap.size
            const snap = await getDocs(q);
            data.order = snap.size;
            data.createdAt = serverTimestamp();
            await addDoc(memosCol, data);
        }
        // Save success -> Close
        closeMemoEditor();
    } catch (error) {
        console.error('[MemoEditor] 保存エラー:', error);
        alert("保存に失敗しました");
    }
}

/**
 * 削除処理
 */
export async function deleteMemo(id) {
    if (!currentWorkId) return;
    if (!confirm("本当に削除しますか？")) return;

    try {
        await deleteDoc(doc(db, "works", currentWorkId, "memos", id));
    } catch (error) {
        console.error('[MemoEditor] 削除エラー:', error);
        alert("削除に失敗しました");
    }
}

/**
 * 並び替え処理
 */
export async function moveMemo(id, dir) {
    if (!currentWorkId) return;

    try {
        const memosCol = collection(db, "works", currentWorkId, "memos");
        const q = query(memosCol, orderBy("order", "asc"));
        const snap = await getDocs(q);

        const memos = [];
        snap.forEach(d => memos.push({ id: d.id, ...d.data() }));

        const idx = memos.findIndex(m => m.id === id);
        if (idx === -1) return;

        const targetIdx = idx + dir;
        if (targetIdx < 0 || targetIdx >= memos.length) return;

        const other = memos[targetIdx];

        // Batch update
        const batch = writeBatch(db);
        batch.update(doc(memosCol, id), { order: targetIdx });
        batch.update(doc(memosCol, other.id), { order: idx });

        await batch.commit();

        // Refresh happens automatically via onSnapshot in list
    } catch (error) {
        console.error('[MemoEditor] 並び替えエラー:', error);
    }
}
