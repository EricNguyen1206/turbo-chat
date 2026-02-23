/**
 * WebSocket Provider for Messages
 * 
 * Establishes WebSocket connection using httpOnly cookie authentication.
 * No need to pass tokens - cookies are sent automatically.
 */

import { memo, useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { useSocketStore } from "@/store/useSocketStore";
import { useCurrentUserQuery } from "@/services/api/users";

function MessagesWebSocketProvider() {
  const { connect, disconnect, isConnected } = useSocketStore();
  const { data: user } = useCurrentUserQuery();
  const hasConnected = useRef(false);


  // Establish WebSocket connection when user is available
  useEffect(() => {
    if (!user?.id) return;

    const userIdString = user.id.toString();

    // Only connect if we haven't connected yet and we're not already connected
    if (!hasConnected.current && !isConnected()) {
      hasConnected.current = true;
      // No token needed - cookies are sent automatically
      connect(userIdString)
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
  }, [user?.id, connect, disconnect, isConnected]);

  return <Outlet />;
}

// Memoize the component to prevent unnecessary re-renders
export default memo(MessagesWebSocketProvider);
