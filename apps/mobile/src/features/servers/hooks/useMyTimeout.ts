import { isTimedOut } from '@nezfocus/shared';
import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { homeStore } from '../../../domain/servers/homeStore';

// REQ-ROLE-05: my timeout in this server while it runs, else null; the screen turns back by
// itself when it ends ("hiện lại khi hết hạn", spec 02 › Bị tạm khóa ngay khi đang gõ).
export function useMyTimeout(serverId: string | null): string | null {
  const until = useStore(homeStore, (s) =>
    serverId ? (s.myTimeouts[serverId] ?? null) : null,
  );
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    const id = setTimeout(
      () => setNow(Date.now()),
      Math.max(0, Date.parse(until) - Date.now()) + 500,
    );
    return () => clearTimeout(id);
  }, [until]);
  return isTimedOut(until, now) ? until : null;
}
