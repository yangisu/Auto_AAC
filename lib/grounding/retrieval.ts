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

export function retrieveGrounding(
  studentProfile: StudentProfile,
  scienceText: string,
): GroundingResult {
  const { rules, detectedNeeds } = selectSpecialEducationRules(studentProfile);

  return {
    curriculumContexts: selectCurriculumContexts(scienceText),
    specialEducationRules: rules,
    styleProfile: styleProfile as AacStyleProfile,
    extractedKeywords: extractScienceKeywords(scienceText),
    detectedNeeds,
  };
}

export type { CurriculumContext, SpecialEducationRule, StudentProfile };
