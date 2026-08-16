import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import {
  EventReport,
  ResourcePerson,
} from "@/types";
import { toast } from "sonner";

const SECTIONS = [
  { id: 1, name: "Event Summary", icon: FileText, desc: "Executive summary & objectives" },
  { id: 2, name: "Participation", icon: Users, desc: "Attendance & demographics" },
  { id: 3, name: "Resource Persons", icon: Award, desc: "Keynotes & guest speakers" },
  { id: 4, name: "Budget & Finance", icon: DollarSign, desc: "Expenses & revenue balance" },
  { id: 5, name: "Media & Attachments", icon: ImageIcon, desc: "Photos, videos & original files" },
  { id: 6, name: "Feedback & Impact", icon: MessageSquare, desc: "Ratings & student quotes" },
];

export const EventReportBuilderPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const { data: event, isLoading: isEventLoading } = useEventDetail(eventId);
  const { data: existingReport, isLoading: isReportLoading } = useEventReport(eventId);
  const { data: regMetrics } = useEventRegistrationMetrics(eventId);

  const saveReportDraftMutation = useSaveReportDraft();
  const submitReportMutation = useSubmitEventReport();

  const [activeSection, setActiveSection] = useState(1);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  // Form State
  const [reportState, setReportState] = useState<EventReport | null>(null);

  // Initialize Report State from existing report or event defaults
  useEffect(() => {
    if (existingReport) {
      setReportState(existingReport);
    } else if (event && !reportState) {
      const initial: EventReport = {
        id: event.id,
        eventId: event.id,
        eventTitle: event.title,
        category: event.category,
        eventDate: event.startAt,
        venueLocation: event.venueLocation,
        department: event.department || profile?.department || "The Apollo University",
        organiserId: event.organiserId,
        organiserName: event.organiserName,
        organiserEmail: event.organiserEmail,
        status: "DRAFT",
        summary: {
          executiveSummary: "",
          detailedProceedings: "",
          objectives: [""],
          outcomesAchieved: [""],
        },
        participation: {
          registeredCount: event.registeredCount || 0,
          actualAttendance: regMetrics?.registeredCount || event.registeredCount || 0,
          departmentWiseBreakdown: regMetrics?.departmentBreakdown || {},
          yearWiseBreakdown: {},
          externalParticipantsCount: 0,
          externalInstitutions: [],
          facultyCoordinators: [event.organiserName],
          studentVolunteersCount: 0,
          studentVolunteersNames: [],
        },
        resourcePersons: [],
        finance: {
          budgetAllocated: 0,
          budgetSpent: 0,
          balance: 0,
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
          feedbackSummary: "",
          averageRating: 5,
          responseCount: 0,
          participantQuotes: [],
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
    }
  }, [existingReport, event, profile, regMetrics, reportState]);

  // Section Completeness Calculation
  const sectionCompleteness = useMemo(() => {
    if (!reportState) return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    const c1 = reportState.summary.executiveSummary.trim().length > 30 ? 100 : 0;
    const c2 = reportState.participation.actualAttendance > 0 ? 100 : 0;
    const c3 = reportState.resourcePersons.length > 0 ? 100 : 50;
    const c4 = reportState.finance.budgetSpent > 0 || reportState.finance.expenses.length > 0 ? 100 : 50;
    const c5 = 100; // Media section
    const c6 = reportState.feedback.feedbackSummary.trim().length > 10 ? 100 : 50;

    return { 1: c1, 2: c2, 3: c3, 4: c4, 5: c5, 6: c6 };
  }, [reportState]);

  const overallCompleteness = useMemo(() => {
    const values = Object.values(sectionCompleteness);
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round(sum / values.length);
  }, [sectionCompleteness]);

  // Autosave Draft Callback
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
          toast.success("Report Draft Saved", { description: `Saved at ${format(new Date(), "HH:mm")}` });
        }
      } catch (err: any) {
        if (!silent) toast.error("Autosave Failed", { description: err.message });
      } finally {
        if (!silent) setIsAutosaving(false);
      }
    },
    [eventId, reportState, saveReportDraftMutation]
  );

  // 30s Autosave timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (reportState?.summary?.executiveSummary) {
        handleSaveDraft(true);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [handleSaveDraft, reportState?.summary?.executiveSummary]);

  // Submit Handler
  const handleConfirmSubmit = async () => {
    if (!eventId) return;
    try {
      await submitReportMutation.mutateAsync({
        eventId,
        reportData: reportState || undefined,
      });
      setSubmitDialogOpen(false);
      navigate("/faculty/reports");
    } catch (err: any) {
      console.error("[handleConfirmSubmit] submission error:", err);
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
              className="text-xs"
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
          <div className="flex items-center gap-2 bg-slate-50 border px-3 py-1.5 rounded-2xl">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Completeness</span>
              <span className="text-xs font-extrabold text-[#004D61]">{overallCompleteness}% Complete</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#E0F3F7] flex items-center justify-center font-extrabold text-[11px] text-[#007A99]">
              {overallCompleteness}%
            </div>
          </div>

          {lastSaved && (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-slate-50 border px-2.5 py-1 rounded-full">
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
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
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
          {/* SECTION 1: EXECUTIVE SUMMARY */}
          {/* =================================================================== */}
          {activeSection === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Section 1: Executive Summary &amp; Objectives
                </h2>
                <p className="text-xs text-slate-500">
                  Provide an overview of the event, its purpose, and core objectives achieved.
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
                      executiveWordCount < 50 ? "text-amber-600" : "text-emerald-600"
                    }`}
                  >
                    {executiveWordCount} words (min. 50 recommended)
                  </span>
                </div>
                <RichTextEditor
                  value={reportState.summary.executiveSummary}
                  onChange={(val) =>
                    setReportState((prev) => ({
                      ...prev!,
                      summary: { ...prev!.summary, executiveSummary: val },
                    }))
                  }
                  placeholder="Summarize the core themes, distinguished attendees, key insights, and campus impact..."
                />
              </div>

              {/* Objectives */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800">
                    Specific Learning &amp; Academic Objectives
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
                    className="rounded-xl text-xs h-8"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    <span>Add Objective</span>
                  </Button>
                </div>

                {reportState.summary.objectives?.map((obj, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={obj}
                      onChange={(e) => {
                        const updated = [...reportState.summary.objectives];
                        updated[idx] = e.target.value;
                        setReportState((prev) => ({
                          ...prev!,
                          summary: { ...prev!.summary, objectives: updated },
                        }));
                      }}
                      placeholder={`Objective #${idx + 1}`}
                      className="h-9 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = reportState.summary.objectives.filter((_, i) => i !== idx);
                        setReportState((prev) => ({
                          ...prev!,
                          summary: { ...prev!.summary, objectives: updated },
                        }));
                      }}
                      className="text-rose-500 hover:text-rose-700 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* SECTION 2: PARTICIPATION */}
          {/* =================================================================== */}
          {activeSection === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Section 2: Participation &amp; Demographics
                </h2>
                <p className="text-xs text-slate-500">
                  Registered attendee data, verified gate attendance, and departmental breakdown.
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
                    className="h-10 text-xs sm:text-sm bg-slate-50 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">
                    Actual Attendance Verified <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={reportState.participation.actualAttendance}
                    onChange={(e) =>
                      setReportState((prev) => ({
                        ...prev!,
                        participation: {
                          ...prev!.participation,
                          actualAttendance: Number(e.target.value),
                        },
                      }))
                    }
                    className="h-10 text-xs sm:text-sm font-bold"
                  />
                  {reportState.participation.actualAttendance >
                    reportState.participation.registeredCount && (
                    <p className="text-[11px] text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Attendance exceeds confirmed registrations.</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Student Volunteers */}
              <div className="space-y-1.5 pt-2 border-t">
                <Label className="text-xs font-bold text-slate-800">
                  Student Volunteer Coordinators
                </Label>
                <Input
                  value={reportState.participation.studentVolunteersNames?.join(", ") || ""}
                  onChange={(e) =>
                    setReportState((prev) => ({
                      ...prev!,
                      participation: {
                        ...prev!.participation,
                        studentVolunteersNames: e.target.value.split(",").map((s) => s.trim()),
                      },
                    }))
                  }
                  placeholder="e.g. Rahul Sharma (CSE), Sneha Rao (ECE)"
                  className="h-10 text-xs sm:text-sm"
                />
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* SECTION 3: RESOURCE PERSONS */}
          {/* =================================================================== */}
          {activeSection === 3 && (
            <div className="space-y-6 animate-fade-in">
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
                      resourcePersons: [...prev!.resourcePersons, newPerson],
                    }));
                  }}
                  className="rounded-xl text-xs h-8"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Speaker</span>
                </Button>
              </div>

              {reportState.resourcePersons.map((rp, idx) => (
                <div key={rp.id} className="p-4 rounded-2xl bg-slate-50 border space-y-3 relative">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">Resource Person #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = reportState.resourcePersons.filter((p) => p.id !== rp.id);
                        setReportState((prev) => ({ ...prev!, resourcePersons: updated }));
                      }}
                      className="text-rose-500 hover:text-rose-700 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      value={rp.name}
                      onChange={(e) => {
                        const updated = [...reportState.resourcePersons];
                        updated[idx].name = e.target.value;
                        setReportState((prev) => ({ ...prev!, resourcePersons: updated }));
                      }}
                      placeholder="Full Name (e.g. Dr. Rajesh Kumar)"
                      className="h-9 text-xs"
                    />
                    <Input
                      value={rp.designation}
                      onChange={(e) => {
                        const updated = [...reportState.resourcePersons];
                        updated[idx].designation = e.target.value;
                        setReportState((prev) => ({ ...prev!, resourcePersons: updated }));
                      }}
                      placeholder="Designation (e.g. Principal AI Scientist)"
                      className="h-9 text-xs"
                    />
                    <Input
                      value={rp.organisation}
                      onChange={(e) => {
                        const updated = [...reportState.resourcePersons];
                        updated[idx].organisation = e.target.value;
                        setReportState((prev) => ({ ...prev!, resourcePersons: updated }));
                      }}
                      placeholder="Organization (e.g. Google India)"
                      className="h-9 text-xs"
                    />
                    <Input
                      value={rp.sessionTopic}
                      onChange={(e) => {
                        const updated = [...reportState.resourcePersons];
                        updated[idx].sessionTopic = e.target.value;
                        setReportState((prev) => ({ ...prev!, resourcePersons: updated }));
                      }}
                      placeholder="Session Title / Keynote Topic"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* =================================================================== */}
          {/* SECTION 4: BUDGET & FINANCE */}
          {/* =================================================================== */}
          {activeSection === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Section 4: Financial Statement &amp; Balance Sheet
                </h2>
                <p className="text-xs text-slate-500">Track allocated grants, itemized expenses, and registrations revenue.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Budget Allocated (₹)</Label>
                  <Input
                    type="number"
                    value={reportState.finance.budgetAllocated}
                    onChange={(e) =>
                      setReportState((prev) => ({
                        ...prev!,
                        finance: {
                          ...prev!.finance,
                          budgetAllocated: Number(e.target.value),
                          balance: Number(e.target.value) - prev!.finance.budgetSpent,
                        },
                      }))
                    }
                    className="h-10 text-xs sm:text-sm font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Total Spent (₹)</Label>
                  <Input
                    type="number"
                    value={reportState.finance.budgetSpent}
                    onChange={(e) =>
                      setReportState((prev) => ({
                        ...prev!,
                        finance: {
                          ...prev!.finance,
                          budgetSpent: Number(e.target.value),
                          balance: prev!.finance.budgetAllocated - Number(e.target.value),
                        },
                      }))
                    }
                    className="h-10 text-xs sm:text-sm font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Balance Remaining (₹)</Label>
                  <Input
                    value={`₹${(reportState.finance.balance || 0).toLocaleString()}`}
                    readOnly
                    className="h-10 text-xs sm:text-sm bg-slate-50 font-extrabold text-emerald-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* SECTION 5: MEDIA & EVENT ATTACHMENTS */}
          {/* =================================================================== */}
          {activeSection === 5 && (
            <div className="space-y-6 animate-fade-in">
              <EventAttachmentsManager
                eventId={reportState.eventId}
                allowUpload={!isReadOnly}
                title="Event Media Highlights &amp; Supporting Documentation"
                subtitle="Upload and manage original photos, videos, attendance sheets, and presentations."
              />
            </div>
          )}

          {/* =================================================================== */}
          {/* SECTION 6: FEEDBACK & IMPACT */}
          {/* =================================================================== */}
          {activeSection === 6 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Section 6: Attendee Feedback &amp; Student Impact
                </h2>
                <p className="text-xs text-slate-500">Quotes, survey ratings, and actionable future recommendations.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">Feedback Summary</Label>
                <Textarea
                  value={reportState.feedback.feedbackSummary}
                  onChange={(e) =>
                    setReportState((prev) => ({
                      ...prev!,
                      feedback: { ...prev!.feedback, feedbackSummary: e.target.value },
                    }))
                  }
                  rows={3}
                  className="text-xs rounded-xl"
                />
              </div>

              {/* Quotes */}
              <div className="space-y-3 pt-2 border-t">
                <Label className="text-xs font-bold text-slate-800">
                  Representative Participant Quotes
                </Label>
                {reportState.feedback.participantQuotes?.map((q, idx) => (
                  <div key={q.id} className="p-3 bg-slate-50 rounded-xl border space-y-2">
                    <Input
                      value={q.quote}
                      onChange={(e) => {
                        const updated = [...reportState.feedback.participantQuotes];
                        updated[idx].quote = e.target.value;
                        setReportState((prev) => ({
                          ...prev!,
                          feedback: { ...prev!.feedback, participantQuotes: updated },
                        }));
                      }}
                      placeholder="Student Feedback Quote"
                      className="h-8 text-xs bg-white"
                    />
                    <Input
                      value={q.authorName}
                      onChange={(e) => {
                        const updated = [...reportState.feedback.participantQuotes];
                        updated[idx].authorName = e.target.value;
                        setReportState((prev) => ({
                          ...prev!,
                          feedback: { ...prev!.feedback, participantQuotes: updated },
                        }));
                      }}
                      placeholder="Attribution (e.g. Rohan V. - CSE 4th Year)"
                      className="h-7 text-[11px] bg-white"
                    />
                  </div>
                ))}
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
              className="rounded-xl text-xs"
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
                  className="bg-[#004D61] hover:bg-[#003847] text-white rounded-xl text-xs"
                >
                  <span>Section {activeSection + 1}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              ) : (
                !isReadOnly && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setSubmitDialogOpen(true)}
                    disabled={submitReportMutation.isPending}
                    className="bg-[#004D61] hover:bg-[#003847] text-white font-bold rounded-xl text-xs px-6 shadow-md gap-2"
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
              Submit Report to Academic Administration?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              Submitting locks your report document and dispatches it to the Academic Quality Board for official sign-off.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSubmitDialogOpen(false)}
              className="w-full sm:w-auto rounded-xl text-xs"
            >
              Back to Editing
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmSubmit}
              disabled={submitReportMutation.isPending}
              className="w-full sm:w-auto rounded-xl text-xs bg-[#004D61] hover:bg-[#003847] text-white font-bold"
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
