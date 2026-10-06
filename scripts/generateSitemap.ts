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

  console.log(`✅ [Sitemap Generator] Successfully generated ${sitemapOutputPath}!`);
  console.log(`📊 Indexed:`);
  console.log(`   - 1 Storefront Homepage`);
  console.log(`   - 7 Curated Collection Pages`);
  console.log(`   - 3 Atelier & Review Sections`);
  console.log(`   - ${products.length} Individual Handcrafted Products with Google Image metadata`);
  console.log(`   - Total URLs: ${1 + 7 + 3 + products.length}`);
}

run().catch((err) => {
  console.error('❌ Error generating sitemap:', err);
  process.exit(1);
});
