import fs from 'fs';
import path from 'path';

const PROJECT_ID = 'amped-turbine-3mn89';
const DATABASE_ID = 'artified-staging';

function slugifyProductTitle(title) {
  return String(title || '')
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtmlAttr(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseFirestoreValue(fieldVal) {
  if (!fieldVal || typeof fieldVal !== 'object') return undefined;
  if ('stringValue' in fieldVal) return fieldVal.stringValue;
  if ('integerValue' in fieldVal) return Number(fieldVal.integerValue);
  if ('doubleValue' in fieldVal) return Number(fieldVal.doubleValue);
  if ('booleanValue' in fieldVal) return Boolean(fieldVal.booleanValue);
  if ('arrayValue' in fieldVal) {
    const vals = fieldVal.arrayValue?.values || [];
    return vals.map(parseFirestoreValue);
  }
  if ('mapValue' in fieldVal) {
    const fields = fieldVal.mapValue?.fields || {};
    const out = {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = parseFirestoreValue(v);
    }
    return out;
  }
  return undefined;
}

function parseFirestoreDoc(docObj) {
  if (!docObj || !docObj.fields) return null;
  const parsed = {};
  for (const [k, v] of Object.entries(docObj.fields)) {
    parsed[k] = parseFirestoreValue(v);
  }
  const docId = docObj.name ? String(docObj.name).split('/').pop() : '';
  return {
    ...parsed,
    id: parsed.id || docId,
  };
}

async function findProductFromFirestoreOrLocal(rawIdentifier) {
  const cleanId = decodeURIComponent(String(rawIdentifier || ''))
    .replace(/^\/+|\/+$/g, '')
    .replace(/^product\//i, '')
    .trim();
  if (!cleanId) return null;

  const targetSlug = slugifyProductTitle(cleanId);

  // 1a. Try direct GetDocument by document ID first (fast 200 OK when ID is passed)
  try {
    const directUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/products/${encodeURIComponent(cleanId)}`;
    const directRes = await fetch(directUrl);
    if (directRes.ok) {
      const directDoc = await directRes.json();
      const parsed = parseFirestoreDoc(directDoc);
      if (parsed && parsed.title) {
        return parsed;
      }
    }
  } catch {}

  // 1b. Query live Firestore via :runQuery (evaluates public read rules & returns 200 OK for all products)
  try {
    const runQueryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents:runQuery`;
    const queryRes = await fetch(runQueryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'products' }],
          limit: 500,
        },
      }),
    });
    if (queryRes.ok) {
      const rows = await queryRes.json();
      if (Array.isArray(rows)) {
        for (const row of rows) {
          if (!row || !row.document) continue;
          const prod = parseFirestoreDoc(row.document);
          if (!prod || !prod.title) continue;
          const pId = String(prod.id || '').trim();
          const pSlug = slugifyProductTitle(prod.title);
          if (
            pId.toLowerCase() === cleanId.toLowerCase() ||
            (targetSlug && pSlug === targetSlug)
          ) {
            return prod;
          }
        }
      }
    }
  } catch {}

  // 2. Fallback to local products.json if present
  const candidatePaths = [
    path.resolve(process.cwd(), 'dist/products.json'),
    path.resolve(process.cwd(), 'public/products.json'),
    path.resolve(process.cwd(), 'src/data/products.json'),
  ];
  for (const pPath of candidatePaths) {
    if (fs.existsSync(pPath)) {
      try {
        const list = JSON.parse(fs.readFileSync(pPath, 'utf-8'));
        if (Array.isArray(list)) {
          const matched = list.find(
            (p) =>
              String(p.id || '').toLowerCase() === cleanId.toLowerCase() ||
              (targetSlug && slugifyProductTitle(p.title) === targetSlug)
          );
          if (matched) return matched;
        }
      } catch {}
    }
  }

  return null;
}

function buildBriefDescription(product) {
  const raw = String(
    product.description ||
      product.subtitle ||
      `Handcrafted ${product.title} handmade in Kathmandu, Nepal by Artified_np.`
  )
    .replace(/\s+/g, ' ')
    .trim();
  const clipped = raw.length > 155 ? `${raw.slice(0, 152).trim()}...` : raw;
  return `${clipped} Handcrafted in Kathmandu, Nepal • View details on Artified_np.`;
}

export default async function handler(req, res) {
  const rawProductParam =
    req.query?.product ||
    req.query?.slug ||
    req.query?.id ||
    (req.url ? req.url.split('?')[0].replace(/^\/product\//i, '').replace(/\/+$/, '') : '');

  const htmlCandidates = [
    path.resolve(process.cwd(), 'dist/index.html'),
    path.resolve(process.cwd(), 'index.html'),
  ];
  let html = '';
  for (const candidate of htmlCandidates) {
    if (fs.existsSync(candidate)) {
      html = fs.readFileSync(candidate, 'utf-8');
      break;
    }
  }

  if (!html) {
    res.status(404).send('Not found');
    return;
  }

  const product = await findProductFromFirestoreOrLocal(rawProductParam);
  if (product && product.title) {
    const slug = slugifyProductTitle(product.title) || encodeURIComponent(product.id);
    const prodTitle = escapeHtmlAttr(`${product.title} | Artified Nepal`);
    const prodDesc = escapeHtmlAttr(buildBriefDescription(product));
    const prodUrl = `https://www.artified.com.np/product/${slug}`;
    const prodOgImg = `https://www.artified.com.np/og/products/${slug}.jpg`;
    const prodAlt = escapeHtmlAttr(
      `${product.title} — ${product.subtitle || 'Handcrafted in Kathmandu, Nepal'}`
    );

    html = html
      .replace(/<title>.*?<\/title>/i, `<title>${prodTitle}</title>`)
      .replace(/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${prodUrl}" />`)
      .replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${prodDesc}" />`)
      .replace(/<meta property="og:type"[^>]*>/i, `<meta property="og:type" content="product" />`)
      .replace(/<meta property="og:url"[^>]*>/i, `<meta property="og:url" content="${prodUrl}" />`)
      .replace(/<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${prodTitle}" />`)
      .replace(/<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${prodDesc}" />`)
      .replace(/<meta property="og:image"[^>]*>/i, `<meta property="og:image" content="${prodOgImg}" />`)
      .replace(/<meta property="og:image:secure_url"[^>]*>/i, `<meta property="og:image:secure_url" content="${prodOgImg}" />`)
      .replace(/<meta property="og:image:alt"[^>]*>/i, `<meta property="og:image:alt" content="${prodAlt}" />`)
      .replace(/<meta name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${prodTitle}" />`)
      .replace(/<meta name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${prodDesc}" />`)
      .replace(/<meta name="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${prodOgImg}" />`)
      .replace(/<meta name="twitter:image:alt"[^>]*>/i, `<meta name="twitter:image:alt" content="${prodAlt}" />`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=600');
    res.status(200).send(html);
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.status(200).send(html);
}
