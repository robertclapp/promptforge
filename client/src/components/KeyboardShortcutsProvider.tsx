import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";
import { CommandPalette } from "./CommandPalette";

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const { shortcuts, showHelp, setShowHelp, showSearch, setShowSearch } = useKeyboardShortcuts();

  return (
    <>
      {children}
      <KeyboardShortcutsHelp 
        open={showHelp} 
        onOpenChange={setShowHelp}
        shortcuts={shortcuts}
      />
      <CommandPalette 
        open={showSearch} 
        onOpenChange={setShowSearch}
      />
    </>
  );
}
