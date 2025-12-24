import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  MapPin, 
  Clock, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Trash2,
  Bell,
  Globe,
  Laptop
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";

function getDeviceIcon(deviceType: string | null) {
  switch (deviceType) {
    case "mobile":
      return <Smartphone className="w-5 h-5" />;
    case "tablet":
      return <Tablet className="w-5 h-5" />;
    default:
      return <Monitor className="w-5 h-5" />;
  }
}

function getStatusBadge(status: string | null, isNew: boolean, isSuspicious: boolean) {
  if (isSuspicious) {
    return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" /> Suspicious</Badge>;
  }
  if (status === "failed") {
    return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Failed</Badge>;
  }
  if (status === "blocked") {
    return <Badge variant="secondary" className="gap-1"><Shield className="w-3 h-3" /> Blocked</Badge>;
  }
  if (isNew) {
    return <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600"><Bell className="w-3 h-3" /> New</Badge>;
  }
  return <Badge variant="outline" className="gap-1 border-green-500 text-green-600"><CheckCircle className="w-3 h-3" /> Success</Badge>;
}

export default function LoginActivity() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("history");

  const { data: history, isLoading: historyLoading } = trpc.loginActivity.getHistory.useQuery({ limit: 50 });
  const { data: devices, isLoading: devicesLoading, refetch: refetchDevices } = trpc.loginActivity.getKnownDevices.useQuery();
  const { data: locations, isLoading: locationsLoading, refetch: refetchLocations } = trpc.loginActivity.getKnownLocations.useQuery();
  const { data: settings, isLoading: settingsLoading, refetch: refetchSettings } = trpc.loginActivity.getNotificationSettings.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.loginActivity.getStats.useQuery();

  const updateSettings = trpc.loginActivity.updateNotificationSettings.useMutation({
    onSuccess: () => {
      toast.success("Settings updated");
      refetchSettings();
    },
    onError: () => {
      toast.error("Failed to update settings");
    },
  });

  const removeDevice = trpc.loginActivity.removeDevice.useMutation({
    onSuccess: () => {
      toast.success("Device removed");
      refetchDevices();
    },
    onError: () => {
      toast.error("Failed to remove device");
    },
  });

  const removeLocation = trpc.loginActivity.removeLocation.useMutation({
    onSuccess: () => {
      toast.success("Location removed");
      refetchLocations();
    },
    onError: () => {
      toast.error("Failed to remove location");
    },
  });

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Please log in to view login activity.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Login Activity</h1>
        <p className="text-muted-foreground mt-2">
          Monitor your account access and manage security notifications
        </p>
      </div>

      {/* Stats Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.successfulLogins}</p>
                  <p className="text-sm text-muted-foreground">Successful Logins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.failedLogins}</p>
                  <p className="text-sm text-muted-foreground">Failed Attempts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Laptop className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.uniqueDevices}</p>
                  <p className="text-sm text-muted-foreground">Unique Devices</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.suspiciousActivities}</p>
                  <p className="text-sm text-muted-foreground">Suspicious Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="history">Login History</TabsTrigger>
          <TabsTrigger value="devices">Known Devices</TabsTrigger>
          <TabsTrigger value="locations">Known Locations</TabsTrigger>
          <TabsTrigger value="settings">Notification Settings</TabsTrigger>
        </TabsList>

        {/* Login History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Login Activity</CardTitle>
              <CardDescription>
                Your login history from the past 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : history && history.length > 0 ? (
                <div className="space-y-4">
                  {history.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-4 border rounded-lg"
                    >
                      <div className="p-2 bg-muted rounded-lg">
                        {getDeviceIcon(activity.deviceType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{activity.deviceName || "Unknown Device"}</span>
                          {getStatusBadge(activity.loginStatus, activity.isNewDevice || activity.isNewLocation, activity.isSuspicious)}
                          {activity.isNewDevice && (
                            <Badge variant="outline" className="text-xs">New Device</Badge>
                          )}
                          {activity.isNewLocation && (
                            <Badge variant="outline" className="text-xs">New Location</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {activity.browser} on {activity.os}
                          </span>
                          {activity.city && activity.country && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {activity.city}, {activity.country}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {activity.createdAt ? new Date(activity.createdAt).toLocaleString() : "Unknown"}
                          </span>
                        </div>
                        {activity.ipAddress && (
                          <p className="text-xs text-muted-foreground mt-1">
                            IP: {activity.ipAddress}
                          </p>
                        )}
                        {activity.failureReason && (
                          <p className="text-xs text-red-500 mt-1">
                            Reason: {activity.failureReason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No login activity recorded yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Known Devices Tab */}
        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Known Devices</CardTitle>
              <CardDescription>
                Devices that have accessed your account. Remove any you don't recognize.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {devicesLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : devices && devices.length > 0 ? (
                <div className="space-y-4">
                  {devices.map((device) => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          <Monitor className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium">{device.deviceName || "Unknown Device"}</p>
                          <p className="text-sm text-muted-foreground">
                            {device.browser} on {device.os}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            First seen: {device.firstSeenAt ? new Date(device.firstSeenAt).toLocaleDateString() : "Unknown"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDevice.mutate({ deviceId: device.id })}
                        disabled={removeDevice.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No known devices recorded yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Known Locations Tab */}
        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Known Locations</CardTitle>
              <CardDescription>
                Locations where your account has been accessed. Remove any you don't recognize.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {locationsLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : locations && locations.length > 0 ? (
                <div className="space-y-4">
                  {locations.map((location) => (
                    <div
                      key={location.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {location.city ? `${location.city}, ` : ""}{location.country || "Unknown Location"}
                          </p>
                          {location.region && (
                            <p className="text-sm text-muted-foreground">{location.region}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            First seen: {location.firstSeenAt ? new Date(location.firstSeenAt).toLocaleDateString() : "Unknown"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLocation.mutate({ locationId: location.id })}
                        disabled={removeLocation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No known locations recorded yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure when you want to receive login activity alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {settingsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : settings && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive email alerts for login activity
                      </p>
                    </div>
                    <Switch
                      checked={settings.emailNotifications}
                      onCheckedChange={(checked) =>
                        updateSettings.mutate({ emailNotifications: checked })
                      }
                    />
                  </div>

                  <div className="border-t pt-6 space-y-4">
                    <h4 className="font-medium">Alert Types</h4>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>New Device Login</Label>
                        <p className="text-sm text-muted-foreground">
                          Alert when your account is accessed from a new device
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifyNewDevice}
                        onCheckedChange={(checked) =>
                          updateSettings.mutate({ notifyNewDevice: checked })
                        }
                        disabled={!settings.emailNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>New Location Login</Label>
                        <p className="text-sm text-muted-foreground">
                          Alert when your account is accessed from a new location
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifyNewLocation}
                        onCheckedChange={(checked) =>
                          updateSettings.mutate({ notifyNewLocation: checked })
                        }
                        disabled={!settings.emailNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Failed Login Attempts</Label>
                        <p className="text-sm text-muted-foreground">
                          Alert when there are failed login attempts on your account
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifyFailedLogin}
                        onCheckedChange={(checked) =>
                          updateSettings.mutate({ notifyFailedLogin: checked })
                        }
                        disabled={!settings.emailNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Suspicious Activity</Label>
                        <p className="text-sm text-muted-foreground">
                          Alert when suspicious activity is detected on your account
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifySuspiciousActivity}
                        onCheckedChange={(checked) =>
                          updateSettings.mutate({ notifySuspiciousActivity: checked })
                        }
                        disabled={!settings.emailNotifications}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
