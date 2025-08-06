'use server';

import { flagSuspiciousBehavior, FlagSuspiciousBehaviorInput, FlagSuspiciousBehaviorOutput } from '@/ai/flows/flag-suspicious-behavior';

export type AnalysisResult = {
  data: FlagSuspiciousBehaviorOutput | null;
  error: string | null;
}

export async function analyzeBehavior(
  input: FlagSuspiciousBehaviorInput
): Promise<AnalysisResult> {
  try {
    const result = await flagSuspiciousBehavior(input);
    return { data: result, error: null };
  } catch (error) {
    console.error("Error analyzing behavior:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { data: null, error: `Analysis failed: ${errorMessage}` };
  }
}
