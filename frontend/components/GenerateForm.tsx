'use client';

import { useState } from 'react';
import { generatePPT } from '../lib/api';

interface Props {
  onJobCreated: (jobId: string, topic: string) => void;
}

const GRADES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const SUBJECTS = [
  'Science',
  'Mathematics',
  'Social Studies',
  'English',
  'Hindi',
  'History',
  'Geography',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Economics',
];

export default function GenerateForm({ onJobCreated }: Props) {
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('8');
  const [subject, setSubject] = useState('Science');
  const [numSlides, setNumSlides] = useState(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const result = await generatePPT({ topic: topic.trim(), grade, subject, numSlides });
      onJobCreated(result.jobId, topic.trim());
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#2A3F5F] bg-[#1A2940] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
      <h2 className="mb-6 text-2xl font-bold text-[#00BFFF]">Generate Presentation</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-[#8899AA]">Topic</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Photosynthesis, French Revolution, Quadratic Equations"
            className="w-full rounded-xl border border-[#2A3F5F] bg-[#0D1B2A] px-4 py-3 text-white placeholder-[#4A5E7A] transition-colors focus:border-[#00BFFF] focus:outline-none"
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#8899AA]">Grade</label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full rounded-xl border border-[#2A3F5F] bg-[#0D1B2A] px-4 py-3 text-white transition-colors focus:border-[#00BFFF] focus:outline-none"
              disabled={loading}
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#8899AA]">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-[#2A3F5F] bg-[#0D1B2A] px-4 py-3 text-white transition-colors focus:border-[#00BFFF] focus:outline-none"
              disabled={loading}
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[#8899AA]">
            Number of Slides: <span className="font-bold text-[#00BFFF]">{numSlides}</span>
          </label>
          <input
            type="range"
            min={3}
            max={12}
            value={numSlides}
            onChange={(e) => setNumSlides(Number(e.target.value))}
            className="w-full accent-[#00BFFF]"
            disabled={loading}
          />
          <div className="mt-1 flex justify-between text-xs text-[#4A5E7A]">
            <span>3 slides</span>
            <span>12 slides</span>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-[#FF4B6E]/30 bg-[#FF4B6E]/10 px-4 py-3 text-sm text-[#FF4B6E]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00BFFF] py-3 font-bold text-[#0D1B2A] transition-colors hover:bg-[#00AADE] disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0D1B2A]/30 border-t-[#0D1B2A]" />
              Queuing your request...
            </>
          ) : (
            '✦ Generate Presentation'
          )}
        </button>
      </form>
    </div>
  );
}