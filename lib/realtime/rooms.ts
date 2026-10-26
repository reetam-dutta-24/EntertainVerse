/** Socket.IO room names shared by the socket server, API routes and clients. */

/** Every socket a user opens joins their private room — DMs and personal events land here. */
export const userRoom = (userId: string) => `user:${userId}`;
