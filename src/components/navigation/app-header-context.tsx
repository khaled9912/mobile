import { createContext, useContext, type ReactNode } from "react";

const AppHeaderContext = createContext(false);

export const AppHeaderProvider = ({
  present,
  children,
}: {
  present: boolean;
  children: ReactNode;
}) => (
  <AppHeaderContext.Provider value={present}>
    {children}
  </AppHeaderContext.Provider>
);

/** Screens use this to skip their own top safe-area edge under the app header. */
export const useAppHeaderPresent = () => useContext(AppHeaderContext);
