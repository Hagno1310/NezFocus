import { Mail } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { pendingInvites } from '../../../data/invites';
import { bannerServerName } from '../../../domain/invites/pendingInvite';
import { Banner } from '../../../shared/ui/Feedback';

// Spec 01 › Quy ước chung "Lời mời đang chờ": on S-AUTH-01/02/04 (sign in) and S-ONB-01
// (complete). The context strip, under the offline one (S-MOD-04: at most two).
export function PendingInviteBanner({ step }: { step: 'signIn' | 'complete' }) {
  const { t } = useTranslation();
  const invite = useStore(pendingInvites.store, () => pendingInvites.current());
  if (!invite) return null;
  const server = bannerServerName(invite.serverName);
  return (
    <Banner
      icon={Mail}
      text={t(
        step === 'signIn' ? 'invites.pendingSignIn' : 'invites.pendingComplete',
        { server },
      )}
    />
  );
}
