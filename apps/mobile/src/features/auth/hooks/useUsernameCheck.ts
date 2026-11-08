import { checkUsername, normalizeUsername } from '@nezfocus/shared';
import { useEffect, useRef, useState } from 'react';
import { authRepository } from '../../../data/auth';

export type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken';

const PAUSE_MS = 500;

// S-ONB-01 › Tương tác: 0.5 s after typing stops, ask whether the username is free. Only a hint:
// complete-account checks again (40901). Usernames that break DEC-03 are not asked about.
export function useUsernameCheck(username: string) {
  const [result, setResult] = useState<{
    username: string;
    status: UsernameStatus;
  }>({ username: '', status: 'idle' });
  const first = useRef(true);
  const normalized = normalizeUsername(username);
  const askable = checkUsername(normalized).length === 0;

  useEffect(() => {
    if (!askable) return;
    let cancelled = false;
    // The prefilled username is checked right away; typed ones after the pause.
    const timer = setTimeout(
      () => {
        setResult({ username: normalized, status: 'checking' });
        authRepository.usernameAvailable(normalized).then(
          (free) => {
            if (!cancelled)
              setResult({
                username: normalized,
                status: free ? 'available' : 'taken',
              });
          },
          () => {
            if (!cancelled) setResult({ username: normalized, status: 'idle' });
          },
        );
      },
      first.current ? 0 : PAUSE_MS,
    );
    first.current = false;
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [normalized, askable]);

  // A result for an older value is stale while the user keeps typing.
  return askable && result.username === normalized ? result.status : 'idle';
}
