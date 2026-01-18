import { db } from "./config.js"; // Core DB Config
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    getDoc,
    setDoc,
    getDocs,
    increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * WORKS (作品管理)
 */

export function subscribeWorks(uid, callback) {
    const q = query(collection(db, "works"), where("uid", "==", uid));
    return onSnapshot(q, (snapshot) => {
        const works = [];
        snapshot.forEach((doc) => {
            works.push({ id: doc.id, ...doc.data() });
        });
        callback(works);
    });
}

export async function createWork(data) {
    const docRef = await addDoc(collection(db, "works"), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        pinned: false,
        totalChars: 0
    });
    return docRef.id;
}

export async function updateWork(workId, data) {
    const docRef = doc(db, "works", workId);
    await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
    });
}

export async function deleteWork(workId) {
    await deleteDoc(doc(db, "works", workId));
}

export async function toggleWorkPin(workId, currentPinStatus) {
    const docRef = doc(db, "works", workId);
    await updateDoc(docRef, { pinned: !currentPinStatus });
}

/**
 * CHAPTERS (話管理)
 */

export function subscribeChapters(workId, callback) {
    const q = query(collection(db, "works", workId, "chapters"), orderBy("order", "asc"));
    return onSnapshot(q, (snapshot) => {
        const chapters = [];
        snapshot.forEach((doc) => {
            chapters.push({ id: doc.id, ...doc.data() });
        });
        callback(chapters);
    });
}

export async function createChapter(workId, order, initialContent = "") {
    const docRef = await addDoc(collection(db, "works", workId, "chapters"), {
        title: `第${order}話`,
        content: initialContent,
        order: order,
        updatedAt: serverTimestamp()
    });
    return docRef.id;
}

export async function updateChapter(workId, chapterId, data) {
    const docRef = doc(db, "works", workId, "chapters", chapterId);
    await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
    });
}

export async function deleteChapter(workId, chapterId) {
    await deleteDoc(doc(db, "works", workId, "chapters", chapterId));
}

/**
 * STATISTICS & HISTORY (統計・履歴)
 */

export async function incrementDailyProgress(uid, amount) {
    if (amount === 0) return;
    console.log(`[Stats] Incrementing progress for ${uid}: +${amount}`);

    // Fix: Use local date for consistency with user's perspective
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`; // Local YYYY-MM-DD

    const docRef = doc(db, "users", uid, "dailyProgress", today);
    // Use setDoc with merge to ensure doc exists, but use increment for atomic update
    await setDoc(docRef, {
        count: increment(amount),
        date: today
    }, { merge: true });
}

export async function getRecentDailyProgress(uid, days = 7) {
    const q = query(
        collection(db, "users", uid, "dailyProgress"),
        orderBy("date", "desc")
    );
    const snapshot = await getDocs(q);
    const stats = [];
    snapshot.forEach((doc) => stats.push(doc.data()));
    return stats.slice(0, days).reverse();
}

/**
 * HISTORY BACKUP (バックアップ)
 */
export async function saveHistoryBackup(workId, chapterId, content) {
    const historyRef = collection(db, "works", workId, "chapters", chapterId, "history");
    const data = {
        content: content,
        timestamp: serverTimestamp()
    };
    await addDoc(historyRef, data);
}

/**
 * MEMOS (メモ管理)
 */

export function subscribeMemos(workId, callback) {
    const q = query(collection(db, "works", workId, "memos"), orderBy("order", "asc"));
    return onSnapshot(q, (snapshot) => {
        const memos = [];
        snapshot.forEach((doc) => {
            memos.push({ id: doc.id, ...doc.data() });
        });
        callback(memos);
    });
}

export async function createMemo(workId, title, content) {
    const initialOrder = Date.now();
    const docRef = await addDoc(collection(db, "works", workId, "memos"), {
        title: title || "新規メモ",
        content: content || "",
        order: initialOrder,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    return docRef.id;
}

export async function updateMemo(workId, memoId, data) {
    const docRef = doc(db, "works", workId, "memos", memoId);
    await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
    });
}

export async function updateMemoOrder(workId, id1, order1, id2, order2) {
    const ref1 = doc(db, "works", workId, "memos", id1);
    const ref2 = doc(db, "works", workId, "memos", id2);
    await updateDoc(ref1, { order: order2, updatedAt: serverTimestamp() });
    await updateDoc(ref2, { order: order1, updatedAt: serverTimestamp() });
}

export async function deleteMemo(workId, memoId) {
    await deleteDoc(doc(db, "works", workId, "memos", memoId));
}
