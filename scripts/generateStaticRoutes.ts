import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { buildProductOgSvgMarkup } from '../src/utils/ogImageGenerator.ts';
import { buildProductWithLocalBusinessSchema } from '../src/utils/LocalBusinessSchema.tsx';
import { Product } from '../src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RouteConfig {
  path: string;
  title: string;
  description: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
}

const STATIC_ROUTES: RouteConfig[] = [
  {
    path: 'pearl-bags',
    title: 'Handcrafted Pearl Bags Nepal | Luxury Beaded Handbags | Artified_np',
    description: 'Shop luxury handcrafted pearl bags, sphere evening clutches, and beaded totes handmade by Sahina Shrestha in Kathmandu, Nepal. Doorstep delivery across Nepal.',
    canonicalUrl: 'https://www.artified.com.np/pearl-bags',
    ogTitle: 'Handcrafted Pearl Bags Nepal | Artified_np',
    ogDescription: 'Shop luxury handcrafted pearl bags, sphere evening clutches, and beaded totes handmade by Sahina Shrestha in Kathmandu, Nepal.'
  },
  {
    path: 'pearl-necklaces',
    title: 'Handmade Pearl Necklaces & Pearl Capes Nepal | Artified_np',
    description: 'Discover exquisite handmade pearl necklaces, Royal Layered Drape Pearl Capes, Classic Woven Collar Capes, and freshwater baroque chokers handcrafted in Kathmandu, Nepal.',
    canonicalUrl: 'https://www.artified.com.np/pearl-necklaces',
    ogTitle: 'Handmade Pearl Necklaces & Pearl Capes Nepal | Artified_np',
    ogDescription: 'Discover exquisite handmade pearl necklaces, Royal Layered Drape Pearl Capes, Classic Woven Collar Capes, and freshwater baroque chokers handcrafted in Kathmandu, Nepal.'
  },
  {
    path: 'macrame',
    title: 'Sustainable Macrame Accessories & Hand-Woven Bags Nepal | Artified_np',
    description: 'Shop sustainable handcrafted macrame bags, wristlets, plant hangers, and bohemian wearable art handcrafted in Kathmandu, Nepal.',
    canonicalUrl: 'https://www.artified.com.np/macrame',
    ogTitle: 'Sustainable Macrame Accessories Nepal | Artified_np',
    ogDescription: 'Shop sustainable handcrafted macrame bags, wristlets, plant hangers, and bohemian wearable art handcrafted in Kathmandu, Nepal.'
  },
  {
    path: 'workshops',
    title: 'Beading & Macrame Craft Workshops Kathmandu Nepal | Artified_np',
    description: 'Join hands-on pearl beading and macrame artisan masterclasses in Kathmandu led by founder Sahina Shrestha. Learn ancestral knotting and jewelry crafting techniques.',
    canonicalUrl: 'https://www.artified.com.np/workshops',
    ogTitle: 'Artisan Beading & Macrame Workshops Kathmandu | Artified_np',
    ogDescription: 'Join hands-on pearl beading and macrame artisan masterclasses in Kathmandu led by founder Sahina Shrestha.'
  }
];

function escapeHtmlAttr(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function generateStaticRoutes() {
  console.log('🚀 [Static Route Generator] Pre-rendering static HTML pages and OpenGraph product cards...');
  const rootDir = path.resolve(__dirname, '..');
  const distDir = path.resolve(rootDir, 'dist');
  const publicDir = path.resolve(rootDir, 'public');
  const indexHtmlPath = path.resolve(distDir, 'index.html');

  if (!fs.existsSync(indexHtmlPath)) {
    console.error('❌ dist/index.html not found! Run vite build first.');
    process.exit(1);
  }

  const baseHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

  for (const route of STATIC_ROUTES) {
    const routeDir = path.resolve(distDir, route.path);
    if (!fs.existsSync(routeDir)) {
      fs.mkdirSync(routeDir, { recursive: true });
    }

    let routeHtml = baseHtml;

    routeHtml = routeHtml.replace(
      /<title>.*?<\/title>/i,
      `<title>${route.title}</title>`
    );

    routeHtml = routeHtml.replace(
      /<link rel="canonical"[^>]*>/i,
      `<link rel="canonical" href="${route.canonicalUrl}" />`
    );

    routeHtml = routeHtml.replace(
      /<meta name="description"[^>]*>/i,
      `<meta name="description" content="${route.description}" />`
    );

    routeHtml = routeHtml.replace(
      /<meta property="og:title"[^>]*>/i,
      `<meta property="og:title" content="${route.ogTitle}" />`
    );
    routeHtml = routeHtml.replace(
      /<meta property="og:description"[^>]*>/i,
      `<meta property="og:description" content="${route.ogDescription}" />`
    );

    if (routeHtml.includes('property="og:url"')) {
      routeHtml = routeHtml.replace(
        /<meta property="og:url"[^>]*>/i,
        `<meta property="og:url" content="${route.canonicalUrl}" />`
      );
    } else {
      routeHtml = routeHtml.replace(
        /<meta property="og:title"/i,
        `<meta property="og:url" content="${route.canonicalUrl}" />\n    <meta property="og:title"`
      );
    }

    routeHtml = routeHtml.replace(
      /<meta name="twitter:title"[^>]*>/i,
      `<meta name="twitter:title" content="${route.ogTitle}" />`
    );
    routeHtml = routeHtml.replace(
      /<meta name="twitter:description"[^>]*>/i,
      `<meta name="twitter:description" content="${route.ogDescription}" />`
    );

    const outFilePath = path.join(routeDir, 'index.html');
    fs.writeFileSync(outFilePath, routeHtml, 'utf-8');
    console.log(`  ✅ Generated: dist/${route.path}/index.html`);
  }

  // Generate 1200x630 OpenGraph image cards and share HTML pages for each product
  const productsJsonPath = path.resolve(rootDir, 'src/data/products.json');
  if (fs.existsSync(productsJsonPath)) {
    const products: Product[] = JSON.parse(fs.readFileSync(productsJsonPath, 'utf-8'));
    const ogOutDir = path.resolve(distDir, 'og', 'products');
    if (!fs.existsSync(ogOutDir)) {
      fs.mkdirSync(ogOutDir, { recursive: true });
    }

    let ogGeneratedCount = 0;
    for (const product of products) {
      if (!product || !product.id) continue;

      let embeddedImageDataUri: string | undefined;
      const primaryImg = Array.isArray(product.images) ? product.images[0] : '';
      if (primaryImg) {
        try {
          if (primaryImg.startsWith('data:image/')) {
            const base64Part = primaryImg.split(',')[1];
            if (base64Part) {
              const buf = await sharp(Buffer.from(base64Part, 'base64'))
                .resize(520, 520, { fit: 'cover' })
                .jpeg({ quality: 82 })
                .toBuffer();
              embeddedImageDataUri = `data:image/jpeg;base64,${buf.toString('base64')}`;
            }
          } else if (primaryImg.startsWith('/')) {
            const imgPath = path.resolve(publicDir, primaryImg.replace(/^\/+/, ''));
            if (fs.existsSync(imgPath)) {
              const buf = await sharp(imgPath)
                .resize(520, 520, { fit: 'cover' })
                .jpeg({ quality: 82 })
                .toBuffer();
              embeddedImageDataUri = `data:image/jpeg;base64,${buf.toString('base64')}`;
            }
          }
        } catch {}
      }

      const svg = buildProductOgSvgMarkup(product, { embeddedImageDataUri });
      const jpegOutPath = path.join(ogOutDir, `${product.id}.jpg`);
      await sharp(Buffer.from(svg))
        .resize(1200, 630)
        .jpeg({ quality: 88, mozjpeg: true })
        .toFile(jpegOutPath);
      ogGeneratedCount++;

      // Pre-render /product/<id>/index.html for rich link previews on Instagram, TikTok, and WhatsApp
      const prodDir = path.resolve(distDir, 'product', product.id);
      if (!fs.existsSync(prodDir)) {
        fs.mkdirSync(prodDir, { recursive: true });
      }
      const priceText = `NPR ${Number(product.price || 0).toLocaleString('en-US')}`;
      const prodTitle = escapeHtmlAttr(`${product.title} (${priceText}) | Buy Now | Artified Nepal`);
      const prodDesc = escapeHtmlAttr(
        `Shop handmade ${product.title} in Nepal for ${priceText}. Handcrafted in Kathmandu with doorstep delivery across Nepal.`
      );
      const prodUrl = `https://www.artified.com.np/product/${encodeURIComponent(product.id)}/`;
      const prodOgImg = `https://www.artified.com.np/og/products/${encodeURIComponent(product.id)}.jpg`;
      const prodAlt = escapeHtmlAttr(`${product.title} — Buy Now at Artified Nepal`);

      let prodHtml = baseHtml
        .replace(/<title>.*?<\/title>/i, `<title>${prodTitle}</title>`)
        .replace(/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${prodUrl}" />`)
        .replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${prodDesc}" />`)
        .replace(/<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${prodTitle}" />`)
        .replace(/<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${prodDesc}" />`)
        .replace(/<meta property="og:image"[^>]*>/i, `<meta property="og:image" content="${prodOgImg}" />`)
        .replace(/<meta property="og:image:secure_url"[^>]*>/i, `<meta property="og:image:secure_url" content="${prodOgImg}" />`)
        .replace(/<meta property="og:image:alt"[^>]*>/i, `<meta property="og:image:alt" content="${prodAlt}" />`)
        .replace(/<meta name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${prodTitle}" />`)
        .replace(/<meta name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${prodDesc}" />`)
        .replace(/<meta name="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${prodOgImg}" />`)
        .replace(/<meta name="twitter:image:alt"[^>]*>/i, `<meta name="twitter:image:alt" content="${prodAlt}" />`);

      if (prodHtml.includes('property="og:url"')) {
        prodHtml = prodHtml.replace(
          /<meta property="og:url"[^>]*>/i,
          `<meta property="og:url" content="${prodUrl}" />`
        );
      } else {
        prodHtml = prodHtml.replace(
          /<meta property="og:title"/i,
          `<meta property="og:url" content="${prodUrl}" />\n    <meta property="og:title"`
        );
      }

      const localBusinessProductLd = buildProductWithLocalBusinessSchema(product, 'https://www.artified.com.np');
      const localBusinessScriptTag = `\n    <script id="product-local-business-jsonld" type="application/ld+json">${JSON.stringify(localBusinessProductLd)}</script>\n  </head>`;
      prodHtml = prodHtml.replace('</head>', localBusinessScriptTag);

      fs.writeFileSync(path.join(prodDir, 'index.html'), prodHtml, 'utf-8');
    }

    console.log(`  ✅ Generated ${ogGeneratedCount} product OpenGraph cards (dist/og/products/<id>.jpg) and /product/<id>/ preview pages`);
  }

  // Generate dist/404.html for GitHub Pages fallback
  const spaRedirectScript = `
    <!-- Single Page Application GitHub Pages 404 Redirection Protection -->
    <script>
      (function() {
        var path = window.location.pathname;
        var search = window.location.search;
        var hash = window.location.hash;
        if (path && path !== '/404.html' && path !== '/404') {
          sessionStorage.setItem('artified_spa_fallback_url', path + search + hash);
        }
      })();
    </script>
  `;

  const notFoundHtml = baseHtml.replace('</head>', `${spaRedirectScript}\n  </head>`);
  fs.writeFileSync(path.resolve(distDir, '404.html'), notFoundHtml, 'utf-8');
  console.log('  ✅ Generated: dist/404.html (GitHub Pages SPA Fallback Safety Net)');

  console.log('🎉 [Static Route Generator] All static routes, product OpenGraph cards, and 404 fallbacks pre-rendered successfully!');
}

generateStaticRoutes().catch((err) => {
  console.error('❌ Error in static route generator:', err);
  process.exit(1);
});

