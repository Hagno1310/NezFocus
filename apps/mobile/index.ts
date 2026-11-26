import { registerGlobals } from '@livekit/react-native';
import { registerRootComponent } from 'expo';
import App from './src/app/App';

// LiveKit needs WebRTC globals before any Room is made (SRS 7.3.5).
registerGlobals();
registerRootComponent(App);
