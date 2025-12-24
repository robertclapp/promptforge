import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Shield, 
  Download, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Eye,
  Filter,
  RefreshCw,
  FileJson,
  FileText,
  ChevronLeft,
  ChevronRight,
  Activity,
  Users,
  CreditCard,
  Key,
  Lock
} from "lucide-react";
import { format } from "date-fns";

const eventCategoryIcons: Record<string, React.ReactNode> = {
  permission: <Lock className="h-4 w-4" />,
  resource: <Activity className="h-4 w-4" />,
  team: <Users className="h-4 w-4" />,
  billing: <CreditCard className="h-4 w-4" />,
  api: <Key className="h-4 w-4" />,
  security: <Shield className="h-4 w-4" />,
};

const statusColors: Record<string, string> = {
  success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  failure: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  denied: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
};

const statusIcons: Record<string, React.ReactNode> = {
  success: <CheckCircle className="h-4 w-4 text-green-600" />,
  failure: <XCircle className="h-4 w-4 text-red-600" />,
  denied: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
};

export default function AuditLogs() {
  const [filters, setFilters] = useState({
    eventCategory: "",
    status: "",
    search: "",
    limit: 25,
    offset: 0,
  });
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data, isLoading, refetch } = trpc.audit.list.useQuery({
    eventCategory: filters.eventCategory as any || undefined,
    status: filters.status as any || undefined,
    search: filters.search || undefined,
    limit: filters.limit,
    offset: filters.offset,
  });

  const { data: stats, isLoading: statsLoading } = trpc.audit.getStats.useQuery();

  const exportJsonMutation = trpc.audit.exportJson.useMutation();
  const exportCsvMutation = trpc.audit.exportCsv.useMutation();

  const handleExportJson = async () => {
    try {
      const result = await exportJsonMutation.mutateAsync({
        eventCategory: filters.eventCategory as any || undefined,
      });
      const blob = new Blob([result.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export JSON:", error);
    }
  };

  const handleExportCsv = async () => {
    try {
      const result = await exportCsvMutation.mutateAsync({
        eventCategory: filters.eventCategory as any || undefined,
      });
      const blob = new Blob([result.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export CSV:", error);
    }
  };

  const totalPages = Math.ceil((data?.total || 0) / filters.limit);
  const currentPage = Math.floor(filters.offset / filters.limit) + 1;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Audit Logs
            </h1>
            <p className="text-muted-foreground mt-1">
              Track all sensitive operations and security events in your workspace
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJson}>
              <FileJson className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <FileText className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{stats?.totalEvents || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Permission Denied</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-yellow-600">{stats?.permissionDenied || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deletions</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-red-600">{stats?.deletions || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Role Changes</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-blue-600">{stats?.roleChanges || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Billing Events</CardTitle>
              <CreditCard className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-purple-600">{stats?.billingEvents || 0}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by user, email, or resource..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value, offset: 0 })}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={filters.eventCategory}
                onValueChange={(value) => setFilters({ ...filters, eventCategory: value, offset: 0 })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  <SelectItem value="permission">Permission</SelectItem>
                  <SelectItem value="resource">Resource</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value, offset: 0 })}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failure">Failure</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Event History</CardTitle>
            <CardDescription>
              {data?.total || 0} total events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : data?.logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No audit logs found</p>
                <p className="text-sm">Events will appear here as actions are performed</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">
                          {log.createdAt ? format(new Date(log.createdAt), "MMM d, HH:mm:ss") : "-"}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.userName || "Unknown"}</div>
                            <div className="text-xs text-muted-foreground">{log.userEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            {eventCategoryIcons[log.eventCategory]}
                            {log.eventCategory}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {log.eventType}
                          </code>
                        </TableCell>
                        <TableCell>
                          {log.resourceType ? (
                            <div>
                              <div className="text-sm">{log.resourceName || log.resourceId}</div>
                              <div className="text-xs text-muted-foreground">{log.resourceType}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[log.status]}>
                            <span className="flex items-center gap-1">
                              {statusIcons[log.status]}
                              {log.status}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedLog(log)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Audit Log Details</DialogTitle>
                                <DialogDescription>
                                  Event ID: {log.id}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                                    <p className="font-mono">
                                      {log.createdAt ? format(new Date(log.createdAt), "PPpp") : "-"}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                                    <p>
                                      <Badge className={statusColors[log.status]}>
                                        {log.status}
                                      </Badge>
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">User</label>
                                    <p>{log.userName || "Unknown"}</p>
                                    <p className="text-sm text-muted-foreground">{log.userEmail}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Role</label>
                                    <p>{log.userRole || "-"}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Event Type</label>
                                    <p><code className="bg-muted px-1.5 py-0.5 rounded">{log.eventType}</code></p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Category</label>
                                    <p>{log.eventCategory}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Action</label>
                                    <p>{log.action}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                                    <p className="font-mono">{log.ipAddress || "-"}</p>
                                  </div>
                                </div>
                                {log.resourceType && (
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Resource</label>
                                    <p>{log.resourceType}: {log.resourceName || log.resourceId}</p>
                                  </div>
                                )}
                                {log.requiredPermission && (
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Required Permission</label>
                                    <p><code className="bg-muted px-1.5 py-0.5 rounded">{log.requiredPermission}</code></p>
                                  </div>
                                )}
                                {log.details && Object.keys(log.details).length > 0 && (
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Details</label>
                                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-40">
                                      {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.previousValue && (
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Previous Value</label>
                                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-40">
                                      {JSON.stringify(log.previousValue, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.newValue && (
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">New Value</label>
                                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-40">
                                      {JSON.stringify(log.newValue, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {filters.offset + 1} to {Math.min(filters.offset + filters.limit, data?.total || 0)} of {data?.total || 0} events
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setFilters({ ...filters, offset: filters.offset - filters.limit })}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
