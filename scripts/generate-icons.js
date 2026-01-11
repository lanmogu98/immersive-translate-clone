/**
 * Script to generate extension icons from source image
 * Uses sharp for high-quality image resizing
 *
 * Usage: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE_IMAGE = path.join(__dirname, '../icons/imagen.png');
const OUTPUT_DIR = path.join(__dirname, '../icons');

const SIZES = [16, 48, 128];

async function generateIcons() {
    console.log('Generating extension icons from:', SOURCE_IMAGE);

    // Verify source exists
    if (!fs.existsSync(SOURCE_IMAGE)) {
        console.error('Source image not found:', SOURCE_IMAGE);
        process.exit(1);
    }

    for (const size of SIZES) {
        const outputPath = path.join(OUTPUT_DIR, `icon${size}.png`);

        try {
            await sharp(SOURCE_IMAGE)
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .png()
                .toFile(outputPath);

            const stats = fs.statSync(outputPath);
            console.log(`✓ Generated ${outputPath} (${stats.size} bytes)`);
        } catch (err) {
            console.error(`✗ Failed to generate ${outputPath}:`, err.message);
            process.exit(1);
        }
    }

    console.log('\nAll icons generated successfully!');
}

generateIcons().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
