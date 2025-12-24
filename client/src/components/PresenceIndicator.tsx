/**
 * PresenceIndicator Component
 * Shows who else is viewing/editing a document
 */

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Users } from "lucide-react";
import type { UserPresence } from "@/hooks/usePresence";

interface PresenceIndicatorProps {
  users: UserPresence[];
  maxVisible?: number;
  showCount?: boolean;
  size?: "sm" | "md" | "lg";
}

export function PresenceIndicator({
  users,
  maxVisible = 3,
  showCount = true,
  size = "md"
}: PresenceIndicatorProps) {
  if (users.length === 0) return null;

  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = users.length - maxVisible;

  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base"
  };

  const avatarSize = sizeClasses[size];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {visibleUsers.map((user) => (
            <Tooltip key={user.sessionId}>
              <TooltipTrigger asChild>
                <Avatar
                  className={`${avatarSize} border-2 border-background cursor-pointer transition-transform hover:scale-110 hover:z-10`}
                  style={{ borderColor: user.color }}
                >
                  <AvatarFallback
                    style={{ backgroundColor: user.color + "20", color: user.color }}
                    className="font-medium"
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="flex flex-col gap-1">
                <span className="font-medium">{user.name}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
                {user.cursor && (
                  <span className="text-xs text-muted-foreground">
                    Line {user.cursor.line}, Col {user.cursor.column}
                  </span>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
          
          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className={`${avatarSize} border-2 border-background bg-muted cursor-pointer`}>
                  <AvatarFallback className="text-muted-foreground font-medium">
                    +{remainingCount}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="flex flex-col gap-1">
                  {users.slice(maxVisible).map((user) => (
                    <span key={user.sessionId} className="text-sm">
                      {user.name}
                    </span>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {showCount && (
          <Badge variant="secondary" className="gap-1 text-xs">
            <Users className="h-3 w-3" />
            {users.length} editing
          </Badge>
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * Cursor overlay for showing other users' cursors in an editor
 */
interface CursorOverlayProps {
  users: UserPresence[];
  editorElement?: HTMLElement | null;
  lineHeight?: number;
  charWidth?: number;
}

export function CursorOverlay({
  users,
  editorElement,
  lineHeight = 20,
  charWidth = 8
}: CursorOverlayProps) {
  if (!editorElement) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {users.map((user) => {
        if (!user.cursor) return null;

        const top = (user.cursor.line - 1) * lineHeight;
        const left = user.cursor.column * charWidth;

        return (
          <div key={user.sessionId}>
            {/* Cursor line */}
            <div
              className="absolute w-0.5 transition-all duration-75"
              style={{
                top: `${top}px`,
                left: `${left}px`,
                height: `${lineHeight}px`,
                backgroundColor: user.color
              }}
            />
            
            {/* Name label */}
            <div
              className="absolute text-xs px-1 py-0.5 rounded whitespace-nowrap transition-all duration-75"
              style={{
                top: `${top - 18}px`,
                left: `${left}px`,
                backgroundColor: user.color,
                color: "white"
              }}
            >
              {user.name}
            </div>

            {/* Selection highlight */}
            {user.selection && (
              <div
                className="absolute opacity-20 transition-all duration-75"
                style={{
                  top: `${(user.selection.start.line - 1) * lineHeight}px`,
                  left: `${user.selection.start.column * charWidth}px`,
                  width: `${(user.selection.end.column - user.selection.start.column) * charWidth}px`,
                  height: `${(user.selection.end.line - user.selection.start.line + 1) * lineHeight}px`,
                  backgroundColor: user.color
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Compact presence badge for list views
 */
interface PresenceBadgeProps {
  count: number;
  className?: string;
}

export function PresenceBadge({ count, className = "" }: PresenceBadgeProps) {
  if (count === 0) return null;

  return (
    <Badge 
      variant="outline" 
      className={`gap-1 text-xs bg-green-500/10 text-green-600 border-green-500/20 ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
      {count} active
    </Badge>
  );
}
