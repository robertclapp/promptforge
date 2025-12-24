import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Settings2, 
  Shield, 
  Eye, 
  Users, 
  UserCog,
  Crown,
  RefreshCw,
  Info,
  Check,
  X,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";

const roleInfo = {
  viewer: {
    icon: Eye,
    label: "Viewer",
    description: "Read-only access to workspace resources",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  },
  member: {
    icon: Users,
    label: "Member",
    description: "Can create and edit resources",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  admin: {
    icon: UserCog,
    label: "Admin",
    description: "Can delete resources and manage team",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
  owner: {
    icon: Crown,
    label: "Owner",
    description: "Full access to all features",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
};

const categoryOrder = [
  "Read",
  "Prompts",
  "Evaluations",
  "AI Providers",
  "Budgets",
  "Context Packages",
  "Test Suites",
  "Optimizations",
  "Templates",
  "Team",
  "Billing",
  "API Keys",
];

export default function WorkspacePermissions() {
  const [selectedRole, setSelectedRole] = useState<"viewer" | "member" | "admin">("viewer");
  const utils = trpc.useUtils();

  const { data: availablePermissions, isLoading: permissionsLoading } = 
    trpc.workspacePermissions.getAvailablePermissions.useQuery();

  const { data: overrides, isLoading: overridesLoading } = 
    trpc.workspacePermissions.list.useQuery();

  const { data: effectivePermissions, isLoading: effectiveLoading } = 
    trpc.workspacePermissions.getEffectivePermissions.useQuery({ role: selectedRole });

  const setOverrideMutation = trpc.workspacePermissions.setOverride.useMutation({
    onSuccess: () => {
      utils.workspacePermissions.list.invalidate();
      utils.workspacePermissions.getEffectivePermissions.invalidate();
      toast.success("Permission updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeOverrideMutation = trpc.workspacePermissions.removeOverride.useMutation({
    onSuccess: () => {
      utils.workspacePermissions.list.invalidate();
      utils.workspacePermissions.getEffectivePermissions.invalidate();
      toast.success("Permission reset to default");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetAllMutation = trpc.workspacePermissions.resetAll.useMutation({
    onSuccess: () => {
      utils.workspacePermissions.list.invalidate();
      utils.workspacePermissions.getEffectivePermissions.invalidate();
      toast.success("All permissions reset to defaults");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Group permissions by category
  const permissionsByCategory = useMemo(() => {
    if (!availablePermissions) return {};
    
    const grouped: Record<string, typeof availablePermissions> = {};
    availablePermissions.forEach((perm) => {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push(perm);
    });
    
    return grouped;
  }, [availablePermissions]);

  // Get override status for a permission
  const getOverrideStatus = (permission: string): { isOverridden: boolean; granted?: boolean } => {
    const override = overrides?.find(
      (o) => o.role === selectedRole && o.permission === permission
    );
    return {
      isOverridden: !!override,
      granted: override?.granted,
    };
  };

  // Check if permission is default for this role
  const isDefaultPermission = (permission: string, defaultRoles: readonly string[]): boolean => {
    return defaultRoles.includes(selectedRole);
  };

  const handleTogglePermission = (permission: string, currentValue: boolean) => {
    setOverrideMutation.mutate({
      role: selectedRole,
      permission,
      granted: !currentValue,
    });
  };

  const handleResetPermission = (permission: string) => {
    removeOverrideMutation.mutate({
      role: selectedRole,
      permission,
    });
  };

  const isLoading = permissionsLoading || overridesLoading || effectiveLoading;
  const RoleIcon = roleInfo[selectedRole].icon;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Settings2 className="h-8 w-8 text-primary" />
              Workspace Permissions
            </h1>
            <p className="text-muted-foreground mt-1">
              Customize role permissions for your workspace
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset All to Defaults
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset All Permissions?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove all custom permission overrides and restore the default
                  permission settings for all roles. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => resetAllMutation.mutate()}>
                  Reset All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Info Banner */}
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="flex items-start gap-3 pt-4">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">About Permission Overrides</p>
              <p className="mt-1">
                Customize which permissions each role has in your workspace. Overrides take
                precedence over default permissions. Owner permissions cannot be modified.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Role Tabs */}
        <Tabs value={selectedRole} onValueChange={(v) => setSelectedRole(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            {(["viewer", "member", "admin"] as const).map((role) => {
              const info = roleInfo[role];
              const Icon = info.icon;
              return (
                <TabsTrigger key={role} value={role} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {info.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={selectedRole} className="mt-6">
            {/* Role Info Card */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${roleInfo[selectedRole].color}`}>
                    <RoleIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>{roleInfo[selectedRole].label} Role</CardTitle>
                    <CardDescription>{roleInfo[selectedRole].description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Permissions Grid */}
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[...Array(4)].map((_, j) => (
                          <Skeleton key={j} className="h-10 w-full" />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {categoryOrder.map((category) => {
                  const permissions = permissionsByCategory[category];
                  if (!permissions || permissions.length === 0) return null;

                  return (
                    <Card key={category}>
                      <CardHeader>
                        <CardTitle className="text-lg">{category}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {permissions.map((perm) => {
                            const { isOverridden, granted } = getOverrideStatus(perm.permission);
                            const defaultValue = isDefaultPermission(perm.permission, perm.defaultRoles);
                            const currentValue = effectivePermissions?.[perm.permission as keyof typeof effectivePermissions] ?? defaultValue;

                            return (
                              <div
                                key={perm.permission}
                                className="flex items-center justify-between py-2 border-b last:border-0"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{perm.description}</span>
                                    {isOverridden && (
                                      <Badge variant="outline" className="text-xs">
                                        Custom
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    <code className="bg-muted px-1 py-0.5 rounded">
                                      {perm.permission}
                                    </code>
                                    <span className="mx-2">•</span>
                                    Default: {defaultValue ? (
                                      <span className="text-green-600">Allowed</span>
                                    ) : (
                                      <span className="text-red-600">Denied</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  {isOverridden && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleResetPermission(perm.permission)}
                                      disabled={removeOverrideMutation.isPending}
                                    >
                                      <RefreshCw className="h-4 w-4 mr-1" />
                                      Reset
                                    </Button>
                                  )}
                                  <div className="flex items-center gap-2">
                                    {currentValue ? (
                                      <Check className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <X className="h-4 w-4 text-red-600" />
                                    )}
                                    <Switch
                                      checked={currentValue}
                                      onCheckedChange={() => handleTogglePermission(perm.permission, currentValue)}
                                      disabled={setOverrideMutation.isPending}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Owner Note */}
        <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
          <CardContent className="flex items-start gap-3 pt-4">
            <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">Owner Permissions</p>
              <p className="mt-1">
                Workspace owners always have full access to all features. Owner permissions
                cannot be customized or restricted for security reasons.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
