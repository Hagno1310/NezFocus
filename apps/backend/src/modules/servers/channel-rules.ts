import {
  describeDuplicate,
  type ChannelResponse,
  type ChannelRuleError,
  type DuplicateName,
} from '@nezfocus/shared';

// The rules live in shared (the app checks the same before it calls the API); this file
// turns their result into the 40001 field errors of SRS 5.2.

type Named = Pick<ChannelResponse, 'id' | 'type' | 'name' | 'parent_id'>;

export type RuleError = {
  field: 'id' | 'parent_id' | 'name';
  code: string;
  message: string;
};

const upper = (name: string) => name.toLocaleUpperCase('vi');

// The field `name` sentences of REQ-SRV-02 v1.9 (spec 08 › S-SET-06 "Không trùng tên"):
// a text channel is "kênh #tên", a voice channel "phòng Tên".
export function duplicateSentence(d: DuplicateName): string {
  if (d.kind === 'category') return `Server đã có danh mục ${upper(d.name)}`;
  const what = d.type === 'text' ? `kênh #${d.name}` : `phòng ${d.name}`;
  return d.category === null
    ? `Trên cùng danh sách đã có ${what}`
    : `${upper(d.category)} đã có ${what}`;
}

export const duplicateNameMessage = (
  channels: readonly Named[],
  existing: Named,
) => duplicateSentence(describeDuplicate(channels, existing));

export function ruleError(e: ChannelRuleError): RuleError {
  switch (e.reason) {
    case 'duplicate':
      return {
        field: 'name',
        code: 'DUPLICATE_NAME',
        message: duplicateSentence(e.duplicate),
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
