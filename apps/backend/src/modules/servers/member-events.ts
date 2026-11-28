// In-process (SRS 7.5.1): a user joined a server by invite. Messaging listens to send the
// welcome-channel message (REQ-MSG-11) and set the newcomer's read states (P2-A4).
export const MEMBER_JOINED = 'server.member.joined';

export type MemberJoined = { serverId: bigint; userId: bigint };

// REQ-ROLE-05 AC1: a ban with "Xóa tin nhắn gần đây". Messaging soft-deletes the user's messages
// in the server sent from `since` and sends MESSAGE_DELETE_BULK; emitted with emitAsync.
export const MEMBER_BANNED = 'server.member.banned';

export type MemberBanned = { serverId: bigint; userId: bigint; since: Date };
