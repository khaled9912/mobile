import { JITSI_DOMAIN } from "@/config/env";

/**
 * Room names must match the web app's lesson page so both clients join the
 * same conference. Keep this in sync with FE/src/app/lesson/[id]/page.tsx.
 */
export const lessonRoomName = (lessonId: string) => `ana-quran-${lessonId}`;

export const lessonRoomUrl = (lessonId: string) =>
  `https://${JITSI_DOMAIN}/${lessonRoomName(lessonId)}`;
