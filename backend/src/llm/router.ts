import { redis } from '../queue/client';
import { callGroq, PPTContent } from './groq';
import { callGemini } from './gemini';

const FAILURE_THRESHOLD = 3;
const FAILURE_WINDOW_SEC = 60;
const BREAKER_OPEN_SEC = 30;

export type LLMModel = 'groq' | 'gemini';

export interface LLMResult {
  content: PPTContent;
  model: LLMModel;
  tokensUsed?: number;
}

export async function routeLLM(topic: string, grade: string, subject: string, numSlides: number): Promise<LLMResult> {
  const isOpen = await redis.get('groq:open');

  if (!isOpen) {
    try {
      console.log('[LLM Router] Attempting Groq (primary)...');
      const content = await withTimeout(callGroq(topic, grade, subject, numSlides), 20000);
      await redis.del('groq:failures');
      console.log('[LLM Router] Groq succeeded');
      return { content, model: 'groq' };
    } catch (err: any) {
      console.error('[LLM Router] Groq failed:', err?.message || err);

      const status = err?.status || err?.statusCode;
      if ([429, 500, 503].includes(status) || err?.code === 'TIMEOUT') {
        const failures = await redis.incr('groq:failures');
        await redis.expire('groq:failures', FAILURE_WINDOW_SEC);

        console.log(`[LLM Router] Groq failure count: ${failures}/${FAILURE_THRESHOLD}`);

        if (Number(failures) >= FAILURE_THRESHOLD) {
          await redis.set('groq:open', '1', { ex: BREAKER_OPEN_SEC });
          console.warn('[LLM Router] Circuit breaker OPENED for 30s');
        }
      }
    }
  } else {
    console.log('[LLM Router] Circuit breaker OPEN — routing directly to Gemini');
  }

  console.log('[LLM Router] Attempting Gemini (fallback)...');
  const content = await withTimeout(callGemini(topic, grade, subject, numSlides), 25000);
  console.log('[LLM Router] Gemini succeeded');
  return { content, model: 'gemini' };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => {
        const err: any = new Error(`LLM call timed out after ${ms}ms`);
        err.code = 'TIMEOUT';
        reject(err);
      }, ms)
    ),
  ]);
}