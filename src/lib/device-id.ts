import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_ID_KEY = "anaquran.device-id.v1";

let cached: string | null = null;
let pending: Promise<string> | null = null;

const createId = () =>
  `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * A stable per-install identifier used only to group attendance intervals.
 * It is not a security credential and never leaves the device except in
 * attendance beacons.
 */
export const getDeviceId = (): Promise<string> => {
  if (cached) return Promise.resolve(cached);
  if (pending) return pending;

  pending = (async () => {
    try {
      const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (stored) {
        cached = stored;
        return stored;
      }
    } catch {
      // Fall through and create a fresh id for this launch.
    }
    const id = createId();
    cached = id;
    try {
      await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    } catch {
      // The id still works for this session.
    }
    return id;
  })();

  return pending;
};
