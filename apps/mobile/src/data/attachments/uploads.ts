import { randomUUID } from 'expo-crypto';
import { createUploads } from '../../domain/attachments/uploads';
import { gatewayStore } from '../../domain/gateway/gatewayStore';
import { attachmentRepository } from '.';
import { releaseImage } from './pickedImages';

// One for the app: tray tiles and the outbox share uploads (REQ-MSG-04).
export const uploads = createUploads({
  repo: attachmentRepository,
  online: () => gatewayStore.getState().online,
  newKey: randomUUID,
  release: releaseImage,
});

// S-HOME-05 offline (CR-28 #29): tiles waiting for the network go again by themselves.
gatewayStore.subscribe((now, before) => {
  if (now.online && !before.online) uploads.resume();
});
