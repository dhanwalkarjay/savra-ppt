import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pptQueue } from '../queue/client';
import { buildDedupHash, getDedupCache } from '../cache/dedup';
import { createJob, getJob } from '../db/supabase';

export const generateRoute = Router();

generateRoute.post('/', async (req: Request, res: Response) => {
  try {
    const { topic, grade, subject, numSlides } = req.body;

    if (!topic || !grade || !subject || !numSlides) {
      return res.status(400).json({ error: 'Missing required fields: topic, grade, subject, numSlides' });
    }
    if (Number(numSlides) < 3 || Number(numSlides) > 15) {
      return res.status(400).json({ error: 'numSlides must be between 3 and 15' });
    }
    if (String(topic).trim().length < 3) {
      return res.status(400).json({ error: 'Topic too short' });
    }

    const dedupHash = buildDedupHash(topic, grade, subject, Number(numSlides));
    const existingJobId = await getDedupCache(dedupHash);

    if (existingJobId) {
      const existingJob = await getJob(existingJobId);
      if (existingJob && existingJob.status === 'done') {
        console.log(`[Generate] Dedup hit — returning existing job ${existingJobId}`);
        return res.json({
          jobId: existingJobId,
          cached: true,
          status: 'done',
          message: 'Found a cached result for this request',
        });
      }
    }

    const jobId = uuidv4();

    await createJob({
      job_id: jobId,
      status: 'queued',
      topic: String(topic).trim(),
      grade: String(grade).trim(),
      subject: String(subject).trim(),
      num_slides: Number(numSlides),
      dedup_hash: dedupHash,
    });

    await pptQueue.add('generate-ppt', {
      jobId,
      topic: String(topic).trim(),
      grade: String(grade).trim(),
      subject: String(subject).trim(),
      numSlides: Number(numSlides),
      dedupHash,
    });

    console.log(`[Generate] Job ${jobId} queued for "${topic}"`);
    return res.json({ jobId, cached: false, status: 'queued', message: 'Your PPT is being generated' });
  } catch (err: any) {
    console.error('[Generate] Error:', err.message);
    return res.status(500).json({ error: 'Failed to queue PPT generation', details: err.message });
  }
});