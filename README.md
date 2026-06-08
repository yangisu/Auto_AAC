# Auto_AAC

Auto_AAC is an MVP tool for converting Korean curriculum content into teacher-reviewable AAC card sequences for special-education classrooms. It is an AAC conversion tool, not a summarizer: the goal is to transform lesson material into accessible communication cards while preserving the curriculum intent.

## MVP Scope

- Convert teacher-provided curriculum text into a sequential AAC card draft.
- Dynamically analyze the selected student profile before generation, including communication level, reading load, behavioral/emotional support needs, preferred AAC style, and classroom context.
- Retrieve relevant curriculum grounding from static JSON curriculum data using retrieval-like selection, then use the selected material as generation context.
- Generate clear AAC symbols with the OpenAI Images API.
- Keep a human-in-the-loop workflow: teachers review, edit, approve, or reject generated cards before classroom use.

## How It Works

1. A teacher enters a natural-language student profile and a Korean science source text.
2. `lib/grounding/retrieval.ts` extracts science keywords and student-support cues.
3. The app selects relevant curriculum contexts from `data/curriculum_seed.json`.
4. The app selects special-education rules from `data/special_education_grounding.json`.
5. The OpenAI text model returns structured JSON with `topic`, `student_analysis`, and 3-4 AAC steps.
6. The OpenAI Images API generates one AAC-style image for each step.
7. The teacher reviews, edits, regenerates images, deletes cards, and decides whether the draft is usable.

## Special-Education Grounding

Auto_AAC generation should follow these principles:

- Reduce cognitive load and working-memory demand.
- Use one concept per AAC card.
- Prefer short Korean SOV sentences.
- Prioritize concrete, observable concepts over abstract wording.
- Preserve sequential flow across cards.
- Separate cause and effect into different cards when needed.
- Use predictable flow for students with emotional or behavioral support needs.
- Produce clear AAC symbols that match the card concept directly.

`data/special_education_grounding.json` now separates broad needs into more specific generation rules:

- receptive-language support: one independent clause, one verb phrase, no embedded clauses.
- working-memory support: 3-4 steps, one new idea per card, repeat key nouns when needed.
- visual-discrimination support: clean field, large focal object, high contrast, no clutter.
- transition predictability: stable first-next-then order for students who need predictable flow.
- AAC core vocabulary reuse: stable simple predicates such as `받는다`, `간다`, `만든다`, `바뀐다`.

## Curriculum Grounding

The MVP uses static JSON curriculum data as its source of truth. At generation time, the app selects the most relevant curriculum entries in a retrieval-like step, then grounds the AAC card draft in those selected entries. This keeps outputs aligned to curriculum content without requiring a database or full search service for the MVP.

The initial pack is a reviewable MVP seed. It is designed to show explicit grounding in middle-school science concepts and special-education science support practices, but final classroom validity should be reviewed by a teacher or domain expert.

Each curriculum context includes `sentenceDecomposition` and `cardSentenceFrames` so the model can split science meaning into Korean AAC card language:

- `subjectCandidates`: likely science actors, such as `잎`, `식물`, `물`, `열`.
- `objectCandidates`: concrete objects or inputs/outputs, such as `햇빛`, `물`, `양분`.
- `predicateCandidates`: simple predicates, such as `받는다`, `만든다`, `변한다`.
- `concreteAnchors`: visible image anchors for abstract science terms.
- `causeEffectCues`: cues for separating cause and result into different cards.
- `cardSentenceFrames`: ready-to-use short Korean card sentences.

## AAC Style Profile

Auto_AAC supports a custom AAC style profile in `data/aac_style_profile.json`. The current profile is derived from the provided examples: white background, thick black outlines, simple flat vector shapes, rounded card frames, blue/green borders, arrows for sequence or cause-effect, and one concept per image.

This is not model fine-tuning. It is a prompt/style-conditioned image generation pipeline that makes the MVP look and behave like it has an explicit AAC visual system without claiming a trained custom model.

## OpenAI Images API

The app requires an OpenAI API key to generate AAC symbols. Server-side route handlers call the OpenAI text and image APIs and must not expose secret keys to the browser.

- `POST /api/generate`: runs grounding retrieval, structured text generation, and image generation.
- `POST /api/regenerate-image`: regenerates a single image from an existing card image prompt.

## Environment Variables

Create `.env.local` from `.env.local.example` for local development.

```bash
cp .env.local.example .env.local
```

Required:

- `OPENAI_API_KEY`: OpenAI API key used by server-side generation.

Optional:

- `OPENAI_IMAGE_MODEL`: Image generation model name.
- `OPENAI_TEXT_MODEL`: Text model name for AAC card drafting and student-profile analysis.
- `NEXT_PUBLIC_APP_URL`: Public app URL used in deployment-aware links.

Never commit `.env.local`. If an API key is leaked, rotate it immediately in the provider dashboard and replace the local and Vercel environment values.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm test
npm run build
```

Without a safe `OPENAI_API_KEY`, the API intentionally returns a missing-key error. Add a rotated key to `.env.local` to test live text and image generation.

## Grounding References

The grounding packs are MVP seeds derived from these public sources and translated into local, reviewable JSON rules:

- Ministry of Education, Korea: 2022 Revised National Curriculum announcement and MOE Notification No. 2022-33 for the national curriculum, including Science as separate volume 9. https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0&m=040401
- Korea Foundation for the Advancement of Science and Creativity: 2022 revised science curriculum draft/final report, used for the middle-school science area structure: 운동과 에너지, 물질, 생명, 지구와 우주, 과학과 사회. https://cdn.kosac.re.kr/files/legacy_data/jnrepo/upload/jnBrdBoard/202304/a6819baa69b640648e861c4080fba452_1682063071411.pdf
- National Institute of Special Education: 2022 revised special-education curriculum evaluation-material overview, used to frame the need for student-matched goals and basic-curriculum support materials. https://www.nise.go.kr/field/page/vol131/sub_2_04_2.html
- ASHA Practice Portal, Intellectual Disability: AAC has no prerequisite cognitive skill requirement; activity schedules and visual supports can support sequences, attention, transitions, and setting-appropriate behavior. https://www.asha.org/practice-portal/clinical-topics/intellectual-disability/
- ASHA Practice Portal, Augmentative and Alternative Communication: symbol organization, symbol size, field size, sensory/motor status, language level, memory, attention, and AAC feature matching should be individualized. https://www.asha.org/Practice-Portal/Professional-Issues/Augmentative-and-Alternative-Communication/
- CAST Universal Design for Learning: grounding for multiple means of engagement, representation, and action/expression, especially language/symbol and comprehension supports. https://www.cast.org/what-we-do/universal-design-for-learning/
- What Works Clearinghouse, Organizing Instruction and Study to Improve Student Learning: grounding for combining graphics with verbal descriptions and connecting abstract concepts to concrete representations. https://ies.ed.gov/ncee/WWC/PracticeGuide/1
- Autism Internet Modules, Visual Supports: grounding for using visual supports to clarify instructions, academics, social situations, and emotional/behavioral expectations. https://autisminternetmodules.org/m/1048

## Vercel Deployment

Deploy the MVP on Vercel after adding the same environment variables in the Vercel project settings. Keep OpenAI keys as server-side environment variables only. Static JSON curriculum files can be deployed with the app for the MVP, while teacher review remains part of the live workflow before AAC cards are used with students.
