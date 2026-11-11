import { useQuery } from "@tanstack/react-query";
import {
  LESSON_ROOM_FLAGS_KEY,
  getLessonRoomFlags,
  type LessonRoomFlags,
} from "@/api/lesson-room-config";

/** Nothing is offered until the server says so, including if the call fails. */
const FLAGS_OFF: LessonRoomFlags = {
  whiteboard: false,
  chat: false,
  cameraBackground: false,
  pen: false,
};

/**
 * Read once at startup and kept for the session: Jitsi fixes its toolbar when
 * the conference is created, so a mid-call revalidation could only mislead.
 */
export const useLessonRoomFlags = () => {
  const { data, isPending } = useQuery({
    queryKey: LESSON_ROOM_FLAGS_KEY,
    queryFn: getLessonRoomFlags,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  return { flags: data ?? FLAGS_OFF, flagsLoaded: !isPending };
};
