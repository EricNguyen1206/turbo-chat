/**
 * WebSocket Provider for Messages
 * 
 * Establishes WebSocket connection using httpOnly cookie authentication.
 * No need to pass tokens - cookies are sent automatically.
 */

import { memo, useEffect, useRef, useCallback } from "react";
import { Outlet } from "react-router-dom";
import { useSocketStore } from "@/store/useSocketStore";
import { useOnlineStatusStore } from "@/store/useOnlineStatusStore";
import { useCurrentUserQuery } from "@/services/api/users";
import { apiUrl } from "@/lib/config";

function MessagesWebSocketProvider() {
  const { connect, disconnect, isConnected } = useSocketStore();
  const setMultipleStatuses = useOnlineStatusStore((state) => state.setMultipleStatuses);
  const { data: user } = useCurrentUserQuery();
  const hasConnected = useRef(false);

  // Fetch initial friends online status
  const fetchFriendsOnlineStatus = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/friends/online-status`, {
        credentials: 'include', // Include httpOnly cookies
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.statuses) {
          setMultipleStatuses(data.data.statuses);
          console.log("Friends online status hydrated:", Object.keys(data.data.statuses).length);
        }
      }
    } catch (error) {
      console.error("Failed to fetch friends online status:", error);
    }
  }, [setMultipleStatuses]);

  // Establish WebSocket connection when user is available
  useEffect(() => {
    if (!user?.id) return;

    const userIdString = user.id.toString();

    // Only connect if we haven't connected yet and we're not already connected
    if (!hasConnected.current && !isConnected()) {
      hasConnected.current = true;
      // No token needed - cookies are sent automatically
      connect(userIdString)
        .then(() => {
          // Fetch initial friends online status after connection
          return fetchFriendsOnlineStatus();
        })
        .catch(() => {
          // Reset the flag on error so we can try again if needed
          hasConnected.current = false;
        });
    }

    // Cleanup on unmount
    return () => {
      hasConnected.current = false;
      disconnect();
    };
  }, [user?.id, connect, disconnect, isConnected, fetchFriendsOnlineStatus]);

  return <Outlet />;
}

// Memoize the component to prevent unnecessary re-renders
export default memo(MessagesWebSocketProvider);
