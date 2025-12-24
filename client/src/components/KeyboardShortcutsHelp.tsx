import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Keyboard } from "lucide-react";
import { 
  useKeyboardShortcuts, 
  formatShortcut, 
  groupShortcutsByCategory,
  type KeyboardShortcut 
} from "@/hooks/useKeyboardShortcuts";

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts: KeyboardShortcut[];
}

export function KeyboardShortcutsHelp({ open, onOpenChange, shortcuts }: KeyboardShortcutsHelpProps) {
  const groupedShortcuts = groupShortcutsByCategory(shortcuts);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </div>
          <DialogDescription>
            Use these shortcuts to navigate and perform actions quickly
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border border-border">
                      {formatShortcut(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded border">/</kbd> anytime to toggle this help
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compact shortcut hint component for UI elements
interface ShortcutHintProps {
  shortcut: string;
  className?: string;
}

export function ShortcutHint({ shortcut, className = "" }: ShortcutHintProps) {
  return (
    <kbd className={`ml-auto px-1.5 py-0.5 text-[10px] font-mono bg-muted/50 rounded border border-border/50 text-muted-foreground ${className}`}>
      {shortcut}
    </kbd>
  );
}
