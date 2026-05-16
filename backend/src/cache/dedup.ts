import crypto from 'crypto';
import { redis } from '../queue/client';

export function buildDedupHash(topic: string, grade: string, subject: string, numSlides: number): string {
  const raw = `${topic.trim().toLowerCase()}|${grade.trim().toLowerCase()}|${subject.trim().toLowerCase()}|${numSlides}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function getDedupCache(hash: string): Promise<string | null> {
  const cached = await redis.get(`dedup:${hash}`);
  return (cached as string | null) ?? null;
}

export async function setDedupCache(hash: string, jobId: string): Promise<void> {
  await redis.set(`dedup:${hash}`, jobId, { ex: 86400 });
}