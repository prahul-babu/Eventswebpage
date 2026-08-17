import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { format, isWithinInterval, subDays, startOfDay, endOfDay } from "date-fns";
import {
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  RotateCcw,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User as UserIcon,
  Calendar,
  Layers,
  Activity,
  Copy,
  Check,
} from "lucide-react";
import { useAdminAuditLogs, AuditLogEntry } from "@/lib/queries/adminUsers";
import {
  AuditActionCategory,
  AuditStatus,
} from "@/lib/audit";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type SortField =
  | "timestamp"
  | "action"
  | "actorName"
  | "actorEmail"
  | "actorRole"
  | "targetName"
  | "status"
  | "actionCategory";
type SortOrder = "asc" | "desc";

export const AdminAuditLogsPage: React.FC = () => {
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("ALL");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Sort States
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Selected Log Drawer / Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);

  // Query Hook
  const { data: rawLogs = [], isLoading } = useAdminAuditLogs();

  // Reset Filters Helper
  const handleResetFilters = () => {
    setSearchQuery("");
    setCategoryFilter("ALL");
    setActionFilter("ALL");
    setRoleFilter("ALL");
    setTargetTypeFilter("ALL");
    setStatusFilter("ALL");
    setDateRangeFilter("ALL");
    setCustomStartDate("");
    setCustomEndDate("");
    setCurrentPage(1);
  };

  // Distinct Action Types for Dropdown
  const availableActions = useMemo(() => {
    const set = new Set<string>();
    rawLogs.forEach((l) => {
      if (l.action) set.add(l.action);
    });
    return Array.from(set).sort();
  }, [rawLogs]);

  // Filtered & Searched Logs
  const filteredLogs = useMemo(() => {
    let result = [...rawLogs];
    const now = new Date();

    // 1. Text Search across Actor, Email, Target, Action, Description, ID
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((l) => {
        return (
          l.action.toLowerCase().includes(q) ||
          (l.actionCategory && l.actionCategory.toLowerCase().includes(q)) ||
          (l.actorName && l.actorName.toLowerCase().includes(q)) ||
          (l.actorEmail && l.actorEmail.toLowerCase().includes(q)) ||
          (l.actorId && l.actorId.toLowerCase().includes(q)) ||
          (l.targetName && l.targetName.toLowerCase().includes(q)) ||
          (l.targetId && l.targetId.toLowerCase().includes(q)) ||
          (l.targetType && l.targetType.toLowerCase().includes(q)) ||
          (l.description && l.description.toLowerCase().includes(q)) ||
          (l.id && l.id.toLowerCase().includes(q))
        );
      });
    }

    // 2. Category Filter
    if (categoryFilter !== "ALL") {
      result = result.filter(
        (l) => l.actionCategory?.toUpperCase() === categoryFilter.toUpperCase()
      );
    }

    // 3. Action Filter
    if (actionFilter !== "ALL") {
      result = result.filter((l) => l.action === actionFilter);
    }

    // 4. Role Filter
    if (roleFilter !== "ALL") {
      result = result.filter((l) => l.actorRole?.toUpperCase() === roleFilter.toUpperCase());
    }

    // 5. Target Type Filter
    if (targetTypeFilter !== "ALL") {
      result = result.filter(
        (l) => l.targetType?.toUpperCase() === targetTypeFilter.toUpperCase()
      );
    }

    // 6. Status Filter
    if (statusFilter !== "ALL") {
      result = result.filter((l) => l.status?.toUpperCase() === statusFilter.toUpperCase());
    }

    // 7. Date Range Filter
    if (dateRangeFilter === "TODAY") {
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      result = result.filter((l) => l.timestamp >= todayStart && l.timestamp <= todayEnd);
    } else if (dateRangeFilter === "7D") {
      const pastDate = subDays(now, 7);
      result = result.filter((l) => l.timestamp >= pastDate);
    } else if (dateRangeFilter === "30D") {
      const pastDate = subDays(now, 30);
      result = result.filter((l) => l.timestamp >= pastDate);
    } else if (dateRangeFilter === "90D") {
      const pastDate = subDays(now, 90);
      result = result.filter((l) => l.timestamp >= pastDate);
    } else if (dateRangeFilter === "CUSTOM" && (customStartDate || customEndDate)) {
      const start = customStartDate ? startOfDay(new Date(customStartDate)) : new Date(0);
      const end = customEndDate ? endOfDay(new Date(customEndDate)) : new Date(8640000000000000);
      result = result.filter((l) => isWithinInterval(l.timestamp, { start, end }));
    }

    // 8. Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "timestamp") {
        comparison = a.timestamp.getTime() - b.timestamp.getTime();
      } else if (sortField === "action") {
        comparison = a.action.localeCompare(b.action);
      } else if (sortField === "actionCategory") {
        comparison = (a.actionCategory || "").localeCompare(b.actionCategory || "");
      } else if (sortField === "actorName") {
        comparison = (a.actorName || a.actorEmail || "").localeCompare(
          b.actorName || b.actorEmail || ""
        );
      } else if (sortField === "actorEmail") {
        comparison = (a.actorEmail || "").localeCompare(b.actorEmail || "");
      } else if (sortField === "actorRole") {
        comparison = (a.actorRole || "").localeCompare(b.actorRole || "");
      } else if (sortField === "targetName") {
        comparison = (a.targetName || a.targetId || "").localeCompare(
          b.targetName || b.targetId || ""
        );
      } else if (sortField === "status") {
        comparison = (a.status || "").localeCompare(b.status || "");
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [
    rawLogs,
    searchQuery,
    categoryFilter,
    actionFilter,
    roleFilter,
    targetTypeFilter,
    statusFilter,
    dateRangeFilter,
    customStartDate,
    customEndDate,
    sortField,
    sortOrder,
  ]);

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Handle Sort Toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (filteredLogs.length === 0) {
      toast.error("No Logs to Export", {
        description: "There are no audit records matching the current filters.",
      });
      return;
    }

    const headers = [
      "Audit ID",
      "Timestamp",
      "Action",
      "Category",
      "Actor Name",
      "Actor Email",
      "Actor Role",
      "Actor ID",
      "Target Type",
      "Target Name",
      "Target ID",
      "Status",
      "Description",
      "Details",
      "User Agent",
    ];

    const rows = filteredLogs.map((l) => [
      `"${l.id}"`,
      `"${format(l.timestamp, "yyyy-MM-dd HH:mm:ss")}"`,
      `"${l.action}"`,
      `"${l.actionCategory || "SYSTEM"}"`,
      `"${(l.actorName || "").replace(/"/g, '""')}"`,
      `"${l.actorEmail || ""}"`,
      `"${l.actorRole || "USER"}"`,
      `"${l.actorId || ""}"`,
      `"${l.targetType || "SYSTEM"}"`,
      `"${(l.targetName || "").replace(/"/g, '""')}"`,
      `"${l.targetId || ""}"`,
      `"${l.status || "SUCCESS"}"`,
      `"${(l.description || "").replace(/"/g, '""')}"`,
      `"${JSON.stringify(l.details || {}).replace(/"/g, '""')}"`,
      `"${(l.userAgent || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Apollo_Institutional_Audit_${format(new Date(), "yyyyMMdd_HHmm")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Audit Logs Exported", {
      description: `Successfully exported ${filteredLogs.length} records to CSV.`,
    });
  };

  // Copy JSON Payload Helper
  const handleCopyPayload = () => {
    if (!selectedLog) return;
    const payloadStr = JSON.stringify(selectedLog, null, 2);
    navigator.clipboard.writeText(payloadStr);
    setCopiedPayload(true);
    toast.success("Payload Copied to Clipboard");
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  // Status Badge Helper
  const renderStatusBadge = (status: AuditStatus) => {
    switch (status) {
      case "SUCCESS":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-semibold gap-1 text-[10px] uppercase">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            SUCCESS
          </Badge>
        );
      case "FAILED":
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 font-semibold gap-1 text-[10px] uppercase">
            <XCircle className="w-3 h-3 text-rose-600" />
            FAILED
          </Badge>
        );
      case "WARNING":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 font-semibold gap-1 text-[10px] uppercase">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            WARNING
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-[10px] uppercase">
            {status}
          </Badge>
        );
    }
  };

  // Role Badge Helper
  const renderRoleBadge = (role: string) => {
    const upper = role.toUpperCase();
    if (upper === "ADMIN") {
      return (
        <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold">
          ADMIN
        </Badge>
      );
    }
    if (upper === "FACULTY") {
      return (
        <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-bold">
          FACULTY
        </Badge>
      );
    }
    return (
      <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-medium">
        STUDENT
      </Badge>
    );
  };

  // Category Badge Helper
  const renderCategoryBadge = (category: AuditActionCategory | string) => {
    return (
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
        {category ? category.replace(/_/g, " ") : "SYSTEM"}
      </span>
    );
  };

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title="Institutional Audit Trail"
        description="Immutable system-wide event log recording authentications, role assignments, event approvals, cancellations, and accreditation reviews."
        badge={{ text: "Security & Governance", variant: "indigo" }}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleExportCsv}
              disabled={filteredLogs.length === 0}
              className="rounded-xl text-xs bg-slate-900 hover:bg-slate-800 text-white gap-1.5 h-9 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit CSV</span>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="rounded-xl text-xs gap-1.5 h-9 bg-white"
            >
              <Link to="/admin">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Console Home</span>
              </Link>
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Metric Summary Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 rounded-2xl border-slate-200/80 bg-white shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Audit Logs</span>
              <Activity className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{rawLogs.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Immutable system events</div>
          </Card>

          <Card className="p-4 rounded-2xl border-slate-200/80 bg-white shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Authentication</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {rawLogs.filter((l) => l.actionCategory === "AUTHENTICATION").length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Logins, signups & auth</div>
          </Card>

          <Card className="p-4 rounded-2xl border-slate-200/80 bg-white shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Event & Registrations</span>
              <Calendar className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {
                rawLogs.filter(
                  (l) =>
                    l.actionCategory === "EVENT_MANAGEMENT" ||
                    l.actionCategory === "REGISTRATION" ||
                    l.actionCategory === "APPROVALS"
                ).length
              }
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Lifecycle & booking ops</div>
          </Card>

          <Card className="p-4 rounded-2xl border-slate-200/80 bg-white shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Security & Roles</span>
              <Layers className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {
                rawLogs.filter(
                  (l) =>
                    l.actionCategory === "USER_MANAGEMENT" ||
                    l.actionCategory === "SECURITY" ||
                    l.actionCategory === "PROFILE"
                ).length
              }
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Role & institutional changes</div>
          </Card>
        </div>

        {/* Filters Toolbar */}
        <Card className="p-5 rounded-3xl border-slate-200/90 bg-white shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Main Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by actor name, email, target, action, description, or ID..."
                className="h-10 pl-10 text-xs rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Actions / Reset */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="h-10 px-3 text-xs rounded-xl text-slate-600 hover:text-slate-900 border-slate-200 gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </Button>
            </div>
          </div>

          {/* Granular Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-slate-100">
            {/* Category Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Category
              </label>
              <Select
                value={categoryFilter}
                onValueChange={(val) => {
                  setCategoryFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl bg-white border-slate-200">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                  <SelectItem value="USER_MANAGEMENT">User Management</SelectItem>
                  <SelectItem value="EVENT_MANAGEMENT">Event Management</SelectItem>
                  <SelectItem value="REGISTRATION">Registration</SelectItem>
                  <SelectItem value="APPROVALS">Approvals</SelectItem>
                  <SelectItem value="REPORTS">Reports</SelectItem>
                  <SelectItem value="PROFILE">Profile</SelectItem>
                  <SelectItem value="NOTIFICATIONS">Notifications</SelectItem>
                  <SelectItem value="DOCUMENTS">Documents</SelectItem>
                  <SelectItem value="PAYMENTS">Payments</SelectItem>
                  <SelectItem value="SECURITY">Security</SelectItem>
                  <SelectItem value="SYSTEM">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Action Type
              </label>
              <Select
                value={actionFilter}
                onValueChange={(val) => {
                  setActionFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl bg-white border-slate-200">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="ALL">All Actions</SelectItem>
                  {availableActions.map((act) => (
                    <SelectItem key={act} value={act}>
                      {act.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Actor Role
              </label>
              <Select
                value={roleFilter}
                onValueChange={(val) => {
                  setRoleFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl bg-white border-slate-200">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Roles</SelectItem>
                  <SelectItem value="ADMIN">Administrator</SelectItem>
                  <SelectItem value="FACULTY">Faculty</SelectItem>
                  <SelectItem value="STUDENT">Student</SelectItem>
                  <SelectItem value="SYSTEM">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Target Type Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Target Type
              </label>
              <Select
                value={targetTypeFilter}
                onValueChange={(val) => {
                  setTargetTypeFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl bg-white border-slate-200">
                  <SelectValue placeholder="All Targets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Targets</SelectItem>
                  <SelectItem value="EVENT">Event</SelectItem>
                  <SelectItem value="USER">User / Account</SelectItem>
                  <SelectItem value="REGISTRATION">Registration</SelectItem>
                  <SelectItem value="REPORT">Report</SelectItem>
                  <SelectItem value="DOCUMENT">Document</SelectItem>
                  <SelectItem value="PAYMENT">Payment</SelectItem>
                  <SelectItem value="NOTIFICATION">Notification</SelectItem>
                  <SelectItem value="SYSTEM">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Status
              </label>
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl bg-white border-slate-200">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="SUCCESS">Success</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="WARNING">Warning</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Date Range
              </label>
              <Select
                value={dateRangeFilter}
                onValueChange={(val) => {
                  setDateRangeFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl bg-white border-slate-200">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Time</SelectItem>
                  <SelectItem value="TODAY">Today</SelectItem>
                  <SelectItem value="7D">Last 7 Days</SelectItem>
                  <SelectItem value="30D">Last 30 Days</SelectItem>
                  <SelectItem value="90D">Last 90 Days</SelectItem>
                  <SelectItem value="CUSTOM">Custom Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Date Range Selectors */}
          {dateRangeFilter === "CUSTOM" && (
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">From:</span>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-8 text-xs rounded-lg w-36"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">To:</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-8 text-xs rounded-lg w-36"
                />
              </div>
            </div>
          )}
        </Card>

        {/* Audit Logs Table */}
        <Card className="border-slate-200/90 shadow-sm rounded-3xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  {/* Timestamp Header */}
                  <th
                    onClick={() => handleSort("timestamp")}
                    className="p-4 cursor-pointer hover:text-slate-900 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Timestamp</span>
                      {sortField === "timestamp" ? (
                        sortOrder === "asc" ? (
                          <ChevronUp className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  </th>

                  {/* Action Header */}
                  <th
                    onClick={() => handleSort("action")}
                    className="p-4 cursor-pointer hover:text-slate-900 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Action & Category</span>
                      {sortField === "action" ? (
                        sortOrder === "asc" ? (
                          <ChevronUp className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  </th>

                  {/* Actor Header */}
                  <th
                    onClick={() => handleSort("actorName")}
                    className="p-4 cursor-pointer hover:text-slate-900 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Actor</span>
                      {sortField === "actorName" ? (
                        sortOrder === "asc" ? (
                          <ChevronUp className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  </th>

                  {/* Target Record Header */}
                  <th
                    onClick={() => handleSort("targetName")}
                    className="p-4 cursor-pointer hover:text-slate-900 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Target Record</span>
                      {sortField === "targetName" ? (
                        sortOrder === "asc" ? (
                          <ChevronUp className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  </th>

                  {/* Status Header */}
                  <th
                    onClick={() => handleSort("status")}
                    className="p-4 cursor-pointer hover:text-slate-900 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      {sortField === "status" ? (
                        sortOrder === "asc" ? (
                          <ChevronUp className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  </th>

                  {/* Details Header */}
                  <th className="p-4 text-right">Details</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-slate-400">
                      <Loader2 className="w-7 h-7 animate-spin mx-auto mb-3 text-indigo-600" />
                      <div className="font-semibold text-slate-700">
                        Loading Institutional Audit Trail...
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Verifying immutable cryptographic event records
                      </div>
                    </td>
                  </tr>
                ) : paginatedLogs.length > 0 ? (
                  paginatedLogs.map((log) => {
                    return (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        {/* Timestamp */}
                        <td className="p-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          <div>{format(log.timestamp, "dd MMM yyyy")}</div>
                          <div className="text-[10px] text-slate-400">
                            {format(log.timestamp, "hh:mm:ss a")}
                          </div>
                        </td>

                        {/* Action & Category */}
                        <td className="p-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span className="group-hover:text-indigo-600 transition-colors">
                              {log.action.replace(/_/g, " ")}
                            </span>
                          </div>
                          <div className="mt-0.5">
                            {renderCategoryBadge(log.actionCategory)}
                          </div>
                        </td>

                        {/* Actor */}
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-slate-800">
                              {log.actorName || log.actorEmail}
                            </div>
                            {renderRoleBadge(log.actorRole)}
                          </div>
                          <div className="text-[11px] text-slate-400">{log.actorEmail}</div>
                        </td>

                        {/* Target Record */}
                        <td className="p-4 whitespace-nowrap max-w-xs truncate">
                          {log.targetName ? (
                            <div className="font-medium text-slate-800 truncate">
                              {log.targetName}
                            </div>
                          ) : (
                            <div className="font-mono text-slate-600 text-[11px]">
                              {log.targetId || "SYSTEM"}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">
                            {log.targetType || "SYSTEM"}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-4 whitespace-nowrap">
                          {renderStatusBadge(log.status || "SUCCESS")}
                        </td>

                        {/* Details Action */}
                        <td className="p-4 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                            }}
                            className="h-8 px-2.5 text-xs rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Details</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-slate-500">
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                          <Search className="w-6 h-6" />
                        </div>
                        <div className="text-base font-bold text-slate-800">
                          No audit records found
                        </div>
                        <p className="text-xs text-slate-500">
                          We couldn't find any immutable audit records matching your current
                          search query or active filter settings.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResetFilters}
                          className="rounded-xl text-xs"
                        >
                          Clear All Filters
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination & Summary Bar */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span>
                Showing{" "}
                <strong className="text-slate-800">
                  {filteredLogs.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
                </strong>{" "}
                to{" "}
                <strong className="text-slate-800">
                  {Math.min(currentPage * pageSize, filteredLogs.length)}
                </strong>{" "}
                of <strong className="text-slate-800">{filteredLogs.length}</strong> audit records
              </span>

              <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3">
                <span>Per page:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-7 w-16 text-xs rounded-lg bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Page Navigation Buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 px-2.5 rounded-lg text-xs bg-white"
              >
                Previous
              </Button>

              <div className="flex items-center gap-1 px-2">
                <span className="text-xs font-semibold text-slate-700">
                  Page {currentPage} of {totalPages}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-2.5 rounded-lg text-xs bg-white"
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Audit Log Details Dialog / Drawer */}
      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold text-slate-900">
                    {selectedLog?.action.replace(/_/g, " ")}
                  </DialogTitle>
                  {selectedLog && renderStatusBadge(selectedLog.status || "SUCCESS")}
                </div>
                <DialogDescription className="text-xs text-slate-500">
                  Audit ID: <span className="font-mono text-slate-700">{selectedLog?.id}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6 pt-2 text-xs">
              {/* Institutional Narrative / Description */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 leading-relaxed font-medium">
                {selectedLog.description}
              </div>

              {/* Grid Details: Actor & Target */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Actor Info */}
                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>Actor Information</span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    {selectedLog.actorName || selectedLog.actorEmail}
                  </div>
                  <div className="text-slate-600">{selectedLog.actorEmail}</div>
                  <div className="flex items-center gap-2 pt-1">
                    {renderRoleBadge(selectedLog.actorRole)}
                    <span className="text-[10px] font-mono text-slate-400">
                      UID: {selectedLog.actorId.slice(0, 14)}...
                    </span>
                  </div>
                </div>

                {/* Target Record Info */}
                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <span>Target Record</span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    {selectedLog.targetName || selectedLog.targetType}
                  </div>
                  <div className="text-[11px] font-mono text-slate-600">
                    ID: {selectedLog.targetId || "SYSTEM"}
                  </div>
                  <div className="pt-1">
                    <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                      Type: {selectedLog.targetType}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Timestamp & Environment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Timestamp
                  </span>
                  <div className="font-mono text-slate-800 font-medium mt-0.5">
                    {format(selectedLog.timestamp, "yyyy-MM-dd HH:mm:ss (zzz)")}
                  </div>
                </div>

                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Action Category
                  </span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {selectedLog.actionCategory?.replace(/_/g, " ") || "SYSTEM"}
                  </div>
                </div>
              </div>

              {/* Changed Fields Diff (If recorded) */}
              {selectedLog.changedFields && Object.keys(selectedLog.changedFields).length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Field Modifications / Value Changes
                  </div>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                    {Object.entries(selectedLog.changedFields).map(([field, delta]) => (
                      <div key={field} className="p-3 bg-white flex items-start justify-between gap-4">
                        <span className="font-mono font-bold text-slate-700">{field}:</span>
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="text-rose-600 line-through bg-rose-50 px-1.5 py-0.5 rounded">
                            {String(delta.oldValue ?? "none")}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                            {String(delta.newValue ?? "none")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical JSON Payload & Details */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Cryptographic Payload Record
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyPayload}
                    className="h-6 px-2 text-[11px] rounded-md gap-1 text-slate-500 hover:text-slate-900"
                  >
                    {copiedPayload ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </Button>
                </div>
                <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto shadow-inner">
                  <pre>{JSON.stringify(selectedLog.details || {}, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAuditLogsPage;
