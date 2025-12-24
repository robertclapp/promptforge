/**
 * Presence Service
 * Manages real-time user presence for collaborative editing
 */

import { v4 as uuidv4 } from "uuid";

// In-memory presence store (in production, use Redis)
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

interface DocumentPresence {
  documentId: string;
  documentType: "prompt" | "evaluation" | "context_package";
  users: Map<string, UserPresence>;
}

// Store presence by document
const presenceStore = new Map<string, DocumentPresence>();

// User colors for presence indicators
const PRESENCE_COLORS = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Blue
  "#96CEB4", // Green
  "#FFEAA7", // Yellow
  "#DDA0DD", // Plum
  "#98D8C8", // Mint
  "#F7DC6F", // Gold
  "#BB8FCE", // Purple
  "#85C1E9", // Sky Blue
];

function getRandomColor(): string {
  return PRESENCE_COLORS[Math.floor(Math.random() * PRESENCE_COLORS.length)];
}

function getDocumentKey(documentType: string, documentId: string): string {
  return `${documentType}:${documentId}`;
}

export const presenceService = {
  /**
   * Join a document for collaborative editing
   */
  join(
    documentType: "prompt" | "evaluation" | "context_package",
    documentId: string,
    user: { id: string; name: string; email: string; avatar?: string }
  ): { sessionId: string; presence: UserPresence; otherUsers: UserPresence[] } {
    const key = getDocumentKey(documentType, documentId);
    const sessionId = uuidv4();
    
    // Get or create document presence
    let docPresence = presenceStore.get(key);
    if (!docPresence) {
      docPresence = {
        documentId,
        documentType,
        users: new Map()
      };
      presenceStore.set(key, docPresence);
    }

    // Create user presence
    const presence: UserPresence = {
      id: user.id,
      sessionId,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      color: getRandomColor(),
      lastActivity: new Date()
    };

    // Add user to document
    docPresence.users.set(sessionId, presence);

    // Get other users
    const otherUsers = Array.from(docPresence.users.values())
      .filter(u => u.sessionId !== sessionId);

    return { sessionId, presence, otherUsers };
  },

  /**
   * Leave a document
   */
  leave(
    documentType: "prompt" | "evaluation" | "context_package",
    documentId: string,
    sessionId: string
  ): { removedUser?: UserPresence; remainingUsers: UserPresence[] } {
    const key = getDocumentKey(documentType, documentId);
    const docPresence = presenceStore.get(key);
    
    if (!docPresence) {
      return { remainingUsers: [] };
    }

    const removedUser = docPresence.users.get(sessionId);
    docPresence.users.delete(sessionId);

    // Clean up empty documents
    if (docPresence.users.size === 0) {
      presenceStore.delete(key);
    }

    const remainingUsers = Array.from(docPresence.users.values());
    return { removedUser, remainingUsers };
  },

  /**
   * Update cursor position
   */
  updateCursor(
    documentType: "prompt" | "evaluation" | "context_package",
    documentId: string,
    sessionId: string,
    cursor: { line: number; column: number }
  ): UserPresence | null {
    const key = getDocumentKey(documentType, documentId);
    const docPresence = presenceStore.get(key);
    
    if (!docPresence) return null;

    const presence = docPresence.users.get(sessionId);
    if (!presence) return null;

    presence.cursor = cursor;
    presence.lastActivity = new Date();
    
    return presence;
  },

  /**
   * Update selection range
   */
  updateSelection(
    documentType: "prompt" | "evaluation" | "context_package",
    documentId: string,
    sessionId: string,
    selection: { start: { line: number; column: number }; end: { line: number; column: number } } | null
  ): UserPresence | null {
    const key = getDocumentKey(documentType, documentId);
    const docPresence = presenceStore.get(key);
    
    if (!docPresence) return null;

    const presence = docPresence.users.get(sessionId);
    if (!presence) return null;

    presence.selection = selection || undefined;
    presence.lastActivity = new Date();
    
    return presence;
  },

  /**
   * Get all users in a document
   */
  getDocumentUsers(
    documentType: "prompt" | "evaluation" | "context_package",
    documentId: string
  ): UserPresence[] {
    const key = getDocumentKey(documentType, documentId);
    const docPresence = presenceStore.get(key);
    
    if (!docPresence) return [];

    return Array.from(docPresence.users.values());
  },

  /**
   * Heartbeat to keep presence alive
   */
  heartbeat(
    documentType: "prompt" | "evaluation" | "context_package",
    documentId: string,
    sessionId: string
  ): boolean {
    const key = getDocumentKey(documentType, documentId);
    const docPresence = presenceStore.get(key);
    
    if (!docPresence) return false;

    const presence = docPresence.users.get(sessionId);
    if (!presence) return false;

    presence.lastActivity = new Date();
    return true;
  },

  /**
   * Clean up stale presence entries (older than 30 seconds)
   */
  cleanupStale(): number {
    const staleThreshold = new Date(Date.now() - 30000);
    let cleanedCount = 0;

    Array.from(presenceStore.entries()).forEach(([key, docPresence]) => {
      Array.from(docPresence.users.entries()).forEach(([sessionId, presence]) => {
        if (presence.lastActivity < staleThreshold) {
          docPresence.users.delete(sessionId);
          cleanedCount++;
        }
      });

      // Remove empty documents
      if (docPresence.users.size === 0) {
        presenceStore.delete(key);
      }
    });

    return cleanedCount;
  },

  /**
   * Get presence statistics
   */
  getStats(): {
    totalDocuments: number;
    totalUsers: number;
    documentBreakdown: { documentType: string; count: number }[];
  } {
    let totalUsers = 0;
    const typeCount: Record<string, number> = {};

    Array.from(presenceStore.values()).forEach((docPresence) => {
      totalUsers += docPresence.users.size;
      typeCount[docPresence.documentType] = (typeCount[docPresence.documentType] || 0) + 1;
    });

    return {
      totalDocuments: presenceStore.size,
      totalUsers,
      documentBreakdown: Object.entries(typeCount).map(([documentType, count]) => ({
        documentType,
        count
      }))
    };
  }
};

// Run cleanup every 10 seconds
setInterval(() => {
  presenceService.cleanupStale();
}, 10000);

export type { UserPresence, DocumentPresence };
