/**
 * Export Manager
 * Handles exporting chapter content to TXT or PDF.
 */

import { escapeHtml } from "../core/utils.js";

export const ExportManager = {
    init() {
        this.bindEvents();
    },

    bindEvents() {
        const btn = document.getElementById('btn-export');
        const panel = document.getElementById('export-panel');
        const btnTxt = document.getElementById('btn-export-txt');
        const btnPdf = document.getElementById('btn-export-pdf');

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

        if (btnTxt) {
            btnTxt.onclick = () => this.exportTXT();
        }

        if (btnPdf) {
            btnPdf.onclick = () => this.exportPDF();
        }
    },

    exportTXT() {
        const content = this.getContent();
        const title = this.getTitle();
        if (!content) {
            alert("本文がありません。");
            return;
        }

        const blob = new Blob([content], { type: "text/plain" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title}.txt`;
        a.click();
        window.URL.revokeObjectURL(url);
    },

    exportPDF() {
        // PDF Export relies on Browser Print to PDF
        // We create a temporary printable view or use CSS media print.
        // For simplicity and best fidelity with the current vertical writing view,
        // we can just print the current editor view, BUT we want to hide UI.

        // Better: Open a new window with formatted content and print it.

        const content = this.getContent();
        const title = this.getTitle();
        // Check current writing mode
        const isVertical = document.getElementById('main-editor').classList.contains('vertical');

        const win = window.open('', '_blank');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${escapeHtml(title)}</title>
                <style>
                    body {
                        font-family: serif;
                        padding: 40px;
                        font-size: 12pt;
                        line-height: 2.0;
                    }
                    h1 {
                        text-align: center;
                        font-size: 18pt;
                        margin-bottom: 50px;
                    }
                    .content {
                        white-space: pre-wrap;
                        text-align: justify;
                    }
                    /* Vertical Writing Support */
                    ${isVertical ? `
                    body {
                        writing-mode: vertical-rl;
                        padding-top: 50px; /* Right to Left scroll start? No, print handles pages */
                        height: 100vh;
                        overflow: visible; /* For print */
                    }
                    h1 {
                        margin-left: 50px; /* In vertical mode this pushes it down/left based on flow */
                        margin-bottom: 0;
                        margin-left: 2em;
                    }
                    ` : ''}
                    
                    @media print {
                        @page { margin: 20mm; }
                        body { 
                           /* Reset height for print to allow paging */
                           height: auto; 
                           overflow: visible;
                        }
                    }
                </style>
            </head>
            <body>
                <h1>${escapeHtml(title)}</h1>
                <div class="content">${escapeHtml(content)}</div>
                <script>
                    window.onload = function() {
                        setTimeout(() => {
                            window.print();
                            // Optional: window.close();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `;

        win.document.write(html);
        win.document.close();
    },

    getContent() {
        // Get from DB or Editor? Editor is most up to date.
        return document.getElementById('main-editor').value;
    },

    getTitle() {
        const input = document.getElementById('chapter-subtitle');
        if (input && input.value.trim()) return input.value.trim();

        // Fallback to "Chapter N"
        if (window.chapterManager && window.chapterManager.currentChapterId) {
            const ch = window.chapterManager.getCurrentChapter();
            if (ch) return ch.title; // "第N話"
        }
        return "Untitled_Chapter";
    }
};
