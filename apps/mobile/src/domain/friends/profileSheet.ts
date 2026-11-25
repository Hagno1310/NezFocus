import { createStore } from 'zustand/vanilla';

// S-HOME-10: one sheet for the whole app; screens only call openMemberProfile.
export type ProfileTarget = {
  userId: string;
  serverId: string | null; // in a server: role and "Thành viên từ"; null: SERVER CHUNG
  fromTheirDm: boolean; // AUTH-06 AC5: no "Nhắn tin"
};

// `target` stays after closing so the sheet keeps its content while it animates out.
export const profileSheet = createStore<{
  target: ProfileTarget | null;
  visible: boolean;
}>(() => ({ target: null, visible: false }));

export const openMemberProfile = (
  userId: string,
  ctx: { serverId?: string | null; fromTheirDm?: boolean } = {},
) =>
  profileSheet.setState({
    visible: true,
    target: {
      userId,
      serverId: ctx.serverId ?? null,
      fromTheirDm: !!ctx.fromTheirDm,
    },
  });

export const closeMemberProfile = () =>
  profileSheet.setState({ visible: false });
