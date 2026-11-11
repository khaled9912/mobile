import { apiFetch } from "./client";

/**
 * Which controls a live lesson room offers. The server owns the answer so the
 * web app and this binary switch together; see `LessonRoom__*` in the backend
 * operations runbook.
 */
export interface LessonRoomFlags {
  whiteboard: boolean;
  chat: boolean;
  cameraBackground: boolean;
  pen: boolean;
}

export const LESSON_ROOM_FLAGS_KEY = ["config", "lesson-room"] as const;

export const getLessonRoomFlags = async (): Promise<LessonRoomFlags> => {
  const raw = await apiFetch<Partial<LessonRoomFlags>>(
    "/api/config/lesson-room"
  );
  return {
    whiteboard: Boolean(raw?.whiteboard),
    chat: Boolean(raw?.chat),
    cameraBackground: Boolean(raw?.cameraBackground),
    pen: Boolean(raw?.pen),
  };
};
