import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "lucide-react";
import { useAdminAllReports } from "@/lib/queries/reports";
import { downloadEventReportPdf } from "@/lib/pdf/reportPdfGenerator";
import { downloadEventReportDocx } from "@/lib/docx/reportDocxGenerator";
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
import type { EventReport } from "@/types";
import { NAAC_CRITERIA, EventReportStatus } from "@/types";
import { toast } from "sonner";
import { safeFormatDate } from "@/lib/utils";

export const AdminReportsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [academicYearFilter, setAcademicYearFilter] = useState("ALL");
  const [naacFilter, setNaacFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | EventReportStatus>("ALL");

  const { data: allReports, isLoading } = useAdminAllReports();

  const filteredReports = useMemo(() => {
    if (!allReports) return [];

    return allReports.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (
        academicYearFilter !== "ALL" &&
        r.institutionalMapping?.academicYear &&
        r.institutionalMapping.academicYear !== academicYearFilter
      )
        return false;
      if (
        naacFilter !== "ALL" &&
        r.institutionalMapping?.naacCriterion &&
        r.institutionalMapping.naacCriterion !== naacFilter
      )
        return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (r.eventTitle || "").toLowerCase().includes(q);
        const matchOrganiser = (r.organiserName || "").toLowerCase().includes(q);
        const matchDept = (r.department || "").toLowerCase().includes(q);
        return matchTitle || matchOrganiser || matchDept;
      }
      return true;
    });
  }, [allReports, statusFilter, academicYearFilter, naacFilter, searchQuery]);

  // Export Accreditation CSV for NAAC AQAR Submissions
  const handleExportCsv = () => {
    if (!filteredReports || filteredReports.length === 0) {
      toast.error("No Data to Export", { description: "Current filter returned no reports." });
      return;
    }

    const headers = [
      "Event Title",
      "Department",
      "Event Date",
      "Category",
      "Organiser Name",
      "Registrations",
      "Actual Attendance",
      "Budget Spent (INR)",
      "NAAC Criterion",
      "NBA Outcomes",
      "SDG Goals",
      "Report Status",
    ];

    const rows = filteredReports.map((r) => [
      `"${r.eventTitle.replace(/"/g, '""')}"`,
      `"${r.department}"`,
      safeFormatDate(r.eventDate, "yyyy-MM-dd", "N/A"),
      r.category,
      `"${r.organiserName}"`,
      r.participation.registeredCount,
      r.participation.actualAttendance,
      r.finance.budgetSpent,
      `"${r.institutionalMapping.naacCriterion}"`,
      `"${(r.institutionalMapping.nbaProgrammeOutcomes || []).join("; ")}"`,
      `"${(r.institutionalMapping.sdgGoals || []).join(", ")}"`,
      r.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Apollo_University_NAAC_Accreditation_Report_${safeFormatDate(new Date(), "yyyyMMdd")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Accreditation CSV Exported", {
      description: "AQAR-ready spreadsheet generated.",
    });
  };

  // Bulk PDF Export
  const handleBulkExportPdf = () => {
    if (!filteredReports || filteredReports.length === 0) return;
    toast.info("Generating Dossiers", {
      description: `Exporting ${Math.min(filteredReports.length, 5)} PDF reports with Apollo letterhead.`,
    });
    filteredReports.slice(0, 5).forEach((r) => {
      downloadEventReportPdf(r);
    });
  };

  const getStatusBadge = (status: EventReportStatus) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="emerald">Approved &amp; Archived</Badge>;
      case "SUBMITTED":
        return <Badge variant="indigo">Pending Review</Badge>;
      case "CHANGES_REQUESTED":
        return <Badge variant="amber">Revisions Requested</Badge>;
      case "DRAFT":
        return <Badge variant="secondary">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="Statutory Accreditation & Post-Event Reports"
        description="Official post-event outcome repository mapped to NAAC criteria, NBA programme outcomes, and UN SDG goals."
        badge={{ text: "Accreditation Governance", variant: "amber" }}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="rounded-xl text-xs gap-1.5 h-9 bg-white shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export AQAR CSV</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleBulkExportPdf}
              className="bg-[#004D61] hover:bg-[#003847] text-white rounded-xl text-xs gap-1.5 h-9 font-bold shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Bulk PDF Dossiers</span>
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Filters Card */}
        <Card className="p-4 sm:p-6 rounded-3xl border-slate-200 shadow-2xs bg-white space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search event, organiser, dept..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs rounded-xl h-10"
              />
            </div>

            {/* Academic Year Filter */}
            <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
              <SelectTrigger className="text-xs rounded-xl h-10">
                <SelectValue placeholder="Academic Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Academic Years</SelectItem>
                <SelectItem value="2025-26">AY 2025-26</SelectItem>
                <SelectItem value="2024-25">AY 2024-25</SelectItem>
                <SelectItem value="2023-24">AY 2023-24</SelectItem>
              </SelectContent>
            </Select>

            {/* NAAC Criterion Filter */}
            <Select value={naacFilter} onValueChange={setNaacFilter}>
              <SelectTrigger className="text-xs rounded-xl h-10">
                <SelectValue placeholder="NAAC Criterion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All NAAC Criteria</SelectItem>
                {NAAC_CRITERIA.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Report Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(val: any) => setStatusFilter(val)}
            >
              <SelectTrigger className="text-xs rounded-xl h-10">
                <SelectValue placeholder="Report Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Report Statuses</SelectItem>
                <SelectItem value="SUBMITTED">Pending Review</SelectItem>
                <SelectItem value="APPROVED">Approved &amp; Archived</SelectItem>
                <SelectItem value="CHANGES_REQUESTED">Revisions Requested</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Reports Table */}
        <Card className="rounded-3xl border-slate-200 shadow-2xs overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Event Details</th>
                  <th className="p-4">Organiser &amp; Dept</th>
                  <th className="p-4">Event Date</th>
                  <th className="p-4">NAAC Criterion</th>
                  <th className="p-4">Verified Attendance</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#007A99]" />
                      <span>Loading university reports archive...</span>
                    </td>
                  </tr>
                ) : filteredReports.length > 0 ? (
                  filteredReports.map((report: EventReport) => (
                    <tr key={report.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm max-w-[260px] truncate">
                          {report.eventTitle}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {report.category} &bull; {report.venueLocation}
                        </div>
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{report.organiserName}</div>
                        <div className="text-[10px] text-slate-400">{report.department}</div>
                      </td>

                      <td className="p-4 whitespace-nowrap text-slate-500">
                        {safeFormatDate(report.eventDate, "MMM d, yyyy", "Date TBA")}
                      </td>

                      <td className="p-4 max-w-[200px] truncate text-[#004D61] font-medium">
                        {report.institutionalMapping?.naacCriterion || "Academic & Co-curricular"}
                      </td>

                      <td className="p-4 whitespace-nowrap font-bold text-slate-900">
                        {report.participation?.actualAttendance ?? 0} / {report.participation?.registeredCount ?? 0}
                      </td>

                      <td className="p-4 whitespace-nowrap">{getStatusBadge(report.status)}</td>

                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* PDF Download Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              downloadEventReportPdf(report);
                              toast.success("PDF Downloaded");
                            }}
                            className="h-8 w-8 p-0 rounded-lg text-rose-600 hover:bg-rose-50"
                            title="Download PDF Report"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </Button>

                          {/* Word (.docx) Download Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                await downloadEventReportDocx(report);
                                toast.success("Word Document Downloaded");
                              } catch (e: any) {
                                toast.error("Word Export Error", { description: e.message });
                              }
                            }}
                            className="h-8 w-8 p-0 rounded-lg text-blue-600 hover:bg-blue-50"
                            title="Download Word (.docx) Report"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>

                          {/* Review Dossier Button */}
                          <Button
                            asChild
                            size="sm"
                            className="rounded-xl text-xs font-bold h-8 px-3 bg-[#004D61] hover:bg-[#003847] text-white shadow-2xs"
                          >
                            <Link to={`/admin/reports/${report.eventId}`}>Review &rarr;</Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      No reports found matching criteria.
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

export default AdminReportsPage;
