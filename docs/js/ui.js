/**
 * UI Management and Rendering
 */
import { escapeHtml, formatWorkDate, formatDate } from "./core/utils.js";

export const views = {
    login: 'login-screen',
    top: 'top-view',
    setup: 'setup-view',
    workspace: 'workspace-view',
    memo: 'memo-view',
    stats: 'stats-view',
    info: 'info-view'
};

/**
 * Utility to show/hide elements using CSS classes (No direct style manipulation)
 */
export function toggleElementVisibility(elementId, isVisible) {
    const el = document.getElementById(elementId);
    if (el) {
        if (isVisible) el.classList.remove('hidden');
        else el.classList.add('hidden');
    }
}

/**
 * Update Statistics on Dashboard (TOP)
 */
export function renderStatsDashboard(data) {
    const todayChars = document.getElementById('stat-today-chars');
    const weeklyChars = document.getElementById('stat-weekly-chars');

    if (todayChars) todayChars.textContent = data.todayCount;
    if (weeklyChars) weeklyChars.textContent = data.weeklySum;
}

/**
 * Update Statistics Summary Grid (Stats View)
 */
export function renderStatsFull(data, totalWorks) {
    const today = document.getElementById('summary-today');
    const weekly = document.getElementById('summary-weekly');
    const monthly = document.getElementById('summary-monthly');
    const total = document.getElementById('summary-total-works');

    if (today) today.textContent = data.todayCount;
    if (weekly) weekly.textContent = data.weeklySum;
    if (monthly) monthly.textContent = data.monthlySum;
    if (total) total.textContent = totalWorks;
}

/**
 * Update Active Tab in Stats View
 */
export function updateActiveTab(label) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.trim() === label);
    });
}

/**
 * 作品詳細を表示（閲覧モード）
 */
/**
 * 作品詳細を表示（閲覧モード）- Plotter互換 (HTML生成方式)
 */
export function renderWorkInfo(work, container = document, prefix = "info-") {
    // Find the target container for dynamic content
    const targetDiv = (container instanceof HTMLElement)
        ? container.querySelector('#info-container')
        : document.getElementById('info-container');

    if (!targetDiv) return;

    // Logic from Plotter's renderWorkView
    const ratingLabels = {
        sexual: "性描写",
        violent: "暴力",
        cruel: "残酷"
    };
    const activeRatings = (work.rating || []).map(r => ratingLabels[r] || r).join('/');

    const statusLabels = {
        "in-progress": "制作中",
        "completed": "完了",
        "suspended": "中断"
    };
    const statusLabel = statusLabels[work.status] || "未設定";

    const aiLabels = {
        "none": "なし",
        "assist": "補助",
        "partial": "一部",
        "main": "本文"
    };
    const aiLabel = aiLabels[work.ai] || "なし";

    // Note: Plotter uses check for 'derivative', defaults to 'original'
    const typeLabel = (work.type === 'derivative') ? '二次創作' : 'オリジナル';

    // Note: Plotter uses check for 'short', defaults to 'long'
    const lengthLabel = (work.length === 'short') ? '短編' : '長編';

    targetDiv.innerHTML = `
        <div class="card-retro">
            <h3 style="color:#fff; font-size:1.6rem; margin-bottom:10px;">${escapeHtml(work.title || "無題")}</h3>
            
            <div class="work-meta-compact">
                <div class="work-meta-group">
                    <span class="meta-item"><span class="gold-bold" style="display:inline;">状態：</span>${statusLabel}</span>
                    <span class="meta-item"><span class="gold-bold" style="display:inline;">種別：</span>${typeLabel}</span>
                </div>
                <div class="work-meta-group">
                    <span class="meta-item"><span class="gold-bold" style="display:inline;">長さ：</span>${lengthLabel}</span>
                    <span class="meta-item"><span class="gold-bold" style="display:inline;">AI利用：</span>${aiLabel}</span>
                </div>
                ${activeRatings ? '<div class="work-meta-group"><span class="meta-item"><span class="gold-bold" style="display:inline;">レーティング：</span>' + activeRatings + '</span></div>' : ''}
            </div>

            <label class="gold-bold" style="font-size:0.8rem; opacity:0.7; margin-bottom:2px;">キャッチコピー</label>
            <div style="color:#fff; margin-bottom:15px; font-size:1.1rem;">${escapeHtml(work.catchphrase || "（未設定）")}</div>
            
            <label class="gold-bold" style="font-size:0.8rem; opacity:0.7; margin-bottom:2px;">あらすじ</label>
            <div style="color:#fff; white-space:pre-wrap; line-height:1.7; font-size:1.1rem; margin-bottom:20px;">${escapeHtml(work.description || "あらすじ未入力")}</div>
        </div>
    `;
}

/**
 * Get Data from Work Setup Form
 */
export function getWorkFormData() {
    return {
        title: document.getElementById('work-f-title').value.trim(),
        catchphrase: document.getElementById('work-f-catchphrase').value.trim(),
        description: document.getElementById('work-f-description')?.value.trim() || "",
        status: document.querySelector('input[name="work-status"]:checked')?.value || 'in-progress',
        length: document.querySelector('input[name="work-length"]:checked')?.value || 'long',
        type: document.querySelector('input[name="work-type"]:checked')?.value || 'original',
        ai: document.querySelector('input[name="work-ai"]:checked')?.value || 'none',
        rating: Array.from(document.querySelectorAll('input[name="rating"]:checked')).map(cb => cb.value)
    };
}

/**
 * Switch between different views
 */
export function switchView(viewId) {
    document.querySelectorAll('.view-content').forEach(v => {
        v.classList.remove('active');
        v.classList.add('hidden'); // hiddenクラスを使用
    });

    const loginScreen = document.getElementById(views.login);
    const mainApp = document.getElementById('main-app');

    if (viewId === views.login) {
        if (loginScreen) {
            loginScreen.classList.remove('hidden');
            loginScreen.style.display = 'flex'; // コンテナ自体はflexを維持
        }
        if (mainApp) mainApp.classList.add('hidden');
    } else {
        if (loginScreen) loginScreen.classList.add('hidden');
        if (mainApp) mainApp.classList.remove('hidden');

        // クリーンアップ処理: 執筆画面内の全画面表示設定が残っていたらリセットする
        document.querySelectorAll('.workspace-full-form').forEach(el => {
            el.classList.remove('workspace-full-form');
        });
        document.querySelectorAll('.info-view-actions').forEach(el => {
            el.style.display = ''; // 隠していたボタンを元に戻す
        });

        const target = document.getElementById(viewId);
        if (target) {
            target.classList.add('active');
            target.classList.remove('hidden');
        }
    }
}

/**
 * Render the work list
 */
export function renderWorkList(works, onOpen, onDelete, onPin, filter = 'all', sort = 'updatedAt', onEdit = null) {
    const container = document.getElementById('work-list');
    if (!container) return;

    // Filter logic matches Plotter's db query if possible, but we filter purely on client side here
    // Maintain filter support even if UI doesn't show it (for compatibility)
    let filtered = [...works];
    if (filter !== 'all') {
        filtered = filtered.filter(w => w.status === filter);
    }

    // Sort: Pinned first, then User choice
    filtered.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;

        if (sort === 'updatedAt') return b.updatedAt - a.updatedAt;
        return b.createdAt - a.createdAt;
    });

    container.innerHTML = '';
    if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:60px;color:#888;">作品がありません</div>';
        return;
    }

    filtered.forEach(work => {
        const item = document.createElement('div');
        // Match Plotter's class
        item.className = 'work-card';

        // Tags Logic
        const tagsHtml = `
            <span class="work-tag ${work.length === 'short' ? 'tag-short' : 'tag-long'}">${work.length === 'short' ? '短編' : '長編'}</span>
        `;

        // Card HTML Structure (Plotter copy)
        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <h3 style="margin:0;">${escapeHtml(work.title || "無題")}</h3>
                <button class="star-btn ${work.pinned ? 'active' : ''}" data-action="pin" title="お気に入り">${work.pinned ? '★' : '☆'}</button>
            </div>
            <div style="margin:5px 0;">${tagsHtml}</div>
            <div class="work-meta" style="display:flex; justify-content:space-between; align-items:flex-end; gap:2px; font-size:0.85rem; margin-top:auto; color:#666;">
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span>作成日: ${formatDate(work.createdAt)}</span>
                    <span>更新日: ${formatDate(work.updatedAt, true)}</span>
                </div>
                <button class="btn-retro edit-btn" data-action="edit" style="font-size:0.8rem; padding:4px 12px; background:transparent; color:#fff; border:1px solid #fff;">編集</button>
            </div>
        `;

        // Event Handling
        // Card Click (Open)
        item.onclick = (e) => {
            if (e.target.closest('button')) return;
            onOpen(work.id);
        };

        // Pin Button
        const starBtn = item.querySelector('[data-action="pin"]');
        if (starBtn) {
            starBtn.onclick = (e) => {
                e.stopPropagation();
                onPin(work.id, work.pinned);
            };
        }

        // Edit Button
        const editBtn = item.querySelector('[data-action="edit"]');
        if (editBtn) {
            editBtn.onclick = (e) => {
                e.stopPropagation();
                if (onEdit) onEdit(work.id);
                else if (window.showWorkSetup) window.showWorkSetup(work.id);
            };
        }

        container.appendChild(item);
    });
}



/**
 * Render the chapter list in the sidebar
 */
export function renderChapterList(chapters, currentChapterId, onSelect) {
    const list = document.getElementById('chapter-list');
    if (!list) return;

    list.innerHTML = '';
    chapters.forEach(d => {
        const div = document.createElement('div');
        div.className = 'chapter-item';
        if (currentChapterId === d.id) div.classList.add('active');
        div.innerHTML = `
            <span class="chapter-title">${escapeHtml(d.title)}</span>
            <span class="chapter-count">${(d.content || "").length}</span>
        `;
        div.onclick = () => onSelect(d.id, d.content);
        list.appendChild(div);
    });
}

/**
 * Render Selectors or Inputs for Work Info Form
 */
export function clearWorkForm() {
    const fields = {
        'work-f-title': '',
        'work-f-catchphrase': '',
        'work-f-description': ''
    };
    Object.entries(fields).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    });

    // Reset radios
    const defaults = {
        'work-status': 'in-progress',
        'work-length': 'long',
        'work-type': 'original',
        'work-ai': 'none'
    };
    Object.entries(defaults).forEach(([name, val]) => {
        const el = document.querySelector(`input[name="${name}"][value="${val}"]`);
        if (el) el.checked = true;
    });

    document.querySelectorAll('input[name="rating"]').forEach(cb => cb.checked = false);

    const countDisp = document.getElementById('catchphrase-count');
    if (countDisp) countDisp.textContent = "残35字";
}

export function populateWorkForm(work) {
    const fields = {
        'work-f-title': work.title || "",
        'work-f-catchphrase': work.catchphrase || "",
        'work-f-description': work.description || ""
    };
    Object.entries(fields).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    });

    const radios = {
        'work-status': work.status || 'in-progress',
        'work-length': work.length || 'long',
        'work-type': work.type || 'original',
        'work-ai': work.ai || 'none'
    };
    Object.entries(radios).forEach(([name, val]) => {
        const el = document.querySelector(`input[name="${name}"][value="${val}"]`);
        if (el) el.checked = true;
    });

    document.querySelectorAll('input[name="rating"]').forEach(cb => {
        cb.checked = (work.rating || []).includes(cb.value);
    });

    const countDisp = document.getElementById('catchphrase-count');
    if (countDisp) countDisp.textContent = `残${35 - (work.catchphrase || "").length}字`;
}


