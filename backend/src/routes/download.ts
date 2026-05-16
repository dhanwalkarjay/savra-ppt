import { Router, Request, Response } from 'express';
import { redis } from '../queue/client';
import { getJob } from '../db/supabase';

export const downloadRoute = Router();

downloadRoute.get('/:jobId', async (req: Request, res: Response) => {
  const { jobId } = req.params;

  const job = await getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  if (job.status !== 'done') {
    return res.status(400).json({ error: `Job not ready — status: ${job.status}` });
  }

  const bufferKey = `pptx:${jobId}`;
  const base64Buffer = await redis.get(bufferKey);

  if (!base64Buffer) {
    return res.status(410).json({
      error: 'PPTX file has expired (older than 1 hour). Please regenerate.',
    });
  }

  const buffer = Buffer.from(base64Buffer as string, 'base64');
  const safeFilename = job.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}_grade${job.grade}.pptx"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
});