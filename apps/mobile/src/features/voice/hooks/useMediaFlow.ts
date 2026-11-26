import { useRef, useState } from 'react';
import { cameraPermission } from '../../../data/voice/cameraPermission';
import { micPermission } from '../../../data/voice/micPermission';
import { mediaDenied } from '../../../domain/voice/mediaDenied';
import { permissionStep } from '../../../domain/voice/mediaPermission';

export type MediaKind = 'mic' | 'camera';
export type MediaSheet = { kind: MediaKind; blocked: boolean } | null;

const permissions = { mic: micPermission, camera: cameraPermission };

// 10 S-MOD-05 for the room Mic / Camera: `ensure(kind)` answers whether it may turn on, after the
// explain sheet / Android dialog / blocked sheet as the flow says. Android refusing marks it
// denied (C-17 `no-permission`, S-ROOM-EDGE `mic-denied`).
export function useMediaFlow() {
  const [sheet, setSheet] = useState<MediaSheet>(null);
  const answer = useRef<((ok: boolean) => void) | null>(null);

  const mark = (kind: MediaKind, ok: boolean) =>
    mediaDenied.setState({ [kind]: !ok });
  const ask = async (kind: MediaKind) => {
    const ok = await permissions[kind].request();
    mark(kind, ok);
    return ok;
  };
  const settle = (ok: boolean) => {
    answer.current?.(ok);
    answer.current = null;
  };

  async function ensure(kind: MediaKind): Promise<boolean> {
    const step = permissionStep(await permissions[kind].check());
    if (step === 'granted') {
      mark(kind, true);
      return true;
    }
    if (step === 'ask') return ask(kind);
    setSheet({ kind, blocked: step === 'blocked' });
    return new Promise((resolve) => {
      answer.current = resolve;
    });
  }

  return {
    sheet,
    ensure,
    onContinue: async () => {
      if (!sheet) return;
      setSheet(null);
      settle(await ask(sheet.kind));
    },
    onSettings: () => {
      if (!sheet) return;
      setSheet(null);
      void permissions[sheet.kind].openSettings();
      settle(false);
    },
    // "Để sau": go on without it; nothing new was refused.
    onLater: () => {
      setSheet(null);
      settle(false);
    },
  };
}
