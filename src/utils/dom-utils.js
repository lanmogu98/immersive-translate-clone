class DOMUtils {
    static isBlockElement(el) {
        const blockTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TD', 'DIV', 'BLOCKQUOTE'];
        return blockTags.includes(el.tagName);
    }

    static hasSignificantText(el) {
        if (!el.textContent) return false;
        const text = el.textContent.trim();
        // Filter out short texts (nav items, buttons usually)
        // Filter out code blocks
        if (el.closest('pre') || el.closest('code')) return false;
        return text.length > 10 && !/^\d+$/.test(text); // More than 10 chars, not just numbers
    }

    static getTranslatableElements() {
        const elements = [];
        // Enhanced selector to include lists, blockquotes, and captions
        const candidates = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, td, div, figcaption, dt, dd');

        for (const element of candidates) {
            // Basic visibility check
            if (element.offsetParent === null) continue;

            // Prevent translating our own elements
            if (element.classList.contains('immersive-translate-target')) continue;
            if (element.closest('.immersive-translate-target')) continue;

            // Skip navigation bars if possible (simple heuristic: common nav class/id substrings or role)
            // This is hard to get perfect universally without complex logic.
            // For now, we rely on text length. Small text in DIVs is often UI.

            // Ensure it has direct text content (not just nested elements)
            // This helps avoid translating container divs that just hold other divs
            if (['DIV', 'LI', 'TD'].includes(element.tagName) && !this.hasDirectText(element)) {
                continue;
            }

            const text = element.innerText.trim();
            // Lowered threshold to 10 to catch short captions
            if (text.length > 8 && !/^\d+$/.test(text)) {
                elements.push({ element, text });
            }
        }
        return elements;
    }

    static hasDirectText(element) {
        for (let node of element.childNodes) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                return true;
            }
        }
        return false;
    }

    static isSeparatelyTranslated(element) {
        // Logic updated to match 'appendChild' strategy
        // We check if the element already contains a direct child with the translation class
        return element.querySelector(':scope > .immersive-translate-target') !== null;
    }

    static injectTranslationNode(element) {
        const node = document.createElement('span'); // Use SPAN to be valid inside P and H tags
        node.className = 'immersive-translate-target';

        // Copy font styles AND alignment from the original element
        const style = window.getComputedStyle(element);
        node.style.fontSize = style.fontSize;
        node.style.fontWeight = style.fontWeight;
        // We don't copy font-family directly as 'inherit' in CSS usually works better if we use standard tags,
        // but copying ensures we get custom webfonts
        node.style.fontFamily = style.fontFamily;
        node.style.color = style.color;
        node.style.textAlign = style.textAlign; // Critical for headers
        node.style.lineHeight = style.lineHeight;

        // Reset spacing for the inner span to avoid double margins
        node.style.margin = '0';
        node.style.padding = '0';

        // Add a small top margin for separation, but handle it in CSS
        // node.style.display = 'block'; // Defined in CSS

        // Loading State
        node.innerHTML = '<span class="immersive-translate-loading">Thinking...</span>';

        // Insert AS LAST CHILD of the original element
        // This prevents breaking Flex/Grid layouts (which happens if we add a sibling)
        element.appendChild(node);

        return node;
    }

    static appendTranslation(node, text) {
        // Determine if this is the first chunk of actual text
        const loading = node.querySelector('.immersive-translate-loading');
        if (loading) {
            node.innerHTML = ''; // Clear loading spinner
        }
        node.textContent += text;
    }

    static removeLoadingState(node) {
        if (node.classList.contains('immersive-translate-loading')) {
            node.classList.remove('immersive-translate-loading');
            node.innerHTML = ''; // Clear text if it was just spinner
        }
        // Also ensure no spinner remains inside
        const loading = node.querySelector('.immersive-translate-loading');
        if (loading) loading.remove();
    }

    static showError(node, message) {
        this.removeLoadingState(node);
        node.textContent = `[Error: ${message}]`;
        node.classList.add('immersive-translate-error');
    }

    /**
     * Extract all text nodes from an element (depth-first traversal)
     * Used for rich text preservation - translates text nodes while keeping markup
     * 
     * @param {Element} element - The element to extract text nodes from
     * @returns {Text[]} Array of Text nodes in document order
     */
    static extractTextNodes(element) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while ((node = walker.nextNode())) {
            // Include all text nodes, even whitespace-only
            // Filter empty ones but keep whitespace for formatting
            textNodes.push(node);
        }
        
        return textNodes;
    }

    /**
     * Apply translations to corresponding text nodes
     * Preserves HTML structure while replacing text content
     * 
     * @param {Text[]} textNodes - Array of text nodes to update
     * @param {string[]} translations - Array of translated strings (same order as textNodes)
     */
    static applyTranslationToTextNodes(textNodes, translations) {
        const len = Math.min(textNodes.length, translations.length);
        
        for (let i = 0; i < len; i++) {
            if (textNodes[i] && translations[i] !== undefined) {
                textNodes[i].textContent = translations[i];
            }
        }
        // Text nodes beyond translations.length are left unchanged
    }
}

// Node.js test support (no effect in extension runtime)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DOMUtils };
}
