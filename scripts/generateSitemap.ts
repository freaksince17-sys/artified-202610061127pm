import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSitemapXml } from '../src/utils/sitemapGenerator.ts';
import { Product } from '../src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('✨ [Sitemap Generator] Starting Google-compliant sitemap generation...');

  const rootDir = path.resolve(__dirname, '..');
  const productsJsonPath = path.resolve(rootDir, 'src/data/products.json');
  const sitemapOutputPath = path.resolve(rootDir, 'public/sitemap.xml');

  if (!fs.existsSync(productsJsonPath)) {
    console.error('❌ Could not find products.json at:', productsJsonPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(productsJsonPath, 'utf-8');
  const products: Product[] = JSON.parse(raw);

  const xml = generateSitemapXml(products, 'https://www.artified.com.np');

  fs.writeFileSync(sitemapOutputPath, xml, 'utf-8');

  // Also write to dist/sitemap.xml if dist directory exists
  const distSitemapPath = path.resolve(rootDir, 'dist/sitemap.xml');
  if (fs.existsSync(path.resolve(rootDir, 'dist'))) {
    fs.writeFileSync(distSitemapPath, xml, 'utf-8');
  }

  // Also ensure public/products.json is synced for static hosting (e.g. GitHub Pages)
  const publicProductsPath = path.resolve(rootDir, 'public/products.json');
  fs.writeFileSync(publicProductsPath, raw, 'utf-8');

  console.log(`✅ [Sitemap Generator] Successfully generated ${sitemapOutputPath}!`);
  console.log(`📊 Indexed:`);
  console.log(`   - 1 Storefront Homepage (/)`);
  console.log(`   - 4 Clean Static Landing Pages (/pearl-bags, /pearl-necklaces, /macrame, /workshops)`);
  console.log(`   - 3 Atelier & Review Sections (#meet-artisan, #customer-reviews, #instagram-journal)`);
  console.log(`   - ${products.length} Individual Handcrafted Products with Google Image metadata`);
  console.log(`   - Total Clean URLs: ${1 + 4 + 3 + products.length}`);
}

run().catch((err) => {
  console.error('❌ Error generating sitemap:', err);
  process.exit(1);
});
