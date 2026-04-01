import { useEffect, useEffectEvent, useState } from "react";
import { useSelector } from "react-redux";

const buildSocketUrl = (token) => {
  const configuredBase = import.meta.env.VITE_API_BASE_URL;
  const baseUrl =
    configuredBase && configuredBase !== "/"
      ? new URL(configuredBase, window.location.origin)
      : new URL(window.location.origin);

  baseUrl.protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
  baseUrl.pathname = "/rms/ws/updates";
  baseUrl.search = "";
  baseUrl.searchParams.set("token", token);

  return baseUrl.toString();
};

export default function useRestaurantLiveUpdates(onEvent) {
  const accessToken = useSelector((state) => state.auth.accessToken);
  const [connectionState, setConnectionState] = useState("offline");
  const handleEvent = useEffectEvent((payload) => {
    onEvent?.(payload);
  });

  useEffect(() => {
    if (!accessToken) {
      return undefined;
    }

    let active = true;
    let socket;
    let retryTimer;
    let retryAttempt = 0;

    const connect = () => {
      if (!active) return;

      setConnectionState(retryAttempt > 0 ? "reconnecting" : "connecting");
      socket = new WebSocket(buildSocketUrl(accessToken));

      socket.onopen = () => {
        retryAttempt = 0;
        setConnectionState("live");
      };

      socket.onmessage = (event) => {
        try {
          handleEvent(JSON.parse(event.data));
        } catch {
          // Ignore malformed payloads so the page stays usable.
        }
      };

      socket.onerror = () => {
        setConnectionState("reconnecting");
      };

      socket.onclose = () => {
        if (!active) return;

        retryAttempt += 1;
        setConnectionState("reconnecting");
        retryTimer = window.setTimeout(connect, Math.min(6000, retryAttempt * 1000));
      };
    };

    connect();

    return () => {
      active = false;
      if (retryTimer) window.clearTimeout(retryTimer);
      if (socket && socket.readyState < WebSocket.CLOSING) {
        socket.close();
      }
    };
  }, [accessToken]);

  return { connectionState: accessToken ? connectionState : "offline" };
}
