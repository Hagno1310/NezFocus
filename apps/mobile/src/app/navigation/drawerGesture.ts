export type DrawerSide = 'left' | 'right';

// Pan fails after this many px the wrong way, before the drawer's 5px activation offset.
const WRONG_WAY_PX = 3;

// Both drawers listen across the whole content, so each pan starts only in its own direction (SRS 3.1 › Cử chỉ).
export function drawerGesture(
  side: DrawerSide,
  { leftOpen, rightOpen }: { leftOpen: boolean; rightOpen: boolean },
) {
  const open = side === 'left' ? leftOpen : rightOpen;
  const otherOpen = side === 'left' ? rightOpen : leftOpen;
  // left+closed and right+open both move rightwards, so they fail on a leftward move.
  const movesRight = (side === 'left') !== open;
  return {
    swipeEnabled: !otherOpen,
    failOffsetX: movesRight ? -WRONG_WAY_PX : WRONG_WAY_PX,
  };
}
