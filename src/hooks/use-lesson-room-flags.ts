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
  transcription: false,
  reportConcern: false,
};

/** Live app controls refresh; JitsiRoom separately snapshots its native config. */
export const useLessonRoomFlags = () => {
  const { data, isFetched, isError } = useQuery({
    queryKey: LESSON_ROOM_FLAGS_KEY,
    queryFn: getLessonRoomFlags,
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: false,
  });

  const flags = data ?? FLAGS_OFF;
  return {
    // React Query retains old data after a failed poll. Never keep these two
    // features enabled from that stale response. Do not unmount a live room.
    flags: isError
      ? { ...flags, transcription: false, reportConcern: false }
      : flags,
    // isPending becomes true again when retrying an initial failure with no
    // cached data. isFetched stays true, keeping an already-open room mounted.
    flagsLoaded: isFetched,
  };
};
