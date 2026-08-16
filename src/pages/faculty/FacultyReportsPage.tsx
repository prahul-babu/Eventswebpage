import React, { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileText,
  Search,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useFacultyReports } from "@/lib/queries/reports";
import { downloadEventReportPdf } from "@/lib/pdf/reportPdfGenerator";
import { downloadEventReportDocx } from "@/lib/docx/reportDocxGenerator";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EventReportStatus } from "@/types";
import { toast } from "sonner";

export const FacultyReportsPage: React.FC = () => {
  const { firebaseUser, profile } = useAuth();
  const currentUid = firebaseUser?.uid || profile?.uid;
  const currentEmail = firebaseUser?.email || profile?.email;
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | EventReportStatus>("ALL");

  const { data: reportItems, isLoading } = useFacultyReports(currentUid, currentEmail);

  const filteredItems = (reportItems || []).filter((item) => {
    if (statusFilter !== "ALL" && item.reportStatus !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.event.title.toLowerCase().includes(q) ||
        item.event.category.toLowerCase().includes(q) ||
        item.event.venueLocation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: EventReportStatus) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="emerald" className="text-[10px]">Approved &amp; Archived</Badge>;
      case "SUBMITTED":
        return <Badge variant="indigo" className="text-[10px]">Submitted / In Review</Badge>;
      case "CHANGES_REQUESTED":
        return <Badge variant="amber" className="text-[10px]">Revisions Requested</Badge>;
      case "DRAFT":
        return <Badge variant="secondary" className="text-[10px]">Draft in Progress</Badge>;
      case "NOT_STARTED":
      default:
        return <Badge variant="outline" className="text-[10px] text-slate-500">Report Due</Badge>;
    }
  };

  const handleDownloadPdf = (report: any) => {
    if (!report) {
      toast.error("No Report Draft Available", { description: "Please complete and save the report first." });
      return;
    }
    downloadEventReportPdf(report);
    toast.success("PDF Exported Successfully");
  };

  const handleDownloadDocx = async (report: any) => {
    if (!report) {
      toast.error("No Report Draft Available", { description: "Please complete and save the report first." });
      return;
    }
    try {
      await downloadEventReportDocx(report);
      toast.success("Word Document Exported Successfully");
    } catch (e: any) {
      toast.error("Word Export Error", { description: e.message });
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="Post-Event Institutional Reports"
        description="Compile comprehensive outcomes, attendance demographics, financials, and accreditation records for your completed events."
        badge={{ text: "Accreditation Hub", variant: "indigo" }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Status Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Completed Events",
              count: reportItems?.length || 0,
              icon: CheckCircle2,
              color: "text-slate-900",
            },
            {
              label: "Reports Approved",
              count: reportItems?.filter((r) => r.reportStatus === "APPROVED").length || 0,
              icon: Sparkles,
              color: "text-emerald-600",
            },
            {
              label: "Under Review",
              count: reportItems?.filter((r) => r.reportStatus === "SUBMITTED").length || 0,
              icon: Clock,
              color: "text-indigo-600",
            },
            {
              label: "Action Required",
              count:
                reportItems?.filter(
                  (r) => r.reportStatus === "NOT_STARTED" || r.reportStatus === "CHANGES_REQUESTED"
                ).length || 0,
              icon: AlertTriangle,
              color: "text-amber-600",
            },
          ].map((stat, idx) => (
            <Card key={idx} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">{stat.label}</span>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className={`text-xl sm:text-2xl font-extrabold mt-1 ${stat.color}`}>
                {stat.count}
              </div>
            </Card>
          ))}
        </div>

        {/* Filter Bar */}
        <Card className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search event title, category, venue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs rounded-xl h-9"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(["ALL", "NOT_STARTED", "DRAFT", "SUBMITTED", "APPROVED"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    statusFilter === st
                      ? "bg-[#004D61] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st === "ALL"
                    ? "All Events"
                    : st === "NOT_STARTED"
                    ? "Due"
                    : st === "SUBMITTED"
                    ? "Under Review"
                    : st === "APPROVED"
                    ? "Approved"
                    : "Drafts"}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Table of Reports */}
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Event Details</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Event Date</th>
                  <th className="p-4">Turnout</th>
                  <th className="p-4">Report Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                      <span>Loading faculty reports archive...</span>
                    </td>
                  </tr>
                ) : filteredItems.length > 0 ? (
                  filteredItems.map(({ event, reportStatus, report, verifiedAttendance }) => (
                    <tr key={event.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm max-w-[280px] truncate">
                          {event.title}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[280px]">
                          {event.venueLocation}
                        </div>
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <Badge variant="secondary" className="text-[10px]">
                          {event.category}
                        </Badge>
                      </td>

                      <td className="p-4 whitespace-nowrap text-slate-500">
                        {format(event.startAt, "MMM d, yyyy")}
                      </td>

                      <td className="p-4 whitespace-nowrap font-semibold text-slate-900">
                        {verifiedAttendance ?? event.registeredCount ?? 0} attendees
                      </td>

                      <td className="p-4 whitespace-nowrap">{getStatusBadge(reportStatus)}</td>

                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {report && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadPdf(report)}
                                title="Download PDF Report"
                                className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 rounded-xl"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadDocx(report)}
                                title="Download Word (.docx) Report"
                                className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 rounded-xl"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}

                          <Button
                            asChild
                            size="sm"
                            className={`rounded-xl text-xs font-bold h-8 px-3 ${
                              reportStatus === "APPROVED"
                                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                : reportStatus === "NOT_STARTED" || reportStatus === "CHANGES_REQUESTED"
                                ? "bg-[#004D61] hover:bg-[#003847] text-white shadow-xs"
                                : "bg-slate-900 hover:bg-slate-800 text-white"
                            }`}
                          >
                            <Link to={`/faculty/events/${event.id}/report`}>
                              {reportStatus === "NOT_STARTED"
                                ? "Start Report"
                                : reportStatus === "APPROVED"
                                ? "View Report"
                                : "Edit Report"}
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                      No completed events found matching criteria.
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

export default FacultyReportsPage;
