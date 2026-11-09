import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { useQuery } from "@tanstack/react-query";
import { getRecentCalls } from "@/api/lesson-operations";
import type { LessonCall } from "@/api/types";
import {
  RING_TIMEOUT_MS,
  RING_WINDOW_MS,
  ensureLessonCallChannel,
  startCallHaptics,
  startCallRinger,
} from "@/lib/lesson-call-notifications";
import { socketAwareInterval } from "@/lib/realtime-liveness";
import { useAuth } from "@/providers/auth-provider";
import { useLessonCall } from "@/providers/lesson-call-provider";
import { IncomingCallBanner } from "@/components/lesson/incoming-call-banner";

/**
 * Rings for calls addressed to the signed-in user. The list query is the only
 * trigger: realtime invalidates it instantly, push invalidates the notification
 * list, and returning to the foreground sweeps everything the app missed while
 * suspended. The interval is the fallback for a socket that never connected.
 */
const RING_POLL_MS = 20_000;

export const LessonRingProvider = ({ children }: { children: ReactNode }) => {
  const { status, user } = useAuth();
  const { call } = useLessonCall();
  const authenticated = status === "authenticated" && Boolean(user);
  const [ringing, setRinging] = useState<LessonCall | null>(null);
  const rung = useRef(new Set<string>());

  const calls = useQuery({
    queryKey: ["lesson-calls"],
    queryFn: getRecentCalls,
    enabled: authenticated,
    refetchInterval: socketAwareInterval(RING_POLL_MS),
  });

  useEffect(() => {
    void ensureLessonCallChannel();
  }, []);

  // A push is the only signal an OS-delivered call leaves in JS, so treat it as
  // a reason to look rather than as the ring itself.
  useEffect(() => {
    if (!authenticated) return;
    const subscription = Notifications.addNotificationReceivedListener(() => {
      void calls.refetch();
    });
    return () => subscription.remove();
  }, [authenticated, calls]);

  useEffect(() => {
    if (!authenticated) return;
    const fresh = (calls.data ?? []).find(
      (call) =>
        !rung.current.has(call.id) &&
        Date.now() - Date.parse(call.createdAt) < RING_WINDOW_MS
    );
    if (!fresh) return;
    rung.current.add(fresh.id);
    setRinging(fresh);
  }, [authenticated, calls.data]);

  const inRoom = useRef(Boolean(call));
  useEffect(() => {
    inRoom.current = Boolean(call);
  }, [call]);

  useEffect(() => {
    if (!ringing) return;
    const stopHaptics = startCallHaptics();
    // A live Jitsi room owns the audio session; ringing over it would duck the
    // lesson the person is already teaching or attending.
    const stopRinger = inRoom.current ? null : startCallRinger();
    const timer = setTimeout(() => setRinging(null), RING_TIMEOUT_MS);
    return () => {
      stopHaptics();
      stopRinger?.();
      clearTimeout(timer);
    };
  }, [ringing]);

  const join = useCallback(() => {
    const lessonId = ringing?.lessonId;
    setRinging(null);
    if (lessonId) router.push({ pathname: "/lesson/[id]", params: { id: lessonId } });
  }, [ringing]);

  const dismiss = useCallback(() => setRinging(null), []);

  return (
    <>
      {children}
      {ringing ? (
        <IncomingCallBanner call={ringing} onJoin={join} onDismiss={dismiss} />
      ) : null}
    </>
  );
};
