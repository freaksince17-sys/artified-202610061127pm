import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generateOgImage() {
  try {
    const svgPath = path.resolve('public/artified-logo.svg');
    const outputPath = path.resolve('public/og-image.jpg');

    if (!fs.existsSync(svgPath)) {
      console.error('Source SVG logo not found at:', svgPath);
      return;
    }

    console.log('Rendering SVG logo to high-resolution social share preview (1200x630)...');

    // Load the SVG file content
    let svgContent = fs.readFileSync(svgPath, 'utf-8');

    // We will place the SVG in the center of a beautiful 1200x630 canvas
    // Premium minimalist aesthetic with soft warm off-white background matching the brand
    const width = 1200;
    const height = 630;
    
    // Create an elegant SVG wrapper that contains the centered logo
    const ogSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="100%" height="100%" fill="#FAF8F5" />
        <g transform="translate(${(width - 680) / 2}, ${(height - 190) / 2}) scale(1.3)">
          ${svgContent.substring(svgContent.indexOf('<g'), svgContent.lastIndexOf('</svg>'))}
        </g>
      </svg>
    `;

    // Convert to a sharp, high-quality JPEG
    await sharp(Buffer.from(ogSvg))
      .jpeg({ quality: 95 })
      .toFile(outputPath);

    console.log('Successfully generated public/og-image.jpg with the premium logo!');
  } catch (error) {
    console.error('Error generating social preview image:', error);
  }
}

generateOgImage();
