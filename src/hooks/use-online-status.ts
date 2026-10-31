import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

/** False only when we are confident the device has no internet route. */
export const useOnlineStatus = () => {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(
        Boolean(state.isConnected && state.isInternetReachable !== false)
      );
    });
    void NetInfo.fetch().then((state) => {
      setOnline(
        Boolean(state.isConnected && state.isInternetReachable !== false)
      );
    });
    return unsubscribe;
  }, []);

  return online;
};
