import { validateTest } from './test-schema';
import type { TestData } from './test-schema';

export interface ValidationOk {
  valid: true;
  data: TestData;
}

export interface ValidationErr {
  valid: false;
  error: string;
}

export type ValidationResult = ValidationOk | ValidationErr;

/** Non-throwing wrapper around validateTest(). */
export function validateTestSafe(payload: unknown): ValidationResult {
  try {
    const data = validateTest(payload);
    return { valid: true, data };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : String(e) };
  }
}
