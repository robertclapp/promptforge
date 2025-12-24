import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Settings, Trash2, UserPlus, Crown, Shield, Eye } from "lucide-react";
import { toast } from "sonner";

export default function Teams() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [newTeam, setNewTeam] = useState({ name: "", slug: "", description: "" });
  const [inviteForm, setInviteForm] = useState({ email: "", role: "member" as "owner" | "admin" | "member" | "viewer" });

  // Fetch teams
  const { data: teams = [], refetch } = trpc.teams.list.useQuery();

  // Fetch members for selected team
  const { data: members = [] } = trpc.teams.members.useQuery(selectedTeam!, {
    enabled: !!selectedTeam,
  });

  // Create team mutation
  const createTeamMutation = trpc.teams.create.useMutation({
    onSuccess: () => {
      toast.success("Team created successfully");
      setCreateDialogOpen(false);
      setNewTeam({ name: "", slug: "", description: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create team: ${error.message}`);
    },
  });

  // Delete team mutation
  const deleteTeamMutation = trpc.teams.delete.useMutation({
    onSuccess: () => {
      toast.success("Team deleted successfully");
      setSelectedTeam(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete team: ${error.message}`);
    },
  });

  // Remove member mutation
  const removeMemberMutation = trpc.teams.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Member removed successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to remove member: ${error.message}`);
    },
  });

  // Invite member mutation
  const inviteMemberMutation = trpc.invitations.create.useMutation({
    onSuccess: () => {
      toast.success("Invitation sent successfully");
      setInviteDialogOpen(false);
      setInviteForm({ email: "", role: "member" });
    },
    onError: (error) => {
      toast.error(`Failed to send invitation: ${error.message}`);
    },
  });

  const handleCreateTeam = () => {
    if (!newTeam.name || !newTeam.slug) {
      toast.error("Name and slug are required");
      return;
    }

    createTeamMutation.mutate(newTeam);
  };

  const handleDeleteTeam = (teamId: string) => {
    if (confirm("Are you sure you want to delete this team?")) {
      deleteTeamMutation.mutate(teamId);
    }
  };

  const handleRemoveMember = (teamId: string, userId: string) => {
    if (confirm("Are you sure you want to remove this member?")) {
      removeMemberMutation.mutate({ teamId, userId });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case "admin":
        return <Shield className="h-4 w-4 text-blue-500" />;
      case "member":
        return <Users className="h-4 w-4 text-green-500" />;
      case "viewer":
        return <Eye className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      owner: "bg-yellow-100 text-yellow-800",
      admin: "bg-blue-100 text-blue-800",
      member: "bg-green-100 text-green-800",
      viewer: "bg-gray-100 text-gray-800",
    };
    return colors[role as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teams</h1>
          <p className="text-muted-foreground mt-1">
            Manage your team workspaces and members
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </Button>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team: any) => (
          <Card key={team.id} className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                </div>
                <Badge className={getRoleBadge(team.role)}>
                  <div className="flex items-center gap-1">
                    {getRoleIcon(team.role)}
                    <span className="capitalize">{team.role}</span>
                  </div>
                </Badge>
              </div>
              <CardDescription>{team.description || "No description"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Slug:</span> {team.slug}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTeam(team.id);
                      setInviteDialogOpen(true);
                    }}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTeam(team.id)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  {team.role === "owner" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTeam(team.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {teams.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first team to start collaborating
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Team Members Dialog */}
      {selectedTeam && (
        <Dialog open={!!selectedTeam} onOpenChange={() => setSelectedTeam(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Team Members</DialogTitle>
              <DialogDescription>
                Manage members and their roles in this team
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member: any) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.userId}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadge(member.role)}>
                          <div className="flex items-center gap-1">
                            {getRoleIcon(member.role)}
                            <span className="capitalize">{member.role}</span>
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(member.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {member.role !== "owner" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(selectedTeam, member.userId)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation email to add a new member to your team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as "owner" | "admin" | "member" | "viewer" })}
              >
                <option value="member">Member - Can view and edit</option>
                <option value="admin">Admin - Can manage members</option>
                <option value="viewer">Viewer - Read-only access</option>
                <option value="owner">Owner - Full control</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedTeam && inviteForm.email) {
                  inviteMemberMutation.mutate({
                    organizationId: selectedTeam,
                    email: inviteForm.email,
                    role: inviteForm.role,
                  });
                }
              }}
              disabled={inviteMemberMutation.isPending || !inviteForm.email}
            >
              {inviteMemberMutation.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Team Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>
              Create a new workspace for your team to collaborate
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                placeholder="My Awesome Team"
                value={newTeam.name}
                onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                placeholder="my-awesome-team"
                value={newTeam.slug}
                onChange={(e) =>
                  setNewTeam({
                    ...newTeam,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                  })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used in URLs and must be unique
              </p>
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="What is this team about?"
                value={newTeam.description}
                onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTeam} disabled={createTeamMutation.isPending}>
              {createTeamMutation.isPending ? "Creating..." : "Create Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
