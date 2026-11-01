import { useCallback, useRef, useState } from "react";

/**
 * Pull-to-refresh state that only reacts to a user gesture, so background
 * polling does not flash the native refresh spinner.
 */
export const usePullRefresh = (refetch: () => Promise<unknown>) => {
  const [refreshing, setRefreshing] = useState(false);
  const running = useRef(false);

  const onRefresh = useCallback(() => {
    if (running.current) return;
    running.current = true;
    setRefreshing(true);
    void refetch().finally(() => {
      running.current = false;
      setRefreshing(false);
    });
  }, [refetch]);

  return { refreshing, onRefresh };
};
