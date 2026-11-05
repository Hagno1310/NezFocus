export function parseFakeAreas(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

// Metro inlines EXPO_PUBLIC_* only on direct `process.env.X` access, so read it here once.
const fakeAreas = parseFakeAreas(process.env.EXPO_PUBLIC_FAKE);

// area = folder name under src/data/<area>/ (vd `auth`, `servers`).
export function pickRepository<T>(
  area: string,
  impls: { remote: T; fake: T },
  fakes: Set<string> = fakeAreas,
): T {
  return fakes.has(area) ? impls.fake : impls.remote;
}
