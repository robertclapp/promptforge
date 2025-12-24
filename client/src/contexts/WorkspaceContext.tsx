import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { trpc } from "@/lib/trpc";

interface WorkspaceContextType {
  activeTeamId: string | null;
  setActiveTeamId: (teamId: string | null) => void;
  teams: Array<{ id: string; name: string; role: string }>;
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(() => {
    // Load from localStorage on mount
    return localStorage.getItem("activeTeamId");
  });

  // Fetch user's teams
  const { data: teams = [], isLoading } = trpc.teams.list.useQuery();

  // Set active team to first team if none selected
  useEffect(() => {
    if (!isLoading && teams.length > 0 && !activeTeamId) {
      const firstTeamId = teams[0].id;
      setActiveTeamIdState(firstTeamId);
      localStorage.setItem("activeTeamId", firstTeamId);
    }
  }, [teams, isLoading, activeTeamId]);

  const setActiveTeamId = (teamId: string | null) => {
    setActiveTeamIdState(teamId);
    if (teamId) {
      localStorage.setItem("activeTeamId", teamId);
    } else {
      localStorage.removeItem("activeTeamId");
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        activeTeamId,
        setActiveTeamId,
        teams,
        isLoading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
