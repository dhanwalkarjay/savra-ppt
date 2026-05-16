import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type JobStatus = 'queued' | 'processing' | 'done' | 'failed';

export interface JobRecord {
  job_id: string;
  status: JobStatus;
  topic: string;
  grade: string;
  subject: string;
  num_slides: number;
  dedup_hash?: string;
  slide_json?: object;
  error_message?: string;
  created_at?: string;
  completed_at?: string;
}

export async function createJob(record: Omit<JobRecord, 'created_at' | 'completed_at'>): Promise<void> {
  const { error } = await supabase.from('jobs').insert(record);
  if (error) {
    throw new Error(`Supabase insert failed: ${error.message}`);
  }
}

export async function updateJob(
  jobId: string,
  updates: Partial<Pick<JobRecord, 'status' | 'slide_json' | 'error_message' | 'completed_at'>>
): Promise<void> {
  const { error } = await supabase.from('jobs').update(updates).eq('job_id', jobId);
  if (error) {
    throw new Error(`Supabase update failed: ${error.message}`);
  }
}

export async function getJob(jobId: string): Promise<JobRecord | null> {
  const { data, error } = await supabase.from('jobs').select('*').eq('job_id', jobId).single();
  if (error || !data) {
    return null;
  }
  return data as JobRecord;
}