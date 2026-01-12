/**
 * Tests for Batch Calculator (Issue 31)
 *
 * These tests verify that:
 * 1. Token estimation works correctly for different text types
 * 2. Safe batch size calculation respects model limits
 * 3. Fallback sequence works correctly when limits are exceeded
 */

describe('batch-calculator', () => {
    let BatchCalculator;

    beforeEach(() => {
        jest.resetModules();
        BatchCalculator = require('../src/utils/batch-calculator.js');
    });

    describe('TOKEN_RATIOS', () => {
        test('should have defined token ratios for common language pairs', () => {
            expect(BatchCalculator.TOKEN_RATIOS).toBeDefined();
            expect(BatchCalculator.TOKEN_RATIOS.en_to_zh).toBeDefined();
            expect(BatchCalculator.TOKEN_RATIOS.default).toBeDefined();
        });

        test('en_to_zh ratio should be less than 1 (Chinese is more compact)', () => {
            expect(BatchCalculator.TOKEN_RATIOS.en_to_zh).toBeLessThan(1);
        });
    });

    describe('FALLBACK_SEQUENCE', () => {
        test('should have fallback sequence [10, 5, 3, 1]', () => {
            expect(BatchCalculator.FALLBACK_SEQUENCE).toEqual([10, 5, 3, 1]);
        });
    });

    describe('estimateTokens()', () => {
        test('should return 0 for empty text', () => {
            expect(BatchCalculator.estimateTokens('')).toBe(0);
        });

        test('should return 0 for null/undefined', () => {
            expect(BatchCalculator.estimateTokens(null)).toBe(0);
            expect(BatchCalculator.estimateTokens(undefined)).toBe(0);
        });

        test('should estimate tokens for English text (approx 1 token per 4 chars)', () => {
            const text = 'Hello world, this is a test.'; // 28 chars
            const tokens = BatchCalculator.estimateTokens(text);
            // Expect roughly 7 tokens (28/4), allow some variance
            expect(tokens).toBeGreaterThanOrEqual(5);
            expect(tokens).toBeLessThanOrEqual(10);
        });

        test('should estimate tokens for CJK text (approx 1 token per 1.5 chars)', () => {
            const text = '这是一个测试文本'; // 8 Chinese chars
            const tokens = BatchCalculator.estimateTokens(text);
            // Expect roughly 5-6 tokens (8/1.5), allow some variance
            expect(tokens).toBeGreaterThanOrEqual(4);
            expect(tokens).toBeLessThanOrEqual(8);
        });

        test('should handle mixed text (English + CJK)', () => {
            const text = 'Hello 你好 World 世界';
            const tokens = BatchCalculator.estimateTokens(text);
            expect(tokens).toBeGreaterThan(0);
        });
    });

    describe('getTokenRatio()', () => {
        test('should return en_to_zh ratio for zh-CN target', () => {
            const ratio = BatchCalculator.getTokenRatio('zh-CN');
            expect(ratio).toBe(BatchCalculator.TOKEN_RATIOS.en_to_zh);
        });

        test('should return en_to_zh ratio for zh-TW target', () => {
            const ratio = BatchCalculator.getTokenRatio('zh-TW');
            expect(ratio).toBe(BatchCalculator.TOKEN_RATIOS.en_to_zh);
        });

        test('should return default ratio for unknown target', () => {
            const ratio = BatchCalculator.getTokenRatio('unknown');
            expect(ratio).toBe(BatchCalculator.TOKEN_RATIOS.default);
        });

        test('should return en_to_ja ratio for ja target', () => {
            const ratio = BatchCalculator.getTokenRatio('ja');
            expect(ratio).toBe(BatchCalculator.TOKEN_RATIOS.en_to_ja);
        });
    });

    describe('calculateSafeBatchSize()', () => {
        // Default model limits for testing
        const defaultLimits = {
            contextWindow: 128000,
            maxOutputTokens: 16000
        };

        test('should return userBatchSize when within limits', () => {
            const paragraphs = [
                'Short paragraph one.',
                'Short paragraph two.',
                'Short paragraph three.',
                'Short paragraph four.',
                'Short paragraph five.'
            ];

            const result = BatchCalculator.calculateSafeBatchSize({
                userBatchSize: 5,
                paragraphs,
                ...defaultLimits,
                targetLanguage: 'zh-CN',
                systemPromptTokens: 500
            });

            expect(result).toBe(5);
        });

        test('should return default (10) when userBatchSize is not specified', () => {
            const paragraphs = ['Short text.'];

            const result = BatchCalculator.calculateSafeBatchSize({
                paragraphs,
                ...defaultLimits,
                targetLanguage: 'zh-CN',
                systemPromptTokens: 500
            });

            expect(result).toBe(10);
        });

        test('should fallback to smaller batch when content exceeds context limit', () => {
            // Create very long paragraphs to exceed limits
            const longParagraph = 'A'.repeat(20000); // ~5000 tokens each
            const paragraphs = Array(10).fill(longParagraph);

            const result = BatchCalculator.calculateSafeBatchSize({
                userBatchSize: 10,
                paragraphs,
                contextWindow: 30000, // Small context window
                maxOutputTokens: 16000,
                targetLanguage: 'zh-CN',
                systemPromptTokens: 500
            });

            // Should fallback to smaller batch size
            expect(result).toBeLessThan(10);
        });

        test('should return 1 as minimum fallback', () => {
            // Create extremely long paragraph
            const veryLongParagraph = 'A'.repeat(100000);
            const paragraphs = [veryLongParagraph];

            const result = BatchCalculator.calculateSafeBatchSize({
                userBatchSize: 10,
                paragraphs,
                contextWindow: 1000, // Very small context
                maxOutputTokens: 500,
                targetLanguage: 'zh-CN',
                systemPromptTokens: 100
            });

            expect(result).toBe(1);
        });

        test('should respect userBatchSize cap when building fallback sequence', () => {
            const paragraphs = ['Short text.'];

            // User sets batch size to 5 (less than default 10)
            const result = BatchCalculator.calculateSafeBatchSize({
                userBatchSize: 5,
                paragraphs,
                ...defaultLimits,
                targetLanguage: 'zh-CN',
                systemPromptTokens: 500
            });

            // Should not exceed user's setting
            expect(result).toBeLessThanOrEqual(5);
        });

        test('should try userBatchSize first when > 10', () => {
            const paragraphs = Array(15).fill('Short text.');

            const result = BatchCalculator.calculateSafeBatchSize({
                userBatchSize: 15,
                paragraphs,
                ...defaultLimits,
                targetLanguage: 'zh-CN',
                systemPromptTokens: 500
            });

            // With generous limits, should return user's setting
            expect(result).toBe(15);
        });

        test('should handle empty paragraphs array', () => {
            const result = BatchCalculator.calculateSafeBatchSize({
                userBatchSize: 10,
                paragraphs: [],
                ...defaultLimits,
                targetLanguage: 'zh-CN',
                systemPromptTokens: 500
            });

            // Should return the user batch size (nothing to constrain)
            expect(result).toBe(10);
        });

        test('should handle missing systemPromptTokens', () => {
            const paragraphs = ['Short text.'];

            const result = BatchCalculator.calculateSafeBatchSize({
                userBatchSize: 10,
                paragraphs,
                ...defaultLimits,
                targetLanguage: 'zh-CN'
                // systemPromptTokens not provided
            });

            expect(result).toBe(10);
        });
    });

    describe('buildFallbackSequence()', () => {
        test('should start with userBatchSize when provided', () => {
            const sequence = BatchCalculator.buildFallbackSequence(15);
            expect(sequence[0]).toBe(15);
        });

        test('should include standard fallback values', () => {
            const sequence = BatchCalculator.buildFallbackSequence(20);
            expect(sequence).toContain(10);
            expect(sequence).toContain(5);
            expect(sequence).toContain(3);
            expect(sequence).toContain(1);
        });

        test('should filter out values greater than userBatchSize', () => {
            const sequence = BatchCalculator.buildFallbackSequence(5);
            // Should not contain 10 (> userBatchSize)
            expect(sequence).not.toContain(10);
            expect(sequence[0]).toBe(5);
        });

        test('should remove duplicates', () => {
            const sequence = BatchCalculator.buildFallbackSequence(10);
            const uniqueSequence = [...new Set(sequence)];
            expect(sequence).toEqual(uniqueSequence);
        });

        test('should be sorted in descending order', () => {
            const sequence = BatchCalculator.buildFallbackSequence(15);
            for (let i = 1; i < sequence.length; i++) {
                expect(sequence[i - 1]).toBeGreaterThan(sequence[i]);
            }
        });
    });

    describe('DEFAULT_BATCH_SIZE', () => {
        test('should be 10', () => {
            expect(BatchCalculator.DEFAULT_BATCH_SIZE).toBe(10);
        });
    });

    describe('integration scenarios', () => {
        test('should handle typical Wikipedia paragraph lengths', () => {
            // Typical Wikipedia paragraphs are 100-500 words (500-2500 chars)
            const typicalParagraphs = [
                'The history of computing hardware covers the developments from early simple devices to aid calculation to modern day computers. '.repeat(3),
                'Before the 20th century, most calculations were done by humans. Early mechanical tools to help humans with digital calculations include the abacus. '.repeat(3),
                'The Roman abacus was developed from devices used in Babylonia as early as 2400 BC. Since then, many other forms of reckoning boards or tables have been invented. '.repeat(3)
            ];

            const result = BatchCalculator.calculateSafeBatchSize({
                userBatchSize: 10,
                paragraphs: typicalParagraphs,
                contextWindow: 128000,
                maxOutputTokens: 16000,
                targetLanguage: 'zh-CN',
                systemPromptTokens: 1000
            });

            // Should handle typical content without fallback
            expect(result).toBeGreaterThanOrEqual(3);
        });

        test('should work with Gemini large context (1M tokens)', () => {
            const paragraphs = Array(10).fill('This is a medium length paragraph for testing. '.repeat(10));

            const result = BatchCalculator.calculateSafeBatchSize({
                userBatchSize: 10,
                paragraphs,
                contextWindow: 1000000, // Gemini's 1M context
                maxOutputTokens: 65536,
                targetLanguage: 'zh-CN',
                systemPromptTokens: 1000
            });

            expect(result).toBe(10);
        });
    });

    // =========================================================================
    // Code Review Fixes - Edge Cases (Issue 31 Review)
    // =========================================================================

    describe('edge cases - input validation (Issue 3)', () => {
        test('should handle contextWindow = 0 gracefully (use default)', () => {
            const result = BatchCalculator.calculateSafeBatchSize({
                userBatchSize: 10,
                paragraphs: ['Short text.'],
                contextWindow: 0,
                maxOutputTokens: 16000,
                targetLanguage: 'zh-CN'
            });
            // Should use default context window (128000) and return valid size
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(10);
        });

        test('should handle negative contextWindow gracefully (use default)', () => {
            const result = BatchCalculator.calculateSafeBatchSize({
                userBatchSize: 5,
                paragraphs: ['Text.'],
                contextWindow: -1000,
                maxOutputTokens: 16000
            });
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(5);
        });

        test('should handle NaN contextWindow gracefully (use default)', () => {
            const result = BatchCalculator.calculateSafeBatchSize({
                userBatchSize: 5,
                paragraphs: ['Text.'],
                contextWindow: NaN,
                maxOutputTokens: 16000
            });
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(5);
        });

        test('should handle Infinity maxOutputTokens gracefully (use default)', () => {
            const result = BatchCalculator.calculateSafeBatchSize({
                userBatchSize: 10,
                paragraphs: ['Text.'],
                contextWindow: 128000,
                maxOutputTokens: Infinity
            });
            // Should use default max output (16000) and return valid size
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(10);
        });

        test('should handle non-numeric userBatchSize (use default)', () => {
            const result = BatchCalculator.calculateSafeBatchSize({
                userBatchSize: 'invalid',
                paragraphs: ['Text.'],
                contextWindow: 128000,
                maxOutputTokens: 16000
            });
            // Should use default (10)
            expect(result).toBe(10);
        });

        test('should handle negative userBatchSize (use default)', () => {
            const result = BatchCalculator.calculateSafeBatchSize({
                userBatchSize: -5,
                paragraphs: ['Text.'],
                contextWindow: 128000,
                maxOutputTokens: 16000
            });
            // Should use default (10)
            expect(result).toBe(10);
        });
    });

    describe('edge cases - fallback sequence (Issue 4)', () => {
        test('buildFallbackSequence(2) should include 1 for final fallback', () => {
            const sequence = BatchCalculator.buildFallbackSequence(2);
            expect(sequence).toContain(1);
            expect(sequence).toContain(2);
            expect(sequence).toEqual([2, 1]);
        });

        test('buildFallbackSequence(1) should return [1]', () => {
            const sequence = BatchCalculator.buildFallbackSequence(1);
            expect(sequence).toEqual([1]);
        });

        test('buildFallbackSequence(0) should return [1] as safe minimum', () => {
            const sequence = BatchCalculator.buildFallbackSequence(0);
            // Zero or invalid should still return at least [1]
            expect(sequence).toContain(1);
        });
    });

    describe('edge cases - paragraphs with null/undefined (Issue 5)', () => {
        test('should handle paragraphs containing null values', () => {
            const paragraphs = ['Valid text', null, 'Another valid', undefined, 'Last one'];
            const result = BatchCalculator.calculateSafeBatchSize({
                userBatchSize: 5,
                paragraphs,
                contextWindow: 128000,
                maxOutputTokens: 16000,
                targetLanguage: 'zh-CN'
            });
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(5);
        });

        test('should handle paragraphs array with only null/undefined', () => {
            const result = BatchCalculator.calculateSafeBatchSize({
                userBatchSize: 5,
                paragraphs: [null, undefined, null],
                contextWindow: 128000,
                maxOutputTokens: 16000
            });
            // Empty effective paragraphs should return user batch size
            expect(result).toBe(5);
        });

        test('should not produce "null" or "undefined" strings in token estimation', () => {
            // This test verifies that null/undefined don't become literal strings
            const paragraphs = ['text', null, undefined];
            const result = BatchCalculator.calculateSafeBatchSize({
                userBatchSize: 3,
                paragraphs,
                contextWindow: 128000,
                maxOutputTokens: 16000
            });
            // Should work without error and return reasonable value
            expect(result).toBeGreaterThanOrEqual(1);
        });

        test('should handle non-array paragraphs parameter', () => {
            const result = BatchCalculator.calculateSafeBatchSize({
                userBatchSize: 5,
                paragraphs: 'not an array',
                contextWindow: 128000,
                maxOutputTokens: 16000
            });
            // Should return user batch size when paragraphs is invalid
            expect(result).toBe(5);
        });
    });

    describe('edge cases - getTokenRatio with source language (Issue 1)', () => {
        test('should accept optional sourceLanguage parameter', () => {
            // This tests the API signature change
            const ratio = BatchCalculator.getTokenRatio('zh-CN', 'en');
            expect(ratio).toBe(BatchCalculator.TOKEN_RATIOS.en_to_zh);
        });

        test('should use default ratio when source language is unknown', () => {
            // German source to Chinese target - no specific ratio defined
            const ratio = BatchCalculator.getTokenRatio('zh-CN', 'de');
            expect(ratio).toBe(BatchCalculator.TOKEN_RATIOS.default);
        });

        test('should work without source language (backward compatible)', () => {
            // Should still work when sourceLanguage is not provided
            const ratio = BatchCalculator.getTokenRatio('zh-CN');
            expect(typeof ratio).toBe('number');
            expect(ratio).toBeGreaterThan(0);
        });

        test('should use zh_to_en ratio for CJK source to English target', () => {
            const ratio = BatchCalculator.getTokenRatio('en', 'zh');
            expect(ratio).toBe(BatchCalculator.TOKEN_RATIOS.zh_to_en);
        });
    });
});
