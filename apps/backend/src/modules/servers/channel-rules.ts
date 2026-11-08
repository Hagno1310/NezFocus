import { duplicateNameMessage, type ChannelRuleError } from '@nezfocus/shared';

// The rules live in shared (the app checks the same before it calls the API); this file
// turns their result into the 40001 field errors of SRS 5.2.

export type RuleError = {
  field: 'id' | 'parent_id' | 'name';
  code: string;
  message: string;
};

export function ruleError(e: ChannelRuleError): RuleError {
  switch (e.reason) {
    case 'duplicate':
      return {
        field: 'name',
        code: 'DUPLICATE_NAME',
        message: duplicateNameMessage(e.duplicate),
      };
    case 'unknown-channel':
      return {
        field: 'id',
        code: 'UNKNOWN_CHANNEL',
        message: `Unknown or repeated channel ${e.id}`,
      };
    case 'not-a-category':
      return {
        field: 'parent_id',
        code: 'NOT_A_CATEGORY',
        message: 'Only a text or voice channel goes into a category',
      };
  }
}
