import {
  Easing,
  FadeIn,
  FadeOut,
  ReduceMotion,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { motion } from '../theme';

// DESIGN.md › Motion: enter ease-out, exit ease-in; Reduce motion = 200 ms crossfade, never nothing.
export const exitMs = motion.short;

const enter = Easing.out(Easing.ease);
const exit = Easing.in(Easing.ease);

export const fadeIn = FadeIn.duration(motion.short)
  .easing(enter)
  .reduceMotion(ReduceMotion.Never);
export const fadeOut = FadeOut.duration(exitMs)
  .easing(exit)
  .reduceMotion(ReduceMotion.Never);

export const sheetEnter = (reduced: boolean) =>
  reduced
    ? fadeIn
    : SlideInDown.duration(motion.medium)
        .easing(enter)
        .reduceMotion(ReduceMotion.Never);

// A sheet dragged down fades out: sliding would first snap it back to its rest position.
export const sheetExit = (reduced: boolean, dragged: boolean) =>
  reduced || dragged
    ? fadeOut
    : SlideOutDown.duration(exitMs)
        .easing(exit)
        .reduceMotion(ReduceMotion.Never);
