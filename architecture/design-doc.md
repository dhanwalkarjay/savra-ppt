# Savra PPT Generation — Architecture Design Document

**Author:** Jay Dhanwalkar 
**Date:** May 2026
**Version:** 0.1

---

## Executive Summary

The current PPT generation system is synchronous, expensive (₹15/PPT), and fragile under load. This document proposes a redesigned architecture centered on four core changes:

1. **Async job queue** — teacher submits and moves on; no more waiting on screen
2. **Semantic caching** — semantically similar requests hit cache instead of the LLM
3. **Smart model routing** — use the best available free model, fall back gracefully
4. **Token-optimized prompting** — cut input/output tokens per PPT by ~50%

**Stack philosophy:** Every component in this architecture runs on a free tier. This is intentional — at 2,400 users, Savra does not need paid infrastructure yet. The free-tier choices are production-grade services (not toys), each with a clear paid upgrade path when scale demands it.

Projected outcome: cost drops from ₹15 to **~₹0/PPT on free tier** (Groq's free API). When a paid tier becomes necessary at 10K users, projected cost is ~₹0.20/PPT — a 98%+ reduction.

---

## Free Stack Overview

| Layer | Free Service | Limit / Notes |
|-------|-------------|---------------|
| LLM (primary) | **Groq API** — `llama-3.3-70b` | 14,400 req/day, 500K tokens/min — free |
| LLM (fallback) | **Google AI Studio** — `gemini-1.5-flash` | 1,500 req/day — free |
| Embeddings | **HuggingFace Inference API** — `all-MiniLM-L6-v2` | Free, no CC needed |
| Job queue | **BullMQ** + **Upstash Redis** | 10,000 commands/day free |
| Database | **Supabase** (PostgreSQL) | 500MB, 2 projects free |
| File output | Local buffer → direct download stream | No S3 needed for prototype |
| Frontend | **Vercel** (Next.js) | Free hobby tier |
| Backend | **Railway** or localhost | 500 hrs/month free |

> For the prototype, PPTX files are streamed directly as a download response buffer. In production, swap the buffer write for an S3/R2 `putObject` — the rest of the architecture stays identical.

---

## A. System Design

### Request Flow

```
Teacher (browser)
  │
  ├─ POST /api/generate  →  Express backend
  │                              │
  │                    ┌─────────┴──────────┐
  │                    │  Dedup check       │  SHA-256 hash match in Redis?
  │                    │  + Semantic cache  │  cosine similarity > 0.92?
  │                    │  (Upstash + HF emb)│──── HIT ──→ return cached PPTX
  │                    └────────────────────┘
  │                              │ MISS
  │                    ┌─────────▼──────────┐
  │                    │  BullMQ job queue  │  enqueue, return { jobId } instantly
  │                    │  (Upstash Redis)   │
  │                    └─────────┬──────────┘
  │                              │
  │                    ┌─────────▼──────────┐
  │                    │   Worker           │
  │                    │  1. Prompt builder │  compact JSON schema prompt
  │                    │  2. LLM router     │  Groq → Gemini Flash fallback
  │                    │  3. PPTX builder   │  pptxgenjs template injection
  │                    └─────────┬──────────┘
  │                              │
  │                    ┌─────────▼──────────┐
  │                    │  Output            │  job status → Supabase
  │                    │                    │  PPTX buffer → Redis (TTL 1hr)
  │                    └────────────────────┘
  │
  └─ GET /api/jobs/:jobId   →  poll every 3s  →  { status, ready } on done
     GET /api/download/:jobId  →  streams PPTX buffer
```

### Key Architectural Decisions

**Async over sync** — Instead of blocking the teacher for 30s–2min, the system returns a `jobId` immediately. The frontend polls every 3 seconds. When status is `done`, a download button appears. This single change eliminates the "stuck on screen" problem regardless of which LLM is used.

> Teacher experience: "Submit → instant confirmation → download button ~10–15s later." Far better than a frozen screen with a spinner.

**Template-first generation** — The LLM only generates a JSON structure: `{ slides: [{ title, bullets, notes }] }`. A separate `pptxgenjs` step injects this into pre-built slide templates. The LLM never touches layout, fonts, or design — this keeps prompts short, outputs predictable, and PPTX generation fast (<1s).

**Upstash Redis as the backbone** — Serves three roles simultaneously: BullMQ job queue, exact-match response cache (by SHA-256 hash), and PPTX buffer storage (TTL 1hr). One free-tier Redis instance covers all three at current Savra volume.

**Supabase for job state** — Job records (`jobId`, `status`, `createdAt`, `params`) live in Supabase. This gives a persistent audit trail even after the Redis buffer expires, and enables future features like job history per teacher.

---

## B. Cost Reduction Strategy

### Where the cost comes from (current system)

Current LLM: Gemini 1.5 Pro  
Per-PPT tokens (10 slides): ~3,000 input + ~2,000 output = ~5,000 tokens  
At blended Gemini Pro pricing: **₹15/PPT**

### Levers

**1. Switch primary model to Groq — biggest lever, and it's free**

Groq provides `llama-3.3-70b` on a genuinely free API (no trial, no credit card). Llama 3.3 70B performs comparably to GPT-4o on structured generation. For slide content (JSON bullets, not open essays), quality is at or above Gemini 1.5 Pro. Groq also runs on custom LPU hardware — generation time drops from ~30s to ~8s.

| Model | Cost | Quality (structured JSON) | Latency |
|-------|------|--------------------------|---------|
| Gemini 1.5 Pro (current) | ₹15/PPT | Baseline | ~30s |
| **Groq Llama 3.3 70B (new primary)** | **₹0 (free)** | **~95% of Pro** | **~8s** |
| Gemini 1.5 Flash (fallback) | ₹0 (AI Studio free) | ~85% of Pro | ~12s |

Free tier limit: 14,400 requests/day. At 100 PPTs/day (current volume), well within limits. At 10K users, upgrade to Groq paid (~$0.59/1M tokens) or rotate across multiple API keys.

**2. Token-optimized prompting**

Current: one large, loosely structured prompt per generation  
New: tight system prompt (identical every time, Groq caches it) + compact user message

- Output schema: `{"slides": [{"title": "...", "bullets": ["...", "..."], "notes": "..."}]}`
- Remove filler tokens ("Please generate…", "Make sure to…", "As an AI…") — saves 200–400 tokens per request
- All slides in one API call, not one call per slide

**Estimated reduction: 40–50% fewer tokens per PPT** — critical when moving to paid tier.

**3. Semantic response caching (free via HuggingFace)**

Teachers across schools generate nearly identical content: "Class 8 Photosynthesis 10 slides" and "Grade 8 Photosynthesis presentation" should return the same cached output.

How it works:
1. Compute embedding of `"{topic} {grade} {subject} {numSlides}"` via HuggingFace `all-MiniLM-L6-v2` (free inference API)
2. Store embedding vector + PPTX Redis key in Upstash
3. On new request: compute embedding, check cosine similarity against stored vectors
4. If similarity > 0.92 → return cached PPTX, skip LLM entirely

HuggingFace Inference API is free with no rate limit for this model size. Estimated cache hit rate at scale: 15–25%.

**4. Exact-match deduplication (zero cost)**

SHA-256 hash of `topic + grade + subject + numSlides`. If the same request completed in the last 24h, return the cached result immediately. Stored as a Redis key with 24h TTL. Zero additional cost.

**5. Template pre-computation**

`pptxgenjs` templates are defined as static JS objects — no rendering at request time. The worker only fills in content fields. PPTX assembly takes <1s and uses zero API calls.

---

## C. Reliability Plan

### The core problem

Gemini Pro 503s happen because Savra hits Google's rate limits synchronously, with no queue buffer and no circuit breaker. The fallback (2.5 Flash) degrades quality because it receives the same unoptimized prompt that Pro struggled with.

### Smart fallback: Groq → Gemini Flash

```
Request arrives at worker
  │
  ├── Is Groq circuit breaker OPEN?
  │      NO  → call Groq (llama-3.3-70b), 20s timeout
  │      YES → call Gemini Flash immediately (no delay, same quality tier for JSON)
  │
  Groq returns 429 or 503:
  │      increment groq:failures in Redis (TTL 60s)
  │      if failures >= 3 → set groq:open flag (TTL 30s)
  │      retry once after 2s
  │      if retry fails → call Gemini Flash
  │
  Both fail:
  │      mark job status: "queued_retry" in Supabase
  │      worker retries after 5-minute backoff
  │      UI shows: "High demand — your PPT will be ready in ~5 min"
```

**Key insight:** Groq 429 (rate limit) is not a quality failure — it means "try again or use fallback." Gemini Flash as fallback is acceptable because both are free, and the quality gap on structured JSON is small (~10%). The real improvement over the current system is that failures are now handled asynchronously — the teacher never sees a mid-workflow error, just a slightly longer wait.

### Circuit breaker (Redis-backed, no library needed)

```js
async function callLLM(prompt) {
  const isOpen = await redis.get('groq:open');
  if (isOpen) return callGeminiFlash(prompt);

  try {
    const result = await callGroq(prompt); // 20s timeout
    await redis.del('groq:failures');
    return result;
  } catch (err) {
    if ([429, 503].includes(err.status) || err.code === 'TIMEOUT') {
      const failures = await redis.incr('groq:failures');
      await redis.expire('groq:failures', 60);
      if (Number(failures) >= 3) {
        await redis.set('groq:open', '1', 'EX', 30); // open for 30s
      }
    }
    return callGeminiFlash(prompt);
  }
}
```

### Graceful degradation tiers

| Scenario | Behaviour | Teacher sees |
|----------|-----------|--------------|
| Groq healthy | Llama 3.3 70B, ~8–15s | Download ready |
| Groq 429 (< 3 failures) | 2s retry → Gemini Flash | Slight delay |
| Groq circuit open | Immediately Gemini Flash, ~12s | Normal UX |
| Both rate-limited | 5-min retry queue | "High demand" message with ETA |
| Queue backlog > 30 jobs | Return queue position in response | ETA shown in UI |

---

## D. Scaling Plan

### Cost math at 10,000 users

**Current system:**
- 10,000 users, 50% teachers = 5,000 teachers
- 2 PPTs/week each → ~43,000 PPTs/month
- At ₹15/PPT: **₹6,45,000/month (~$7,700/month)**

**New system on free tier (current + near-term):**
- Groq free: 14,400 req/day → covers 43,000 PPTs/month comfortably
- LLM cost: **₹0/month**
- Upstash Redis: needs paid plan at ~500 PPTs/day → **$10/month**
- Supabase free: covers this volume
- Total infra: **~$10–25/month**

**New system on Groq paid tier (sustained 10K users):**
- Groq paid: $0.59/1M input, $0.79/1M output tokens
- Per PPT (optimized, ~1,500 in + 1,200 out tokens): ~$0.0024 = **₹0.20/PPT**
- With 20% semantic cache hit rate: effective **₹0.16/PPT**
- Monthly at 43,000 PPTs: **₹6,880/month (~$82/month)**
- **Savings vs current: ~99% cost reduction**

### Infrastructure decisions by volume

**100 PPTs/day (now):**
- Single Express server + 1 BullMQ worker, 3 concurrent jobs
- All free tiers sufficient
- Run on Railway free tier or localhost

**500 PPTs/day:**
- Upgrade Upstash to $10/month
- 2 workers, 5 concurrent jobs
- Watch Groq daily limits — add second API key rotation if needed

**2,000 PPTs/day:**
- Groq paid tier or 3–5 key rotation
- Horizontal workers (BullMQ handles distribution automatically)
- Move PPTX storage from Redis to Cloudflare R2 (free 10GB/month)
- Add Supabase index on `jobId` + `status` for faster polling queries

**10,000 PPTs/day:**
- Groq paid + Anthropic Haiku 3.5 as secondary (not fallback — load-balanced)
- 10–15 workers, autoscaled
- Redis Cluster with AOF persistence
- CDN for PPTX downloads

### Single point of failure: Upstash Redis

The current design routes the job queue, semantic cache, and PPTX buffer all through one Redis instance. If Upstash goes down:

- New jobs cannot be queued (queue is down)
- Cache lookups fail — all requests go straight to the LLM
- Completed PPTX buffers are inaccessible until Redis recovers

Mitigations in place now: Supabase stores job status independently (so we know what completed even if Redis is down). PPTX can be regenerated by resubmitting — it is not irreplaceable data.

Mitigation at scale: add a Redis read replica (Upstash supports this on paid plans). Decouple the PPTX buffer from the queue Redis by moving files to Cloudflare R2 at the 500 PPTs/day milestone.

### Bottleneck table

| Bottleneck | Hits at | Fix |
|------------|---------|-----|
| Groq 14,400/day free limit | ~600 PPTs/day | Multi-key rotation or paid ($0.59/1M tokens) |
| Upstash 10,000 cmd/day free | ~300 PPTs/day | $10/month paid plan |
| HuggingFace embedding latency (~200ms) | 2,000+ PPTs/day | Self-host via ONNX Runtime (still free) |
| Redis PPTX buffer memory | 500+ active PPTs | Reduce TTL to 30min or move to R2 |
| Single worker process | 200+ concurrent users | Horizontal BullMQ workers |

---

## Assumptions Made

- Node.js backend (Express/Fastify) — matches recommended stack
- Existing slide templates are stable — LLM fills content only, does not design
- Teachers accept async generation — submit and return, better UX than waiting
- "Quality" = factual accuracy + well-structured bullets for school curricula
- Groq API key available (free, sign up at console.groq.com — no CC needed)
- Google AI Studio key available for fallback (free, no CC needed)
- PPTX served as direct download buffer for prototype; S3 swap is a one-line change in production

---

---

## Bonus Question: Projected Monthly LLM Cost at 10,000 Users

> "At 10,000 users with 50% being teachers who each generate 2 PPTs/week — what is your projected monthly LLM cost under your new architecture vs. the current system? Show your assumptions."

### Assumptions

| Assumption | Value |
|-----------|-------|
| Total users | 10,000 |
| Teachers (50%) | 5,000 |
| PPTs per teacher per week | 2 |
| Weeks per month | 4.3 |
| Total PPTs/month | 5,000 × 2 × 4.3 = **43,000** |
| Tokens per PPT (current, unoptimized) | 3,000 input + 2,000 output = 5,000 |
| Tokens per PPT (new, optimized) | 1,500 input + 1,200 output = 2,700 |
| Semantic cache hit rate | 20% (conservative) |
| Effective PPTs needing LLM | 43,000 × 0.80 = **34,400** |

### Current system cost (Gemini 1.5 Pro)

- ₹15/PPT × 43,000 PPTs = **₹6,45,000/month (~$7,700/month)**

### New system — free tier (Groq + Gemini Flash)

- Groq free tier: 14,400 requests/day → 4,32,000/month — comfortably covers 34,400
- LLM cost: **₹0/month**
- Infrastructure (Upstash paid + Railway): ~$25/month = **~₹2,100/month**
- **Total: ~₹2,100/month**

### New system — Groq paid tier (when free limits are exceeded at peak)

- Groq paid pricing: $0.59/1M input tokens, $0.79/1M output tokens
- Input tokens: 34,400 PPTs × 1,500 = 51.6M tokens → $30.44
- Output tokens: 34,400 PPTs × 1,200 = 41.28M tokens → $32.61
- Total LLM: $63.05/month = **~₹5,300/month**
- Infrastructure: ~$25/month
- **Total: ~₹6,400/month (~$76/month)**

### Summary

| System | Monthly cost | Per-PPT cost |
|--------|-------------|-------------|
| Current (Gemini 1.5 Pro) | ₹6,45,000 | ₹15.00 |
| New (Groq free tier) | ₹2,100 | ₹0.05 (infra only) |
| New (Groq paid tier) | ₹6,400 | ₹0.15 |

**Cost reduction: 97–99% depending on tier.**

The free tier alone handles the 10K user scenario — 43,000 PPTs/month is well within Groq's 4,32,000 requests/month allowance. The paid tier math is shown for when Savra wants guaranteed SLAs and no rate-limit risk.

1. **Instrument every LLM call** — log token counts, latency, cache hit/miss. Can't optimize what you can't measure.
2. **Ship semantic cache first** — highest ROI, zero LLM cost on cache hits, low implementation risk.
3. **A/B test Groq Llama vs current Gemini Pro** on 5% traffic — validate quality parity with real teacher feedback before full cutover.
4. **WebSocket for job status** — replace polling with push so the UI feels instant.
5. **Self-host embeddings** — when HuggingFace latency is a bottleneck, run `all-MiniLM-L6-v2` locally via ONNX (free, <100ms, no external calls).
