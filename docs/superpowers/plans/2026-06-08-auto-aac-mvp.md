# Auto AAC MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vercel-ready Next.js MVP that turns teacher-provided Korean science text and student profiles into 3-4 reviewable AAC storyboard cards with OpenAI text and image generation.

**Architecture:** The app uses Next.js App Router route handlers for `/api/generate` and `/api/regenerate-image`. Static curriculum, special-education, and AAC style grounding data feed deterministic retrieval helpers, which are injected into structured OpenAI prompts and image prompts. The client renders a teacher review workspace where every generated card remains editable, regenerable, and deletable.

**Tech Stack:** Next.js App Router, TypeScript, React, OpenAI JavaScript SDK, Zod, local JSON grounding packs, Vercel deployment.

---

### Role Agents

- **Grounding Architect:** owns `data/*` and `lib/grounding/*`; builds curriculum/special-education retrieval and style profile data.
- **AI Pipeline Engineer:** owns `lib/openai.ts`, `lib/schemas.ts`, `lib/prompts/*`, and API routes; wires structured text generation and image generation.
- **Teacher UX Engineer:** owns `app/page.tsx`, `app/globals.css`, and `components/*`; builds the first-screen tool and storyboard editing workflow.
- **Verification/Docs Engineer:** owns README, env example, verification commands, and final commit/push readiness.

### Task 1: Scaffold Next.js App

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `next-env.d.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `.gitignore`

- [ ] Initialize a TypeScript Next.js App Router project with npm scripts for `dev`, `build`, `start`, and `lint`.
- [ ] Add React/Next/OpenAI/Zod dependencies.
- [ ] Keep the first route as the actual AAC conversion tool, not a landing page.
- [ ] Run `npm install`.

### Task 2: Grounding Packs And Retrieval

**Files:**
- Create: `data/curriculum_seed.json`
- Create: `data/special_education_grounding.json`
- Create: `data/aac_style_profile.json`
- Create: `lib/grounding/curriculum-grounding.ts`
- Create: `lib/grounding/special-education-rules.ts`
- Create: `lib/grounding/retrieval.ts`
- Create: `lib/grounding/retrieval.test.ts`

- [ ] Write failing tests for keyword overlap curriculum selection, student-profile rule selection, and style-profile loading.
- [ ] Build static grounding JSON with middle-school science domains, special-education transformation constraints, and the custom AAC style derived from the attached examples.
- [ ] Implement deterministic retrieval without embeddings or vector DB.
- [ ] Verify tests pass.

### Task 3: Schemas, Prompts, And OpenAI Client

**Files:**
- Create: `lib/schemas.ts`
- Create: `lib/prompts/system-prompt.ts`
- Create: `lib/prompts/image-prompt.ts`
- Create: `lib/openai.ts`

- [ ] Define Zod schemas preserving `topic`, `student_analysis`, and `steps`.
- [ ] Add extended metadata fields: `curriculum_links`, `special_education_rules_used`, `teacher_review_required`, and image/style metadata.
- [ ] Create system and image prompt builders that inject retrieved curriculum, special-education, and AAC style grounding.
- [ ] Initialize the OpenAI client lazily from `OPENAI_API_KEY`.

### Task 4: API Routes

**Files:**
- Create: `app/api/generate/route.ts`
- Create: `app/api/regenerate-image/route.ts`

- [ ] Implement `POST /api/generate` input validation.
- [ ] Run retrieval and OpenAI structured output generation.
- [ ] Generate image data URLs for each step with the custom AAC style prompt.
- [ ] Implement `POST /api/regenerate-image`.
- [ ] Return clear missing-key errors without exposing secrets.

### Task 5: Teacher Review UI

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Create: `components/InputPanel.tsx`
- Create: `components/Storyboard.tsx`
- Create: `components/AacCard.tsx`
- Create: `components/ReviewToolbar.tsx`

- [ ] Build a dense teacher tool surface with student-profile and science-text textareas.
- [ ] Render loading and API error states.
- [ ] Show storyboard cards with step numbers, images, editable simplified text, regenerate-image button, and delete button.
- [ ] Mark every output as `교사용 검토 초안` / `교사 검토 필요`.
- [ ] Surface applied curriculum links, special-education rules, and AAC style profile metadata.

### Task 6: Documentation And Verification

**Files:**
- Create: `README.md`
- Create: `.env.local.example`

- [ ] Document why this is an AAC conversion tool, not a general summarizer.
- [ ] Explain curriculum grounding, special-education grounding, dynamic student-profile analysis, and Human-in-the-loop review.
- [ ] Explain custom AAC style profile/reference-guided generation without claiming model fine-tuning.
- [ ] Document OpenAI Images API usage, Vercel deployment, and env vars.
- [ ] Run `npm run build`.
- [ ] Start `npm run dev` and browser-verify the local UI.
- [ ] If no safe API key is available, verify API error handling and document that live OpenAI generation requires a rotated key in `.env.local`.
- [ ] Commit and push to `yangisu/Auto_AAC`.
