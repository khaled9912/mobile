import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ApiError } from "@/api/client";
import { getLessonById } from "@/api/lessons";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useLessonCall } from "@/providers/lesson-call-provider";
import { LessonFeedback } from "@/components/lesson/lesson-feedback";
import { LessonOperationsPanel } from "@/components/lesson/lesson-operations-panel";
import { ShareLessonDrawer } from "@/components/lesson/share-lesson-drawer";
import { KeyboardAwareScrollView } from "@/components/ui/keyboard-aware-scroll-view";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorView } from "@/components/ui/states";
import { TextCardSkeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatTimeRange, relativeDay } from "@/lib/format";
import { lessonRoomName, lessonRoomUrl } from "@/lib/lesson-room";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";
import { usePullRefresh } from "@/hooks/use-pull-refresh";
import {
  lessonStatusLabel,
  lessonStatusTone,
} from "@/lib/status";

const STAGE_BG = "#05080a";

export default function LessonRoomScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { role, user } = useAuth();
  const { colors } = useTheme();
  const isSupport = role === "admin" || role === "super_admin";
  const trackAttendance = role === "teacher" || role === "student";
  const displayName = user?.fullName ?? "Guest";
  const roomDisplayName = isSupport
    ? `${displayName} (Academy support)`
    : displayName;
  const insets = useSafeAreaInsets();
  const { call, joined, startCall, endCallForLesson } = useLessonCall();

  const lessonQuery = useQuery({
    queryKey: ["lessons", id],
    queryFn: () => getLessonById(id as string),
    enabled: Boolean(id),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const { refreshing, onRefresh } = usePullRefresh(lessonQuery.refetch);

  const lesson = lessonQuery.data;

  // Waking up at the scheduled start and end keeps the room accurate without
  // the user refreshing.
  const startsAtMs = lesson ? new Date(lesson.startsAt).getTime() : null;
  const endsAtMs = lesson ? new Date(lesson.endsAt).getTime() : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startsAtMs === null) return;
    const remaining = startsAtMs - Date.now();
    if (remaining <= 0) return;
    const timer = setTimeout(() => setNow(Date.now()), remaining + 500);
    return () => clearTimeout(timer);
  }, [startsAtMs]);
  useEffect(() => {
    if (endsAtMs === null) return;
    const remaining = endsAtMs - Date.now();
    if (remaining <= 0) return;
    const timer = setTimeout(() => setNow(Date.now()), remaining + 500);
    return () => clearTimeout(timer);
  }, [endsAtMs]);
  const beforeStart = startsAtMs !== null && now < startsAtMs;
  const afterEnd = endsAtMs !== null && now >= endsAtMs;

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/schedule");
  }, []);

  const [shareOpen, setShareOpen] = useState(false);

  const callJoined = call?.lessonId === lesson?.id && joined;

  // The clock alone decides when the room is open. A lesson marked ended early
  // stays joinable until its scheduled end so either side can rejoin after a
  // dropped call.
  const showingRoom =
    Boolean(lesson) &&
    lesson!.status !== "cancelled" &&
    !beforeStart &&
    (!afterEnd || callJoined);

  // Sharing only makes sense while the room is open; the recap is a record.
  const canShare = Boolean(lesson) && showingRoom;

  useEffect(() => {
    if (!lesson || !showingRoom) return;
    const room = lessonRoomName(lesson.id);
    startCall({
      lessonId: lesson.id,
      room,
      displayName: roomDisplayName,
      title: "Lesson room",
      subtitle: `${formatDateTime(lesson.startsAt)} · ${lesson.teacherName} with ${lesson.studentName}`,
      shareUrl: lessonRoomUrl(lesson.id),
      trackAttendance,
    });
  }, [lesson, roomDisplayName, showingRoom, startCall, trackAttendance]);

  // A cancelled lesson, or one that ended before anyone joined, closes the room.
  useEffect(() => {
    if (!lesson) return;
    if (lesson.status === "cancelled" || (afterEnd && !callJoined)) {
      endCallForLesson(lesson.id);
    }
  }, [afterEnd, callJoined, endCallForLesson, lesson]);

  const error = lessonQuery.error;
  const forbidden =
    error instanceof ApiError && (error.status === 403 || error.status === 404);

  const title =
    lesson && afterEnd && !showingRoom ? "Lesson recap" : "Lesson room";
  const subtitle = lesson
    ? `${formatDateTime(lesson.startsAt)} · ${lesson.teacherName} with ${lesson.studentName}`
    : "Joining your private lesson room.";

  const header = (
    <View
      style={[
        styles.header,
        {
          borderBottomColor: showingRoom ? "rgba(255,255,255,0.12)" : colors.border,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={12}
        onPress={goBack}
        style={styles.headerButton}
      >
        <Ionicons
          name="chevron-back"
          size={24}
          color={showingRoom ? "#ffffff" : colors.text}
        />
      </Pressable>
      <View style={styles.headerCopy}>
        <AppText
          variant="h3"
          color={showingRoom ? "#ffffff" : "text"}
          numberOfLines={1}
        >
          {title}
        </AppText>
        <AppText
          variant="caption"
          color={showingRoom ? "rgba(255,255,255,0.68)" : "muted"}
          numberOfLines={1}
        >
          {subtitle}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Refresh lesson"
        accessibilityState={{ busy: refreshing }}
        hitSlop={12}
        onPress={onRefresh}
        style={styles.headerButton}
      >
        {refreshing ? (
          <ActivityIndicator
            size="small"
            color={showingRoom ? "#ffffff" : colors.brand}
          />
        ) : (
          <Ionicons
            name="refresh"
            size={20}
            color={showingRoom ? "#ffffff" : colors.muted}
          />
        )}
      </Pressable>
      {canShare ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share lesson room link"
          hitSlop={12}
          onPress={() => setShareOpen(true)}
          style={styles.headerButton}
        >
          <Ionicons name="share-outline" size={21} color="#ffffff" />
        </Pressable>
      ) : null}
    </View>
  );

  const renderContent = () => {
    if (!id) {
      return (
        <KeyboardAwareScrollView contentContainerStyle={styles.scroll}>
          <ErrorView
            error={new Error("This lesson link is incomplete.")}
            title="Lesson unavailable"
          />
        </KeyboardAwareScrollView>
      );
    }

    if (lessonQuery.isLoading) {
      return (
        <KeyboardAwareScrollView contentContainerStyle={styles.scroll}>
          <TextCardSkeleton lines={3} />
          <TextCardSkeleton lines={5} />
        </KeyboardAwareScrollView>
      );
    }

    if (forbidden) {
      return (
        <KeyboardAwareScrollView contentContainerStyle={styles.scroll}>
          <EmptyState
            icon="lock-closed-outline"
            title="Lesson unavailable"
            body="This lesson does not exist or does not belong to your account."
            action={
              <Button title="Back to schedule" size="sm" onPress={goBack} />
            }
          />
        </KeyboardAwareScrollView>
      );
    }

    if (error || !lesson) {
      return (
        <KeyboardAwareScrollView contentContainerStyle={styles.scroll}>
          <ErrorView
            error={error ?? new Error("This lesson could not be found.")}
            onRetry={() => void lessonQuery.refetch()}
          />
        </KeyboardAwareScrollView>
      );
    }

    if (lesson.status === "cancelled") {
      return (
        <KeyboardAwareScrollView contentContainerStyle={styles.scroll}>
          <EmptyState
            icon="close-circle-outline"
            title="Lesson cancelled"
            body="This lesson was cancelled, so the room is closed."
            action={
              <Button title="Back to schedule" size="sm" onPress={goBack} />
            }
          />
          <LessonOperationsPanel lesson={lesson} role={role} />
        </KeyboardAwareScrollView>
      );
    }

    if (beforeStart) {
      return (
        <KeyboardAwareScrollView contentContainerStyle={styles.scroll}>
          <EmptyState
            icon="time-outline"
            title="The room is not open yet"
            body={`This lesson room opens at ${formatDateTime(lesson.startsAt)}.`}
            action={
              <Button title="Back to schedule" size="sm" onPress={goBack} />
            }
          />
          <LessonOperationsPanel lesson={lesson} role={role} />
        </KeyboardAwareScrollView>
      );
    }

    if (afterEnd && !showingRoom) {
      return (
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brand}
              colors={[colors.brand]}
            />
          }
        >
          <Card style={styles.recapCard}>
            <View style={styles.between}>
              <AppText variant="caption" color="gold" weight="700">
                {relativeDay(lesson.startsAt).toUpperCase()}
              </AppText>
              <Badge
                label={lessonStatusLabel[lesson.status]}
                tone={lessonStatusTone[lesson.status]}
              />
            </View>
            <AppText variant="h2" style={styles.recapTitle}>
              {formatTimeRange(lesson.startsAt, lesson.endsAt)}
            </AppText>
            <AppText variant="small" color="muted">
              {lesson.teacherName} with {lesson.studentName}
            </AppText>
          </Card>
          <LessonFeedback lesson={lesson} role={role} />
          <LessonOperationsPanel lesson={lesson} role={role} />
        </KeyboardAwareScrollView>
      );
    }

    // The call itself lives in the root LessonCallProvider so it survives
    // navigation; this screen only backgrounds it while the room is open.
    return <View style={[styles.stage, { paddingBottom: insets.bottom }]} />;
  };

  const darkStage = showingRoom;

  return (
    <View
      style={[
        styles.flex,
        { backgroundColor: darkStage ? STAGE_BG : colors.background },
      ]}
    >
      <SafeAreaView edges={["top"]} style={styles.flex}>
        {header}
        {renderContent()}
      </SafeAreaView>
      {lesson ? (
        <ShareLessonDrawer
          visible={shareOpen}
          shareUrl={lessonRoomUrl(lesson.id)}
          onClose={() => setShareOpen(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stage: { flex: 1, backgroundColor: STAGE_BG },
  header: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1, gap: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  recapCard: { gap: 4 },
  recapTitle: { marginTop: 2 },
});
