import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import DOMPurify from "dompurify";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Loader2,
  MessageSquare,
  FileCheck,
  Check,
} from "lucide-react";
import { useEventDetail } from "@/lib/queries/events";
import {
  useOrganiserStats,
  useVenueConflicts,
  useApproveEvent,
  useRejectEvent,
} from "@/lib/queries/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const QUICK_PICK_REASONS = [
  "Incomplete event details or description",
  "Venue clash with existing approved university event",
  "Date conflict with examination or institutional schedule",
  "Pricing structure needs further review & justification",
  "Violates campus safety or event policy guidelines",
  "Missing required faculty mentor endorsements",
];

export const AdminEventReviewPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const { data: event, isLoading: isEventLoading } = useEventDetail(eventId);
  const { data: organiserStats } = useOrganiserStats(event?.organiserId);
  const { data: venueConflicts } = useVenueConflicts(
    event?.venueLocation,
    event?.startAt,
    event?.endAt,
    eventId
  );

  const approveMutation = useApproveEvent();
  const rejectMutation = useRejectEvent();

  // Reviewer Decision State
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [checklist, setChecklist] = useState({
    detailsComplete: false,
    datesSensible: false,
    venueAvailable: false,
    pricingAppropriate: false,
    descriptionFreeOfErrors: false,
  });

  // Modal States
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<"REJECTED" | "CHANGES_REQUESTED">("CHANGES_REQUESTED");
  const [rejectionReason, setRejectionReason] = useState("");

  const toggleChecklist = (key: keyof typeof checklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirmApprove = async () => {
    if (!eventId) return;
    try {
      await approveMutation.mutateAsync({
        eventId,
        reviewerNotes,
        notifyDepartmentStudents: true,
      });
      setApproveModalOpen(false);
      navigate("/admin/approvals");
    } catch {
      // Error handled by mutation toast
    }
  };

  const handleConfirmReject = async () => {
    if (!eventId) return;
    if (rejectionReason.trim().length < 20) {
      toast.error("Explanation Too Short", {
        description: "Please provide a detailed comment of at least 20 characters.",
      });
      return;
    }

    try {
      await rejectMutation.mutateAsync({
        eventId,
        decision: decisionType,
        reason: rejectionReason.trim(),
        reviewerNotes,
      });
      setRejectModalOpen(false);
      navigate("/admin/approvals");
    } catch {
      // Error handled by mutation toast
    }
  };

  if (isEventLoading) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Loading event review dossier...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto stroke-1" />
        <h2 className="text-xl font-bold text-slate-900">Event Not Found</h2>
        <p className="text-xs text-slate-500">The requested event review document does not exist.</p>
        <Button asChild variant="outline" className="rounded-xl text-xs">
          <Link to="/admin/approvals">Back to Approvals Queue</Link>
        </Button>
      </div>
    );
  }

  const sanitizedDescription = DOMPurify.sanitize(event.description);
  const waitingDays = event.createdAt ? differenceInDays(new Date(), event.createdAt) : 0;

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <Link
            to="/admin/approvals"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Approvals Queue</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 truncate max-w-xl">
              {event.title}
            </h1>
            <Badge variant="amber" className="text-xs shrink-0">
              Pending Review
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={waitingDays > 5 ? "destructive" : waitingDays > 2 ? "amber" : "secondary"}
            className="text-xs py-1 px-3"
          >
            <Clock className="w-3.5 h-3.5 mr-1" />
            <span>Waiting {waitingDays} {waitingDays === 1 ? "day" : "days"}</span>
          </Badge>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SPLIT REVIEW SCREEN: 2 COLUMNS */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Student-Facing Detail Page Preview (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Applicant Preview Dossier
            </span>
            <Badge variant="outline" className="text-[10px]">
              Exact Student View
            </Badge>
          </div>

          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
            {/* Banner */}
            <div className="aspect-video w-full bg-slate-950 relative overflow-hidden">
              {event.bannerUrl ? (
                <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-indigo-950 via-indigo-900 to-slate-900 flex items-center justify-center text-white">
                  <Sparkles className="w-12 h-12 text-amber-300" />
                </div>
              )}
              <div className="absolute top-4 left-4 flex gap-2">
                <Badge variant="indigo" className="bg-white/90 text-indigo-950 font-bold backdrop-blur-md">
                  {event.category}
                </Badge>
              </div>
            </div>

            <CardContent className="p-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{event.title}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                  <span>Organised by</span>
                  <strong className="text-slate-800">{event.organiserName}</strong>
                  <span>&bull;</span>
                  <span>{event.department}</span>
                </div>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Schedule</span>
                    <span className="font-semibold text-slate-900">{format(event.startAt, "EEEE, MMMM d, yyyy")}</span>
                    <div className="text-[11px] text-slate-500">
                      {format(event.startAt, "h:mm a")} – {format(event.endAt, "h:mm a")}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Venue &amp; Mode</span>
                    <span className="font-semibold text-slate-900">{event.venueLocation}</span>
                    <div className="text-[11px] text-indigo-600 font-medium">{event.venueType}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2 border-t sm:border-t-0 sm:pt-0">
                  <Users className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Capacity Limit</span>
                    <span className="font-semibold text-slate-900">{event.capacity} Attendees</span>
                    <div className="text-[11px] text-slate-500">
                      {event.allowWaitlist ? "Waitlist Enabled" : "Waitlist Disabled"} &bull; Max Team: {event.maxTeamSize}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2 border-t sm:border-t-0 sm:pt-0">
                  <DollarSign className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Registration Fee</span>
                    <span className="font-bold text-slate-900">
                      {event.isPaid ? `₹${event.price}` : "Free Admission"}
                    </span>
                    <div className="text-[11px] text-slate-500">
                      Closes: {format(event.registrationDeadline, "MMM d, h:mm a")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Rich Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</h3>
                <div
                  className="prose prose-sm text-xs sm:text-sm text-slate-700 max-w-none leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                />
              </div>

              {/* Eligibility & Prerequisites */}
              {(event.eligibility || event.prerequisites) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t text-xs">
                  {event.eligibility && (
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Eligibility</span>
                      <p className="text-slate-800 pt-0.5">{event.eligibility}</p>
                    </div>
                  )}
                  {event.prerequisites && (
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Prerequisites</span>
                      <p className="text-slate-800 pt-0.5">{event.prerequisites}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Sticky Decision Panel (5 Cols) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Administrative Decision Panel
            </span>
            <Badge variant="indigo" className="text-[10px]">
              Gate Review
            </Badge>
          </div>

          {/* 1. Organiser Summary Card */}
          <Card className="rounded-3xl border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-slate-50 border-b">
              <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Organiser Credibility Profile</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Applicant:</span>
                <span className="font-bold text-slate-900">{event.organiserName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Department:</span>
                <span className="font-medium text-slate-800">{event.department}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t">
                <span className="text-slate-500">Historical Track Record:</span>
                <span className="font-extrabold text-indigo-700">
                  {organiserStats?.approvedEventsCount || 0} approved ({organiserStats?.totalEventsHosted || 0} total)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 2. Venue Conflict Detector Block */}
          {venueConflicts && venueConflicts.length > 0 ? (
            <Card className="rounded-3xl border-rose-300 bg-rose-50/70 shadow-sm overflow-hidden animate-fade-in">
              <CardHeader className="p-4 pb-2 border-b border-rose-200 bg-rose-100/50">
                <CardTitle className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Venue Clash Warning ({venueConflicts.length} Conflict)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs text-rose-900">
                <p className="text-[11px] leading-relaxed">
                  Another approved event is scheduled at <strong>{event.venueLocation}</strong> during this exact time window:
                </p>
                {venueConflicts.map((c) => (
                  <div key={c.id} className="p-2.5 bg-white rounded-xl border border-rose-200 text-xs">
                    <strong className="block text-slate-900">{c.title}</strong>
                    <span className="text-[10px] text-slate-500">
                      {format(c.startAt, "h:mm a")} – {format(c.endAt, "h:mm a")} &bull; {c.organiserName}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Venue Schedule Clear: No overlapping events detected.</span>
            </div>
          )}

          {/* 3. Administrative Quality Checklist */}
          <Card className="rounded-3xl border-slate-200 shadow-sm bg-white p-4 space-y-3">
            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-indigo-600" />
              <span>Policy &amp; Quality Checklist</span>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              {[
                { key: "detailsComplete", label: "Title, category & overview complete" },
                { key: "datesSensible", label: "Timelines & registration deadlines sensible" },
                { key: "venueAvailable", label: "Venue booking verified & mode appropriate" },
                { key: "pricingAppropriate", label: "Pricing structure matches university norms" },
                { key: "descriptionFreeOfErrors", label: "Description compliant with code of conduct" },
              ].map(({ key, label }) => {
                const checked = checklist[key as keyof typeof checklist];
                return (
                  <label
                    key={key}
                    onClick={() => toggleChecklist(key as keyof typeof checklist)}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                        checked ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300"
                      }`}
                    >
                      {checked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className={`text-[11px] ${checked ? "font-semibold text-slate-900" : "text-slate-600"}`}>
                      {label}
                    </span>
                  </label>
                );
              })}
            </div>
          </Card>

          {/* 4. Internal Reviewer Notes */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-slate-800 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                <span>Internal Reviewer Notes</span>
              </label>
              <span className="text-[10px] text-slate-400 italic">Not visible to faculty</span>
            </div>
            <Textarea
              placeholder="Private audit log notes for admin board records..."
              value={reviewerNotes}
              onChange={(e) => setReviewerNotes(e.target.value)}
              rows={3}
              className="text-xs rounded-xl bg-white"
            />
          </div>

          {/* 5. Tri-State Decision Action Bar */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <Button
              type="button"
              onClick={() => setApproveModalOpen(true)}
              className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 shadow-sm gap-1"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve</span>
            </Button>

            <Button
              type="button"
              onClick={() => {
                setDecisionType("CHANGES_REQUESTED");
                setRejectModalOpen(true);
              }}
              className="rounded-xl text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold h-11 shadow-sm gap-1"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Request Changes</span>
            </Button>

            <Button
              type="button"
              onClick={() => {
                setDecisionType("REJECTED");
                setRejectModalOpen(true);
              }}
              className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold h-11 shadow-sm gap-1"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject</span>
            </Button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* APPROVE CONFIRMATION DIALOG */}
      {/* =================================================================== */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader className="text-left space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Publish Event to Campus Catalog?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              This will update <strong className="text-slate-900">"{event.title}"</strong> to{" "}
              <strong className="text-emerald-700">PUBLISHED</strong>. Students will immediately be able to browse and register.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApproveModalOpen(false)}
              disabled={approveMutation.isPending}
              className="w-full sm:w-auto rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmApprove}
              disabled={approveMutation.isPending}
              className="w-full sm:w-auto rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <span>Confirm &amp; Publish</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =================================================================== */}
      {/* REJECT / REQUEST CHANGES DIALOG */}
      {/* =================================================================== */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6">
          <DialogHeader className="text-left space-y-1">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                decisionType === "CHANGES_REQUESTED"
                  ? "bg-amber-50 text-amber-600"
                  : "bg-rose-50 text-rose-600"
              }`}
            >
              {decisionType === "CHANGES_REQUESTED" ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <XCircle className="w-6 h-6" />
              )}
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {decisionType === "CHANGES_REQUESTED"
                ? "Request Revisions from Organiser"
                : "Reject Event Proposal"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Provide constructive feedback to the faculty organiser. Minimum 20 characters required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Quick Pick Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-600">Quick-Pick Standard Feedback:</span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PICK_REASONS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setRejectionReason((prev) => (prev ? `${prev}. ${chip}` : chip))}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] text-slate-700 text-left transition-colors"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment Textarea */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-slate-700">Detailed Feedback to Faculty *</label>
                <span className={`text-[10px] ${rejectionReason.length < 20 ? "text-rose-600 font-bold" : "text-emerald-600"}`}>
                  {rejectionReason.length} / 20 min chars
                </span>
              </div>
              <Textarea
                placeholder="Explain the required revisions, policy conflicts, or rescheduling instructions..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 flex flex-col sm:flex-row items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectModalOpen(false)}
              disabled={rejectMutation.isPending}
              className="w-full sm:w-auto rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmReject}
              disabled={rejectMutation.isPending || rejectionReason.trim().length < 20}
              className={`w-full sm:w-auto rounded-xl text-xs text-white font-bold ${
                decisionType === "CHANGES_REQUESTED"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : decisionType === "CHANGES_REQUESTED" ? (
                <span>Send Revision Request</span>
              ) : (
                <span>Confirm Rejection</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AdminEventReviewPage;
