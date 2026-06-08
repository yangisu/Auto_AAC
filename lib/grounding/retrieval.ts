import styleProfile from "../../data/aac_style_profile.json";
import {
  CurriculumContext,
  extractScienceKeywords,
  selectCurriculumContexts,
} from "./curriculum-grounding";
import {
  selectSpecialEducationRules,
  SpecialEducationRule,
  StudentProfile,
} from "./special-education-rules";

export interface AacStyleProfile {
  id: string;
  source: string;
  canvas: {
    background: string;
    frame: string;
    frameRadius: string;
    borderColors: string[];
  };
  line: {
    outline: string;
    weight: string;
    joins: string;
  };
  rendering: Record<string, string>;
  composition: {
    conceptCount: number;
    layout: string;
    sequenceCue: string;
    backgroundDetail: string;
  };
  constraints: string[];
  negativePrompt: string[];
}

export interface GroundingResult {
  curriculumContexts: CurriculumContext[];
  specialEducationRules: SpecialEducationRule[];
  styleProfile: AacStyleProfile;
  extractedKeywords: string[];
  detectedNeeds: string[];
}

export function retrieveDefaultStyleProfile(): AacStyleProfile {
  return styleProfile as AacStyleProfile;
}

export function retrieveGrounding(
  studentProfile: StudentProfile | string,
  scienceText: string,
): GroundingResult {
  const profile =
    typeof studentProfile === "string" ? { description: studentProfile } : studentProfile;
  const { rules, detectedNeeds } = selectSpecialEducationRules(profile);

  return {
    curriculumContexts: selectCurriculumContexts(scienceText),
    specialEducationRules: rules,
    styleProfile: retrieveDefaultStyleProfile(),
    extractedKeywords: extractScienceKeywords(scienceText),
    detectedNeeds,
  };
}

export type { CurriculumContext, SpecialEducationRule, StudentProfile };
