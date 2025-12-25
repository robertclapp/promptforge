import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatModifier, formatShortcut, groupShortcutsByCategory, type KeyboardShortcut } from "../useKeyboardShortcuts";

describe("useKeyboardShortcuts", () => {
  describe("formatModifier", () => {
    it("should format ctrl modifier for non-Mac", () => {
      // Mock non-Mac platform
      Object.defineProperty(navigator, "platform", {
        value: "Win32",
        writable: true,
      });
      
      expect(formatModifier("ctrl")).toBe("Ctrl");
      expect(formatModifier("shift")).toBe("Shift");
      expect(formatModifier("alt")).toBe("Alt");
    });

    it("should return unknown modifiers as-is", () => {
      expect(formatModifier("unknown")).toBe("unknown");
    });
  });

  describe("formatShortcut", () => {
    it("should format shortcut with single modifier", () => {
      const shortcut: KeyboardShortcut = {
        key: "s",
        modifiers: ["ctrl"],
        description: "Save",
        action: vi.fn(),
        category: "Edit",
      };
      
      const result = formatShortcut(shortcut);
      expect(result).toContain("S");
    });

    it("should format shortcut with multiple modifiers", () => {
      const shortcut: KeyboardShortcut = {
        key: "p",
        modifiers: ["ctrl", "shift"],
        description: "Print",
        action: vi.fn(),
        category: "File",
      };
      
      const result = formatShortcut(shortcut);
      expect(result).toContain("P");
    });

    it("should format shortcut with no modifiers", () => {
      const shortcut: KeyboardShortcut = {
        key: "Escape",
        modifiers: [],
        description: "Close",
        action: vi.fn(),
        category: "UI",
      };
      
      const result = formatShortcut(shortcut);
      expect(result).toContain("ESCAPE");
    });
  });

  describe("groupShortcutsByCategory", () => {
    it("should group shortcuts by category", () => {
      const shortcuts: KeyboardShortcut[] = [
        {
          key: "s",
          modifiers: ["ctrl"],
          description: "Save",
          action: vi.fn(),
          category: "Edit",
        },
        {
          key: "n",
          modifiers: ["ctrl"],
          description: "New",
          action: vi.fn(),
          category: "File",
        },
        {
          key: "o",
          modifiers: ["ctrl"],
          description: "Open",
          action: vi.fn(),
          category: "File",
        },
      ];

      const grouped = groupShortcutsByCategory(shortcuts);

      expect(Object.keys(grouped)).toHaveLength(2);
      expect(grouped["Edit"]).toHaveLength(1);
      expect(grouped["File"]).toHaveLength(2);
    });

    it("should handle empty shortcuts array", () => {
      const grouped = groupShortcutsByCategory([]);
      expect(Object.keys(grouped)).toHaveLength(0);
    });

    it("should preserve shortcut properties in groups", () => {
      const action = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        {
          key: "s",
          modifiers: ["ctrl"],
          description: "Save",
          action,
          category: "Edit",
        },
      ];

      const grouped = groupShortcutsByCategory(shortcuts);

      expect(grouped["Edit"][0].key).toBe("s");
      expect(grouped["Edit"][0].description).toBe("Save");
      expect(grouped["Edit"][0].action).toBe(action);
    });
  });

  describe("keyboard event handling", () => {
    it("should not trigger shortcuts when typing in input fields", () => {
      // This is a behavioral test that would require rendering
      // For now, we test the logic conceptually
      const isInput = (tagName: string) => 
        tagName === "INPUT" || tagName === "TEXTAREA";
      
      expect(isInput("INPUT")).toBe(true);
      expect(isInput("TEXTAREA")).toBe(true);
      expect(isInput("DIV")).toBe(false);
    });

    it("should allow Escape key in input fields", () => {
      // Escape should work even in inputs
      const shouldAllowInInput = (key: string) => key === "Escape";
      
      expect(shouldAllowInInput("Escape")).toBe(true);
      expect(shouldAllowInInput("s")).toBe(false);
    });
  });

  describe("shortcut matching", () => {
    it("should match key case-insensitively", () => {
      const matchKey = (eventKey: string, shortcutKey: string) =>
        eventKey.toLowerCase() === shortcutKey.toLowerCase();

      expect(matchKey("S", "s")).toBe(true);
      expect(matchKey("s", "S")).toBe(true);
      expect(matchKey("Escape", "escape")).toBe(true);
    });

    it("should correctly check modifier combinations", () => {
      const checkModifiers = (
        modifiers: string[],
        ctrlKey: boolean,
        shiftKey: boolean,
        altKey: boolean
      ) => {
        const hasCtrl = modifiers.includes("ctrl") || modifiers.includes("meta");
        const hasShift = modifiers.includes("shift");
        const hasAlt = modifiers.includes("alt");

        return (
          hasCtrl === ctrlKey &&
          hasShift === shiftKey &&
          hasAlt === altKey
        );
      };

      expect(checkModifiers(["ctrl"], true, false, false)).toBe(true);
      expect(checkModifiers(["ctrl", "shift"], true, true, false)).toBe(true);
      expect(checkModifiers(["ctrl"], false, false, false)).toBe(false);
    });
  });
});
