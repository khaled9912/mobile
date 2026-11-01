import { useCallback, useEffect, useRef, useState } from "react";
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
import { JitsiRoom } from "@/components/lesson/jitsi-room";
import { LessonFeedback } from "@/components/lesson/lesson-feedback";
import { KeyboardAwareScrollView } from "@/components/ui/keyboard-aware-scroll-view";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui/states";
import { formatDateTime, formatTimeRange, relativeDay } from "@/lib/format";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";
import { usePullRefresh } from "@/hooks/use-pull-refresh";
import {
  isLessonEnded,
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
  const insets = useSafeAreaInsets();

  const [joined, setJoined] = useState(false);
  const closing = useRef(false);

  const lessonQuery = useQuery({
    queryKey: ["lessons", id],
    queryFn: () => getLessonById(id as string),
    enabled: Boolean(id),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const { refreshing, onRefresh } = usePullRefresh(lessonQuery.refetch);

  const lesson = lessonQuery.data;
  const ended = lesson ? isLessonEnded(lesson) : false;

  // The room stays closed until the scheduled start. Waking up exactly at that
  // moment lets the room mount without the user refreshing.
  const startsAtMs = lesson ? new Date(lesson.startsAt).getTime() : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startsAtMs === null) return;
    const remaining = startsAtMs - Date.now();
    if (remaining <= 0) return;
    const timer = setTimeout(() => setNow(Date.now()), remaining + 500);
    return () => clearTimeout(timer);
  }, [startsAtMs]);
  const beforeStart = startsAtMs !== null && now < startsAtMs;

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/schedule");
  }, []);

  const handleClose = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    goBack();
  }, [goBack]);

  // Once someone has joined, a refetch that crosses the end time must not rip
  // the live call away from them.
  const showingRoom =
    Boolean(lesson) &&
    lesson!.status !== "cancelled" &&
    !beforeStart &&
    (!ended || joined);

  const error = lessonQuery.error;
  const forbidden =
    error instanceof ApiError && (error.status === 403 || error.status === 404);

  const title =
    lesson && ended && !showingRoom ? "Lesson recap" : "Lesson room";
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
        <View style={styles.center}>
          <LoadingView label="Preparing your lesson room…" />
        </View>
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
        </KeyboardAwareScrollView>
      );
    }

    if (ended && !showingRoom) {
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
        </KeyboardAwareScrollView>
      );
    }

    return (
      <View style={[styles.stage, { paddingBottom: insets.bottom }]}>
        <JitsiRoom
          room={`rayan-academy-${lesson.id}`}
          displayName={user?.fullName ?? "Guest"}
          onJoined={() => setJoined(true)}
          onClose={handleClose}
        />
      </View>
    );
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  recapCard: { gap: 4 },
  recapTitle: { marginTop: 2 },
});
