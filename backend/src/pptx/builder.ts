import dotenv from 'dotenv';
dotenv.config();

import PptxGenJS from 'pptxgenjs';
import https from 'https';
import { PPTContent, SlideContent } from '../llm/groq';

const THEMES = {
  dark_navy: {
    darkBg: '0D1B2A', lightBg: 'F8F9FA',
    titleOnDark: '00BFFF', titleOnLight: '1A3A5F',
    bodyOnDark: 'C8D6E5', bodyOnLight: '374151',
    accentA: 'FF4B6E', accentB: '00C9A7', accentC: '7C3AED',
    cardOnDark: '1A2940', cardOnLight: 'FFFFFF',
    borderOnDark: '2A3F5F', borderOnLight: 'E5E7EB',
  },
  light_clean: {
    darkBg: '1E3A5F', lightBg: 'FFFFFF',
    titleOnDark: '93C5FD', titleOnLight: '1E3A5F',
    bodyOnDark: 'DBEAFE', bodyOnLight: '374151',
    accentA: 'F59E0B', accentB: '3B82F6', accentC: '8B5CF6',
    cardOnDark: '162D4A', cardOnLight: 'F0F9FF',
    borderOnDark: '2D4F7F', borderOnLight: 'BFDBFE',
  },
  green_nature: {
    darkBg: '1B4332', lightBg: 'F0FDF4',
    titleOnDark: '6EE7B7', titleOnLight: '065F46',
    bodyOnDark: 'D1FAE5', bodyOnLight: '1F2937',
    accentA: 'F59E0B', accentB: '10B981', accentC: 'EC4899',
    cardOnDark: '2D6A4F', cardOnLight: 'FFFFFF',
    borderOnDark: '3D8B5F', borderOnLight: 'A7F3D0',
  },
};

const ACCENT_CYCLE = [
  'FF4B6E', '00C9A7', '7C3AED', '1A56DB',
  'F59E0B', '10B981', 'EC4899', '00BFFF',
];

type Theme = typeof THEMES.dark_navy;

// ─── IMAGE FETCHING ────────────────────────────────────────────────────────────

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

async function fetchImageAsBase64(keyword: string): Promise<string | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => { resolve(null); }, 10000);

    const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(keyword)}&w=800&h=500&orientation=landscape&client_id=${UNSPLASH_ACCESS_KEY}`;

    https.get(url, (res) => {
      if (res.statusCode !== 200) { clearTimeout(timeout); resolve(null); return; }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        clearTimeout(timeout);
        try {
          const json = JSON.parse(data);
          const imgUrl = json.urls?.regular || json.urls?.full || json.links?.download;
          if (!imgUrl) { resolve(null); return; }

          https.get(imgUrl, (imgRes) => {
            if (imgRes.statusCode !== 200) { resolve(null); return; }
            const chunks: Buffer[] = [];
            imgRes.on('data', (c: Buffer) => chunks.push(c));
            imgRes.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
            imgRes.on('error', () => resolve(null));
          }).on('error', () => resolve(null));
        } catch { resolve(null); }
      });
      res.on('error', () => { clearTimeout(timeout); resolve(null); });
    }).on('error', () => { clearTimeout(timeout); resolve(null); });
  });
}

// ─── MAIN ENTRY ───────────────────────────────────────────────────────────────

export async function buildPPTX(pptContent: PPTContent, topic: string): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';

  const theme = THEMES[pptContent.theme as keyof typeof THEMES] || THEMES.dark_navy;
  const slides = pptContent.slides;

  console.log('[Builder] Fetching images for slides...');
  const images = await Promise.all(
    slides.map(s => s.imageKeyword ? fetchImageAsBase64(s.imageKeyword) : Promise.resolve(null))
  );
  console.log(`[Builder] ${images.filter(Boolean).length}/${slides.length} images fetched`);

  for (let i = 0; i < slides.length; i++) {
    const content = slides[i];
    const pSlide = pptx.addSlide();
    const img = images[i];
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const isDark = content.layout === 'title' || content.layout === 'summary' || i % 2 === 0;

    switch (content.layout) {
      case 'title':   buildTitleSlide(pptx, pSlide, content, theme, topic, img, accent); break;
      case 'two_col': buildTwoColSlide(pptx, pSlide, content, theme, isDark, img, accent); break;
      case 'summary': buildSummarySlide(pptx, pSlide, content, theme, accent); break;
      default:        buildBulletsSlide(pptx, pSlide, content, theme, isDark, img, accent);
    }

    if (content.notes) pSlide.addNotes(content.notes);
  }

  return await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
}

// ─── TITLE SLIDE ──────────────────────────────────────────────────────────────

function buildTitleSlide(
  pptx: PptxGenJS, slide: PptxGenJS.Slide,
  content: SlideContent, theme: Theme,
  topic: string, img: string | null, accent: string
) {
  slide.background = { color: theme.darkBg };

  slide.addShape(pptx.ShapeType.ellipse, {
    x: 9.8, y: -1.2, w: 5.0, h: 5.0,
    fill: { color: theme.cardOnDark }, line: { color: theme.borderOnDark, width: 0 },
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: 0.6, y: 3.35, w: 3.0, h: 0.08,
    fill: { color: theme.accentA }, line: { color: theme.accentA },
  });

  slide.addText(content.title.toUpperCase(), {
    x: 0.5, y: 0.8, w: img ? 6.5 : 12.3, h: 1.8,
    fontSize: 44, bold: true, color: theme.titleOnDark,
    fontFace: 'Calibri', align: 'left', valign: 'middle',
  });

  if (content.bullets[0]) {
    slide.addText(content.bullets[0], {
      x: 0.5, y: 3.55, w: img ? 6.5 : 12.3, h: 0.7,
      fontSize: 20, color: theme.bodyOnDark,
      fontFace: 'Calibri', align: 'left',
    });
  }

  if (img) {
    slide.addImage({
      data: `data:image/jpeg;base64,${img}`,
      x: 7.0, y: 1.0, w: 5.8, h: 4.5,
      rounding: true,
    });
  }

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 3.5, y: 6.6, w: 6.3, h: 0.6,
    fill: { color: theme.cardOnDark },
    line: { color: theme.borderOnDark, width: 1 }, rectRadius: 0.1,
  });
  slide.addText(content.notes?.slice(0, 55) || `${topic} · CBSE curriculum aligned`, {
    x: 3.5, y: 6.6, w: 6.3, h: 0.6,
    fontSize: 11, bold: true, color: theme.bodyOnDark,
    fontFace: 'Calibri', align: 'center', valign: 'middle',
  });
}

// ─── BULLETS SLIDE ────────────────────────────────────────────────────────────

function buildBulletsSlide(
  pptx: PptxGenJS, slide: PptxGenJS.Slide,
  content: SlideContent, theme: Theme,
  isDark: boolean, img: string | null, accent: string
) {
  const bg = isDark ? theme.darkBg : theme.lightBg;
  const titleColor = isDark ? theme.titleOnDark : theme.titleOnLight;
  const bodyColor = isDark ? theme.bodyOnDark : theme.bodyOnLight;
  const cardBg = isDark ? theme.cardOnDark : theme.cardOnLight;
  const cardBorder = isDark ? theme.borderOnDark : theme.borderOnLight;

  slide.background = { color: bg };

  slide.addText(content.title.toUpperCase(), {
    x: 0.5, y: 0.25, w: 12.3, h: 0.72,
    fontSize: 30, bold: true, color: titleColor,
    fontFace: 'Calibri', align: 'left',
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 0.5, y: 0.98, w: 12.3, h: 0,
    line: { color: cardBorder, width: 1 },
  });

  const leftW = img ? 7.2 : 12.3;

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.4, y: 1.12, w: leftW, h: 5.95,
    fill: { color: cardBg }, line: { color: cardBorder, width: 1 }, rectRadius: 0.15,
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.4, y: 1.12, w: leftW, h: 0.62,
    fill: { color: accent }, line: { color: accent }, rectRadius: 0.15,
  });
  slide.addText(content.title, {
    x: 0.55, y: 1.15, w: leftW - 0.2, h: 0.56,
    fontSize: 14, bold: true, color: 'FFFFFF',
    fontFace: 'Calibri', valign: 'middle',
  });
  slide.addText(
    content.bullets.map(b => ({
      text: b,
      options: { bullet: { type: 'bullet' as const }, fontSize: 16, color: bodyColor, paraSpaceAfter: 10, fontFace: 'Calibri' },
    })),
    { x: 0.55, y: 1.88, w: leftW - 0.25, h: 4.95, valign: 'top' }
  );

  if (img) {
    slide.addImage({
      data: `data:image/jpeg;base64,${img}`,
      x: 7.8, y: 1.12, w: 5.1, h: 3.8,
      rounding: true,
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 7.8, y: 5.08, w: 5.1, h: 1.95,
      fill: { color: isDark ? '0D1B2A' : 'EEF2FF' },
      line: { color: isDark ? theme.borderOnDark : 'C7D2FE', width: 1 }, rectRadius: 0.1,
    });
    slide.addText('INSIGHT', {
      x: 7.95, y: 5.18, w: 4.8, h: 0.3,
      fontSize: 10, bold: true, color: accent, fontFace: 'Calibri',
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 7.95, y: 5.5, w: 4.7, h: 0,
      line: { color: isDark ? theme.borderOnDark : 'C7D2FE', width: 0.5 },
    });
    slide.addText(content.bullets[content.bullets.length - 1] || content.notes, {
      x: 7.95, y: 5.58, w: 4.8, h: 1.3,
      fontSize: 13, color: bodyColor, italic: true,
      fontFace: 'Calibri', valign: 'top',
    });
  } else {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 7.8, y: 1.12, w: 5.1, h: 5.95,
      fill: { color: isDark ? '0D1B2A' : 'EEF2FF' },
      line: { color: isDark ? theme.borderOnDark : 'C7D2FE', width: 1 }, rectRadius: 0.15,
    });
    slide.addText('KEY INSIGHT', {
      x: 7.95, y: 1.38, w: 4.8, h: 0.38,
      fontSize: 11, bold: true, color: accent, fontFace: 'Calibri',
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 7.95, y: 1.78, w: 4.7, h: 0,
      line: { color: isDark ? theme.borderOnDark : 'C7D2FE', width: 0.5 },
    });
    slide.addText(content.bullets[content.bullets.length - 1] || content.notes, {
      x: 7.95, y: 1.95, w: 4.8, h: 4.8,
      fontSize: 15, color: bodyColor, italic: true,
      fontFace: 'Calibri', valign: 'top',
    });
  }
}

// ─── TWO COLUMN SLIDE ─────────────────────────────────────────────────────────

function buildTwoColSlide(
  pptx: PptxGenJS, slide: PptxGenJS.Slide,
  content: SlideContent, theme: Theme,
  isDark: boolean, img: string | null, accent: string
) {
  const bg = isDark ? theme.darkBg : theme.lightBg;
  const titleColor = isDark ? theme.titleOnDark : theme.titleOnLight;
  const bodyColor = isDark ? theme.bodyOnDark : theme.bodyOnLight;
  const cardBg = isDark ? theme.cardOnDark : theme.cardOnLight;
  const cardBorder = isDark ? theme.borderOnDark : theme.borderOnLight;

  slide.background = { color: bg };

  slide.addText(content.title.toUpperCase(), {
    x: 0.5, y: 0.25, w: 12.3, h: 0.72,
    fontSize: 30, bold: true, color: titleColor,
    fontFace: 'Calibri', align: 'left',
  });

  const mid = Math.ceil(content.bullets.length / 2);
  const leftBullets = content.bullets.slice(0, mid);
  const rightBullets = content.bullets.slice(mid);
  const cardTop = img ? 4.1 : 1.12;
  const cardH = img ? 3.15 : 5.95;

  if (img) {
    slide.addImage({
      data: `data:image/jpeg;base64,${img}`,
      x: 0.4, y: 1.05, w: 12.6, h: 2.85,
      rounding: true,
    });
  }

  const colDefs = [
    { x: 0.4, label: 'PART A', accent: theme.accentB, bullets: leftBullets },
    { x: 6.85, label: 'PART B', accent: theme.accentC, bullets: rightBullets },
  ];

  for (const col of colDefs) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: col.x, y: cardTop, w: 6.2, h: cardH,
      fill: { color: cardBg }, line: { color: cardBorder, width: 1 }, rectRadius: 0.15,
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: col.x, y: cardTop, w: 6.2, h: 0.6,
      fill: { color: col.accent }, line: { color: col.accent }, rectRadius: 0.15,
    });
    slide.addText(col.label, {
      x: col.x + 0.15, y: cardTop + 0.03, w: 5.85, h: 0.54,
      fontSize: 13, bold: true, color: 'FFFFFF', fontFace: 'Calibri', valign: 'middle',
    });
    slide.addText(
      col.bullets.map(b => ({
        text: b,
        options: { bullet: { type: 'bullet' as const }, fontSize: 15, color: bodyColor, paraSpaceAfter: 10, fontFace: 'Calibri' },
      })),
      { x: col.x + 0.2, y: cardTop + 0.72, w: 5.8, h: cardH - 0.85, valign: 'top' }
    );
  }
}

// ─── SUMMARY SLIDE ────────────────────────────────────────────────────────────

function buildSummarySlide(
  pptx: PptxGenJS, slide: PptxGenJS.Slide,
  content: SlideContent, theme: Theme, accent: string
) {
  slide.background = { color: theme.darkBg };

  slide.addShape(pptx.ShapeType.ellipse, {
    x: 3.0, y: 0.3, w: 7.5, h: 7.0,
    fill: { color: theme.cardOnDark }, line: { color: theme.borderOnDark, width: 0 },
  });

  slide.addText('KEY TAKEAWAYS', {
    x: 0.5, y: 0.35, w: 12.3, h: 0.5,
    fontSize: 14, bold: true, color: theme.accentA,
    fontFace: 'Calibri', align: 'center',
  });

  slide.addText(content.title.toUpperCase(), {
    x: 0.5, y: 0.88, w: 12.3, h: 1.3,
    fontSize: 38, bold: true, color: theme.titleOnDark,
    fontFace: 'Calibri', align: 'center',
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.8, y: 2.38, w: 11.7, h: 4.65,
    fill: { color: theme.cardOnDark },
    line: { color: accent, width: 1.5 }, rectRadius: 0.2,
  });

  slide.addText(
    content.bullets.map(b => ({
      text: b,
      options: { bullet: { type: 'bullet' as const }, fontSize: 17, color: theme.bodyOnDark, paraSpaceAfter: 12, fontFace: 'Calibri' },
    })),
    { x: 1.1, y: 2.65, w: 11.1, h: 4.1, valign: 'top' }
  );

  slide.addShape(pptx.ShapeType.rect, {
    x: 5.3, y: 7.1, w: 2.7, h: 0.08,
    fill: { color: theme.accentA }, line: { color: theme.accentA },
  });
}