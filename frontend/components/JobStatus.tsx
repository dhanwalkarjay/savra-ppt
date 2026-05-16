'use client';

import { useEffect, useState } from 'react';
import { getDownloadUrl, getJobStatus, JobStatusResponse } from '../lib/api';
import SlidePreview from './SlidePreview';

interface Props {
  jobId: string;
  topic: string;
  onReset: () => void;
}

const STATUS_MESSAGES = {
  queued: 'Your request is in the queue...',
  processing: 'AI is generating your slides...',
  done: 'Your presentation is ready!',
  failed: 'Generation failed. Please try again.',
};

const STATUS_COLORS = {
  queued: 'text-[#F59E0B]',
  processing: 'text-[#00BFFF]',
  done: 'text-[#10B981]',
  failed: 'text-[#FF4B6E]',
};

export default function JobStatus({ jobId, topic, onReset }: Props) {
  const [job, setJob] = useState<JobStatusResponse | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const data = await getJobStatus(jobId);
        if (cancelled) {
          return;
        }
        setJob(data);
        if (data.status === 'done' || data.status === 'failed') {
          return;
        }
        setTimeout(poll, 3000);
      } catch {
        if (!cancelled) {
          setTimeout(poll, 5000);
        }
      }
    };

    poll();

    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [jobId]);

  const status = job?.status || 'queued';

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#2A3F5F] bg-[#1A2940] p-8">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">{topic}</h3>
            <p className={`mt-1 text-sm ${STATUS_COLORS[status]}`}>{STATUS_MESSAGES[status]}</p>
          </div>
          <span className="rounded-full bg-[#0D1B2A] px-3 py-1 text-xs text-[#4A5E7A]">{elapsed}s elapsed</span>
        </div>

        {(status === 'queued' || status === 'processing') && (
          <div className="h-1 overflow-hidden rounded-full bg-[#0D1B2A]">
            <div
              className="h-full rounded-full bg-[#00BFFF] animate-pulse"
              style={{ width: status === 'processing' ? '70%' : '20%', transition: 'width 1s ease' }}
            />
          </div>
        )}

        {status === 'done' && (
          <div className="mt-4 flex gap-3">
            <a
              href={getDownloadUrl(jobId)}
              download
              className="flex-1 rounded-xl bg-[#10B981] py-3 text-center font-bold text-white transition-colors hover:bg-[#059669]"
            >
              ⬇ Download PPTX
            </a>
            <button
              onClick={onReset}
              className="rounded-xl border border-[#2A3F5F] px-6 text-[#8899AA] transition-colors hover:border-[#00BFFF] hover:text-[#00BFFF]"
            >
              New PPT
            </button>
          </div>
        )}

        {status === 'failed' && (
          <div className="mt-4">
            <p className="mb-3 text-sm text-[#FF4B6E]">{job?.errorMessage}</p>
            <button
              onClick={onReset}
              className="rounded-xl bg-[#FF4B6E] px-6 py-2 font-bold text-white transition-colors hover:bg-[#E53E5E]"
            >
              Try Again
            </button>
          </div>
        )}

        <p className="mt-4 text-xs text-[#4A5E7A]">Job ID: {jobId}</p>
      </div>

      {status === 'done' && job?.slideJson && <SlidePreview slides={job.slideJson.slides} theme={job.slideJson.theme} />}
    </div>
  );
}