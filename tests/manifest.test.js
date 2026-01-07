/**
 * Tests for Issue 15: Extension Icon Configuration
 * 
 * These tests verify that:
 * 1. manifest.json has proper icons configuration
 * 2. Referenced icon files exist
 * 3. action.default_icon is configured
 */

const fs = require('fs');
const path = require('path');

describe('Manifest Icon Configuration (Issue 15)', () => {
  let manifest;
  const projectRoot = path.join(__dirname, '..');

  beforeAll(() => {
    const manifestPath = path.join(projectRoot, 'manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    manifest = JSON.parse(manifestContent);
  });

  describe('icons field', () => {
    test('manifest should have icons field', () => {
      expect(manifest.icons).toBeDefined();
      expect(typeof manifest.icons).toBe('object');
    });

    test('icons should include 16x16 size', () => {
      expect(manifest.icons['16']).toBeDefined();
      expect(typeof manifest.icons['16']).toBe('string');
    });

    test('icons should include 48x48 size', () => {
      expect(manifest.icons['48']).toBeDefined();
      expect(typeof manifest.icons['48']).toBe('string');
    });

    test('icons should include 128x128 size', () => {
      expect(manifest.icons['128']).toBeDefined();
      expect(typeof manifest.icons['128']).toBe('string');
    });

    test('all icon paths should point to existing files', () => {
      const sizes = ['16', '48', '128'];
      for (const size of sizes) {
        const iconPath = manifest.icons[size];
        expect(iconPath).toBeDefined();
        const fullPath = path.join(projectRoot, iconPath);
        expect(fs.existsSync(fullPath)).toBe(true);
      }
    });
  });

  describe('action.default_icon field', () => {
    test('action field should exist', () => {
      expect(manifest.action).toBeDefined();
    });

    test('action should have default_icon field', () => {
      expect(manifest.action.default_icon).toBeDefined();
      expect(typeof manifest.action.default_icon).toBe('object');
    });

    test('default_icon should include 16x16 and 48x48 sizes', () => {
      expect(manifest.action.default_icon['16']).toBeDefined();
      expect(manifest.action.default_icon['48']).toBeDefined();
    });

    test('default_icon paths should point to existing files', () => {
      const sizes = ['16', '48'];
      for (const size of sizes) {
        const iconPath = manifest.action.default_icon[size];
        expect(iconPath).toBeDefined();
        const fullPath = path.join(projectRoot, iconPath);
        expect(fs.existsSync(fullPath)).toBe(true);
      }
    });
  });

  describe('icon files', () => {
    test('icons directory should exist', () => {
      const iconsDir = path.join(projectRoot, 'icons');
      expect(fs.existsSync(iconsDir)).toBe(true);
    });

    test('at least one icon file should exist', () => {
      const iconsDir = path.join(projectRoot, 'icons');
      const files = fs.readdirSync(iconsDir);
      const pngFiles = files.filter(f => f.endsWith('.png'));
      expect(pngFiles.length).toBeGreaterThan(0);
    });

    test('icon16.png should exist', () => {
      const iconPath = path.join(projectRoot, 'icons', 'icon16.png');
      expect(fs.existsSync(iconPath)).toBe(true);
    });

    test('icon48.png should exist', () => {
      const iconPath = path.join(projectRoot, 'icons', 'icon48.png');
      expect(fs.existsSync(iconPath)).toBe(true);
    });

    test('icon128.png should exist', () => {
      const iconPath = path.join(projectRoot, 'icons', 'icon128.png');
      expect(fs.existsSync(iconPath)).toBe(true);
    });
  });
});
