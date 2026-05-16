# Savra PPT Generator 

## What was built
- Next.js 14 frontend with generation form + live job polling + slide preview
- Express.js backend with REST API
- BullMQ async job queue backed by Upstash Redis
- Groq llama-3.3-70b as primary LLM (free tier)
- Google Gemini 1.5 Flash as fallback with circuit breaker
- pptxgenjs PPTX generation with 4 layout types
- SHA-256 dedup cache (24h TTL) in Redis
- Supabase PostgreSQL for persistent job state
- Direct buffer download (no S3 needed)

## What was skipped
- Semantic caching (HuggingFace embeddings) — described in architecture doc
- WebSocket push notifications — polling every 3s used instead
- User authentication — out of scope for assessment
- PDF export — PPTX only

## How to run locally

### 1. Clone and install
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Set environment variables
Copy backend/.env.example → backend/.env and fill in all keys
Copy frontend/.env.local.example → frontend/.env.local

### 3. Set up Supabase
Run the SQL in architecture/design-doc.md Section 3 in Supabase SQL Editor

### 4. Start backend
```bash
cd backend && npm run dev
```

### 5. Start frontend
```bash
cd frontend && npm run dev
```

### 6. Open http://localhost:3000

## Assumptions
- Groq free API key from console.groq.com
- Gemini key from aistudio.google.com (free)
- Upstash Redis from upstash.com (free tier)
- Supabase project from supabase.com (free tier)
- Related images from unsplash.com 

## Tech stack justification
Node.js + Express chosen over Python/FastAPI because Next.js frontend and pptxgenjs (Node-only library) share the same runtime. This reduces context switching and allows shared TypeScript types between frontend and backend.