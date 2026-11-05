import type { PasswordIssue } from '@nezfocus/shared';

export const PASSWORD_RULES = [
  'TOO_SHORT',
  'MISSING_UPPERCASE',
  'MISSING_LOWERCASE',
  'MISSING_DIGIT',
  'MISSING_SPECIAL',
] as const satisfies PasswordIssue[];

export type PasswordRule = (typeof PASSWORD_RULES)[number];
export type RuleState = 'met' | 'unmet' | 'error';

export const passwordRuleStates = (
  issues: readonly PasswordIssue[],
  submitted: boolean,
): [PasswordRule, RuleState][] =>
  PASSWORD_RULES.map((rule) => [
    rule,
    !issues.includes(rule) ? 'met' : submitted ? 'error' : 'unmet',
  ]);

export const CODE_LENGTH = 6;

const digitsOnly = (s: string) => s.replace(/\D/g, '').slice(0, CODE_LENGTH);

// C-24 › error: typing after an error clears the old code and starts again.
export function nextCode(prev: string, raw: string, hadError: boolean): string {
  if (!hadError) return digitsOnly(raw);
  if (raw.length < prev.length) return '';
  return digitsOnly(raw.startsWith(prev) ? raw.slice(prev.length) : raw);
}

// C-09: two short buttons (≤ 2 words each) go side by side; otherwise stack full width.
export const dialogLayout = (labels: readonly string[]): 'row' | 'column' =>
  labels.length === 2 && labels.every((l) => l.trim().split(/\s+/).length <= 2)
    ? 'row'
    : 'column';
