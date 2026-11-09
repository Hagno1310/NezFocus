import { z } from 'zod';

// REQ-ROLE-01 (v1.9, CR-17) name rules, shared so the app's field error never disagrees with
// the backend's 40001 on field `name`. They apply to create and rename.

export const ROLE_NAME_MAX = 100;

// What the backend sends with 40001 code RESERVED_NAME (S-SET-02 `edit-role-name-taken`).
export const RESERVED_ROLE_NAME_MESSAGE = 'Tên này dành cho hệ thống';

// `everyone` / `here`, with or without one "@", in any case.
const isReservedRoleName = (name: string) =>
  /^@?(everyone|here)$/.test(name.toLowerCase());

export const RoleName = z
  .string()
  .trim()
  .transform((name) => name.normalize('NFC')) // NFR-I18N-03
  .pipe(z.string().min(1).max(ROLE_NAME_MAX))
  .superRefine((name, ctx) => {
    if (isReservedRoleName(name))
      ctx.addIssue({
        code: 'custom',
        message: RESERVED_ROLE_NAME_MESSAGE,
        params: { code: 'RESERVED_NAME' },
      });
  });

// What two names are compared on: case-insensitive, accent-sensitive (NFR-I18N-03).
export const roleNameKey = (name: string) =>
  name.normalize('NFC').trim().toLowerCase();

// The role already holding `candidate.name` in the server. Pass `id` when renaming so a
// role never clashes with itself.
export function findDuplicateRole<R extends { id: string; name: string }>(
  roles: readonly R[],
  candidate: { id?: string; name: string },
): R | null {
  const key = roleNameKey(candidate.name);
  return (
    roles.find((r) => r.id !== candidate.id && roleNameKey(r.name) === key) ??
    null
  );
}

// The field `name` sentence of a duplicate (40001 code DUPLICATE_NAME, S-SET-02
// `create-name-taken`); Vietnamese only, like the channel ones.
export const duplicateRoleMessage = (existing: { name: string }) =>
  `Đã có vai trò ${existing.name}`;
