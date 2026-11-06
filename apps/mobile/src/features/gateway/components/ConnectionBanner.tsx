import { useStore } from 'zustand';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import { SystemBanner } from '../../../shared/ui/Feedback';

// S-MOD-04 system strip: place right under the screen header, full width.
export function ConnectionBanner() {
  const banner = useStore(gatewayStore, (s) => s.banner);
  return banner ? <SystemBanner kind={banner} /> : null;
}
