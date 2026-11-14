// backend/routes/ocr.js
import express from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/api/ocr', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        error: `Unsupported file type: ${req.file.mimetype}`,
      });
    }

    const base64 = req.file.buffer.toString('base64');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: req.file.mimetype,
          data: base64,
        },
      },
      {
        text: `Extract these fields from this approval letter. Return ONLY valid JSON, no markdown:
{
  "clubName": "string or null",
  "eventName": "string or null",
  "eventDate": "YYYY-MM-DD or null",
  "attendees": number or null,
  "signatory": "string or null"
}
If a field is missing, use null.`,
      },
    ]);

    const raw = result.response.text().trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    let extracted;
    try {
      extracted = JSON.parse(raw);
    } catch {
      console.error('Gemini returned non-JSON:', raw);
      return res.status(502).json({ error: 'AI returned unparseable response', raw });
    }

    res.json(extracted);
  } catch (err) {
    console.error('OCR error:', err);
    res.status(500).json({ error: err.message || 'OCR failed' });
  }
});

export default router;