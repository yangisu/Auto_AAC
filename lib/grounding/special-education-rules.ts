import specialEducationGrounding from "../../data/special_education_grounding.json";

export type StudentProfile = Record<string, unknown>;

export interface SpecialEducationRule {
  id: string;
  need: string;
  title: string;
  profileFields: string[];
  cues: string[];
  guidance: string[];
  promptConstraints: string[];
}

interface SpecialEducationPack {
  locale: string;
  rules: SpecialEducationRule[];
}

const groundingPack = specialEducationGrounding as SpecialEducationPack;

function normalizeCueText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map(normalizeCueText).join(" ");
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map((nestedValue) => normalizeCueText(nestedValue))
      .join(" ");
  }

  return String(value).normalize("NFKC").toLowerCase();
}

function getProfileFieldText(studentProfile: StudentProfile, fieldNames: string[]): string {
  const normalizedLookup = new Map<string, unknown>();

  for (const [key, value] of Object.entries(studentProfile)) {
    normalizedLookup.set(key.toLowerCase(), value);
  }

  return fieldNames
    .map((fieldName) => normalizedLookup.get(fieldName.toLowerCase()))
    .map(normalizeCueText)
    .join(" ");
}

function hasAnyCue(text: string, cues: string[]): boolean {
  return cues.some((cue) => text.includes(cue.normalize("NFKC").toLowerCase()));
}

function hasNumericLowReadingCue(studentProfile: StudentProfile): boolean {
  const value = studentProfile.readingLevel ?? studentProfile.reading_level;

  return typeof value === "number" && value <= 2;
}

export function selectSpecialEducationRules(studentProfile: StudentProfile): {
  rules: SpecialEducationRule[];
  detectedNeeds: string[];
} {
  const rules = groundingPack.rules.filter((rule) => {
    const fieldText = getProfileFieldText(studentProfile, rule.profileFields);
    const wholeProfileText = normalizeCueText(studentProfile);
    const searchableText = `${fieldText} ${wholeProfileText}`;

    return (
      hasAnyCue(searchableText, rule.cues) ||
      (rule.need === "low_reading_level" && hasNumericLowReadingCue(studentProfile))
    );
  });

  return {
    rules,
    detectedNeeds: rules.map((rule) => rule.need),
  };
}
