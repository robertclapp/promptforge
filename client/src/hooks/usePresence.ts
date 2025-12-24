/**
 * usePresence Hook
 * Manages real-time presence for collaborative editing
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

interface UserPresence {
  id: string;
  sessionId: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  cursor?: {
    line: number;
    column: number;
  };
  selection?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  lastActivity: Date;
}

interface UsePresenceOptions {
  documentType: "prompt" | "evaluation" | "context_package";
  documentId: string;
  enabled?: boolean;
}

export function usePresence({ documentType, documentId, enabled = true }: UsePresenceOptions) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [myPresence, setMyPresence] = useState<UserPresence | null>(null);
  const [otherUsers, setOtherUsers] = useState<UserPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  const utils = trpc.useUtils();

  // Join mutation
  const joinMutation = trpc.presence.join.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setMyPresence(data.presence);
      setOtherUsers(data.otherUsers);
      setIsConnected(true);
    }
  });

  // Leave mutation
  const leaveMutation = trpc.presence.leave.useMutation();

  // Update cursor mutation
  const updateCursorMutation = trpc.presence.updateCursor.useMutation();

  // Update selection mutation
  const updateSelectionMutation = trpc.presence.updateSelection.useMutation();

  // Heartbeat mutation
  const heartbeatMutation = trpc.presence.heartbeat.useMutation();

  // Get document users query
  const { data: documentUsers, refetch: refetchUsers } = trpc.presence.getDocumentUsers.useQuery(
    { documentType, documentId },
    { 
      enabled: enabled && isConnected,
      refetchInterval: false // We'll manually refetch
    }
  );

  // Join on mount
  useEffect(() => {
    if (!enabled || !documentId) return;

    joinMutation.mutate({ documentType, documentId });

    return () => {
      // Leave on unmount
      if (sessionId) {
        leaveMutation.mutate({ documentType, documentId, sessionId });
      }
    };
  }, [enabled, documentType, documentId]);

  // Start heartbeat and polling when connected
  useEffect(() => {
    if (!isConnected || !sessionId) return;

    // Heartbeat every 10 seconds
    heartbeatInterval.current = setInterval(() => {
      heartbeatMutation.mutate({ documentType, documentId, sessionId });
    }, 10000);

    // Poll for other users every 2 seconds
    pollInterval.current = setInterval(() => {
      refetchUsers();
    }, 2000);

    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [isConnected, sessionId, documentType, documentId]);

  // Update other users when document users change
  useEffect(() => {
    if (documentUsers && sessionId) {
      setOtherUsers(documentUsers.filter(u => u.sessionId !== sessionId));
    }
  }, [documentUsers, sessionId]);

  // Update cursor position
  const updateCursor = useCallback((cursor: { line: number; column: number }) => {
    if (!sessionId || !isConnected) return;
    updateCursorMutation.mutate({
      documentType,
      documentId,
      sessionId,
      cursor
    });
  }, [sessionId, isConnected, documentType, documentId]);

  // Update selection
  const updateSelection = useCallback((
    selection: { start: { line: number; column: number }; end: { line: number; column: number } } | null
  ) => {
    if (!sessionId || !isConnected) return;
    updateSelectionMutation.mutate({
      documentType,
      documentId,
      sessionId,
      selection
    });
  }, [sessionId, isConnected, documentType, documentId]);

  // Leave document
  const leave = useCallback(() => {
    if (!sessionId) return;
    leaveMutation.mutate({ documentType, documentId, sessionId });
    setIsConnected(false);
    setSessionId(null);
    setMyPresence(null);
    setOtherUsers([]);
  }, [sessionId, documentType, documentId]);

  return {
    sessionId,
    myPresence,
    otherUsers,
    isConnected,
    updateCursor,
    updateSelection,
    leave,
    totalUsers: otherUsers.length + (myPresence ? 1 : 0)
  };
}

export type { UserPresence };
