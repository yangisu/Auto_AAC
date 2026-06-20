# Auto AAC PWA and Privacy Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Auto AAC Next.js app installable and mobile-safe while preventing sensitive student input from being cached or unnecessarily retained.

**Architecture:** Keep the existing same-origin Next.js UI and API routes on Vercel. Add a narrow PWA shell, explicit privacy controls, safe API response handling, and an environment-driven Digital Asset Links endpoint. Android/Bubblewrap generation is a second implementation plan that starts only after these web assets are deployed and the Play signing certificate is available.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Vitest 4, Playwright, Web App Manifest, Service Worker, OpenAI Responses and Images APIs, Vercel.

---

## Agent Roles and Ownership

- **Lead Integrator:** owns task ordering, worktree isolation, merge conflict prevention, full-suite verification, and GitHub push. This role does not silently modify the user-owned `docs/production_manual.md`.
- **Privacy and API Safety Engineer:** owns Tasks 1-2, including identifier rejection, `store: false`, no-store responses, and provider-error redaction.
- **Teacher UX and Policy Engineer:** owns Task 3, including the teacher acknowledgement, public privacy page, and app-wide policy link.
- **PWA Engineer:** owns Tasks 4-5, including manifest metadata, icon assets, service-worker policy, and offline fallback.
- **Domain Verification Engineer:** owns Task 6, including the tested Digital Asset Links endpoint and environment contract.
- **Mobile QA Engineer:** owns Task 7, including 360/412 px browser checks, accessibility assertions, documentation, and release handoff evidence.
- **Spec Reviewer:** reviews each task only for compliance with this plan before code-quality review begins.
- **Code Quality Reviewer:** reviews approved task diffs for maintainability, security, test quality, and unnecessary scope.
- **Android/TWA Release Engineer:** reserved for the follow-up Android plan; begins only after the production manifest and Play signing fingerprint exist.

Implementation agents run one task at a time because Tasks 2-7 build on shared files. Read-only audits and reviews may run concurrently only when they do not edit the worktree.

## File Structure

### Files created in this plan

- `lib/privacy/pii-guard.ts`: detects high-confidence direct identifiers without retaining matched values.
- `lib/privacy/pii-guard.test.ts`: unit tests for allowed educational descriptions and blocked identifiers.
- `lib/http/no-store.ts`: centralizes JSON no-store responses and public error messages.
- `lib/http/no-store.test.ts`: tests headers and error redaction.
- `components/AppFooter.tsx`: exposes privacy and support links on every screen.
- `app/privacy/page.tsx`: public Korean privacy policy for the teacher-only product.
- `app/manifest.ts`: typed Web App Manifest.
- `app/manifest.test.ts`: manifest contract tests.
- `components/ServiceWorkerRegistration.tsx`: registers the production service worker.
- `public/sw.js`: caches only the static shell and bypasses all API/non-GET traffic.
- `public/offline.html`: dependency-free offline explanation and retry action.
- `tests/pwa/service-worker.test.ts`: verifies sensitive routes cannot enter Cache Storage.
- `public/icons/icon-source.svg`: deterministic Auto AAC icon source.
- `public/icons/icon-192.png`: PWA launcher icon.
- `public/icons/icon-512.png`: PWA and store-source icon.
- `public/icons/icon-maskable-512.png`: maskable launcher icon.
- `scripts/generate-pwa-icons.mjs`: reproducibly renders PNG assets from the SVG source.
- `app/.well-known/assetlinks.json/route.ts`: emits valid Digital Asset Links from server configuration.
- `app/.well-known/assetlinks.json/route.test.ts`: tests fingerprint parsing and response shape.
- `playwright.config.ts`: mobile browser verification configuration.
- `tests/e2e/mobile-pwa.spec.ts`: mobile overflow, policy, manifest, and offline tests.
- `docs/privacy-data-inventory.md`: processing inventory used for Play Data Safety review.
- `docs/android-release-handoff.md`: exact production and certificate gates for the Android plan.

### Existing files modified in this plan

- `package.json`, `package-lock.json`: pin resolved runtime versions and add lint, browser-test, and icon scripts.
- `.gitignore`: exclude Playwright output and Android signing/build secrets in advance.
- `next.config.ts`: add security and no-store headers for sensitive routes.
- `app/layout.tsx`: add viewport/theme metadata, service-worker registration, and footer.
- `app/page.tsx`: track privacy acknowledgement and preserve form state on retryable failures.
- `app/globals.css`: add policy, footer, safe-area, wrapping, and touch-target styles.
- `components/InputPanel.tsx`: show data-transfer warning and require acknowledgement.
- `lib/schemas.ts`, `lib/schemas.test.ts`: enforce lengths and direct-identifier rejection.
- `app/api/generate/route.ts`: set `store: false`, sanitize errors, and disable caching.
- `app/api/regenerate-image/route.ts`: sanitize errors and disable caching.
- `README.md`: document PWA, privacy, environment, and verification behavior.

## External Gates Not Faked by This Plan

- The public privacy page uses the repository issue tracker as the initial support and deletion-request channel. Play submission must replace or supplement it with the exact public support email used in Play Console.
- The app rejects direct student identifiers and is explicitly teacher-only. Production use with identifiable data from children under the applicable digital-consent age remains blocked until the OpenAI project has approved Zero Data Retention and legal review is complete.
- `ANDROID_SHA256_CERT_FINGERPRINTS` is not invented or committed. The endpoint returns `503` until the real Play App Signing fingerprint is configured in Vercel.
- The Android project, upload keystore, signed AAB, Play Console declarations, closed test, and staged rollout belong to the follow-up Android plan.

---

### Task 1: Direct-Identifier Guard and Schema Limits

**Owner:** Privacy and API Safety Engineer

**Files:**
- Create: `lib/privacy/pii-guard.ts`
- Create: `lib/privacy/pii-guard.test.ts`
- Modify: `lib/schemas.ts`
- Modify: `lib/schemas.test.ts`

- [ ] **Step 1: Write failing identifier-guard tests**

Create tests covering allowed de-identified educational descriptions and blocked email, Korean mobile number, resident-registration number, and explicit student-number labels:

```ts
import { describe, expect, it } from "vitest";
import { findDirectIdentifierKinds } from "./pii-guard";

describe("findDirectIdentifierKinds", () => {
  it("allows a de-identified learning profile", () => {
    expect(
      findDirectIdentifierKinds(
        "긴 문장을 어려워하고 흰 배경의 큰 그림에 잘 반응함",
      ),
    ).toEqual([]);
  });

  it.each([
    ["teacher@example.com", "email"],
    ["010-1234-5678", "phone"],
    ["123456-1234567", "resident_registration_number"],
    ["학번: 20260123", "student_number"],
  ])("blocks %s as %s", (value, kind) => {
    expect(findDirectIdentifierKinds(value)).toContain(kind);
  });
});
```

- [ ] **Step 2: Run the tests and confirm the red state**

Run: `npx vitest run lib/privacy/pii-guard.test.ts`

Expected: FAIL because `lib/privacy/pii-guard.ts` does not exist.

- [ ] **Step 3: Implement a non-capturing identifier classifier**

Create `lib/privacy/pii-guard.ts` with a public union type and return only category names, never matched values:

```ts
export type DirectIdentifierKind =
  | "email"
  | "phone"
  | "resident_registration_number"
  | "student_number";

const RULES: ReadonlyArray<{
  kind: DirectIdentifierKind;
  pattern: RegExp;
}> = [
  { kind: "email", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { kind: "phone", pattern: /\b01[016789][ -]?\d{3,4}[ -]?\d{4}\b/ },
  {
    kind: "resident_registration_number",
    pattern: /\b\d{6}[ -]?[1-4]\d{6}\b/,
  },
  { kind: "student_number", pattern: /(?:학번|학생\s*번호)\s*[:：]?\s*\d{4,}/i },
];

export function findDirectIdentifierKinds(
  value: string,
): DirectIdentifierKind[] {
  return RULES.filter(({ pattern }) => pattern.test(value)).map(
    ({ kind }) => kind,
  );
}
```

- [ ] **Step 4: Add schema limits and identifier rejection**

Update the request schemas so `studentProfile` is 5-2,000 characters, `scienceText` is 3-4,000 characters, image prompts are at most 8,000 characters, and revision instructions are at most 1,000 characters. Add `superRefine` to `GenerateRequestSchema` and reject direct identifiers in `studentProfile` with the fixed Korean message `학생 이름·연락처·학번 등 직접 식별정보를 제거해 주세요.`. Do not include matched input in the error.

- [ ] **Step 5: Run focused and full tests**

Run: `npx vitest run lib/privacy/pii-guard.test.ts lib/schemas.test.ts`

Expected: all focused tests PASS.

Run: `npm test`

Expected: all repository tests PASS.

- [ ] **Step 6: Commit Task 1**

```powershell
git add -- lib/privacy/pii-guard.ts lib/privacy/pii-guard.test.ts lib/schemas.ts lib/schemas.test.ts
git commit -m "Add direct identifier safeguards"
```

---

### Task 2: OpenAI Retention, Cache, and Error Controls

**Owner:** Privacy and API Safety Engineer

**Files:**
- Create: `lib/http/no-store.ts`
- Create: `lib/http/no-store.test.ts`
- Modify: `app/api/generate/route.ts`
- Modify: `app/api/regenerate-image/route.ts`
- Modify: `next.config.ts`

- [ ] **Step 1: Write failing response-helper tests**

Test that `jsonNoStore` sets `Cache-Control: no-store, max-age=0`, `Pragma: no-cache`, and `Expires: 0`, and that `publicGenerationError()` returns only `AAC 초안 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.` with a UUID correlation ID.

- [ ] **Step 2: Confirm the helper tests fail**

Run: `npx vitest run lib/http/no-store.test.ts`

Expected: FAIL because `lib/http/no-store.ts` does not exist.

- [ ] **Step 3: Implement no-store response helpers**

Create the following public interface:

```ts
import { NextResponse } from "next/server";

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
} as const;

export function jsonNoStore(
  body: unknown,
  init: { status?: number } = {},
) {
  return NextResponse.json(body, {
    ...init,
    headers: NO_STORE_HEADERS,
  });
}

export function publicGenerationError() {
  return {
    error: "AAC 초안 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    correlationId: crypto.randomUUID(),
  };
}

export function publicImageError() {
  return {
    error: "그림 재생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    correlationId: crypto.randomUUID(),
  };
}
```

- [ ] **Step 4: Apply controls to both API routes**

Replace every `NextResponse.json` call with `jsonNoStore`. Add `store: false` to `openai.responses.parse`. In both `catch` blocks, log only the correlation ID and provider error class/name, never teacher input or the provider message, then return the fixed public error. Keep validation details limited to schema paths and messages.

- [ ] **Step 5: Add route-level no-store headers**

Configure `next.config.ts` headers for `/api/:path*` with the same no-store values so proxy/CDN behavior agrees with route responses.

- [ ] **Step 6: Verify API safety behavior**

Run: `npx vitest run lib/http/no-store.test.ts`

Expected: PASS.

Run: `npm test && npm run build`

Expected: tests and production build PASS; TypeScript accepts `store: false` on the installed OpenAI SDK.

- [ ] **Step 7: Commit Task 2**

```powershell
git add -- lib/http/no-store.ts lib/http/no-store.test.ts app/api/generate/route.ts app/api/regenerate-image/route.ts next.config.ts
git commit -m "Harden AI request privacy controls"
```

---

### Task 3: Teacher Privacy Acknowledgement and Public Policy

**Owner:** Teacher UX and Policy Engineer

**Files:**
- Create: `components/AppFooter.tsx`
- Create: `app/privacy/page.tsx`
- Modify: `components/InputPanel.tsx`
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add a failing component contract test**

Add a source-level Vitest test that asserts `InputPanelProps` includes `privacyAcknowledged` and `onPrivacyAcknowledgedChange`, and that the component renders the exact disclosure:

```text
학생 프로필과 수업 텍스트는 AAC 생성을 위해 Vercel 서버와 OpenAI로 전송됩니다. 학생 이름·학교·학번·연락처·주민등록번호·의료번호를 입력하지 마세요.
```

The test also requires a link to `/privacy` and a checkbox labelled `비식별 정보만 입력했음을 확인합니다.`.

- [ ] **Step 2: Confirm the contract test fails**

Run: `npx vitest run components/InputPanel.privacy.test.ts`

Expected: FAIL because the privacy props and disclosure do not exist.

- [ ] **Step 3: Implement acknowledgement gating**

Add `privacyAcknowledged: boolean` and `onPrivacyAcknowledgedChange(value: boolean)` to `InputPanelProps`. Include acknowledgement in `canGenerate`. In `app/page.tsx`, store it with `useState(false)`, pass both props, and reset it only when the browser session ends, not after generation errors.

- [ ] **Step 4: Add the public Korean privacy page**

Create `app/privacy/page.tsx` with these concrete sections:

- service and operator: Auto AAC project operator;
- contact and deletion requests: `https://github.com/yangisu/Auto_AAC/issues`;
- processed data: de-identified student learning characteristics, science text, revision directions, generated prompts/results;
- purpose: generate teacher-reviewed AAC drafts;
- processors: Vercel hosting and OpenAI API;
- retention: browser state ends with the session; OpenAI API data may be retained for abuse monitoring for up to 30 days unless the project is approved for stricter controls; operational request metadata follows the configured Vercel account policy;
- prohibited input: direct identifiers and unnecessary medical identifiers;
- model training: OpenAI API data is not used for model training by default;
- children: the product is for teachers, not direct student use, and identifiable child data is prohibited;
- rights and deletion requests;
- security: HTTPS and server-side API credentials;
- effective date: 2026-06-20 and change-notice method.

Use plain Korean language and do not claim Zero Data Retention is enabled.

- [ ] **Step 5: Add the app-wide footer and accessible styles**

Render `AppFooter` from `app/layout.tsx` after page content. The footer links to `/privacy` and the GitHub issue tracker. Add styles for disclosure text, checkbox focus, footer links, long-word wrapping, 48 px primary touch targets, and `env(safe-area-inset-*)` padding.

- [ ] **Step 6: Verify policy and UX changes**

Run: `npm test && npm run build`

Expected: tests and build PASS; `/privacy` appears in the build route list.

- [ ] **Step 7: Commit Task 3**

```powershell
git add -- components/InputPanel.tsx components/InputPanel.privacy.test.ts app/page.tsx app/layout.tsx app/privacy/page.tsx components/AppFooter.tsx app/globals.css
git commit -m "Add teacher privacy acknowledgement"
```

---

### Task 4: Reproducible PWA Manifest and Icons

**Owner:** PWA Engineer

**Files:**
- Create: `app/manifest.ts`
- Create: `app/manifest.test.ts`
- Create: `public/icons/icon-source.svg`
- Create: `scripts/generate-pwa-icons.mjs`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Create: `public/icons/icon-maskable-512.png`
- Modify: `app/layout.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Write the failing manifest contract test**

Assert that the manifest returns `name: "Auto AAC"`, `short_name: "Auto AAC"`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `lang: "ko"`, theme color `#245fc9`, and 192/512/maskable PNG entries.

- [ ] **Step 2: Confirm the manifest test fails**

Run: `npx vitest run app/manifest.test.ts`

Expected: FAIL because `app/manifest.ts` does not exist.

- [ ] **Step 3: Implement the typed manifest**

Use `MetadataRoute.Manifest` and the exact icon paths `/icons/icon-192.png`, `/icons/icon-512.png`, and `/icons/icon-maskable-512.png`. Set description to `교사가 검토하는 AAC 카드 초안 생성 도구` and categories to `education` and `productivity`.

- [ ] **Step 4: Create a deterministic icon source and renderer**

Create a square SVG with a blue `#245fc9` rounded background, white inner card, green `#21833b` speech-card outline, and centered dark `AAC` letters. Keep all important content inside the central 70% maskable safe zone. Add `sharp` as an explicit dev dependency and implement `scripts/generate-pwa-icons.mjs` to render the three exact PNG dimensions. Add `npm run icons`.

- [ ] **Step 5: Generate and validate icons**

Run: `npm run icons`

Expected: all three PNG files are generated.

Run a Node check using `sharp(...).metadata()` and assert dimensions are 192x192, 512x512, and 512x512.

- [ ] **Step 6: Add viewport and theme metadata**

Export a Next.js `Viewport` from `app/layout.tsx` with `width: "device-width"`, `initialScale: 1`, `viewportFit: "cover"`, and theme color `#245fc9`.

- [ ] **Step 7: Verify and commit Task 4**

Run: `npm test && npm run build`

Expected: tests and build PASS; build output includes `/manifest.webmanifest`.

```powershell
git add -- app/manifest.ts app/manifest.test.ts app/layout.tsx public/icons scripts/generate-pwa-icons.mjs package.json package-lock.json
git commit -m "Add installable PWA manifest"
```

---

### Task 5: Safe Service Worker and Offline Fallback

**Owner:** PWA Engineer

**Files:**
- Create: `components/ServiceWorkerRegistration.tsx`
- Create: `public/sw.js`
- Create: `public/offline.html`
- Create: `tests/pwa/service-worker.test.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write failing service-worker policy tests**

Load `public/sw.js` as text and require all of these explicit controls:

- non-GET requests return without `respondWith`;
- cross-origin requests return;
- paths beginning `/api/` return;
- only `/offline.html`, manifest, icons, and `/_next/static/` assets can be cached;
- navigation uses network-first and falls back to `/offline.html`;
- cache cleanup removes old `auto-aac-shell-*` versions.

- [ ] **Step 2: Confirm the policy tests fail**

Run: `npx vitest run tests/pwa/service-worker.test.ts`

Expected: FAIL because `public/sw.js` does not exist.

- [ ] **Step 3: Implement the minimal service worker**

Use cache name `auto-aac-shell-v1`. Precache only `/offline.html`, `/manifest.webmanifest`, and the three icon files. For runtime fetches, bypass non-GET, cross-origin, `/api/`, and `/privacy`. Cache-first only same-origin `/_next/static/` and `/icons/` GET requests. Use network-first for navigations and return the precached offline document on network failure.

- [ ] **Step 4: Add dependency-free offline HTML**

Create a Korean page that states `인터넷 연결이 필요합니다`, explains that AAC generation is online-only, and includes a `다시 시도` button calling `location.reload()`. Inline its CSS and script so it does not depend on Next.js chunks.

- [ ] **Step 5: Register only in production**

Create a client component that calls `navigator.serviceWorker.register("/sw.js")` inside `useEffect` only when `process.env.NODE_ENV === "production"`. Render it from `app/layout.tsx` without visible UI.

- [ ] **Step 6: Verify and commit Task 5**

Run: `npx vitest run tests/pwa/service-worker.test.ts && npm run build`

Expected: policy tests and build PASS.

```powershell
git add -- components/ServiceWorkerRegistration.tsx public/sw.js public/offline.html tests/pwa/service-worker.test.ts app/layout.tsx
git commit -m "Add privacy-safe offline shell"
```

---

### Task 6: Environment-Driven Digital Asset Links

**Owner:** Domain Verification Engineer

**Files:**
- Create: `app/.well-known/assetlinks.json/route.ts`
- Create: `app/.well-known/assetlinks.json/route.test.ts`
- Modify: `.env.local.example`
- Modify: `.gitignore`

- [ ] **Step 1: Write failing fingerprint parser tests**

Test that the parser accepts comma-separated uppercase SHA-256 fingerprints, normalizes lowercase input to uppercase, removes duplicates, rejects malformed values, and that the route returns `503` when no real fingerprint is configured.

- [ ] **Step 2: Confirm the tests fail**

Run: `npx vitest run app/.well-known/assetlinks.json/route.test.ts`

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement the endpoint**

Export `parseFingerprints(value: string | undefined): string[]` and `buildAssetLinks(fingerprints: string[])`. The route reads `ANDROID_SHA256_CERT_FINGERPRINTS`, uses package name `com.yangisu.autoaac`, relation `delegate_permission/common.handle_all_urls`, returns JSON array plus `Cache-Control: public, max-age=300`, and returns a no-store JSON error with status 503 when configuration is missing or invalid.

- [ ] **Step 4: Document configuration without a fake certificate**

Add `ANDROID_SHA256_CERT_FINGERPRINTS=` to `.env.local.example` with comments explaining that Vercel production must receive the Play App Signing SHA-256 fingerprint and may additionally receive the local upload fingerprint. Do not commit an example that resembles a real certificate.

- [ ] **Step 5: Expand secret and Android artifact ignores**

Add ignores for `test-results/`, `playwright-report/`, `android/.gradle/`, `android/local.properties`, `android/**/build/`, `android/*.apk`, `android/*.aab`, `android/**/*.jks`, `android/**/*.keystore`, `android/**/key.properties`, and signing service-account JSON files.

- [ ] **Step 6: Verify and commit Task 6**

Run: `npx vitest run app/.well-known/assetlinks.json/route.test.ts && npm run build`

Expected: tests and build PASS; build output includes `/.well-known/assetlinks.json`.

```powershell
git add -- app/.well-known/assetlinks.json/route.ts app/.well-known/assetlinks.json/route.test.ts .env.local.example .gitignore
git commit -m "Add Digital Asset Links endpoint"
```

---

### Task 7: Mobile Browser Verification and Release Handoff

**Owner:** Mobile QA Engineer

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/mobile-pwa.spec.ts`
- Create: `docs/privacy-data-inventory.md`
- Create: `docs/android-release-handoff.md`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `README.md`

- [ ] **Step 1: Add Playwright and failing mobile checks**

Install `@playwright/test` as a pinned dev dependency and configure Chromium projects for 360x800 and 412x915. Tests must assert:

- no horizontal document overflow;
- primary buttons and checkbox controls meet a 44 px minimum hit area;
- the privacy disclosure and `/privacy` link are visible;
- generation remains disabled until valid inputs and acknowledgement are present;
- `/manifest.webmanifest` contains the expected name, start URL, display mode, and icon URLs;
- `/offline.html` contains the retry action;
- `/.well-known/assetlinks.json` returns 503 in an unconfigured local environment rather than fake data.

- [ ] **Step 2: Confirm the browser tests initially fail**

Run the production server and execute `npx playwright test`.

Expected: at least one test FAILS until mobile styles and scripts are finalized.

- [ ] **Step 3: Make minimal mobile corrections**

Adjust `app/globals.css` only where tests identify overflow or undersized hit areas. Preserve the existing desktop teacher workspace and print layout.

- [ ] **Step 4: Write the privacy data inventory**

Document each input/output field, purpose, destination, cache rule, default OpenAI retention statement, deletion/support channel, and Play Data Safety category. State explicitly that analytics, advertising, crash SDKs, accounts, and payments are absent.

- [ ] **Step 5: Write the Android handoff gates**

Document these exact prerequisites:

1. merge and deploy the web foundation to `auto-aac.vercel.app`;
2. verify manifest, icons, service worker, offline page, privacy page, and HTTPS behavior;
3. create the Play app entry and enable Play App Signing;
4. configure the real signing fingerprint in Vercel;
5. confirm Digital Asset Links returns 200 with no redirect;
6. install Android SDK 36, build-tools 34.0.0, platform-tools, and Bubblewrap 1.24.1;
7. generate `com.yangisu.autoaac`, target SDK 35, compile SDK 36;
8. upgrade generated AGP to at least 8.10.1;
9. keep upload keystore and passwords outside Git;
10. build and verify the AAB before internal testing.

- [ ] **Step 6: Run full verification**

Run:

```powershell
npm ci
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 7: Secret and scope verification**

Run a repository scan that reports filenames only and fails on committed `sk-` keys, `.jks`, `.keystore`, `.aab`, `.apk`, signing property files, or service-account JSON. Confirm `docs/production_manual.md` remains untracked and unchanged.

- [ ] **Step 8: Commit Task 7**

```powershell
git add -- playwright.config.ts tests/e2e/mobile-pwa.spec.ts docs/privacy-data-inventory.md docs/android-release-handoff.md package.json package-lock.json README.md app/globals.css
git commit -m "Add mobile release verification"
```

---

## Plan Completion and Android Transition

After all seven tasks:

1. run the complete verification commands again from a clean install;
2. dispatch a final spec-compliance reviewer across the whole diff;
3. dispatch a final code-quality and privacy reviewer only after spec approval;
4. push the implementation branch to `yangisu/Auto_AAC`;
5. do not merge to `main` or change production Vercel configuration without explicit authorization;
6. start the separate Android/TWA implementation plan only after the production deployment and real Play App Signing certificate fingerprint are available.
