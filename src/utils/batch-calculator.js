/**
 * Batch Calculator for Immersive Translate Clone (Issue 31)
 *
 * This module calculates safe batch sizes for translation requests,
 * respecting model context and output token limits.
 *
 * Key features:
 * - Token estimation for input text
 * - Automatic fallback to smaller batches when limits exceeded
 * - Language-aware output token ratio estimation
 *
 * Usage:
 * - Extension runtime: globalThis.BatchCalculator
 * - Jest tests: require('./batch-calculator.js')
 */

// Default batch size (increased from 5 to 10 for Issue 31)
const DEFAULT_BATCH_SIZE = 10;

// Token ratios: estimated output/input token ratio for different language pairs
// These account for the fact that some languages are more compact than others
const TOKEN_RATIOS = {
    en_to_zh: 0.6,    // English to Chinese: Chinese is more compact
    en_to_ja: 0.8,    // English to Japanese
    en_to_ko: 0.7,    // English to Korean
    zh_to_en: 1.8,    // Chinese to English: English is more verbose
    default: 1.2      // Conservative default for unknown pairs
};

// Standard fallback sequence when batch size needs to be reduced
const FALLBACK_SEQUENCE = [10, 5, 3, 1];

/**
 * Estimate the number of tokens in a text string.
 * Uses simple heuristics based on character counts.
 *
 * Approximation rules:
 * - English/Latin: ~1 token per 4 characters
 * - CJK (Chinese/Japanese/Korean): ~1 token per 1.5 characters
 *
 * @param {string|null|undefined} text - The text to estimate tokens for
 * @returns {number} Estimated token count
 */
function estimateTokens(text) {
    if (!text || typeof text !== 'string') {
        return 0;
    }

    // Count CJK characters
    const cjkPattern = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g;
    const cjkMatches = text.match(cjkPattern) || [];
    const cjkCount = cjkMatches.length;

    // Non-CJK characters
    const nonCjkCount = text.length - cjkCount;

    // Estimate tokens
    const cjkTokens = Math.ceil(cjkCount / 1.5);
    const nonCjkTokens = Math.ceil(nonCjkCount / 4);

    return cjkTokens + nonCjkTokens;
}

/**
 * Get the token ratio for a target language.
 * This ratio estimates how the output length compares to input length.
 *
 * @param {string} targetLanguage - Target language code (e.g., 'zh-CN', 'ja', 'en')
 * @returns {number} Token ratio multiplier
 */
function getTokenRatio(targetLanguage) {
    if (!targetLanguage) {
        return TOKEN_RATIOS.default;
    }

    const lang = targetLanguage.toLowerCase();

    if (lang.startsWith('zh')) {
        return TOKEN_RATIOS.en_to_zh;
    }
    if (lang === 'ja' || lang.startsWith('ja-')) {
        return TOKEN_RATIOS.en_to_ja;
    }
    if (lang === 'ko' || lang.startsWith('ko-')) {
        return TOKEN_RATIOS.en_to_ko;
    }
    if (lang === 'en' || lang.startsWith('en-')) {
        return TOKEN_RATIOS.zh_to_en;
    }

    return TOKEN_RATIOS.default;
}

/**
 * Build a fallback sequence starting from the user's batch size.
 * The sequence is sorted in descending order with no duplicates.
 *
 * @param {number} userBatchSize - User's preferred batch size
 * @returns {number[]} Sorted fallback sequence (descending)
 */
function buildFallbackSequence(userBatchSize) {
    const effectiveUserSize = userBatchSize || DEFAULT_BATCH_SIZE;

    // Start with user size, add standard fallback values
    const candidates = [effectiveUserSize, ...FALLBACK_SEQUENCE];

    // Filter to values <= userBatchSize, remove duplicates, sort descending
    const filtered = [...new Set(candidates)]
        .filter(n => n <= effectiveUserSize)
        .sort((a, b) => b - a);

    return filtered;
}

/**
 * Calculate a safe batch size based on model limits and content.
 *
 * Principles:
 * - Input should not exceed 2/3 of context window
 * - Estimated output should not exceed max output tokens
 * - Fallback progressively to smaller batch sizes
 *
 * @param {Object} options - Configuration options
 * @param {number} [options.userBatchSize] - User's preferred batch size (default: 10)
 * @param {string[]} options.paragraphs - Array of paragraph texts to translate
 * @param {number} options.contextWindow - Model's context window size in tokens
 * @param {number} options.maxOutputTokens - Model's max output tokens
 * @param {string} [options.targetLanguage='zh-CN'] - Target language code
 * @param {number} [options.systemPromptTokens=0] - Tokens used by system prompt
 * @returns {number} Safe batch size to use
 */
function calculateSafeBatchSize(options) {
    const {
        userBatchSize,
        paragraphs = [],
        contextWindow,
        maxOutputTokens,
        targetLanguage = 'zh-CN',
        systemPromptTokens = 0
    } = options;

    const effectiveUserSize = userBatchSize || DEFAULT_BATCH_SIZE;

    // If no paragraphs, return user's preference
    if (!paragraphs || paragraphs.length === 0) {
        return effectiveUserSize;
    }

    // Calculate limits
    // Rule: Input should not exceed 2/3 of context window (leave room for output)
    const maxInputTokens = Math.floor((contextWindow || 128000) * 2 / 3);
    const effectiveMaxOutput = maxOutputTokens || 16000;

    // Get token ratio for output estimation
    const tokenRatio = getTokenRatio(targetLanguage);

    // Build fallback sequence
    const sequence = buildFallbackSequence(effectiveUserSize);

    // Try each batch size in sequence
    for (const size of sequence) {
        // Take first 'size' paragraphs
        const batchParagraphs = paragraphs.slice(0, size);

        if (batchParagraphs.length === 0) {
            continue;
        }

        // Combine paragraphs with separator
        const batchText = batchParagraphs.join('\n%%\n');

        // Estimate input tokens (including system prompt)
        const inputTokens = estimateTokens(batchText) + (systemPromptTokens || 0);

        // Estimate output tokens based on input and language ratio
        const estimatedOutput = Math.ceil(inputTokens * tokenRatio);

        // Check if within limits
        if (inputTokens <= maxInputTokens && estimatedOutput <= effectiveMaxOutput) {
            return size;
        }
    }

    // Final fallback: return 1 (always safe)
    return 1;
}

// Export for both browser (globalThis) and Node.js (module.exports)
const BatchCalculator = {
    DEFAULT_BATCH_SIZE,
    TOKEN_RATIOS,
    FALLBACK_SEQUENCE,
    estimateTokens,
    getTokenRatio,
    buildFallbackSequence,
    calculateSafeBatchSize
};

// Node.js / Jest support
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BatchCalculator;
}

// Browser / Extension runtime support
if (typeof globalThis !== 'undefined') {
    globalThis.BatchCalculator = BatchCalculator;
}
