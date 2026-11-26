import VoiceService from '../../../modules/voice-service';

// REQ-VC-01 AC4 (SRS 7.3.5): the foreground service while in a room. A dev client built before
// modules/voice-service: the room works, only not with the screen locked.
export const backgroundService = {
  start: (o: {
    title: string;
    text: string;
    channelName: string;
    camera: boolean;
  }) => VoiceService?.start(o.title, o.text, o.channelName, o.camera),
  stop: () => VoiceService?.stop(),
};
