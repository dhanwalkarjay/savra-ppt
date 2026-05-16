import dotenv from 'dotenv';
dotenv.config();

import { Redis } from '@upstash/redis';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!upstashUrl || !upstashToken) {
  throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set');
}

// After the guard above, TypeScript still doesn't narrow module-level consts
// inside functions. Use local typed variables instead.
const REDIS_URL: string = upstashUrl;
const REDIS_TOKEN: string = upstashToken;

export const redis = new Redis({
  url: REDIS_URL,
  token: REDIS_TOKEN,
});

function buildBullConnectionString(): string {
  // Upstash REST URLs are https:// — convert to rediss:// for ioredis
  const parsed = new URL(REDIS_URL);
  const host = parsed.hostname;
  const port = parsed.port || '6379';
  return `rediss://default:${REDIS_TOKEN}@${host}:${port}`;
}

export const bullRedisConnection = new IORedis(buildBullConnectionString(), {
  maxRetriesPerRequest: null,
  tls: {},
});

export const pptQueue = new Queue('ppt-generation', {
  connection: bullRedisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});