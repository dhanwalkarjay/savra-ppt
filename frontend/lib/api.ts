const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface GenerateRequest {
  topic: string;
  grade: string;
  subject: string;
  numSlides: number;
}

export interface GenerateResponse {
  jobId: string;
  cached: boolean;
  status: string;
  message: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
  topic: string;
  grade: string;
  subject: string;
  numSlides?: number;
  slideJson?: {
    slides: Array<{
      title: string;
      bullets: string[];
      notes: string;
      layout: string;
    }>;
    theme: string;
  };
  errorMessage?: string;
  createdAt?: string;
  completedAt?: string;
}

export async function generatePPT(data: GenerateRequest): Promise<GenerateResponse> {
  const res = await fetch(`${API_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Generation failed');
  }

  return res.json();
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`${API_URL}/api/jobs/${jobId}`);
  if (!res.ok) {
    throw new Error('Failed to fetch job status');
  }
  return res.json();
}

export function getDownloadUrl(jobId: string): string {
  return `${API_URL}/api/download/${jobId}`;
}