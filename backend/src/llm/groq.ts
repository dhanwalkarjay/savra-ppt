import dotenv from 'dotenv';
dotenv.config();

import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface SlideContent {
  title: string;
  bullets: string[];
  notes: string;
  layout: 'title' | 'bullets' | 'two_col' | 'summary';
  imageKeyword?: string; // Used to fetch a relevant image for the slide
  accentColor?: string;  // Optional per-slide accent override
}

export interface PPTContent {
  slides: SlideContent[];
  theme: 'dark_navy' | 'light_clean' | 'green_nature';
}

const SYSTEM_PROMPT = `You are a professional educational presentation creator for Indian school students following CBSE/NCERT curriculum.
Your job is to generate slide content as a single JSON object.

OUTPUT ONLY valid JSON. No markdown fences. No explanation. No extra text.

Schema:
{
  "theme": "dark_navy" | "light_clean" | "green_nature",
  "slides": [
    {
      "title": "string — max 8 words, engaging and specific",
      "bullets": ["string", "string", "string"] — 3 to 5 points, each max 15 words, factual and curriculum-aligned,
      "notes": "string — teacher speaking notes, 2 sentences, practical classroom tip",
      "layout": "title" | "bullets" | "two_col" | "summary",
      "imageKeyword": "string — 2-3 words for an image search e.g. 'chlorophyll plant cell'"
    }
  ]
}

Layout rules (strictly follow):
- Slide 1: layout = "title" always
- Slide 2 to (n-2): alternate between "bullets" and "two_col"
- Last slide: layout = "summary" always
- Use "two_col" for comparison slides (elements vs compounds, causes vs effects)

Content rules:
- Use Indian examples, scientists, cities where relevant
- Bullets must be factual, age-appropriate, CBSE-aligned
- imageKeyword must be a real, searchable image topic (not abstract)
- theme: choose based on subject — science=dark_navy, history=light_clean, nature/biology=green_nature`;

export async function callGroq(
  topic: string,
  grade: string,
  subject: string,
  numSlides: number
): Promise<PPTContent> {
  const userPrompt = `Generate a ${numSlides}-slide presentation on "${topic}" for Grade ${grade} ${subject} students. Make it engaging, informative, and CBSE-aligned.`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0]?.message?.content || '{}';

  let parsed: PPTContent;
  try {
    parsed = JSON.parse(raw) as PPTContent;
  } catch {
    throw new Error('Groq returned invalid JSON');
  }

  if (!parsed.slides || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
    throw new Error('Invalid LLM response: missing or empty slides array');
  }

  // Enforce layout rules in case LLM doesn't follow
  parsed.slides[0].layout = 'title';
  parsed.slides[parsed.slides.length - 1].layout = 'summary';

  return parsed;
}