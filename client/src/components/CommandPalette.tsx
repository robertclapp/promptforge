import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  Search, FileText, Settings, Zap, Package, Store, Users, 
  Shield, BarChart3, Key, Bell, Calendar, Database, ArrowRight
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  category: string;
  keywords?: string[];
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Fetch prompts for search
  const { data: prompts } = trpc.prompts.list.useQuery({ limit: 10 }, {
    enabled: open
  });

  // Define static commands
  const staticCommands: CommandItem[] = useMemo(() => [
    // Navigation
    { id: "nav-dashboard", title: "Go to Dashboard", icon: BarChart3, action: () => navigate("/"), category: "Navigation", keywords: ["home", "main"] },
    { id: "nav-prompts", title: "Go to Prompts", icon: FileText, action: () => navigate("/prompts"), category: "Navigation", keywords: ["templates"] },
    { id: "nav-evaluations", title: "Go to Evaluations", icon: Zap, action: () => navigate("/evaluations"), category: "Navigation", keywords: ["tests", "compare"] },
    { id: "nav-providers", title: "Go to AI Providers", icon: Settings, action: () => navigate("/providers"), category: "Navigation", keywords: ["openai", "anthropic", "api"] },
    { id: "nav-packages", title: "Go to Context Packages", icon: Package, action: () => navigate("/context-packages"), category: "Navigation", keywords: ["context"] },
    { id: "nav-marketplace", title: "Go to Marketplace", icon: Store, action: () => navigate("/marketplace"), category: "Navigation", keywords: ["templates", "community"] },
    { id: "nav-teams", title: "Go to Teams", icon: Users, action: () => navigate("/teams"), category: "Navigation", keywords: ["members", "invite"] },
    { id: "nav-api-keys", title: "Go to API Keys", icon: Key, action: () => navigate("/api-keys"), category: "Navigation", keywords: ["tokens"] },
    
    // Create
    { id: "create-prompt", title: "Create New Prompt", icon: FileText, action: () => navigate("/prompts/new"), category: "Create", keywords: ["new", "add"] },
    { id: "create-evaluation", title: "Create New Evaluation", icon: Zap, action: () => navigate("/evaluations/new"), category: "Create", keywords: ["new", "test"] },
    { id: "create-provider", title: "Add AI Provider", icon: Settings, action: () => navigate("/providers/new"), category: "Create", keywords: ["new", "connect"] },
    { id: "create-package", title: "Create Context Package", icon: Package, action: () => navigate("/context-packages/new"), category: "Create", keywords: ["new"] },
    
    // Security
    { id: "security-2fa", title: "Two-Factor Authentication", icon: Shield, action: () => navigate("/security/2fa"), category: "Security", keywords: ["totp", "authenticator"] },
    { id: "security-sessions", title: "Active Sessions", icon: Users, action: () => navigate("/security/sessions"), category: "Security", keywords: ["devices", "logout"] },
    { id: "security-audit", title: "Audit Logs", icon: Database, action: () => navigate("/audit-logs"), category: "Security", keywords: ["history", "activity"] },
    
    // Settings
    { id: "settings-notifications", title: "Notification Settings", icon: Bell, action: () => navigate("/notifications"), category: "Settings", keywords: ["alerts"] },
    { id: "settings-reports", title: "Scheduled Reports", icon: Calendar, action: () => navigate("/scheduled-reports"), category: "Settings", keywords: ["email", "weekly"] },
  ], [navigate]);

  // Dynamic prompt commands
  const promptCommands: CommandItem[] = useMemo(() => {
    if (!prompts) return [];
    return prompts.slice(0, 5).map(prompt => ({
      id: `prompt-${prompt.id}`,
      title: prompt.name,
      description: prompt.description || "Open prompt",
      icon: FileText,
      action: () => navigate(`/prompts/${prompt.id}`),
      category: "Recent Prompts",
      keywords: prompt.tags || []
    }));
  }, [prompts, navigate]);

  // All commands
  const allCommands = useMemo(() => [...staticCommands, ...promptCommands], [staticCommands, promptCommands]);

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search.trim()) {
      return allCommands;
    }
    const searchLower = search.toLowerCase();
    return allCommands.filter(cmd => {
      const titleMatch = cmd.title.toLowerCase().includes(searchLower);
      const descMatch = cmd.description?.toLowerCase().includes(searchLower);
      const keywordMatch = cmd.keywords?.some(k => k.toLowerCase().includes(searchLower));
      const categoryMatch = cmd.category.toLowerCase().includes(searchLower);
      return titleMatch || descMatch || keywordMatch || categoryMatch;
    });
  }, [allCommands, search]);

  // Group filtered commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onOpenChange(false);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filteredCommands, selectedIndex, onOpenChange]);

  let currentIndex = 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Search commands, prompts, settings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12"
            autoFocus
          />
          <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No results found for "{search}"</p>
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, commands]) => (
              <div key={category} className="mb-2">
                <div className="px-4 py-1.5 text-xs font-semibold text-muted-foreground">
                  {category}
                </div>
                {commands.map((cmd) => {
                  const itemIndex = currentIndex++;
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors ${
                        selectedIndex === itemIndex ? "bg-muted" : ""
                      }`}
                      onClick={() => {
                        cmd.action();
                        onOpenChange(false);
                      }}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{cmd.title}</div>
                        {cmd.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {cmd.description}
                          </div>
                        )}
                      </div>
                      {selectedIndex === itemIndex && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 font-mono bg-muted rounded border">↑</kbd>
              <kbd className="px-1.5 py-0.5 font-mono bg-muted rounded border">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 font-mono bg-muted rounded border">↵</kbd>
              to select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 font-mono bg-muted rounded border">⌘K</kbd>
            to open
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
