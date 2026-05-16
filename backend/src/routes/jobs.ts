import { Router, Request, Response } from 'express';
import { getJob } from '../db/supabase';

export const jobsRoute = Router();

jobsRoute.get('/:jobId', async (req: Request, res: Response) => {
  const { jobId } = req.params;

  const job = await getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  return res.json({
    jobId: job.job_id,
    status: job.status,
    topic: job.topic,
    grade: job.grade,
    subject: job.subject,
    numSlides: job.num_slides,
    slideJson: job.status === 'done' ? job.slide_json : null,
    errorMessage: job.status === 'failed' ? job.error_message : null,
    createdAt: job.created_at,
    completedAt: job.completed_at,
  });
});