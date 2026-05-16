'use client';

import { useState } from 'react';
import GenerateForm from '../components/GenerateForm';
import JobStatus from '../components/JobStatus';

export default function Home() {
  const [view, setView] = useState<'form' | 'status'>('form');
  const [jobId, setJobId] = useState('');
  const [topic, setTopic] = useState('');

  const handleJobCreated = (id: string, topicName: string) => {
    setJobId(id);
    setTopic(topicName);
    setView('status');
  };

  const handleReset = () => {
    setView('form');
    setJobId('');
    setTopic('');
  };

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#2A3F5F] bg-[#1A2940] px-4 py-1.5 text-xs font-medium text-[#00BFFF]">
            ✦ AI-Powered · Free · Async
          </div>
          <h1 className="mb-2 text-4xl font-bold text-white">
            Savra <span className="text-[#00BFFF]">PPT</span> Generator
          </h1>
          <p className="text-[#8899AA]">Generate curriculum-aligned presentations for Indian school teachers</p>
        </div>

        {view === 'form' ? <GenerateForm onJobCreated={handleJobCreated} /> : <JobStatus jobId={jobId} topic={topic} onReset={handleReset} />}

        <p className="mt-8 text-center text-xs text-[#4A5E7A]">Powered by Groq Llama 3.3 70B · Circuit breaker enabled · Async queue</p>
      </div>
    </main>
  );
}