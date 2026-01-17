/**
 * Word Counting Logic
 */

export const WordCounter = {
    /**
     * Count pure characters (excluding whitespace and newlines)
     * @param {string} text 
     * @returns {number}
     */
    countPure(text) {
        if (!text) return 0;
        // Remove all whitespace (space, tab, no-break space, etc.) and line breaks
        return text.replace(/\s+/g, '').length;
    },

    /**
     * Count total characters (including whitespace and newlines)
     * @param {string} text 
     * @returns {number}
     */
    countTotal(text) {
        if (!text) return 0;
        // Depending on requirements, we might want to normalize newlines, 
        // but length usually suffices.
        return text.length;
    }
};
