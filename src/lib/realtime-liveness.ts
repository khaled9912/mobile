/**
 * Whether the SignalR socket is currently live.
 *
 * REST polling exists only to repair missed change events, and the socket
 * already delivers those: every scope invalidates its queries, and connecting,
 * reconnecting, or returning to the foreground runs a full sweep. Paying for a
 * fixed cadence while the socket is healthy is pure overhead: it burns phone
 * data and battery, and on the server it keeps Neon from scaling to zero.
 *
 * The realtime provider writes this; `socketAwareInterval` reads it.
 */
let live = false;

export const setRealtimeLive = (value: boolean) => {
  live = value;
};

export const isRealtimeLive = () => live;

/**
 * Poll at `ms` only while the socket is down.
 *
 * React Query re-reads this whenever a query settles, and the provider sweeps
 * every query on both transitions, so an interval arms on disconnect and
 * disarms on connect. While the app is backgrounded, focusManager already
 * suspends intervals, so this only decides what happens on screen.
 */
export const socketAwareInterval =
  (ms: number) =>
  (): number | false => (live ? false : ms);
