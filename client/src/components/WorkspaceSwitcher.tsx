import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, Users, Plus } from "lucide-react";
import { useLocation } from "wouter";

export function WorkspaceSwitcher() {
  const { activeTeamId, setActiveTeamId, teams, isLoading } = useWorkspace();
  const [, setLocation] = useLocation();

  const activeTeam = teams.find((t) => t.id === activeTeamId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>Loading...</span>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setLocation("/teams")}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Create Team
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          <span className="max-w-[150px] truncate">
            {activeTeam?.name || "Select Workspace"}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Switch Workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {teams.map((team) => (
          <DropdownMenuItem
            key={team.id}
            onClick={() => {
              setActiveTeamId(team.id);
              // Reload the page to refresh all queries with new workspace
              window.location.reload();
            }}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <span className="font-medium">{team.name}</span>
                <span className="text-xs text-muted-foreground capitalize">
                  {team.role}
                </span>
              </div>
              {team.id === activeTeamId && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setLocation("/teams")}
          className="cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2" />
          Manage Teams
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
