import React, { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { useAdminAuditLogs } from "@/lib/queries/adminUsers";
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
import { toast } from "sonner";

export const AdminAuditLogsPage: React.FC = () => {
  const [searchEmail, setSearchEmail] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const { data: logs, isLoading } = useAdminAuditLogs({
    action: actionFilter,
    actorEmail: searchEmail,
  });

  const handleExportCsv = () => {
    if (!logs || logs.length === 0) {
      toast.error("No Logs to Export");
      return;
    }

    const headers = ["Timestamp", "Action", "Actor Email", "Actor Role", "Target UID", "Details"];
    const rows = logs.map((l) => [
      format(l.timestamp, "yyyy-MM-dd HH:mm:ss"),
      l.action,
      l.actorEmail,
      l.actorRole,
      l.targetUid || "N/A",
      `"${JSON.stringify(l.details || {}).replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Apollo_Audit_Logs_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Audit Logs Exported", { description: `Exported ${logs.length} immutable records.` });
  };

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="Institutional Audit Trail"
        description="Immutable system-wide event log recording role assignments, event approvals, cancellations, and accreditation reviews."
        badge={{ text: "Security & Governance", variant: "indigo" }}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleExportCsv}
              className="rounded-xl text-xs bg-slate-900 hover:bg-slate-800 text-white gap-1.5 h-9 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit CSV</span>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-xl text-xs gap-1.5 h-9 bg-white">
              <Link to="/admin">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Console Home</span>
              </Link>
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Filters Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          {/* Search Actor Email */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Search actor email..."
              className="h-9 pl-9 text-xs rounded-xl"
            />
          </div>

          {/* Action Filter */}
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-9 text-xs rounded-xl">
              <SelectValue placeholder="Action Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Actions</SelectItem>
              <SelectItem value="USER_ROLE_CHANGED">User Role / Status Changed</SelectItem>
              <SelectItem value="USER_APPROVED">User Approved</SelectItem>
              <SelectItem value="EVENT_APPROVED">Event Approved</SelectItem>
              <SelectItem value="EVENT_REJECTED">Event Rejected</SelectItem>
              <SelectItem value="EVENT_REPORT_SUBMITTED">Report Submitted</SelectItem>
              <SelectItem value="REPORT_REVIEWED">Report Reviewed</SelectItem>
              <SelectItem value="ROSTER_IMPORTED">Roster Imported</SelectItem>
              <SelectItem value="PAYMENT_REFUNDED">Payment Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Audit Logs Table */}
        <Card className="border-slate-200/90 shadow-sm rounded-3xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Actor</th>
                  <th className="p-4">Target Record</th>
                  <th className="p-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                      <span>Loading immutable audit trail...</span>
                    </td>
                  </tr>
                ) : logs && logs.length > 0 ? (
                  logs.map((log) => {
                    const isExpanded = expandedLogId === log.id;

                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                        >
                          <td className="p-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {format(log.timestamp, "yyyy-MM-dd HH:mm:ss")}
                          </td>

                          <td className="p-4 whitespace-nowrap font-bold text-slate-900">
                            <Badge variant="secondary" className="text-[10px] uppercase font-bold">
                              {log.action.replace(/_/g, " ")}
                            </Badge>
                          </td>

                          <td className="p-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-800">{log.actorEmail}</div>
                            <div className="text-[10px] text-slate-400 uppercase font-mono">{log.actorRole}</div>
                          </td>

                          <td className="p-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                            {log.targetUid ? log.targetUid.slice(0, 16) : "system"}
                          </td>

                          <td className="p-4 text-right whitespace-nowrap">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] rounded-lg">
                              <span>Payload</span>
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 ml-1" /> : <ChevronRight className="w-3.5 h-3.5 ml-1" />}
                            </Button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-50">
                            <td colSpan={5} className="p-4">
                              <div className="bg-slate-900 text-slate-100 p-3 rounded-2xl font-mono text-[11px] overflow-x-auto shadow-inner">
                                <pre>{JSON.stringify(log.details || {}, null, 2)}</pre>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400">
                      No audit log records found matching query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};
export default AdminAuditLogsPage;
