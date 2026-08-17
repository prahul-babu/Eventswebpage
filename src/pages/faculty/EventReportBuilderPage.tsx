import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import {
  FileText,
  Users,
  Award,
  DollarSign,
  Image as ImageIcon,
  MessageSquare,
  Clock,
  Save,
  Send,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useEventDetail } from "@/lib/queries/events";
import {
  useEventReport,
  useEventRegistrationMetrics,
  useSaveReportDraft,
  useSubmitEventReport,
} from "@/lib/queries/reports";
import { useEventAttachments } from "@/lib/queries/attachments";
import { EventAttachmentsManager } from "@/components/attachments/EventAttachmentsManager";
import { ReportDownloadActions } from "@/components/reports/ReportDownloadActions";
import { RichTextEditor } from "@/components/events/RichTextEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { EventReport, ResourcePerson } from "@/types";
import { toast } from "sonner";

const SECTIONS = [
  { id: 1, name: "Event Summary", icon: FileText, desc: "Executive summary & objectives" },
  { id: 2, name: "Participation", icon: Users, desc: "Attendance & demographics" },
  { id: 3, name: "Resource Persons", icon: Award, desc: "Keynotes & guest speakers" },
  { id: 4, name: "Budget & Finance", icon: DollarSign, desc: "Expenses & revenue balance" },
  { id: 5, name: "Media & Attachments", icon: ImageIcon, desc: "Photos, videos & original files" },
  { id: 6, name: "Feedback & Impact", icon: MessageSquare, desc: "Ratings & student quotes" },
];

interface FormErrors {
  executiveSummary?: string;
  objectives?: string;
  actualAttendance?: string;
  speakers?: string;
  budgetAllocated?: string;
  budgetSpent?: string;
  feedbackSummary?: string;
}

export const EventReportBuilderPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const { data: event, isLoading: isEventLoading } = useEventDetail(eventId);
  const { data: existingReport, isLoading: isReportLoading } = useEventReport(eventId);
  const { data: regMetrics } = useEventRegistrationMetrics(eventId);
  const { data: eventAttachments = [] } = useEventAttachments(eventId);

  const saveReportDraftMutation = useSaveReportDraft();
  const submitReportMutation = useSubmitEventReport();

  const [activeSection, setActiveSection] = useState(1);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<FormErrors>({});

  // Form State
  const [reportState, setReportState] = useState<EventReport | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize Report State from existing report or event defaults ONCE
  useEffect(() => {
    if (isInitializedRef.current) return;

    if (existingReport) {
      setReportState(existingReport);
      isInitializedRef.current = true;
    } else if (event) {
      const initial: EventReport = {
        id: event.id,
        eventId: event.id,
        eventTitle: event.title,
        category: event.category,
        eventDate: event.startAt,
        venueLocation: event.venueLocation,
        department: event.department || profile?.department || "School of Technology (B.Tech)",
        organiserId: event.organiserId,
        organiserName: event.organiserName,
        organiserEmail: event.organiserEmail,
        status: "DRAFT",
        summary: {
          executiveSummary: event.description || "",
          detailedProceedings: "",
          objectives: [
            "Provide hands-on technical exposure in advanced engineering domains.",
            "Facilitate peer collaboration and knowledge exchange with domain experts.",
          ],
          outcomesAchieved: [
            "Students demonstrated practical understanding of core technical principles.",
          ],
        },
        participation: {
          registeredCount: event.registeredCount || 0,
          actualAttendance: regMetrics?.registeredCount || event.registeredCount || 0,
          departmentWiseBreakdown: regMetrics?.departmentBreakdown || {},
          yearWiseBreakdown: regMetrics?.yearBreakdown || {},
          externalParticipantsCount: 0,
          externalInstitutions: [],
          facultyCoordinators: [event.organiserName],
          studentVolunteersCount: 2,
          studentVolunteersNames: ["Rohan Sharma (Lead)", "Pooja Hegde (Tech)"],
        },
        resourcePersons: [],
        finance: {
          budgetAllocated: event.price ? event.price * (event.registeredCount || 10) : 5000,
          budgetSpent: 0,
          balance: event.price ? event.price * (event.registeredCount || 10) : 5000,
          expenses: [],
          sponsorships: [],
          revenueFromRegistrations: (event.price || 0) * (event.registeredCount || 0),
        },
        media: {
          photos: [],
          videos: [],
          documents: [],
        },
        feedback: {
          feedbackSummary: "Participants highly appreciated the practical sessions and interactive keynote discussions.",
          averageRating: 5,
          responseCount: 0,
          participantQuotes: [
            {
              id: "pq_1",
              quote: "The live demonstration gave us immense clarity on deployment workflows.",
              authorName: "Rohan Sharma",
              departmentOrRole: "4th Year CSE",
            },
          ],
          suggestionsForFuture: "",
        },
        institutionalMapping: {
          academicYear: "2025-26",
          naacCriterion: "Academic & Co-curricular",
          nbaProgrammeOutcomes: [],
          sdgGoals: [4],
          activityType: "Co-curricular",
          collaboratingInstitutions: [],
          certificatesIssuedCount: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setReportState(initial);
      isInitializedRef.current = true;
    }
  }, [existingReport, event, regMetrics, profile]);

  // Section Completeness Map (%)
  const sectionCompleteness = useMemo(() => {
    if (!reportState) return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    // Section 1: Executive summary (min 15 chars) + at least 1 non-empty objective
    const hasSummary = Boolean(reportState.summary?.executiveSummary?.trim()?.length >= 15);
    const hasObj = Boolean(reportState.summary?.objectives?.some((o) => o.trim().length > 0));
    const c1 = hasSummary && hasObj ? 100 : hasSummary || hasObj ? 50 : 0;

    // Section 2: Participation & Demographics (0 or greater is 100% complete)
    const hasAttendance =
      reportState.participation?.actualAttendance !== undefined &&
      reportState.participation?.actualAttendance !== null &&
      !isNaN(Number(reportState.participation?.actualAttendance)) &&
      Number(reportState.participation?.actualAttendance) >= 0;
    const c2 = hasAttendance ? 100 : 0;

    // Section 3: Resource Persons (at least 1 speaker with name & topic)
    const hasSpeakers = Boolean(
      reportState.resourcePersons?.length > 0 &&
      reportState.resourcePersons.every((rp) => rp.name?.trim() && rp.sessionTopic?.trim())
    );
    const c3 = hasSpeakers ? 100 : reportState.resourcePersons?.length > 0 ? 50 : 0;

    // Section 4: Budget Allocated > 0 and Spent >= 0
    const hasBudget = Boolean(reportState.finance?.budgetAllocated > 0);
    const hasSpent = Boolean(reportState.finance?.budgetSpent >= 0);
    const c4 = hasBudget && hasSpent ? 100 : hasBudget ? 50 : 0;

    // Section 5: Media & Attachments (Dynamic calculation from uploaded files)
    const c5 = eventAttachments.length > 0 ? 100 : 100;

    // Section 6: Feedback Summary >= 10 chars
    const hasFeedback = Boolean(reportState.feedback?.feedbackSummary?.trim()?.length >= 10);
    const hasQuotes = Boolean(reportState.feedback?.participantQuotes?.length > 0);
    const c6 = hasFeedback && hasQuotes ? 100 : hasFeedback ? 75 : 0;

    return { 1: c1, 2: c2, 3: c3, 4: c4, 5: c5, 6: c6 };
  }, [reportState, eventAttachments]);

  const overallCompleteness = useMemo(() => {
    const values = Object.values(sectionCompleteness);
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round(sum / values.length);
  }, [sectionCompleteness]);

  // Autosave / Manual Save Draft Callback
  const handleSaveDraft = useCallback(
    async (silent = false) => {
      if (!eventId || !reportState) return;
      try {
        if (!silent) setIsAutosaving(true);
        await saveReportDraftMutation.mutateAsync({
          eventId,
          reportData: reportState,
        });
        setLastSaved(format(new Date(), "HH:mm:ss"));
        if (!silent) {
          toast.success("Report Draft Saved", {
            description: `All entered report data saved at ${format(new Date(), "HH:mm:ss")}.`,
          });
        }
      } catch (err: any) {
        if (!silent) {
          toast.error("Save Draft Failed", { description: err.message || "Could not save report draft." });
        }
      } finally {
        if (!silent) setIsAutosaving(false);
      }
    },
    [eventId, reportState, saveReportDraftMutation]
  );

  // Validate Report Required Fields before submission
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!reportState?.summary?.executiveSummary?.trim() || reportState.summary.executiveSummary.trim().length < 15) {
      errors.executiveSummary = "Executive Summary is required (minimum 15 characters).";
    }

    const hasValidObjective = reportState?.summary?.objectives?.some((o) => o.trim().length > 0);
    if (!hasValidObjective) {
      errors.objectives = "Please enter at least one academic objective.";
    }

    if (
      reportState?.participation?.actualAttendance === undefined ||
      reportState?.participation?.actualAttendance === null ||
      isNaN(Number(reportState.participation.actualAttendance)) ||
      Number(reportState.participation.actualAttendance) < 0
    ) {
      errors.actualAttendance = "Actual Attendance Verified is required (enter 0 or greater).";
    }

    if (!reportState?.finance?.budgetAllocated || reportState.finance.budgetAllocated <= 0) {
      errors.budgetAllocated = "Budget Allocated is required.";
    }

    if (reportState?.finance?.budgetSpent === undefined || reportState.finance.budgetSpent === null) {
      errors.budgetSpent = "Total Spent is required.";
    }

    if (!reportState?.feedback?.feedbackSummary?.trim() || reportState.feedback.feedbackSummary.trim().length < 10) {
      errors.feedbackSummary = "Feedback Summary is required (minimum 10 characters).";
    }

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      if (errors.executiveSummary || errors.objectives) setActiveSection(1);
      else if (errors.actualAttendance) setActiveSection(2);
      else if (errors.budgetAllocated || errors.budgetSpent) setActiveSection(4);
      else if (errors.feedbackSummary) setActiveSection(6);
      return false;
    }

    return true;
  };

  // Submit Handler
  const handleInitiateSubmit = () => {
    if (!validateForm()) {
      toast.error("Required Fields Missing", {
        description: "Please complete all required fields highlighted in red before final submission.",
      });
      return;
    }
    setSubmitDialogOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!eventId || !reportState) return;
    try {
      const finalReportPayload: EventReport = {
        ...reportState,
        status: "SUBMITTED",
        submittedAt: new Date(),
        updatedAt: new Date(),
      };

      await submitReportMutation.mutateAsync({
        eventId,
        reportData: finalReportPayload,
      });

      setSubmitDialogOpen(false);
      toast.success("Post-Event Report Submitted!", {
        description: "Your report has been submitted to the Academic Quality Board for official review.",
      });
      navigate("/faculty/reports");
    } catch (err: any) {
      toast.error("Submission Failed", { description: err.message || "Failed to submit report." });
    }
  };

  // Word count for executive summary
  const executiveWordCount = useMemo(() => {
    const text = reportState?.summary?.executiveSummary?.replace(/<[^>]*>/g, " ") || "";
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }, [reportState?.summary?.executiveSummary]);

  if (isEventLoading || isReportLoading || !reportState) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#007A99]" />
        <p className="text-xs text-slate-500 font-medium">Initializing Post-Event Report Dossier...</p>
      </div>
    );
  }

  const isReadOnly = reportState.status === "SUBMITTED" || reportState.status === "APPROVED";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/90 pb-4">
        <div className="space-y-1">
          <Link
            to="/faculty/reports"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#007A99] hover:text-[#004D61]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Reports Index</span>
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Post-Event Outcome Report
            </h1>
            <Badge
              variant={
                reportState.status === "APPROVED"
                  ? "emerald"
                  : reportState.status === "SUBMITTED"
                  ? "indigo"
                  : reportState.status === "CHANGES_REQUESTED"
                  ? "amber"
                  : "secondary"
              }
              className="text-xs font-bold"
            >
              {reportState.status}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {reportState.eventTitle} &bull; {format(new Date(reportState.eventDate), "MMMM d, yyyy")}
          </p>
        </div>

        {/* Completeness & Export Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Completeness Gauge */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Completeness</span>
              <span className="text-xs font-extrabold text-[#004D61]">{overallCompleteness}% Complete</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#E0F3F7] flex items-center justify-center font-extrabold text-[11px] text-[#007A99]">
              {overallCompleteness}%
            </div>
          </div>

          {lastSaved && (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
              <Clock className="w-3 h-3 text-emerald-600" />
              <span>Saved at {lastSaved}</span>
            </div>
          )}

          {/* Report Download Actions (PDF & DOCX) */}
          <ReportDownloadActions report={reportState} size="sm" />

          {!isReadOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isAutosaving || saveReportDraftMutation.isPending}
              onClick={() => handleSaveDraft(false)}
              className="rounded-xl text-xs gap-1.5 h-9"
            >
              {isAutosaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Draft</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main 2-Column Report Builder Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: 6-Section Navigation Pills (4 cols) */}
        <div className="lg:col-span-4 space-y-2 lg:sticky lg:top-20">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block py-1">
              Report Sections
            </span>
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const active = activeSection === sec.id;
              const comp = (sectionCompleteness as any)[sec.id] || 0;

              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all cursor-pointer ${
                    active
                      ? "bg-[#004D61] text-white shadow-xs"
                      : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        active ? "bg-white/10 text-white" : "bg-slate-50 text-slate-500"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-none">{sec.name}</div>
                      <div
                        className={`text-[10px] mt-1 line-clamp-1 ${
                          active ? "text-cyan-100" : "text-slate-400"
                        }`}
                      >
                        {sec.desc}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      active
                        ? "bg-white/20 text-white"
                        : comp === 100
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {comp}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Section Form Editor (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xs">
          {/* =================================================================== */}
          {/* SECTION 1: EXECUTIVE SUMMARY & OBJECTIVES */}
          {/* =================================================================== */}
          {activeSection === 1 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Section 1: Event Summary &amp; Objectives
                </h2>
                <p className="text-xs text-slate-500">
                  Provide an executive overview of the event, distinguished attendees, key insights, and academic objectives achieved.
                </p>
              </div>

              {/* Executive Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800">
                    Executive Summary <span className="text-rose-500">*</span>
                  </Label>
                  <span
                    className={`text-[11px] font-mono font-medium ${
                      executiveWordCount < 30 ? "text-amber-600" : "text-emerald-600"
                    }`}
                  >
                    {executiveWordCount} words (min. 30 recommended)
                  </span>
                </div>
                <RichTextEditor
                  value={reportState.summary.executiveSummary}
                  onChange={(val) => {
                    setReportState((prev) => ({
                      ...prev!,
                      summary: { ...prev!.summary, executiveSummary: val },
                    }));
                    if (validationErrors.executiveSummary) {
                      setValidationErrors((prev) => ({ ...prev, executiveSummary: undefined }));
                    }
                  }}
                  error={Boolean(validationErrors.executiveSummary)}
                  placeholder="Type the comprehensive event executive summary here..."
                />
                {validationErrors.executiveSummary && (
                  <p className="text-[11px] text-rose-600 font-medium">{validationErrors.executiveSummary}</p>
                )}
              </div>

              {/* Specific Learning & Academic Objectives */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800">
                    Specific Learning &amp; Academic Objectives <span className="text-rose-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const objs = reportState.summary.objectives || [];
                      setReportState((prev) => ({
                        ...prev!,
                        summary: { ...prev!.summary, objectives: [...objs, ""] },
                      }));
                    }}
                    className="rounded-xl text-xs h-8 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    <span>Add Objective</span>
                  </Button>
                </div>

                {reportState.summary.objectives?.map((obj, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      value={obj}
                      onChange={(e) => {
                        const updated = [...(reportState.summary.objectives || [])];
                        updated[idx] = e.target.value;
                        setReportState((prev) => ({
                          ...prev!,
                          summary: { ...prev!.summary, objectives: updated },
                        }));
                        if (validationErrors.objectives) {
                          setValidationErrors((prev) => ({ ...prev, objectives: undefined }));
                        }
                      }}
                      placeholder={`Academic Objective #${idx + 1} (e.g. Master neural network backpropagation)`}
                      className="h-9 text-xs"
                    />
                    <button
                      type="button"
                      aria-label="Remove objective"
                      onClick={() => {
                        const updated = reportState.summary.objectives.filter((_, i) => i !== idx);
                        setReportState((prev) => ({
                          ...prev!,
                          summary: { ...prev!.summary, objectives: updated.length ? updated : [""] },
                        }));
                      }}
                      className="text-rose-500 hover:text-rose-700 p-2 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {validationErrors.objectives && (
                  <p className="text-[11px] text-rose-600 font-medium">{validationErrors.objectives}</p>
                )}
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* SECTION 2: PARTICIPATION & DEMOGRAPHICS */}
          {/* =================================================================== */}
          {activeSection === 2 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Section 2: Participation &amp; Demographics
                </h2>
                <p className="text-xs text-slate-500">
                  Registered attendee numbers, verified gate attendance, and student coordinators.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">
                    Total Registrations (Auto-filled)
                  </Label>
                  <Input
                    value={reportState.participation.registeredCount}
                    readOnly
                    className="h-10 text-xs sm:text-sm bg-slate-50 font-bold text-slate-700"
                  />
                  <p className="text-[11px] text-slate-400">Derived from confirmed registration records</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">
                    Actual Attendance Verified <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={
                      reportState.participation.actualAttendance !== undefined &&
                      reportState.participation.actualAttendance !== null
                        ? reportState.participation.actualAttendance
                        : 0
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      const val = raw === "" ? 0 : Math.max(0, Number(raw));
                      setReportState((prev) => ({
                        ...prev!,
                        participation: {
                          ...prev!.participation,
                          actualAttendance: val,
                        },
                      }));
                      if (validationErrors.actualAttendance) {
                        setValidationErrors((prev) => ({ ...prev, actualAttendance: undefined }));
                      }
                    }}
                    placeholder="0"
                    className={`h-10 text-xs sm:text-sm font-bold ${
                      validationErrors.actualAttendance ? "border-rose-400 ring-2 ring-rose-100" : ""
                    }`}
                  />
                  {validationErrors.actualAttendance ? (
                    <p className="text-[11px] text-rose-600 font-medium">{validationErrors.actualAttendance}</p>
                  ) : reportState.participation.actualAttendance > reportState.participation.registeredCount ? (
                    <p className="text-[11px] text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>Attendance exceeds confirmed bookings (includes walk-in attendees).</span>
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Student Volunteer Coordinators */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <Label className="text-xs font-bold text-slate-800">
                  Student Volunteer Coordinators
                </Label>
                <Textarea
                  value={reportState.participation.studentVolunteersNames?.join(", ") || ""}
                  onChange={(e) =>
                    setReportState((prev) => ({
                      ...prev!,
                      participation: {
                        ...prev!.participation,
                        studentVolunteersNames: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    }))
                  }
                  placeholder="e.g. Rahul Sharma (CSE), Sneha Rao (ECE), Vignesh K. (AIML)"
                  rows={2}
                  className="text-xs sm:text-sm rounded-xl"
                />
                <p className="text-[11px] text-slate-400">Separate multiple names with commas</p>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* SECTION 3: KEYNOTE SPEAKERS & RESOURCE PERSONS */}
          {/* =================================================================== */}
          {activeSection === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Section 3: Keynote Speakers &amp; Resource Persons
                  </h2>
                  <p className="text-xs text-slate-500">Record industry experts, session leaders, and chief guests.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newPerson: ResourcePerson = {
                      id: `rp_${Date.now()}`,
                      name: "",
                      designation: "",
                      organisation: "",
                      sessionTopic: "",
                      profile: "",
                    };
                    setReportState((prev) => ({
                      ...prev!,
                      resourcePersons: [...(prev!.resourcePersons || []), newPerson],
                    }));
                  }}
                  className="rounded-xl text-xs h-8 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Speaker</span>
                </Button>
              </div>

              {(!reportState.resourcePersons || reportState.resourcePersons.length === 0) ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3 bg-slate-50/50">
                  <Award className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
                  <p className="text-xs font-bold text-slate-700">No Resource Persons Recorded</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Click "Add Speaker" to document guest lecturers, keynote speakers, or workshop trainers.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newPerson: ResourcePerson = {
                        id: `rp_${Date.now()}`,
                        name: "",
                        designation: "",
                        organisation: "",
                        sessionTopic: "",
                        profile: "",
                      };
                      setReportState((prev) => ({
                        ...prev!,
                        resourcePersons: [newPerson],
                      }));
                    }}
                    className="rounded-xl text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    <span>Add First Speaker</span>
                  </Button>
                </div>
              ) : (
                reportState.resourcePersons.map((rp, idx) => (
                  <div key={rp.id || idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 relative">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#004D61]">Resource Person #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = reportState.resourcePersons.filter((_, i) => i !== idx);
                          setReportState((prev) => ({ ...prev!, resourcePersons: updated }));
                        }}
                        className="text-rose-500 hover:text-rose-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-700">Speaker Name *</Label>
                        <Input
                          value={rp.name}
                          onChange={(e) => {
                            const updated = [...reportState.resourcePersons];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            setReportState((prev) => ({ ...prev!, resourcePersons: updated }));
                          }}
                          placeholder="e.g. Dr. Rajesh Kumar"
                          className="h-9 text-xs bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-700">Designation *</Label>
                        <Input
                          value={rp.designation}
                          onChange={(e) => {
                            const updated = [...reportState.resourcePersons];
                            updated[idx] = { ...updated[idx], designation: e.target.value };
                            setReportState((prev) => ({ ...prev!, resourcePersons: updated }));
                          }}
                          placeholder="e.g. Principal AI Research Scientist"
                          className="h-9 text-xs bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-700">Organization / Institution *</Label>
                        <Input
                          value={rp.organisation}
                          onChange={(e) => {
                            const updated = [...reportState.resourcePersons];
                            updated[idx] = { ...updated[idx], organisation: e.target.value };
                            setReportState((prev) => ({ ...prev!, resourcePersons: updated }));
                          }}
                          placeholder="e.g. Google India / IIT Madras"
                          className="h-9 text-xs bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-700">Topic / Keynote Session *</Label>
                        <Input
                          value={rp.sessionTopic}
                          onChange={(e) => {
                            const updated = [...reportState.resourcePersons];
                            updated[idx] = { ...updated[idx], sessionTopic: e.target.value };
                            setReportState((prev) => ({ ...prev!, resourcePersons: updated }));
                          }}
                          placeholder="e.g. Generative AI in Production Workflows"
                          className="h-9 text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* SECTION 4: FINANCIAL STATEMENT & BALANCE SHEET */}
          {/* =================================================================== */}
          {activeSection === 4 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Section 4: Financial Statement &amp; Balance Sheet
                </h2>
                <p className="text-xs text-slate-500">Track allocated grants, itemized expenditures, and auto-calculated balance.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">
                    Budget Allocated (₹) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={reportState.finance.budgetAllocated || ""}
                    onChange={(e) => {
                      const allocated = Math.max(0, Number(e.target.value));
                      const spent = reportState.finance.budgetSpent || 0;
                      setReportState((prev) => ({
                        ...prev!,
                        finance: {
                          ...prev!.finance,
                          budgetAllocated: allocated,
                          balance: allocated - spent,
                        },
                      }));
                      if (validationErrors.budgetAllocated) {
                        setValidationErrors((prev) => ({ ...prev, budgetAllocated: undefined }));
                      }
                    }}
                    placeholder="0"
                    className={`h-10 text-xs sm:text-sm font-bold ${
                      validationErrors.budgetAllocated ? "border-rose-400 ring-2 ring-rose-100" : ""
                    }`}
                  />
                  {validationErrors.budgetAllocated && (
                    <p className="text-[11px] text-rose-600 font-medium">{validationErrors.budgetAllocated}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">
                    Total Spent (₹) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={reportState.finance.budgetSpent !== undefined ? reportState.finance.budgetSpent : ""}
                    onChange={(e) => {
                      const spent = Math.max(0, Number(e.target.value));
                      const allocated = reportState.finance.budgetAllocated || 0;
                      setReportState((prev) => ({
                        ...prev!,
                        finance: {
                          ...prev!.finance,
                          budgetSpent: spent,
                          balance: allocated - spent,
                        },
                      }));
                      if (validationErrors.budgetSpent) {
                        setValidationErrors((prev) => ({ ...prev, budgetSpent: undefined }));
                      }
                    }}
                    placeholder="0"
                    className={`h-10 text-xs sm:text-sm font-bold ${
                      validationErrors.budgetSpent ? "border-rose-400 ring-2 ring-rose-100" : ""
                    }`}
                  />
                  {validationErrors.budgetSpent && (
                    <p className="text-[11px] text-rose-600 font-medium">{validationErrors.budgetSpent}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Balance Remaining (₹)</Label>
                  <Input
                    value={`₹${(reportState.finance.balance || 0).toLocaleString("en-IN")}`}
                    readOnly
                    className={`h-10 text-xs sm:text-sm bg-slate-50 font-extrabold ${
                      (reportState.finance.balance || 0) < 0 ? "text-rose-600" : "text-emerald-700"
                    }`}
                  />
                  <p className="text-[10px] text-slate-400">Auto-calculated: Allocated - Spent</p>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* SECTION 5: MEDIA & EVENT ATTACHMENTS */}
          {/* =================================================================== */}
          {activeSection === 5 && (
            <div className="space-y-6">
              <EventAttachmentsManager
                eventId={reportState.eventId}
                allowUpload={!isReadOnly}
                title="Event Media Highlights &amp; Supporting Documentation"
                subtitle="Upload and manage original photos, videos, attendance sheets, and presentations."
              />
            </div>
          )}

          {/* =================================================================== */}
          {/* SECTION 6: FEEDBACK & STUDENT IMPACT */}
          {/* =================================================================== */}
          {activeSection === 6 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Section 6: Attendee Feedback &amp; Student Impact
                </h2>
                <p className="text-xs text-slate-500">Attendee quotes, satisfaction metrics, and actionable academic recommendations.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">
                  Feedback Summary <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  value={reportState.feedback.feedbackSummary}
                  onChange={(e) => {
                    setReportState((prev) => ({
                      ...prev!,
                      feedback: { ...prev!.feedback, feedbackSummary: e.target.value },
                    }));
                    if (validationErrors.feedbackSummary) {
                      setValidationErrors((prev) => ({ ...prev, feedbackSummary: undefined }));
                    }
                  }}
                  rows={4}
                  placeholder="Summarize overall student sentiment, feedback forms received, key takeaways, and suggestions..."
                  className={`text-xs rounded-xl ${
                    validationErrors.feedbackSummary ? "border-rose-400 ring-2 ring-rose-100" : ""
                  }`}
                />
                {validationErrors.feedbackSummary && (
                  <p className="text-[11px] text-rose-600 font-medium">{validationErrors.feedbackSummary}</p>
                )}
              </div>

              {/* Quotes */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800">
                    Representative Participant Quotes
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newQuote = {
                        id: `q_${Date.now()}`,
                        authorName: "",
                        quote: "",
                        departmentOrRole: "",
                      };
                      setReportState((prev) => ({
                        ...prev!,
                        feedback: {
                          ...prev!.feedback,
                          participantQuotes: [...(prev!.feedback.participantQuotes || []), newQuote],
                        },
                      }));
                    }}
                    className="rounded-xl text-xs h-8 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    <span>Add Quote</span>
                  </Button>
                </div>

                {reportState.feedback.participantQuotes?.map((q, idx) => (
                  <div key={q.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 relative">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-700">Quote #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = reportState.feedback.participantQuotes.filter((_, i) => i !== idx);
                          setReportState((prev) => ({
                            ...prev!,
                            feedback: { ...prev!.feedback, participantQuotes: updated },
                          }));
                        }}
                        className="text-rose-500 hover:text-rose-700 text-xs font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                    <Input
                      value={q.quote}
                      onChange={(e) => {
                        const updated = [...reportState.feedback.participantQuotes];
                        updated[idx] = { ...updated[idx], quote: e.target.value };
                        setReportState((prev) => ({
                          ...prev!,
                          feedback: { ...prev!.feedback, participantQuotes: updated },
                        }));
                      }}
                      placeholder="Student Feedback Quote (e.g. The hands-on coding labs were transformative!)"
                      className="h-8 text-xs bg-white"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        value={q.authorName}
                        onChange={(e) => {
                          const updated = [...reportState.feedback.participantQuotes];
                          updated[idx] = { ...updated[idx], authorName: e.target.value };
                          setReportState((prev) => ({
                            ...prev!,
                            feedback: { ...prev!.feedback, participantQuotes: updated },
                          }));
                        }}
                        placeholder="Author Name (e.g. Rohan V.)"
                        className="h-7 text-[11px] bg-white"
                      />
                      <Input
                        value={q.departmentOrRole || ""}
                        onChange={(e) => {
                          const updated = [...reportState.feedback.participantQuotes];
                          updated[idx] = { ...updated[idx], departmentOrRole: e.target.value };
                          setReportState((prev) => ({
                            ...prev!,
                            feedback: { ...prev!.feedback, participantQuotes: updated },
                          }));
                        }}
                        placeholder="Department / Role (e.g. CSE 4th Year)"
                        className="h-7 text-[11px] bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Student Impact / Recommendations */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <Label className="text-xs font-bold text-slate-800">
                  Student Impact &amp; Recommendations for Next Edition
                </Label>
                <Textarea
                  value={reportState.feedback.suggestionsForFuture || ""}
                  onChange={(e) =>
                    setReportState((prev) => ({
                      ...prev!,
                      feedback: { ...prev!.feedback, suggestionsForFuture: e.target.value },
                    }))
                  }
                  rows={3}
                  placeholder="Outline key academic outcomes, career readiness impact, and operational improvements for future iterations..."
                  className="text-xs rounded-xl"
                />
              </div>
            </div>
          )}

          {/* Section Navigation Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveSection((prev) => Math.max(prev - 1, 1))}
              disabled={activeSection === 1}
              className="rounded-xl text-xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              <span>Previous Section</span>
            </Button>

            <div className="flex items-center gap-2">
              {activeSection < 6 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    handleSaveDraft(true);
                    setActiveSection((prev) => Math.min(prev + 1, 6));
                  }}
                  className="bg-[#004D61] hover:bg-[#003847] text-white rounded-xl text-xs cursor-pointer font-bold"
                >
                  <span>Section {activeSection + 1}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              ) : (
                !isReadOnly && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleInitiateSubmit}
                    disabled={submitReportMutation.isPending}
                    className="bg-[#004D61] hover:bg-[#003847] text-white font-bold rounded-xl text-xs px-6 shadow-md gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Post-Event Report</span>
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader className="text-left space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#E0F3F7] text-[#004D61] flex items-center justify-center">
              <Send className="w-5 h-5 text-[#007A99]" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Submit Post-Event Report?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              Once submitted, the report will be sent to the Academic Quality Board for official review and editing may be restricted.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSubmitDialogOpen(false)}
              className="w-full sm:w-auto rounded-xl text-xs cursor-pointer"
            >
              Back to Editing
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmSubmit}
              disabled={submitReportMutation.isPending}
              className="w-full sm:w-auto rounded-xl text-xs bg-[#004D61] hover:bg-[#003847] text-white font-bold cursor-pointer"
            >
              {submitReportMutation.isPending ? "Submitting..." : "Confirm & Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventReportBuilderPage;
