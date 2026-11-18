// backend/routes/ocr.js
import express from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function tryModel(modelName, content) {
  const model = genAI.getGenerativeModel({ model: modelName });
  const t0 = Date.now();
  console.log(`[OCR] ⏳ trying ${modelName}...`);
  const result = await withTimeout(
    model.generateContent(content),
    60000,
    `${modelName} request`
  );
  console.log(`[OCR] ✅ ${modelName} responded in ${Date.now() - t0}ms`);
  return result;
}

async function callGeminiWithRetry(content) {
  let lastError;
  for (const modelName of MODELS) {
    const maxRetries = 2;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await tryModel(modelName, content);
      } catch (err) {
        lastError = err;
        const msg = err.message || '';
        const isRetryable =
          msg.includes('503') || msg.includes('500') || msg.includes('429') ||
          msg.includes('timed out');
        if (!isRetryable) throw err;

        const isLastAttempt = attempt === maxRetries - 1;
        if (isLastAttempt) break;

        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        console.log(`[OCR] ⚠️ ${modelName} attempt ${attempt + 1} failed, retry in ${Math.round(delay)}ms`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

const EXTRACT_PROMPT = `Extract these fields from this approval letter. Return ONLY valid JSON:
{
  "clubName": "string or null",
  "eventName": "string or null",
  "eventDate": "YYYY-MM-DD or null",
  "eventTime": "string or null",
  "venue": "string or null",
  "attendees": number or null,
  "signatory": "string or null",
  "eventPurpose": "string or null",
  "approvalStatus": "string or null"
}

Rules:
- LANGUAGE: Detect the language of the letter.
  - If the letter is already in English, DO NOT translate anything. Return field values exactly as written.
  - If the letter is in Malay, translate text field values to English. Translate Malay common nouns (e.g. "Kelab Komputer" → "Computer Club", "Dewan Seminar" → "Seminar Hall"). DO NOT translate proper nouns (person names, place names, or the official club name as printed) — keep them as written.
- eventTime: return as "HH:MM – HH:MM" (24-hour clock, en dash). If the letter explicitly says it is a whole-day event or gives no specific times, return exactly "Whole Day".
- venue: return the venue/place name exactly as written in the letter, but if the letter is in Malay, translate the venue name to English. Do not include address/city unless it is part of the venue name.
- eventPurpose: return a SHORT one-to-two sentence summary (max ~150 chars) of the stated aim/objective of the event. If the letter is in Malay, summarise in English; otherwise summarise in English as well (purpose should always be a brief English summary since it's user-facing). Do NOT copy the whole paragraph.
- signatory: return the person who SIGNED the letter on behalf of the club (President, Secretary, Advisor near the signature line). IGNORE names in "FOR OFFICE USE ONLY", "APPROVED BY", or "APPROVAL STATUS" blocks. Keep the name as written — never translate person names.
- approvalStatus: return the status stated in the letter, ALWAYS in English. Normalise Malay values to English: "DILULUSKAN" / "DILULUS" / "LULUS" → "APPROVED"; "MENUNGGU" / "BELUM DILULUSKAN" → "PENDING"; "DITOLAK" / "GAGAL" → "REJECTED". Look for labels like "APPROVAL STATUS:", "STATUS:", "Status Kelulusan:", "Kelulusan:". Use null if no explicit status is written.
- Use null when a field is not present. Do not invent or guess values.`;

function parseExtracted(result) {
  const raw = result.response.text().trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  return JSON.parse(raw);
}

// ── Mode 1: upload file (applicant) ────────────────────────────────
router.post('/api/ocr', upload.single('file'), async (req, res) => {
  const t0 = Date.now();
  console.log(`[OCR] ▶ upload request: ${req.file?.size ?? 0}B ${req.file?.mimetype}`);
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(req.file.mimetype)) {
      return res.status(400).json({ error: `Unsupported: ${req.file.mimetype}` });
    }

    const base64 = req.file.buffer.toString('base64');
    const result = await callGeminiWithRetry([
      { inlineData: { mimeType: req.file.mimetype, data: base64 } },
      { text: EXTRACT_PROMPT },
    ]);

    const extracted = parseExtracted(result);
    console.log(`[OCR] ✅ upload success in ${Date.now() - t0}ms`);
    res.json(extracted);
  } catch (err) {
    console.error(`[OCR] ❌ upload error after ${Date.now() - t0}ms:`, err.message);
    res.status(500).json({ error: err.message || 'OCR failed' });
  }
});

// ── Mode 2: re-extract from URL (MPP) ──────────────────────────────
router.post('/api/ocr-from-url', async (req, res) => {
  const t0 = Date.now();
  const { url } = req.body || {};
  console.log(`[OCR-URL] ▶ url=${url}`);

  try {
    if (!url) return res.status(400).json({ error: 'url is required' });

    // 1. Download the file from Supabase Storage
    const fileRes = await fetch(url);
    if (!fileRes.ok) {
      return res.status(400).json({ error: `Failed to download file: ${fileRes.status}` });
    }
    const contentType = fileRes.headers.get('content-type') || 'application/pdf';
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.some(t => contentType.includes(t))) {
      return res.status(400).json({ error: `Unsupported content-type: ${contentType}` });
    }

    const buf = Buffer.from(await fileRes.arrayBuffer());
    console.log(`[OCR-URL] downloaded ${buf.length}B, type=${contentType}`);

    // 2. Send to Gemini
    const base64 = buf.toString('base64');
    const result = await callGeminiWithRetry([
      { inlineData: { mimeType: contentType, data: base64 } },
      { text: EXTRACT_PROMPT },
    ]);

    const extracted = parseExtracted(result);
    console.log(`[OCR-URL] ✅ success in ${Date.now() - t0}ms`);
    res.json(extracted);
  } catch (err) {
    console.error(`[OCR-URL] ❌ error after ${Date.now() - t0}ms:`, err.message);
    res.status(500).json({ error: err.message || 'OCR failed' });
  }
});

export default router;