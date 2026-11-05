import {
  FadeIn,
  FadeOut,
  ReduceMotion,
  SlideInDown,
} from 'react-native-reanimated';
import { motion } from '../theme';

// DESIGN.md › Motion: with Reduce motion on, movement becomes a 200 ms crossfade, never nothing.
// Reanimated's default (ReduceMotion.System) would skip the animation, so fades opt out of it.
export const fadeIn = FadeIn.duration(motion.short).reduceMotion(
  ReduceMotion.Never,
);
export const fadeOut = FadeOut.duration(motion.short).reduceMotion(
  ReduceMotion.Never,
);

export const sheetEnter = (reduced: boolean) =>
  reduced ? fadeIn : SlideInDown.duration(motion.medium);
