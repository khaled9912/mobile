import { readWelcomeSeen, writeWelcomeSeen } from "./storage";

let seen = true;
let loaded = false;
const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((listener) => listener());
};

export const subscribeWelcome = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// Until the stored flag is read, assume it was seen so a returning user never
// sees the welcome screen flash before the session check completes.
export const getWelcomeSeen = () => (loaded ? seen : true);

export const hydrateWelcome = async () => {
  const stored = await readWelcomeSeen();
  seen = stored;
  loaded = true;
  notify();
};

export const markWelcomeSeen = () => {
  seen = true;
  loaded = true;
  notify();
  void writeWelcomeSeen();
};
