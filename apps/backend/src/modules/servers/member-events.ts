// In-process (SRS 7.5.1): a user joined a server by invite. Messaging listens to send the
// welcome-channel message (REQ-MSG-11) and set the newcomer's read states (P2-A4).
export const MEMBER_JOINED = 'server.member.joined';

export type MemberJoined = { serverId: bigint; userId: bigint };
