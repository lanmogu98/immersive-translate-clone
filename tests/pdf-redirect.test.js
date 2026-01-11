/**
 * Issue 32: PDF Viewer Hijacks Browser
 *
 * Tests to ensure PDF redirect functionality is disabled.
 * The extension should NOT intercept PDF URLs since the PDF viewer is incomplete.
 */

const fs = require('fs');
const path = require('path');

describe('Issue 32: PDF redirect should be disabled', () => {
  test('background.js should not contain active PDF redirect logic', () => {
    const backgroundPath = path.join(__dirname, '../src/background.js');
    const content = fs.readFileSync(backgroundPath, 'utf-8');

    // Split into lines and filter out comments
    const lines = content.split('\n');
    const activeLines = lines.filter(line => {
      const trimmed = line.trim();
      // Skip empty lines and full-line comments
      return trimmed && !trimmed.startsWith('//');
    }).join('\n');

    // Check for PDF redirect patterns in active (non-commented) code
    // Pattern 1: chrome.tabs.onUpdated listener with .pdf check
    const hasPdfListener = activeLines.includes('chrome.tabs.onUpdated.addListener') &&
                          activeLines.includes('.pdf');

    // Pattern 2: redirect to pdf_viewer.html
    const hasPdfViewerRedirect = activeLines.includes('pdf_viewer.html') &&
                                  activeLines.includes('chrome.tabs.update');

    expect(hasPdfListener).toBe(false);
    expect(hasPdfViewerRedirect).toBe(false);
  });

  test('pdf-viewer directory should be documented as incomplete/placeholder', () => {
    const viewerHtmlPath = path.join(__dirname, '../src/pdf-viewer/pdf_viewer.html');
    const content = fs.readFileSync(viewerHtmlPath, 'utf-8');

    // The HTML should indicate it's a placeholder
    expect(content).toMatch(/placeholder/i);
  });
});
