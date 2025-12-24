import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Globe, 
  Plus, 
  Trash2, 
  Shield,
  AlertTriangle,
  Check,
  X,
  Info,
  Network
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function IpAllowlist() {
  const utils = trpc.useUtils();
  
  // State
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newIpAddress, setNewIpAddress] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Queries
  const { data: settings, isLoading: settingsLoading } = trpc.ipAllowlist.getSettings.useQuery();
  const { data: entries, isLoading: entriesLoading } = trpc.ipAllowlist.list.useQuery();

  // Mutations
  const updateSettingsMutation = trpc.ipAllowlist.updateSettings.useMutation({
    onSuccess: () => {
      utils.ipAllowlist.getSettings.invalidate();
      toast.success("Settings updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addEntryMutation = trpc.ipAllowlist.add.useMutation({
    onSuccess: () => {
      utils.ipAllowlist.list.invalidate();
      setAddDialogOpen(false);
      setNewIpAddress("");
      setNewDescription("");
      toast.success("IP address added to allowlist");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateEntryMutation = trpc.ipAllowlist.update.useMutation({
    onSuccess: () => {
      utils.ipAllowlist.list.invalidate();
      toast.success("Entry updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeEntryMutation = trpc.ipAllowlist.remove.useMutation({
    onSuccess: () => {
      utils.ipAllowlist.list.invalidate();
      toast.success("IP address removed");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAddEntry = () => {
    if (!newIpAddress.trim()) {
      toast.error("Please enter an IP address");
      return;
    }
    addEntryMutation.mutate({
      ipAddress: newIpAddress.trim(),
      description: newDescription.trim() || undefined,
    });
  };

  const handleToggleEntry = (id: string, enabled: boolean) => {
    updateEntryMutation.mutate({ id, enabled });
  };

  const isLoading = settingsLoading || entriesLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="h-8 w-8 text-primary" />
            IP Allowlist
          </h1>
          <p className="text-muted-foreground mt-1">
            Restrict access to specific IP addresses or ranges
          </p>
        </div>

        {/* Settings Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Allowlist Settings
                </CardTitle>
                <CardDescription>
                  Configure how IP allowlisting is enforced
                </CardDescription>
              </div>
              <Switch
                checked={settings?.enabled || false}
                onCheckedChange={(enabled) => updateSettingsMutation.mutate({ enabled })}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {settings?.enabled && (
              <>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">
                    When enabled, only IP addresses in the allowlist can access your workspace.
                    Make sure to add your current IP before enabling.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Enforce for API */}
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium">Enforce for API</p>
                      <p className="text-sm text-muted-foreground">
                        Restrict API access to allowed IPs
                      </p>
                    </div>
                    <Switch
                      checked={settings?.enforceForApi || false}
                      onCheckedChange={(enforceForApi) => 
                        updateSettingsMutation.mutate({ enforceForApi })
                      }
                    />
                  </div>

                  {/* Enforce for Web */}
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium">Enforce for Web</p>
                      <p className="text-sm text-muted-foreground">
                        Restrict web dashboard access
                      </p>
                    </div>
                    <Switch
                      checked={settings?.enforceForWeb || false}
                      onCheckedChange={(enforceForWeb) => 
                        updateSettingsMutation.mutate({ enforceForWeb })
                      }
                    />
                  </div>

                  {/* Owner Bypass */}
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium">Owner Bypass</p>
                      <p className="text-sm text-muted-foreground">
                        Allow owners to access from any IP
                      </p>
                    </div>
                    <Switch
                      checked={settings?.ownersBypass || false}
                      onCheckedChange={(ownersBypass) => 
                        updateSettingsMutation.mutate({ ownersBypass })
                      }
                    />
                  </div>

                  {/* Violation Action */}
                  <div className="p-4 rounded-lg border">
                    <p className="font-medium mb-2">Violation Action</p>
                    <Select
                      value={settings?.violationAction || "block"}
                      onValueChange={(violationAction: "block" | "log") => 
                        updateSettingsMutation.mutate({ violationAction })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="block">Block Access</SelectItem>
                        <SelectItem value="log">Log Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">
                      {settings?.violationAction === "log" 
                        ? "Access will be logged but not blocked"
                        : "Access will be blocked and logged"
                      }
                    </p>
                  </div>
                </div>
              </>
            )}

            {!settings?.enabled && (
              <div className="text-center py-6 text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>IP allowlisting is disabled</p>
                <p className="text-sm">Enable to restrict access to specific IP addresses</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* IP Addresses Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5 text-blue-500" />
                  Allowed IP Addresses
                </CardTitle>
                <CardDescription>
                  {entries?.length || 0} IP addresses in allowlist
                </CardDescription>
              </div>
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add IP Address
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add IP Address</DialogTitle>
                    <DialogDescription>
                      Add an IP address or CIDR range to the allowlist
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>IP Address or CIDR Range</Label>
                      <Input
                        placeholder="192.168.1.1 or 10.0.0.0/24"
                        value={newIpAddress}
                        onChange={(e) => setNewIpAddress(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Examples: 192.168.1.1, 10.0.0.0/24, 2001:db8::1
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Description (optional)</Label>
                      <Input
                        placeholder="Office network, VPN, etc."
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddEntry} disabled={addEntryMutation.isPending}>
                      Add to Allowlist
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {entries && entries.length > 0 ? (
              <div className="space-y-2">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      !entry.enabled ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${entry.isCidr ? "bg-purple-100 dark:bg-purple-900" : "bg-blue-100 dark:bg-blue-900"}`}>
                        {entry.isCidr ? (
                          <Network className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        ) : (
                          <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-sm">{entry.ipAddress}</code>
                          {entry.isCidr && (
                            <Badge variant="secondary" className="text-xs">CIDR</Badge>
                          )}
                          {!entry.enabled && (
                            <Badge variant="outline" className="text-xs">Disabled</Badge>
                          )}
                        </div>
                        {entry.description && (
                          <p className="text-sm text-muted-foreground">{entry.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Added {entry.createdAt ? formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true }) : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={entry.enabled}
                        onCheckedChange={(enabled) => handleToggleEntry(entry.id, enabled)}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove IP Address?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove {entry.ipAddress} from the allowlist.
                              {settings?.enabled && (
                                <span className="block mt-2 text-yellow-600">
                                  Warning: If this is your current IP, you may lose access.
                                </span>
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeEntryMutation.mutate({ id: entry.id })}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No IP addresses in allowlist</p>
                <p className="text-sm">Add IP addresses to restrict access</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4" />
              About IP Allowlisting
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Single IP:</strong> Enter a specific IP address like <code>192.168.1.1</code>
            </p>
            <p>
              <strong>CIDR Range:</strong> Use CIDR notation like <code>10.0.0.0/24</code> to allow a range of IPs
            </p>
            <p>
              <strong>IPv6:</strong> Both IPv4 and IPv6 addresses are supported
            </p>
            <p className="pt-2 text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              Always add your current IP before enabling the allowlist to avoid locking yourself out.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
