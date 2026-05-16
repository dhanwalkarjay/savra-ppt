import { Worker } from 'bullmq';
import { bullRedisConnection, redis } from './client';
import { routeLLM } from '../llm/router';
import { buildPPTX } from '../pptx/builder';
import { updateJob } from '../db/supabase';
import { setDedupCache } from '../cache/dedup';

const PPTX_BUFFER_TTL_SEC = 3600;

const worker = new Worker(
  'ppt-generation',
  async (job) => {
    const { jobId, topic, grade, subject, numSlides, dedupHash } = job.data as {
      jobId: string;
      topic: string;
      grade: string;
      subject: string;
      numSlides: number;
      dedupHash?: string;
    };

    console.log(`[Worker] Processing job ${jobId}: "${topic}" Grade ${grade}`);

    await updateJob(jobId, { status: 'processing' });

    const llmResult = await routeLLM(topic, grade, subject, numSlides);
    console.log(`[Worker] LLM done via ${llmResult.model}`);

    const pptxBuffer = await buildPPTX(llmResult.content, topic);
    console.log(`[Worker] PPTX built, size: ${pptxBuffer.length} bytes`);

    const bufferKey = `pptx:${jobId}`;
    await redis.set(bufferKey, pptxBuffer.toString('base64'), { ex: PPTX_BUFFER_TTL_SEC });

    await updateJob(jobId, {
      status: 'done',
      slide_json: llmResult.content as object,
      completed_at: new Date().toISOString(),
    });

    if (dedupHash) {
      await setDedupCache(dedupHash, jobId);
    }

    console.log(`[Worker] Job ${jobId} completed successfully`);
    return { jobId, model: llmResult.model };
  },
  {
    connection: bullRedisConnection,
    concurrency: 3,
  }
);

worker.on('failed', async (job, err) => {
  if (!job) {
    return;
  }

  const { jobId } = job.data as { jobId: string };
  console.error(`[Worker] Job ${jobId} failed:`, err.message);

  await updateJob(jobId, {
    status: 'failed',
    error_message: err.message,
    completed_at: new Date().toISOString(),
  });
});

console.log('[Worker] BullMQ worker started — waiting for jobs...');