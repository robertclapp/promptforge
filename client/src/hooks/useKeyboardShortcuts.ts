import { useEffect, useCallback, useState } from "react";
import { useLocation } from "wouter";

export interface KeyboardShortcut {
  key: string;
  modifiers: ("ctrl" | "meta" | "shift" | "alt")[];
  description: string;
  action: () => void;
  category: string;
  enabled?: boolean;
}

// Check if user is on Mac
const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

// Format modifier for display
export function formatModifier(modifier: string): string {
  if (isMac) {
    switch (modifier) {
      case "ctrl": return "⌃";
      case "meta": return "⌘";
      case "shift": return "⇧";
      case "alt": return "⌥";
      default: return modifier;
    }
  }
  switch (modifier) {
    case "ctrl": return "Ctrl";
    case "meta": return "Ctrl";
    case "shift": return "Shift";
    case "alt": return "Alt";
    default: return modifier;
  }
}

// Format full shortcut for display
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const modifiers = shortcut.modifiers.map(formatModifier).join(isMac ? "" : "+");
  const key = shortcut.key.toUpperCase();
  return isMac ? `${modifiers}${key}` : `${modifiers}+${key}`;
}

export function useKeyboardShortcuts() {
  const [, navigate] = useLocation();
  const [showHelp, setShowHelp] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Define all shortcuts
  const shortcuts: KeyboardShortcut[] = [
    // Navigation shortcuts
    {
      key: "k",
      modifiers: isMac ? ["meta"] : ["ctrl"],
      description: "Open search",
      action: () => setShowSearch(true),
      category: "Navigation"
    },
    {
      key: "h",
      modifiers: isMac ? ["meta", "shift"] : ["ctrl", "shift"],
      description: "Go to Dashboard",
      action: () => navigate("/"),
      category: "Navigation"
    },
    {
      key: "p",
      modifiers: isMac ? ["meta", "shift"] : ["ctrl", "shift"],
      description: "Go to Prompts",
      action: () => navigate("/prompts"),
      category: "Navigation"
    },
    {
      key: "e",
      modifiers: isMac ? ["meta", "shift"] : ["ctrl", "shift"],
      description: "Go to Evaluations",
      action: () => navigate("/evaluations"),
      category: "Navigation"
    },
    {
      key: "m",
      modifiers: isMac ? ["meta", "shift"] : ["ctrl", "shift"],
      description: "Go to Marketplace",
      action: () => navigate("/marketplace"),
      category: "Navigation"
    },
    
    // Creation shortcuts
    {
      key: "n",
      modifiers: isMac ? ["meta"] : ["ctrl"],
      description: "Create new prompt",
      action: () => navigate("/prompts/new"),
      category: "Create"
    },
    {
      key: "j",
      modifiers: isMac ? ["meta"] : ["ctrl"],
      description: "New evaluation",
      action: () => navigate("/evaluations/new"),
      category: "Create"
    },
    
    // UI shortcuts
    {
      key: "/",
      modifiers: [],
      description: "Show keyboard shortcuts",
      action: () => setShowHelp(prev => !prev),
      category: "Help"
    },
    {
      key: "Escape",
      modifiers: [],
      description: "Close dialogs",
      action: () => {
        setShowHelp(false);
        setShowSearch(false);
      },
      category: "Help"
    },
    {
      key: "d",
      modifiers: isMac ? ["meta", "shift"] : ["ctrl", "shift"],
      description: "Toggle dark mode",
      action: () => {
        const event = new CustomEvent('toggle-theme');
        window.dispatchEvent(event);
      },
      category: "UI"
    },
    
    // Export shortcuts
    {
      key: "i",
      modifiers: isMac ? ["meta", "shift"] : ["ctrl", "shift"],
      description: "Go to Import/Export",
      action: () => navigate("/import-export"),
      category: "Navigation"
    },
    {
      key: "a",
      modifiers: isMac ? ["meta", "shift"] : ["ctrl", "shift"],
      description: "Go to Export Analytics",
      action: () => navigate("/export-analytics"),
      category: "Navigation"
    },
    {
      key: "s",
      modifiers: isMac ? ["meta", "shift"] : ["ctrl", "shift"],
      description: "Go to Export Settings",
      action: () => navigate("/export-settings"),
      category: "Navigation"
    }
  ];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      // Allow Escape to work in inputs
      if (event.key !== "Escape") {
        return;
      }
    }

    for (const shortcut of shortcuts) {
      if (!shortcut.enabled && shortcut.enabled !== undefined) continue;

      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      
      const ctrlMatch = shortcut.modifiers.includes("ctrl") 
        ? (isMac ? event.ctrlKey : event.ctrlKey || event.metaKey)
        : !event.ctrlKey;
      
      const metaMatch = shortcut.modifiers.includes("meta")
        ? (isMac ? event.metaKey : event.ctrlKey || event.metaKey)
        : (isMac ? !event.metaKey : true);
      
      const shiftMatch = shortcut.modifiers.includes("shift") === event.shiftKey;
      const altMatch = shortcut.modifiers.includes("alt") === event.altKey;

      // Special handling for "/" key (no modifiers)
      if (shortcut.key === "/" && shortcut.modifiers.length === 0) {
        if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
          event.preventDefault();
          shortcut.action();
          return;
        }
        continue;
      }

      // Special handling for Escape
      if (shortcut.key === "Escape" && event.key === "Escape") {
        shortcut.action();
        return;
      }

      if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
        event.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return {
    shortcuts,
    showHelp,
    setShowHelp,
    showSearch,
    setShowSearch
  };
}

// Group shortcuts by category
export function groupShortcutsByCategory(shortcuts: KeyboardShortcut[]): Record<string, KeyboardShortcut[]> {
  return shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);
}
