import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import DOMPurify from "dompurify";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Download,
  Users,
  DollarSign,
  Loader2,
  FileCheck,
  ShieldCheck,
} from "lucide-react";
import { useEventReport, useReviewEventReport } from "@/lib/queries/reports";
import { generateEventReportPdf } from "@/lib/pdf/reportPdfGenerator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const AdminReportReviewPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const { data: report, isLoading } = useEventReport(eventId);
  const reviewMutation = useReviewEventReport();

  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [changesModalOpen, setChangesModalOpen] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState("");

  const handleConfirmApprove = async () => {
    if (!eventId) return;
    try {
      await reviewMutation.mutateAsync({
        eventId,
        decision: "APPROVED",
      });
      setApproveModalOpen(false);
      navigate("/admin/reports");
    } catch {
      // Handled by toast
    }
  };

  const handleConfirmChanges = async () => {
    if (!eventId) return;
    if (adminFeedback.trim().length < 15) {
      toast.error("Feedback Required", {
        description: "Please provide revision comments of at least 15 characters.",
      });
      return;
    }
    try {
      await reviewMutation.mutateAsync({
        eventId,
        decision: "CHANGES_REQUESTED",
        feedback: adminFeedback.trim(),
      });
      setChangesModalOpen(false);
      navigate("/admin/reports");
    } catch {
      // Handled by toast
    }
  };

  const handleDownloadPdf = () => {
    if (!report) return;
    const doc = generateEventReportPdf(report);
    doc.save(`Apollo_Report_${report.eventId}.pdf`);
    toast.success("Official PDF Downloaded");
  };

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Loading Post-Event Report Dossier...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto stroke-1" />
        <h2 className="text-xl font-bold text-slate-900">Report Not Found</h2>
        <p className="text-xs text-slate-500">The requested event report document does not exist.</p>
        <Button asChild variant="outline" className="rounded-xl text-xs">
          <Link to="/admin/reports">Back to Accreditation Archive</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <Link
            to="/admin/reports"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Accreditation Reports Archive</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 truncate max-w-xl">
              {report.eventTitle}
            </h1>
            <Badge
              variant={
                report.status === "APPROVED"
                  ? "emerald"
                  : report.status === "SUBMITTED"
                  ? "indigo"
                  : "amber"
              }
              className="text-xs"
            >
              {report.status}
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Organised by <strong className="text-slate-800">{report.organiserName}</strong> &bull; {report.department}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            className="rounded-xl text-xs gap-1.5 h-9"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Download Official PDF</span>
          </Button>

          {report.status !== "APPROVED" && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => setChangesModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold h-9 shadow-xs"
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                <span>Request Changes</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setApproveModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-9 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                <span>Approve &amp; Archive</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 2-Column Review Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: 7 Sections Rendered (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Executive Summary */}
          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4" />
                <span>Section 1: Executive Summary &amp; Objectives</span>
              </span>
            </div>
            <div
              className="prose prose-sm text-xs sm:text-sm text-slate-700 max-w-none leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(report.summary?.executiveSummary || "No summary provided."),
              }}
            />
          </Card>

          {/* 2. Participation Breakdown */}
          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>Section 2: Verified Attendance Metrics</span>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Registrations</span>
                <span className="text-base font-extrabold text-slate-900">{report.participation?.registeredCount ?? 0}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl">
                <span className="text-[10px] text-emerald-700 font-bold uppercase block">Turnout Count</span>
                <span className="text-base font-extrabold text-emerald-800">{report.participation?.actualAttendance ?? 0}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Student Volunteers</span>
                <span className="text-base font-extrabold text-slate-900">{report.participation?.studentVolunteersCount ?? 0}</span>
              </div>
            </div>
          </Card>

          {/* 3. Budget Statement */}
          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" />
                <span>Section 4: Financial Expenditure &amp; Balance</span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Allocated</span>
                <span className="font-bold text-slate-900">₹{(report.finance?.budgetAllocated ?? 0).toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Spent</span>
                <span className="font-bold text-rose-700">₹{(report.finance?.budgetSpent ?? 0).toLocaleString()}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl">
                <span className="text-[10px] text-emerald-700 font-bold uppercase block">Balance Remaining</span>
                <span className="font-bold text-emerald-800">₹{(report.finance?.balance ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Accreditation & Decision Card (4 Cols) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
          <Card className="rounded-3xl border-slate-200 shadow-sm bg-white p-6 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Accreditation Classification</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase block">Academic Year</span>
                <strong className="text-slate-900">{report.institutionalMapping?.academicYear || "2025-26"}</strong>
              </div>

              <div className="pt-2 border-t">
                <span className="text-slate-400 text-[10px] font-bold uppercase block">NAAC Criterion</span>
                <strong className="text-indigo-900 block">{report.institutionalMapping?.naacCriterion || "Academic & Co-curricular"}</strong>
              </div>

              <div className="pt-2 border-t">
                <span className="text-slate-400 text-[10px] font-bold uppercase block">Activity Classification</span>
                <Badge variant="secondary" className="text-[10px] font-bold">
                  {report.institutionalMapping?.activityType || "Co-curricular"}
                </Badge>
              </div>

              <div className="pt-2 border-t">
                <span className="text-slate-400 text-[10px] font-bold uppercase block">Certificates Issued</span>
                <strong className="text-slate-900">
                  {report.institutionalMapping?.certificatesIssuedCount || report.participation?.registeredCount || 0} Verified E-Certificates
                </strong>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Approve Modal */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader className="text-left space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Grant Official Report Clearance?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              This will approve <strong className="text-slate-900">"{report.eventTitle}"</strong> and archive it into the University Statutory Accreditation repository.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setApproveModalOpen(false)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmApprove} className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Confirm &amp; Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Changes Modal */}
      <Dialog open={changesModalOpen} onOpenChange={setChangesModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader className="text-left space-y-1">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Request Report Revisions
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Provide specific feedback on required data, financial clarifications, or photo additions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-2 text-xs">
            <label className="font-bold text-slate-700">Revision Comments to Organiser *</label>
            <Textarea
              placeholder="e.g. Please attach the signed attendance sheets and itemize the speaker honorarium receipt..."
              value={adminFeedback}
              onChange={(e) => setAdminFeedback(e.target.value)}
              rows={4}
              className="text-xs rounded-xl"
            />
          </div>

          <DialogFooter className="pt-3 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setChangesModalOpen(false)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmChanges} className="rounded-xl text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold">
              Send Revision Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AdminReportReviewPage;
