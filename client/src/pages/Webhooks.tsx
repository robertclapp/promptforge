import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Webhook,
  Plus,
  Trash2,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  Bell,
  Shield,
  DollarSign,
  FileText,
  TestTube2,
} from "lucide-react";
import { toast } from "sonner";

export default function Webhooks() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [showDeliveriesDialog, setShowDeliveriesDialog] = useState<string | null>(null);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [showSecret, setShowSecret] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const { data: webhooks, isLoading, refetch } = trpc.webhooks.list.useQuery();
  const { data: availableEvents } = trpc.webhooks.getAvailableEvents.useQuery();
  const { data: deliveries, isLoading: deliveriesLoading } = trpc.webhooks.getDeliveries.useQuery(
    { webhookId: showDeliveriesDialog || "", limit: 50 },
    { enabled: !!showDeliveriesDialog }
  );

  const createWebhook = trpc.webhooks.create.useMutation({
    onSuccess: (data) => {
      toast.success("Webhook created successfully!");
      setNewSecret(data.secret);
      setShowCreateDialog(false);
      setNewWebhookUrl("");
      setSelectedEvents([]);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create webhook: ${error.message}`);
    },
  });

  const updateWebhook = trpc.webhooks.update.useMutation({
    onSuccess: () => {
      toast.success("Webhook updated");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update webhook: ${error.message}`);
    },
  });

  const deleteWebhook = trpc.webhooks.delete.useMutation({
    onSuccess: () => {
      toast.success("Webhook deleted");
      setShowDeleteDialog(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete webhook: ${error.message}`);
    },
  });

  const testWebhook = trpc.webhooks.test.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Test delivered successfully (${result.statusCode})`);
      } else {
        toast.error(`Test failed: ${result.response || "Unknown error"}`);
      }
      refetch();
    },
    onError: (error) => {
      toast.error(`Test failed: ${error.message}`);
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const eventCategories = [
    {
      name: "Evaluations",
      icon: <TestTube2 className="w-4 h-4" />,
      events: availableEvents?.filter((e) => e.event.startsWith("evaluation.")) || [],
    },
    {
      name: "Budget",
      icon: <DollarSign className="w-4 h-4" />,
      events: availableEvents?.filter((e) => e.event.startsWith("budget.")) || [],
    },
    {
      name: "Security",
      icon: <Shield className="w-4 h-4" />,
      events: availableEvents?.filter((e) => e.event.startsWith("security.")) || [],
    },
    {
      name: "Prompts",
      icon: <FileText className="w-4 h-4" />,
      events: availableEvents?.filter((e) => e.event.startsWith("prompt.")) || [],
    },
    {
      name: "Test Suites",
      icon: <TestTube2 className="w-4 h-4" />,
      events: availableEvents?.filter((e) => e.event.startsWith("test_suite.")) || [],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground mt-2">
            Receive real-time notifications when events occur in your workspace
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Webhook
        </Button>
      </div>

      {/* Documentation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Webhook Integration
          </CardTitle>
          <CardDescription>
            Webhooks allow you to receive HTTP POST requests when events happen in PromptForge
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Signature Verification</h4>
              <p className="text-sm text-muted-foreground">
                All webhooks include an <code className="bg-muted px-1 rounded">X-Webhook-Signature</code> header 
                containing an HMAC-SHA256 signature of the payload.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Retry Policy</h4>
              <p className="text-sm text-muted-foreground">
                Failed deliveries are retried up to 5 times with exponential backoff 
                (1min, 5min, 15min, 60min).
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Timeout</h4>
              <p className="text-sm text-muted-foreground">
                Your endpoint must respond within 30 seconds. 
                Return a 2xx status code to acknowledge receipt.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhooks List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : webhooks && webhooks.length > 0 ? (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <Webhook className="w-5 h-5 text-blue-500" />
                      <code className="text-sm bg-muted px-2 py-1 rounded break-all">
                        {webhook.url}
                      </code>
                      <Badge variant={webhook.isActive ? "default" : "secondary"}>
                        {webhook.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {(webhook.events as string[]).map((event) => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
                      <span>Created: {webhook.createdAt ? new Date(webhook.createdAt).toLocaleDateString() : "Unknown"}</span>
                      {webhook.lastTriggeredAt && (
                        <span>Last triggered: {new Date(webhook.lastTriggeredAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Switch
                      checked={webhook.isActive}
                      onCheckedChange={(checked) =>
                        updateWebhook.mutate({ webhookId: webhook.id, isActive: checked })
                      }
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testWebhook.mutate({ webhookId: webhook.id })}
                      disabled={testWebhook.isPending}
                    >
                      {testWebhook.isPending ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeliveriesDialog(webhook.id)}
                    >
                      <Clock className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteDialog(webhook.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Webhook className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No webhooks configured</h3>
            <p className="text-muted-foreground mb-4">
              Create your first webhook to start receiving event notifications
            </p>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Webhook
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Webhook Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Webhook</DialogTitle>
            <DialogDescription>
              Configure a new webhook endpoint to receive event notifications
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Endpoint URL</Label>
              <Input
                id="webhook-url"
                placeholder="https://your-server.com/webhook"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Must be a valid HTTPS URL that can receive POST requests
              </p>
            </div>

            <div className="space-y-4">
              <Label>Events to Subscribe</Label>
              {eventCategories.map((category) => (
                <div key={category.name} className="space-y-2">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    {category.icon}
                    {category.name}
                  </div>
                  <div className="grid grid-cols-1 gap-2 pl-6">
                    {category.events.map((event) => (
                      <div key={event.event} className="flex items-center space-x-2">
                        <Checkbox
                          id={event.event}
                          checked={selectedEvents.includes(event.event)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedEvents([...selectedEvents, event.event]);
                            } else {
                              setSelectedEvents(selectedEvents.filter((e) => e !== event.event));
                            }
                          }}
                        />
                        <Label htmlFor={event.event} className="text-sm cursor-pointer flex-1">
                          <span className="font-mono text-xs">{event.event}</span>
                          <span className="text-muted-foreground ml-2">- {event.description}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                createWebhook.mutate({ url: newWebhookUrl, events: selectedEvents })
              }
              disabled={!newWebhookUrl || selectedEvents.length === 0 || createWebhook.isPending}
            >
              {createWebhook.isPending ? "Creating..." : "Create Webhook"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Secret Display Dialog */}
      <Dialog open={!!newSecret} onOpenChange={() => setNewSecret(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Webhook Created Successfully</DialogTitle>
            <DialogDescription>
              Save your webhook secret now. It won't be shown again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Important:</strong> This secret is used to verify webhook signatures. 
                Store it securely - you won't be able to see it again.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Webhook Secret</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-muted rounded-lg text-sm break-all">
                  {showSecret === "new" ? newSecret : "•".repeat(40)}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSecret(showSecret === "new" ? null : "new")}
                >
                  {showSecret === "new" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(newSecret || "", "Secret")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setNewSecret(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deliveries Dialog */}
      <Dialog open={!!showDeliveriesDialog} onOpenChange={() => setShowDeliveriesDialog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delivery History</DialogTitle>
            <DialogDescription>Recent webhook delivery attempts</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {deliveriesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : deliveries && deliveries.length > 0 ? (
              <div className="space-y-2">
                {deliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="p-4 border rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {delivery.deliveredAt ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{delivery.event}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {delivery.statusCode ? `HTTP ${delivery.statusCode}` : "Failed"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {delivery.createdAt ? new Date(delivery.createdAt).toLocaleString() : "Unknown"} • 
                          Attempts: {delivery.attempts}
                        </p>
                      </div>
                    </div>
                    {delivery.response && (
                      <code className="text-xs bg-muted px-2 py-1 rounded max-w-xs truncate">
                        {delivery.response}
                      </code>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No deliveries yet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this webhook? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteDialog && deleteWebhook.mutate({ webhookId: showDeleteDialog })}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
