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

## RICH TEXT MODE (V2 Token Protocol):
- If a paragraph starts with the marker [[ITC_RICH_V2]], the next line will contain plain text with immutable tokens.
- Tokens look like:
  - Paired tokens wrapping translatable content: [[ITC:a0]] ... [[/ITC]]
  - Atomic tokens (must be preserved exactly once, do not edit): [[ITC:ref0]]
- Your output for that paragraph MUST be plain translated text that still contains ALL the same tokens:
  - Do NOT output HTML or Markdown
  - Do NOT wrap output in code fences
  - Do NOT add any other text besides the translation
  - You MAY reorder/move token blocks to make the translation natural
  - You MUST keep token strings EXACTLY unchanged (spelling/case/punctuation)
  - You MUST NOT delete or duplicate any token (especially [[ITC:refN]] footnote tokens)

## OUTPUT FORMAT:
- Single paragraph → Output translation directly
- Multiple paragraphs → Use %% as separator between translations`;

// Default user translation prompt
const DEFAULT_USER_PROMPT = '翻译风格：保持原文语气，流畅自然。';

// Old default prompt for migration detection
// NOTE (Issue 22): this must be an exact match string (not a substring signature),
// otherwise we risk incorrectly treating user-modified prompts as "default".
const OLD_DEFAULT_PROMPT = `You are a professional Simplified Chinese native translator who needs to fluently translate text into Simplified Chinese.

## Translation Rules
1. Output only the translated content, without explanations or additional content (such as "Here's the translation:" or "Translation as follows:")
2. The returned translation must maintain exactly the same number of paragraphs and format as the original text
3. If the text contains HTML tags, consider where the tags should be placed in the translation while maintaining fluency
4. For content that should not be translated (such as proper nouns, code, etc.), keep the original text.
5. If input contains %%, use %% in your output, if input has no %%, don't use %% in your output

## OUTPUT FORMAT:
- **Single paragraph input** → Output translation directly (no separators, no extra text)
- **Multi-paragraph input** → Use %% as paragraph separator between translations`;

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
        // Don't migrate only when it's EXACTLY the old default prompt (user never customized)
        const custom = result.customPrompt.trim();
        const isExactOldDefault = custom === OLD_DEFAULT_PROMPT.trim();
        if (!isExactOldDefault) result.userTranslationPrompt = result.customPrompt;
    }
    
    // Mark customPrompt for deletion
    result.customPrompt = undefined;
    
    return result;
}

// Export for both browser (globalThis) and Node.js (module.exports)
const PromptTemplates = {
    PROTOCOL_PROMPT,
    DEFAULT_USER_PROMPT,
    OLD_DEFAULT_PROMPT,
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

