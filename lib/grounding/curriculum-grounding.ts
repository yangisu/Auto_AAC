import curriculumSeed from "../../data/curriculum_seed.json";

export interface CurriculumSeedContext {
  id: string;
  domain: string;
  unit: string;
  summary: string;
  keywords: string[];
  promptGuidance: string[];
  aacSupports: string[];
  sentenceDecomposition: {
    subjectCandidates: string[];
    objectCandidates: string[];
    predicateCandidates: string[];
    concreteAnchors: string[];
    causeEffectCues: string[];
  };
  cardSentenceFrames: string[];
}

interface CurriculumSeedPack {
  gradeBand: string;
  locale: string;
  contexts: CurriculumSeedContext[];
}

export interface CurriculumContext extends CurriculumSeedContext {
  gradeBand: string;
  matchedKeywords: string[];
  score: number;
}

const seed = curriculumSeed as CurriculumSeedPack;

export function normalizeGroundingText(value: string): string {
  return value.normalize("NFKC").toLowerCase();
}

function compact(value: string): string {
  return normalizeGroundingText(value).replace(/\s+/g, "");
}

function keywordAppears(scienceText: string, keyword: string): boolean {
  const normalizedText = normalizeGroundingText(scienceText);
  const normalizedKeyword = normalizeGroundingText(keyword);

  return (
    normalizedText.includes(normalizedKeyword) ||
    compact(normalizedText).includes(compact(normalizedKeyword))
  );
}

function uniqueInOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }

  return result;
}

export function extractScienceKeywords(scienceText: string): string[] {
  if (!scienceText.trim()) {
    return [];
  }

  const matchedSeedKeywords = seed.contexts.flatMap((context) =>
    context.keywords.filter((keyword) => keywordAppears(scienceText, keyword)),
  );
  const textTokens = normalizeGroundingText(scienceText).match(/[가-힣a-z0-9]+/g) ?? [];
  const meaningfulTokens = textTokens.filter((token) => token.length >= 2);

  return uniqueInOrder([...matchedSeedKeywords, ...meaningfulTokens]);
}

export function selectCurriculumContexts(scienceText: string, limit = 3): CurriculumContext[] {
  if (!scienceText.trim()) {
    return [];
  }

  return seed.contexts
    .map((context, index) => {
      const matchedKeywords = context.keywords.filter((keyword) =>
        keywordAppears(scienceText, keyword),
      );
      const specificityBonus = matchedKeywords.reduce((sum, keyword) => sum + keyword.length, 0) / 100;

      return {
        ...context,
        gradeBand: seed.gradeBand,
        matchedKeywords,
        score: matchedKeywords.length + specificityBonus,
        seedOrder: index,
      };
    })
    .filter((context) => context.matchedKeywords.length > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.seedOrder - right.seedOrder;
    })
    .slice(0, limit)
    .map(({ seedOrder: _seedOrder, ...context }) => context);
}
