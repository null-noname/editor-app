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
        // 1. Remove Ruby syntax: ｜Parent《Ruby》 -> Parent
        // Matches "｜" followed by non-Ruby-markers, followed by "《" ... "》"
        // We replace the whole block with group 1 (Parent)
        let processed = text.replace(/｜([^｜《》]+?)《.+?》/g, '$1');

        // 2. Remove all whitespace
        return processed.replace(/\s+/g, '').length;
    },

    /**
     * Count total characters (including whitespace and newlines)
     * @param {string} text 
     * @returns {number}
     */
    countTotal(text) {
        if (!text) return 0;
        // Fix: Exclude Ruby markers (｜, 《, 》) from total count to match Nola/Manuscript behavior
        // Keeps the base text and the reading, just removes the syntax symbols.
        // Difference 33 chars / 3 symbols = 11 rubies fit the user report perfectly.
        return text.replace(/[｜《》]/g, '').length;
    }
};
