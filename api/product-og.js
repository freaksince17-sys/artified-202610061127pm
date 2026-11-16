import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let sharpLib = null;
try {
  sharpLib = require('sharp');
} catch {}

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

function escapeXmlText(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapTextIntoLines(text, maxCharsPerLine, maxLines) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ['Artified Nepal Creation'];
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        if (lines.length === maxLines) {
          const last = lines[maxLines - 1];
          lines[maxLines - 1] =
            last.length > maxCharsPerLine - 3
              ? `${last.slice(0, maxCharsPerLine - 3).trim()}...`
              : `${last}...`;
          return lines;
        }
      }
      currentLine = word.length > maxCharsPerLine ? `${word.slice(0, maxCharsPerLine - 1)}…` : word;
    }
  }
  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }
  return lines;
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
    .replace(/\.(?:jpg|jpeg|png|webp)$/i, '')
    .replace(/^\/+|\/+$/g, '')
    .trim();
  if (!cleanId) return null;

  const targetSlug = slugifyProductTitle(cleanId);

  try {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/products?pageSize=300`;
    const res = await fetch(firestoreUrl);
    if (res.ok) {
      const data = await res.json();
      const docs = Array.isArray(data.documents) ? data.documents : [];
      for (const rawDoc of docs) {
        const prod = parseFirestoreDoc(rawDoc);
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
  } catch {}

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

export default async function handler(req, res) {
  const rawProductParam =
    req.query?.product ||
    req.query?.slug ||
    (req.url ? req.url.split('?')[0].replace(/^\/og\/products\//i, '').replace(/\/+$/, '') : '');

  const product = await findProductFromFirestoreOrLocal(rawProductParam);

  if (product) {
    const primaryImg = Array.isArray(product.images) ? product.images[0] : '';
    let rawImageBuffer = null;

    if (typeof primaryImg === 'string' && primaryImg.startsWith('data:image/')) {
      const base64Part = primaryImg.split(',')[1];
      if (base64Part) {
        rawImageBuffer = Buffer.from(base64Part, 'base64');
      }
    } else if (typeof primaryImg === 'string' && (primaryImg.startsWith('http://') || primaryImg.startsWith('https://'))) {
      try {
        const imgRes = await fetch(primaryImg);
        if (imgRes.ok) {
          rawImageBuffer = Buffer.from(await imgRes.arrayBuffer());
        }
      } catch {}
    }

    // 1. If sharp is available in the runtime, render the 1200x630 OpenGraph composite preview card
    if (sharpLib) {
      try {
        let embeddedImageDataUri = '';
        if (rawImageBuffer) {
          const resized = await sharpLib(rawImageBuffer)
            .resize(520, 520, { fit: 'cover' })
            .jpeg({ quality: 84 })
            .toBuffer();
          embeddedImageDataUri = `data:image/jpeg;base64,${resized.toString('base64')}`;
        }

        const titleLines = wrapTextIntoLines(product.title, 22, 3);
        const titleFontSize = titleLines.length >= 3 ? 38 : titleLines.some((l) => l.length > 18) ? 44 : 48;
        const lineHeight = Math.round(titleFontSize * 1.16);
        const titleStartY = titleLines.length === 1 ? 210 : titleLines.length === 2 ? 194 : 182;

        const titleTextElements = titleLines
          .map(
            (line, idx) =>
              `<text x="618" y="${titleStartY + idx * lineHeight}" font-family="'DejaVu Serif', Georgia, serif" font-size="${titleFontSize}" font-weight="700" fill="#1C1B1A">${escapeXmlText(line)}</text>`
          )
          .join('\n    ');

        const briefSource = String(
          product.description ||
            product.subtitle ||
            'Individually handcrafted in Kathmandu with doorstep delivery across Nepal.'
        )
          .replace(/\s+/g, ' ')
          .trim();
        const briefLines = wrapTextIntoLines(briefSource, 44, 3);
        const briefStartY = titleStartY + titleLines.length * lineHeight + 28;
        const briefTextElements = briefLines
          .map(
            (line, idx) =>
              `<text x="618" y="${briefStartY + idx * 28}" font-family="'DejaVu Sans', sans-serif" font-size="18" font-weight="500" fill="#4A433C">${escapeXmlText(line)}</text>`
          )
          .join('\n    ');

        const imageBlock = embeddedImageDataUri
          ? `<image href="${escapeXmlText(embeddedImageDataUri)}" x="54" y="54" width="510" height="522" preserveAspectRatio="xMidYMid slice" clip-path="url(#productPhotoClip)" />`
          : `<rect x="54" y="54" width="510" height="522" rx="24" fill="#EFE9E0" />`;

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
          <defs>
            <linearGradient id="creamBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#FAF8F5" />
              <stop offset="100%" stop-color="#EFE7DC" />
            </linearGradient>
            <clipPath id="productPhotoClip">
              <rect x="54" y="54" width="510" height="522" rx="24" />
            </clipPath>
          </defs>
          <rect width="1200" height="630" fill="url(#creamBg)" />
          <rect x="18" y="18" width="1164" height="594" rx="28" fill="none" stroke="#D4B88C" stroke-width="2" />
          <rect x="50" y="50" width="518" height="530" rx="26" fill="#FFFFFF" stroke="#C5A880" stroke-width="2" />
          ${imageBlock}
          <text x="618" y="96" font-family="'DejaVu Sans', sans-serif" font-size="15" font-weight="700" letter-spacing="3" fill="#8C6730">HANDCRAFTED WEARABLE ART • NEPAL</text>
          <line x1="618" y1="116" x2="1128" y2="116" stroke="#D8CBB8" stroke-width="1.5" />
          ${titleTextElements}
          ${briefTextElements}
          <rect x="618" y="396" width="380" height="40" rx="10" fill="#F2ECE1" stroke="#D8CBB8" stroke-width="1" />
          <text x="636" y="422" font-family="'DejaVu Sans', sans-serif" font-size="15" font-weight="700" letter-spacing="1" fill="#7A5216">HANDCRAFTED IN KATHMANDU, NEPAL</text>
          <rect x="618" y="460" width="380" height="72" rx="16" fill="#1C1B1A" stroke="#D4AF37" stroke-width="2.5" />
          <text x="808" y="505" text-anchor="middle" font-family="'DejaVu Sans', sans-serif" font-size="22" font-weight="700" fill="#F5D98B">View Details &amp; Buy Now  →</text>
          <text x="618" y="574" font-family="'DejaVu Sans', sans-serif" font-size="15" font-weight="700" fill="#5C534B">@artified_np  •  artified.com.np</text>
        </svg>`;

        const jpegBuffer = await sharpLib(Buffer.from(svg))
          .resize(1200, 630)
          .jpeg({ quality: 88, mozjpeg: true })
          .toBuffer();

        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        res.status(200).send(jpegBuffer);
        return;
      } catch {}
    }

    // 2. Fallback: serve the product's direct JPEG buffer from Firestore so WhatsApp still shows the product photo
    if (rawImageBuffer) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
      res.status(200).send(rawImageBuffer);
      return;
    }
  }

  const fallbackCandidates = [
    path.resolve(process.cwd(), 'dist/og-image.jpg'),
    path.resolve(process.cwd(), 'public/og-image.jpg'),
  ];
  for (const fallback of fallbackCandidates) {
    if (fs.existsSync(fallback)) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.status(200).send(fs.readFileSync(fallback));
      return;
    }
  }

  res.status(404).send('Not found');
}
