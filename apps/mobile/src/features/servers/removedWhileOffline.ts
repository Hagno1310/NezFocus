import { LogOut } from 'lucide-react-native';
import { localKv } from '../../data/db/kv';
import {
  offlineRemovalToast,
  type RemovedItem,
} from '../../domain/servers/removal';
import { i18n } from '../../shared/i18n';
import { showToast } from '../../shared/ui/Toast';

const TOLD_KEY = 'moderation.removedTold'; // SRS 8.7: ids already toasted on this device

// REQ-ROLE-05 AC7 `removed-while-offline`: after READY, the unread kick / ban `moderation` items
// never told here → one Toast + "Xem" (the Thông báo tab). The items come from the inbox list:
// P4-B1.4 (#190) calls this once GET /notifications exists (P4-B1.1 #187).
export async function toastRemovedWhileOffline(
  items: readonly RemovedItem[],
  onView: () => void,
) {
  const told = new Set((await localKv.get<string[]>(TOLD_KEY)) ?? []);
  const toast = offlineRemovalToast(items, told);
  if (!toast) return;
  await localKv.set(TOLD_KEY, [...told, ...toast.ids]);
  showToast({
    icon: LogOut,
    message:
      toast.text.kind === 'one'
        ? i18n.t('servers.removed.offlineOne', { server: toast.text.server })
        : i18n.t('servers.removed.offlineMany', { count: toast.text.count }),
    action: { label: i18n.t('servers.removed.view'), onPress: onView },
  });
}
