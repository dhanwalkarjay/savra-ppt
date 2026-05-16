
import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenerativeAI } from '@google/generative-ai';
import { PPTContent } from './groq';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `You are a professional educational presentation creator for Indian school students following CBSE/NCERT curriculum.
Output ONLY valid JSON. No markdown fences. No explanation. No extra text whatsoever.

Schema:
{
  "theme": "dark_navy" | "light_clean" | "green_nature",
  "slides": [
    {
      "title": "string — max 8 words",
      "bullets": ["string", "string", "string"],
      "notes": "string — teacher speaking notes, 2 sentences",
      "layout": "title" | "bullets" | "two_col" | "summary",
      "imageKeyword": "string — 2-3 word image search term"
    }
  ]
}

Rules:
- First slide layout = "title". Last slide layout = "summary".
- Middle slides alternate "bullets" and "two_col".
- Use Indian examples, scientists, cities where relevant.
- imageKeyword must be a real searchable image topic.
- theme: science=dark_navy, history=light_clean, nature/biology=green_nature.`;

export async function callGemini(
  topic: string,
  grade: string,
  subject: string,
  numSlides: number
): Promise<PPTContent> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const prompt = `${SYSTEM_PROMPT}\n\nGenerate a ${numSlides}-slide presentation on "${topic}" for Grade ${grade} ${subject} students. CBSE-aligned, use Indian examples.`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text();

  // Strip any accidental backticks
  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();

  let parsed: PPTContent;
  try {
    parsed = JSON.parse(cleaned) as PPTContent;
  } catch {
    throw new Error('Gemini returned invalid JSON');
  }

  if (!parsed.slides || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
    throw new Error('Gemini response missing slides array');
  }

  // Enforce layout rules
  parsed.slides[0].layout = 'title';
  parsed.slides[parsed.slides.length - 1].layout = 'summary';

  return parsed;
}