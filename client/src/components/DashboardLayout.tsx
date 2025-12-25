import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { 
  LayoutDashboard, LogOut, PanelLeft, FileText, Package, Zap, BarChart3, 
  Settings, Sparkles, DollarSign, TestTube2, KeyRound, Store, Users, 
  TrendingUp, CreditCard, Shield, Settings2, Bell, Smartphone, Globe, 
  ClipboardCheck, Monitor, Lock, Activity, Download, Webhook, ChevronDown,
  Search, Home, Calendar, Mail, Sun, Moon, GitCompare
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";

// Organize menu items into categories for better mobile navigation
const menuCategories = [
  {
    name: "Main",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
      { icon: Sparkles, label: "Playground", path: "/playground" },
      { icon: FileText, label: "Prompts", path: "/prompts" },
      { icon: Store, label: "Marketplace", path: "/marketplace" },
      { icon: FileText, label: "Templates", path: "/templates" },
      { icon: Package, label: "Collections", path: "/collections" },
      { icon: Download, label: "Import/Export", path: "/import-export" },
    ]
  },
  {
    name: "Development",
    items: [
      { icon: Package, label: "Context Packages", path: "/context-packages" },
      { icon: Zap, label: "Evaluations", path: "/evaluations" },
      { icon: TestTube2, label: "Regression Testing", path: "/regression-testing" },
    ]
  },
  {
    name: "Analytics",
    items: [
      { icon: BarChart3, label: "Analytics", path: "/analytics" },
      { icon: TrendingUp, label: "Workspace Analytics", path: "/workspace-analytics" },
      { icon: Activity, label: "API Dashboard", path: "/api-dashboard" },
      { icon: Zap, label: "Performance", path: "/performance" },
      { icon: BarChart3, label: "Export Analytics", path: "/export-analytics" },
    ]
  },
  {
    name: "Settings",
    items: [
      { icon: Settings, label: "AI Providers", path: "/providers" },
      { icon: DollarSign, label: "Budgets", path: "/budgets" },
      { icon: KeyRound, label: "API Keys", path: "/api-keys" },
      { icon: Webhook, label: "Webhooks", path: "/webhooks" },
      { icon: Calendar, label: "Scheduled Reports", path: "/scheduled-reports" },
      { icon: Shield, label: "Export Management", path: "/export-management" },
      { icon: Settings2, label: "Export Settings", path: "/export-settings" },
      { icon: GitCompare, label: "Version Compare", path: "/export-diff" },
    ]
  },
  {
    name: "Team",
    items: [
      { icon: Users, label: "Teams", path: "/teams" },
      { icon: CreditCard, label: "Workspace Billing", path: "/workspace-billing" },
      { icon: Settings2, label: "Workspace Permissions", path: "/workspace-permissions" },
    ]
  },
  {
    name: "Security",
    items: [
      { icon: Shield, label: "Audit Logs", path: "/audit-logs" },
      { icon: Bell, label: "Security Settings", path: "/security-settings" },
      { icon: Smartphone, label: "Two-Factor Auth", path: "/two-factor" },
      { icon: Globe, label: "IP Allowlist", path: "/ip-allowlist" },
      { icon: ClipboardCheck, label: "Compliance Reports", path: "/compliance-reports" },
      { icon: Monitor, label: "Sessions", path: "/sessions" },
      { icon: Lock, label: "Password Policy", path: "/password-policy" },
      { icon: Shield, label: "Login Activity", path: "/login-activity" },
      { icon: Download, label: "Data Portability", path: "/data-portability" },
    ]
  },
];

// Flatten for sidebar
const menuItems = menuCategories.flatMap(cat => cat.items);

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="flex flex-col items-center gap-6 md:gap-8 p-6 md:p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4 md:gap-6">
            <div className="relative group">
              <div className="relative">
                <img
                  src={APP_LOGO}
                  alt={APP_TITLE}
                  className="h-16 w-16 md:h-20 md:w-20 rounded-xl object-cover shadow"
                />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">{APP_TITLE}</h1>
              <p className="text-sm text-muted-foreground">
                Please sign in to continue
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all min-h-[48px]"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter menu items based on search
  const filteredCategories = menuCategories.map(cat => ({
    ...cat,
    items: cat.items.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0);

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 pl-2 group-data-[collapsible=icon]:px-0 transition-all w-full">
              {isCollapsed ? (
                <div className="relative h-8 w-8 shrink-0 group">
                  <img
                    src={APP_LOGO}
                    className="h-8 w-8 rounded-md object-cover ring-1 ring-border"
                    alt="Logo"
                  />
                  <button
                    onClick={toggleSidebar}
                    className="absolute inset-0 flex items-center justify-center bg-accent rounded-md ring-1 ring-border opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <PanelLeft className="h-4 w-4 text-foreground" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={APP_LOGO}
                      className="h-8 w-8 rounded-md object-cover ring-1 ring-border shrink-0"
                      alt="Logo"
                    />
                    <span className="font-semibold tracking-tight truncate">
                      {APP_TITLE}
                    </span>
                  </div>
                  <button
                    onClick={toggleSidebar}
                    className="ml-auto h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                  >
                    <PanelLeft className="h-4 w-4 text-muted-foreground" />
                  </button>
                </>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            {/* Search - only show when not collapsed */}
            {!isCollapsed && (
              <div className="px-3 py-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search menu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>
            )}

            <ScrollArea className="flex-1">
              <SidebarMenu className="px-2 py-1">
                {searchQuery ? (
                  // Show filtered results
                  filteredCategories.map(category => (
                    <div key={category.name}>
                      {!isCollapsed && (
                        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {category.name}
                        </div>
                      )}
                      {category.items.map(item => {
                        const isActive = location === item.path;
                        return (
                          <SidebarMenuItem key={item.path}>
                            <SidebarMenuButton
                              isActive={isActive}
                              onClick={() => {
                                setLocation(item.path);
                                setSearchQuery("");
                              }}
                              tooltip={item.label}
                              className="h-10 transition-all font-normal"
                            >
                              <item.icon
                                className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                              />
                              <span>{item.label}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </div>
                  ))
                ) : (
                  // Show all items
                  menuItems.map(item => {
                    const isActive = location === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className={`h-10 transition-all font-normal`}
                        >
                          <item.icon
                            className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                          />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })
                )}
              </SidebarMenu>
            </ScrollArea>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Preferences</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => {
                    const event = new CustomEvent('toggle-theme');
                    window.dispatchEvent(event);
                  }}
                  className="cursor-pointer"
                >
                  <Sun className="mr-2 h-4 w-4 dark:hidden" />
                  <Moon className="mr-2 h-4 w-4 hidden dark:block" />
                  <span>Toggle Theme</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-10 w-10 rounded-lg bg-background touch-target" />
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate max-w-[150px]">
                  {activeMenuItem?.label ?? APP_TITLE}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <WorkspaceSwitcher />
              <NotificationBell />
            </div>
          </div>
        )}
        <main className="flex-1 p-3 md:p-4 lg:p-6 mobile-safe-bottom">{children}</main>
      </SidebarInset>
    </>
  );
}
