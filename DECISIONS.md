# Key Decisions

## Why Groq over Gemini Pro as primary
Groq's free tier (llama-3.3-70b) provides comparable quality to Gemini 1.5 Pro for structured JSON generation at zero cost. Generation time drops from ~30s to ~8s due to Groq's custom LPU hardware. This eliminates the ₹15/PPT cost entirely for current volume.

## Why async over synchronous
The original system blocks the teacher for 30s-2min. With BullMQ:
- Teacher gets a jobId instantly (<200ms)
- Frontend polls every 3s (low overhead)
- System can handle bursts without blocking HTTP connections
- Failed jobs auto-retry without the teacher noticing

## Why SHA-256 dedup over semantic cache
For the prototype, exact-match dedup (SHA-256 hash) is implemented because:
- Zero extra API calls (no embedding model needed)
- Catches the most common case: teacher submitting the same form twice
- Semantic caching is described in the architecture doc as the next step

## Why Upstash Redis over local Redis
The prototype needs to run without Docker or local infrastructure. Upstash's REST API works from any Node.js environment including serverless. Free tier (10K commands/day) is sufficient for prototype demo volume.

## Why PPTX buffer in Redis (not S3)
S3 requires AWS credentials and costs money. For the prototype:
- PPTX buffer stored in Redis as base64, TTL 1 hour
- Downloaded via GET /api/download/:jobId which streams the buffer
- In production: swap the Redis set/get for S3 putObject/getObject — 2 lines change

## What was skipped and why
- Semantic caching (HuggingFace embeddings): Described in architecture doc, not implemented in prototype. Would add ~200ms latency for embedding lookup. SHA-256 dedup covers the most impactful case (same request) with zero overhead.
- WebSocket for real-time updates: Polling every 3s is sufficient for the demo. WebSocket adds server complexity for marginal UX gain at this scale.
- Authentication: Not in the assignment scope. Would be added before production.
- PDF export: The /api/download route serves PPTX. PDF conversion (via LibreOffice or a paid API) would be a separate endpoint.

## Assumptions about Savra's system
- Teachers are okay with async generation (they submit and return, not wait on screen)
- CBSE/NCERT curriculum alignment is the quality bar for slide content
- Slide templates do not need images (only text and shapes — no image search API needed)
- One backend process is sufficient for demo volume (single Railway instance)