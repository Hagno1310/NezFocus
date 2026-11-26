import { useRef, useState } from 'react';
import { micPermission } from '../../../data/voice/micPermission';
import { permissionStep } from '../../../domain/voice/mediaPermission';
import { micDenied } from '../../../domain/voice/micDenied';

export type MicSheet = 'mic' | 'mic-blocked' | null;

// 10 S-MOD-05 for the room Mic: `ensure()` answers whether the mic may turn on, after the
// explain sheet / Android dialog / blocked sheet as the flow says. A refusal by Android turns
// on S-ROOM-EDGE `mic-denied`.
export function useMicFlow() {
  const [sheet, setSheet] = useState<MicSheet>(null);
  const answer = useRef<((ok: boolean) => void) | null>(null);

  const settle = (ok: boolean) => {
    if (!ok) micDenied.setState({ denied: true });
    answer.current?.(ok);
    answer.current = null;
  };
  const ask = async () => {
    const ok = await micPermission.request();
    if (!ok) micDenied.setState({ denied: true });
    return ok;
  };

  async function ensure(): Promise<boolean> {
    const step = permissionStep(await micPermission.check());
    if (step === 'granted') {
      micDenied.setState({ denied: false });
      return true;
    }
    if (step === 'ask') return ask();
    setSheet(step === 'explain' ? 'mic' : 'mic-blocked');
    return new Promise((resolve) => {
      answer.current = resolve;
    });
  }

  return {
    sheet,
    ensure,
    onContinue: async () => {
      setSheet(null);
      settle(await micPermission.request());
    },
    onSettings: () => {
      setSheet(null);
      void micPermission.openSettings();
      settle(false);
    },
    // "Để sau": go on without the mic, nothing refused yet.
    onLater: () => {
      setSheet(null);
      answer.current?.(false);
      answer.current = null;
    },
  };
}
