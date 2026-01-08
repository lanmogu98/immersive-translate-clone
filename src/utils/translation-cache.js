/**
 * Translation Cache for Immersive Translate Clone
 * 
 * This module provides LRU caching for translations to reduce API calls.
 * Cache keys include: text hash, target language, model name, and prompt version.
 * 
 * Usage:
 * - Extension runtime: globalThis.TranslationCache
 * - Jest tests: require('./translation-cache.js')
 */

/**
 * LRU Translation Cache
 */
class TranslationCache {
    /**
     * Create a new translation cache
     * @param {number} maxSize - Maximum number of entries (default: 1000)
     */
    constructor(maxSize = 1000) {
        this._cache = new Map();
        this._maxSize = maxSize;
    }

    /**
     * Get the maximum cache size
     */
    get maxSize() {
        return this._maxSize;
    }

    /**
     * Get the current number of cached entries
     */
    get size() {
        return this._cache.size;
    }

    /**
     * Generate a hash for a text string
     * Uses simple DJB2-like hash for speed
     * @param {string} text - Text to hash
     * @returns {string} Hash string
     */
    hash(text) {
        if (!text || typeof text !== 'string') {
            return '0';
        }
        let h = 0;
        for (let i = 0; i < text.length; i++) {
            h = ((h << 5) - h) + text.charCodeAt(i);
            h |= 0; // Convert to 32-bit integer
        }
        return h.toString(36);
    }

    /**
     * Generate a cache key from context
     * @param {Object} ctx - Translation context
     * @param {string} ctx.text - Source text
     * @param {string} ctx.targetLang - Target language code
     * @param {string} ctx.modelName - Model name
     * @param {string} ctx.promptVersion - Prompt version
     * @returns {string} Cache key
     */
    getKey({ text, targetLang, modelName, promptVersion }) {
        const textHash = this.hash(text);
        return `${targetLang}:${modelName}:${promptVersion}:${textHash}`;
    }

    /**
     * Check if a translation is cached
     * @param {Object} ctx - Translation context
     * @returns {boolean} True if cached
     */
    has(ctx) {
        const key = this.getKey(ctx);
        return this._cache.has(key);
    }

    /**
     * Get a cached translation
     * @param {Object} ctx - Translation context
     * @returns {string|undefined} Cached translation or undefined
     */
    get(ctx) {
        const key = this.getKey(ctx);
        const value = this._cache.get(key);
        
        if (value !== undefined) {
            // Move to end (most recently used) for LRU
            this._cache.delete(key);
            this._cache.set(key, value);
        }
        
        return value;
    }

    /**
     * Store a translation in cache
     * @param {Object} ctx - Translation context
     * @param {string} translation - Translated text
     */
    set(ctx, translation) {
        const key = this.getKey(ctx);
        
        // If key exists, delete to update position
        if (this._cache.has(key)) {
            this._cache.delete(key);
        }
        // Check size limit before adding
        else if (this._cache.size >= this._maxSize) {
            // Delete oldest entry (first in Map)
            const oldestKey = this._cache.keys().next().value;
            this._cache.delete(oldestKey);
        }
        
        this._cache.set(key, translation);
    }

    /**
     * Clear all cached entries
     */
    clear() {
        this._cache.clear();
    }
}

// Node.js / Jest support
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TranslationCache };
}

// Browser / Extension runtime support
if (typeof globalThis !== 'undefined') {
    globalThis.TranslationCache = TranslationCache;
}

