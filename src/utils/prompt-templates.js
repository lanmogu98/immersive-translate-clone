/**
 * Prompt Templates for Immersive Translate Clone
 * 
 * This module separates:
 * - PROTOCOL_PROMPT: Internal, non-editable rules for output format (%% separator, etc.)
 * - User prompt: Editable translation style preferences
 * 
 * Usage:
 * - Extension runtime: globalThis.PromptTemplates
 * - Jest tests: require('./prompt-templates.js')
 */

// Target language definitions (array format for UI dropdowns)
const TARGET_LANGUAGES = [
    { code: 'zh-CN', name: '简体中文 (Simplified Chinese)' },
    { code: 'zh-TW', name: '繁體中文 (Traditional Chinese)' },
    { code: 'en', name: 'English' },
    { code: 'ja', name: '日本語 (Japanese)' },
    { code: 'ko', name: '한국어 (Korean)' },
    { code: 'es', name: 'Español (Spanish)' },
    { code: 'fr', name: 'Français (French)' },
    { code: 'de', name: 'Deutsch (German)' },
    { code: 'ru', name: 'Русский (Russian)' },
    { code: 'pt', name: 'Português (Portuguese)' }
];

// Helper lookup map for fast access
const LANG_MAP = Object.fromEntries(TARGET_LANGUAGES.map(l => [l.code, l.name]));

/**
 * Get language display name by code
 * @param {string} code - Language code (e.g., 'zh-CN')
 * @returns {string} Language display name
 */
function getLanguageName(code) {
    return LANG_MAP[code] || LANG_MAP['zh-CN'] || 'Simplified Chinese';
}

// Protocol prompt - INTERNAL, NOT USER-EDITABLE
// Contains strict output format rules that the stream parser depends on
const PROTOCOL_PROMPT = `You are a professional translator. Translate the input text into {{TARGET_LANG}}.

## STRICT OUTPUT RULES (DO NOT VIOLATE):
1. Output ONLY the translation - no explanations, no "Here's the translation:", no extra text
2. Maintain the EXACT same number of paragraphs as the input
3. For multi-paragraph input separated by %%, output translations separated by %%
4. Preserve HTML tags in appropriate positions while maintaining fluency
5. Keep untranslatable content (proper nouns, code, URLs) as-is

## OUTPUT FORMAT:
- Single paragraph → Output translation directly
- Multiple paragraphs → Use %% as separator between translations`;

// Default user translation prompt
const DEFAULT_USER_PROMPT = '翻译风格：保持原文语气，流畅自然。';

// Old default prompt for migration detection
const OLD_DEFAULT_PROMPT_SIGNATURE = 'You are a professional Simplified Chinese native translator';

/**
 * Build the complete system prompt by combining protocol and user prompts
 * @param {Object} options
 * @param {string} options.userPrompt - User's custom translation style prompt
 * @param {string} options.targetLanguage - Target language code (e.g., 'zh-CN', 'en')
 * @returns {string} Complete system prompt
 */
function buildSystemPrompt({ userPrompt, targetLanguage } = {}) {
    // Resolve target language
    const langCode = targetLanguage || 'zh-CN';
    const langName = getLanguageName(langCode);
    
    // Replace placeholder in protocol prompt
    const protocolWithLang = PROTOCOL_PROMPT.replace('{{TARGET_LANG}}', langName);
    
    // Use default user prompt if not provided
    const effectiveUserPrompt = (userPrompt && userPrompt.trim().length > 0) 
        ? userPrompt.trim() 
        : DEFAULT_USER_PROMPT;
    
    // Combine protocol + user prompt
    return protocolWithLang + '\n\n## User Translation Preferences:\n' + effectiveUserPrompt;
}

/**
 * Migrate old customPrompt to new userTranslationPrompt field
 * @param {Object} oldConfig - Old configuration object
 * @returns {Object} Migrated configuration object
 */
function migrateCustomPrompt(oldConfig) {
    const result = { ...oldConfig };
    
    // If userTranslationPrompt already exists, don't overwrite
    if (result.userTranslationPrompt && result.userTranslationPrompt.trim().length > 0) {
        // Just clean up old field
        result.customPrompt = undefined;
        return result;
    }
    
    // Check if customPrompt exists and is not the old default
    if (result.customPrompt && result.customPrompt.trim().length > 0) {
        // Don't migrate if it's the old default prompt (user never customized)
        if (!result.customPrompt.includes(OLD_DEFAULT_PROMPT_SIGNATURE)) {
            result.userTranslationPrompt = result.customPrompt;
        }
    }
    
    // Mark customPrompt for deletion
    result.customPrompt = undefined;
    
    return result;
}

// Export for both browser (globalThis) and Node.js (module.exports)
const PromptTemplates = {
    PROTOCOL_PROMPT,
    DEFAULT_USER_PROMPT,
    TARGET_LANGUAGES,
    getLanguageName,
    buildSystemPrompt,
    migrateCustomPrompt
};

// Node.js / Jest support
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PromptTemplates;
}

// Browser / Extension runtime support
if (typeof globalThis !== 'undefined') {
    globalThis.PromptTemplates = PromptTemplates;
}

