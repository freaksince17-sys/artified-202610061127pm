import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

function generateStaticRoutes() {
  console.log('🚀 [Static Route Generator] Pre-rendering static HTML pages for GitHub Pages & Google SEO...');
  const rootDir = path.resolve(__dirname, '..');
  const distDir = path.resolve(rootDir, 'dist');
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

    // 1. Replace Title
    routeHtml = routeHtml.replace(
      /<title>.*?<\/title>/i,
      `<title>${route.title}</title>`
    );

    // 2. Replace Canonical Tag
    routeHtml = routeHtml.replace(
      /<link rel="canonical"[^>]*>/i,
      `<link rel="canonical" href="${route.canonicalUrl}" />`
    );

    // 3. Replace Meta Description
    routeHtml = routeHtml.replace(
      /<meta name="description"[^>]*>/i,
      `<meta name="description" content="${route.description}" />`
    );

    // 4. Replace OpenGraph Meta Tags
    routeHtml = routeHtml.replace(
      /<meta property="og:title"[^>]*>/i,
      `<meta property="og:title" content="${route.ogTitle}" />`
    );
    routeHtml = routeHtml.replace(
      /<meta property="og:description"[^>]*>/i,
      `<meta property="og:description" content="${route.ogDescription}" />`
    );

    // Ensure og:url is present
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

    // 5. Replace Twitter Meta Tags
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
    console.log(`  ✅ Generated: dist/${route.path}/index.html (HTTP 200 with unique SEO metadata)`);
  }

  // 6. Generate dist/404.html for GitHub Pages fallback
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

  console.log('🎉 [Static Route Generator] All static routes and 404 safety nets pre-rendered successfully!');
}

generateStaticRoutes();
