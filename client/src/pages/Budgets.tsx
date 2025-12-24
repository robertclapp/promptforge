import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Plus, DollarSign, AlertTriangle, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Budgets Page
 * Manage cost budgets and spending alerts
 */
export default function Budgets() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    period: "monthly" as "daily" | "weekly" | "monthly" | "yearly",
  });

  // Fetch budgets and summary
  const { data: budgets = [], isLoading, refetch } = trpc.budgets.list.useQuery();
  const { data: summary } = trpc.budgets.summary.useQuery();

  // Mutations
  const createMutation = trpc.budgets.create.useMutation({
    onSuccess: () => {
      toast.success("Budget created successfully!");
      setShowCreateDialog(false);
      setFormData({ name: "", amount: "", period: "monthly" });
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create budget: ${error.message}`);
    },
  });

  const deleteMutation = trpc.budgets.delete.useMutation({
    onSuccess: () => {
      toast.success("Budget deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!formData.name || !formData.amount) {
      toast.error("Please fill in all fields");
      return;
    }

    const amountInCents = Math.round(parseFloat(formData.amount) * 100);
    if (isNaN(amountInCents) || amountInCents <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    createMutation.mutate({
      name: formData.name,
      amount: amountInCents,
      period: formData.period,
      startDate: new Date(),
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this budget?")) {
      deleteMutation.mutate({ id });
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-500";
    if (percentage >= 75) return "text-orange-500";
    if (percentage >= 50) return "text-yellow-500";
    return "text-green-500";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-orange-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-primary" />
              Cost Budgets
            </h1>
            <p className="text-muted-foreground mt-1">
              Set spending limits and receive alerts when thresholds are reached
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Budget
          </Button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Budget</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.totalBudget)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Spend</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.totalSpend)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.percentageUsed.toFixed(1)}% used
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active Budgets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.activeBudgets}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Budgets at Risk</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  {summary.budgetsAtRisk}
                  {summary.budgetsAtRisk > 0 && (
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.triggeredAlerts} alerts triggered
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Budgets List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Budgets</CardTitle>
            <CardDescription>
              Monitor and manage your spending limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : budgets.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No budgets created yet</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Budget
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {budgets.map((budget) => (
                  <div key={budget.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{budget.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {budget.period}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            {formatCurrency(budget.currentSpend)} of {formatCurrency(budget.amount)}
                          </span>
                          <span className={getStatusColor(budget.percentageUsed)}>
                            {budget.percentageUsed.toFixed(1)}% used
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(budget.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <Progress
                        value={Math.min(budget.percentageUsed, 100)}
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Remaining: {formatCurrency(budget.remainingAmount)}</span>
                        <span>
                          Resets: {budget.lastResetAt ? new Date(budget.lastResetAt).toLocaleDateString() : "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Alerts */}
                    {budget.alerts.some((a) => a.isTriggered) && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t">
                        {budget.alerts
                          .filter((a) => a.isTriggered)
                          .map((alert) => (
                            <Badge
                              key={alert.id}
                              variant="destructive"
                              className="text-xs"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {alert.threshold}% threshold reached
                            </Badge>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Budget Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Budget</DialogTitle>
            <DialogDescription>
              Set a spending limit to control your AI costs
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Budget Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Monthly AI Spending"
              />
            </div>
            <div>
              <Label htmlFor="amount">Budget Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="100.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                You'll receive alerts at 50%, 75%, 90%, and 100%
              </p>
            </div>
            <div>
              <Label htmlFor="period">Period</Label>
              <Select
                value={formData.period}
                onValueChange={(value: any) => setFormData({ ...formData, period: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
