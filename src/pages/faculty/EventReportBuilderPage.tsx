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
  Building2,
  CheckCircle2,
  Clock,
  Save,
  Send,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Upload,
  AlertTriangle,
  Download,
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
import { generateEventReportPdf } from "@/lib/pdf/reportPdfGenerator";
import { RichTextEditor } from "@/components/events/RichTextEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EventReport,
  NAAC_CRITERIA,
  NBA_OUTCOMES,
  SDG_GOALS,
  ResourcePerson,
} from "@/types";
import { toast } from "sonner";

const SECTIONS = [
  { id: 1, name: "Event Summary", icon: FileText, desc: "Executive summary & objectives" },
  { id: 2, name: "Participation", icon: Users, desc: "Attendance & demographics" },
  { id: 3, name: "Resource Persons", icon: Award, desc: "Keynotes & guest speakers" },
  { id: 4, name: "Budget & Finance", icon: DollarSign, desc: "Expenses & revenue balance" },
  { id: 5, name: "Media Gallery", icon: ImageIcon, desc: "Photos, videos & documents" },
  { id: 6, name: "Feedback & Impact", icon: MessageSquare, desc: "Ratings & student quotes" },
  { id: 7, name: "Institutional Mapping", icon: Building2, desc: "NAAC, NBA & SDG metrics" },
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
        department: event.department || profile?.department || "Apollo University",
        organiserId: event.organiserId,
        organiserName: event.organiserName,
        organiserEmail: event.organiserEmail,
        status: "DRAFT",
        summary: {
          executiveSummary: "",
          detailedProceedings: "",
          objectives: ["Provide hands-on industry exposure", "Foster interdisciplinary collaboration"],
          outcomesAchieved: ["Students gained practical skills", "Produced working prototypes"],
        },
        participation: {
          registeredCount: regMetrics?.registeredCount || event.registeredCount || 0,
          actualAttendance: regMetrics?.registeredCount || event.registeredCount || 0,
          departmentWiseBreakdown: regMetrics?.departmentBreakdown || { [event.department || "General"]: event.registeredCount || 0 },
          yearWiseBreakdown: regMetrics?.yearBreakdown || { "Year 2025-26": event.registeredCount || 0 },
          externalParticipantsCount: 0,
          externalInstitutions: [],
          facultyCoordinators: [profile?.displayName || event.organiserName],
          studentVolunteersCount: 4,
          studentVolunteersNames: ["A. Sharma (Lead)", "K. Patel (Registrations)"],
        },
        resourcePersons: [],
        finance: {
          budgetAllocated: 15000,
          budgetSpent: 12500,
          balance: 2500,
          expenses: [
            { id: "exp_1", head: "Honorarium", description: "Keynote Speaker Memento & Travel", amount: 7500, vendor: "Guest Travel Services" },
            { id: "exp_2", head: "Refreshments", description: "High Tea & Lunch for attendees", amount: 5000, vendor: "Campus Cafeteria" },
          ],
          sponsorships: [],
          revenueFromRegistrations: regMetrics?.totalRevenue || (event.isPaid ? (event.registeredCount || 0) * (event.price || 0) : 0),
        },
        media: {
          photos: [],
          videos: [],
          documents: [],
        },
        feedback: {
          feedbackSummary: "Overwhelmingly positive response with high engagement throughout practical workshops.",
          averageRating: 5,
          responseCount: Math.round((event.registeredCount || 20) * 0.8),
          participantQuotes: [
            { id: "q1", quote: "The hands-on session on advanced toolchains was directly applicable to our final year projects.", authorName: "Rohan V.", departmentOrRole: "CSE Final Year" },
            { id: "q2", quote: "Extremely well organized symposium with great keynote speakers.", authorName: "Priya S.", departmentOrRole: "ECE 3rd Year" },
            { id: "q3", quote: "Learned valuable debugging and development best practices.", authorName: "Ankit M.", departmentOrRole: "AI & DS 2nd Year" },
          ],
          suggestionsForFuture: "Extend workshop duration to 2 full days to allow more time for project demos.",
        },
        institutionalMapping: {
          academicYear: "2025-26",
          naacCriterion: "Criterion 1: Curricular Aspects",
          nbaProgrammeOutcomes: ["PO1: Engineering Knowledge", "PO5: Modern Tool Usage"],
          sdgGoals: [4, 9],
          activityType: "Co-curricular",
          collaboratingInstitutions: ["Apollo Hospital Education Foundation"],
          certificatesIssuedCount: regMetrics?.registeredCount || event.registeredCount || 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setReportState(initial);
    }
  }, [existingReport, event, regMetrics, profile, reportState]);

  // Section completion check
  const sectionCompletions = useMemo(() => {
    if (!reportState) return { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false };
    return {
      1: Boolean(reportState.summary?.executiveSummary && reportState.summary.executiveSummary.trim().length > 30),
      2: Boolean(reportState.participation?.actualAttendance > 0),
      3: true, // optional guest speakers
      4: Boolean(reportState.finance?.budgetAllocated > 0),
      5: true, // media optional or added
      6: Boolean(reportState.feedback?.feedbackSummary),
      7: Boolean(reportState.institutionalMapping?.naacCriterion),
    };
  }, [reportState]);

  const overallCompleteness = useMemo(() => {
    const completedCount = Object.values(sectionCompletions).filter(Boolean).length;
    return Math.round((completedCount / 7) * 100);
  }, [sectionCompletions]);

  // Autosave handler
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
    await handleSaveDraft(true);
    try {
      await submitReportMutation.mutateAsync({ eventId });
      setSubmitDialogOpen(false);
      navigate("/faculty/reports");
    } catch {
      // Error handled by mutation
    }
  };

  // Download Formatted Institutional PDF
  const handleDownloadPdf = () => {
    if (!reportState) return;
    const doc = generateEventReportPdf(reportState);
    doc.save(`Apollo_University_Report_${eventId}.pdf`);
    toast.success("PDF Download Ready", { description: "Institutional report generated with official letterhead." });
  };

  // Word count for executive summary
  const executiveWordCount = useMemo(() => {
    const text = reportState?.summary?.executiveSummary?.replace(/<[^>]*>/g, " ") || "";
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }, [reportState?.summary?.executiveSummary]);

  if (isEventLoading || isReportLoading || !reportState) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Initializing Post-Event Report Dossier...</p>
      </div>
    );
  }

  const isReadOnly = reportState.status === "SUBMITTED" || reportState.status === "APPROVED";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <Link
            to="/faculty/reports"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Reports Index</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
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

        {/* Completeness & Autosave */}
        <div className="flex items-center gap-3">
          {/* Completeness Gauge */}
          <div className="flex items-center gap-2 bg-slate-50 border px-3 py-1.5 rounded-2xl">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Completeness</span>
              <span className="text-xs font-extrabold text-indigo-700">{overallCompleteness}% Complete</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-extrabold text-[11px] text-indigo-900">
              {overallCompleteness}%
            </div>
          </div>

          {lastSaved && (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-slate-50 border px-2.5 py-1 rounded-full">
              <Clock className="w-3 h-3 text-emerald-600" />
              <span>Saved at {lastSaved}</span>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            className="rounded-xl text-xs gap-1.5 h-9"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Export PDF</span>
          </Button>

          {!isReadOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSaveDraft()}
              disabled={isAutosaving}
              className="rounded-xl text-xs gap-1.5 h-9"
            >
              <Save className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isAutosaving ? "Saving..." : "Save Draft"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Changes Requested Banner */}
      {reportState.status === "CHANGES_REQUESTED" && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-bold text-amber-950">Administrative Feedback / Revisions Required:</strong>
            <p className="leading-relaxed">{reportState.adminFeedback || "Please review and complete the requested details."}</p>
          </div>
        </div>
      )}

      {/* Main Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar: 7 Sections Navigation (4 Cols) */}
        <div className="lg:col-span-4 space-y-2 lg:sticky lg:top-20">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 mb-2">
            Report Sections
          </div>
          {SECTIONS.map((sec) => {
            const isActive = activeSection === sec.id;
            const isComplete = (sectionCompletions as any)[sec.id];
            const Icon = sec.icon;

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${isActive ? "text-white" : "text-slate-900"}`}>
                      {sec.name}
                    </div>
                    <div className={`text-[10px] ${isActive ? "text-indigo-100" : "text-slate-400"}`}>
                      {sec.desc}
                    </div>
                  </div>
                </div>

                {isComplete && (
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-emerald-600"}`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Right Content: Section Forms (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
          {/* =================================================================== */}
          {/* SECTION 1: EVENT SUMMARY */}
          {/* =================================================================== */}
          {activeSection === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Section 1: Event Summary &amp; Proceedings
                </h2>
                <p className="text-xs text-slate-500">
                  Executive summary of outcomes, detailed proceedings, and core objectives.
                </p>
              </div>

              {/* Executive Summary */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <Label className="font-bold text-slate-800">
                    Executive Summary (100–500 words) <span className="text-rose-500">*</span>
                  </Label>
                  <span
                    className={`text-[11px] font-bold ${
                      executiveWordCount >= 100 && executiveWordCount <= 500
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                  >
                    {executiveWordCount} words (Target: 100-500)
                  </span>
                </div>
                <RichTextEditor
                  value={reportState.summary?.executiveSummary || ""}
                  onChange={(val) =>
                    setReportState((prev) => ({
                      ...prev!,
                      summary: { ...prev!.summary, executiveSummary: val },
                    }))
                  }
                  placeholder="Provide an institutional summary of the symposium, topics covered, and key breakthroughs..."
                />
              </div>

              {/* Objectives List */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800">Core Objectives</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
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
                  <p className="text-xs text-slate-500">Record industry experts and academic guest speakers.</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const newPerson: ResourcePerson = {
                      id: `res_${Date.now()}`,
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
                  className="rounded-xl text-xs h-8"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Speaker</span>
                </Button>
              </div>

              {reportState.resourcePersons?.map((p, idx) => (
                <div key={p.id} className="p-4 bg-slate-50 rounded-2xl border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Speaker #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setReportState((prev) => ({
                          ...prev!,
                          resourcePersons: prev!.resourcePersons.filter((_, i) => i !== idx),
                        }))
                      }
                      className="text-rose-600 hover:text-rose-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      placeholder="Speaker Full Name"
                      value={p.name}
                      onChange={(e) => {
                        const updated = [...reportState.resourcePersons];
                        updated[idx].name = e.target.value;
                        setReportState((prev) => ({ ...prev!, resourcePersons: updated }));
                      }}
                      className="h-8 text-xs bg-white"
                    />
                    <Input
                      placeholder="Designation & Organisation"
                      value={p.designation}
                      onChange={(e) => {
                        const updated = [...reportState.resourcePersons];
                        updated[idx].designation = e.target.value;
                        setReportState((prev) => ({ ...prev!, resourcePersons: updated }));
                      }}
                      className="h-8 text-xs bg-white"
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
          {/* SECTION 5: MEDIA GALLERY */}
          {/* =================================================================== */}
          {activeSection === 5 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Section 5: High-Res Photo Highlights &amp; Documents
                </h2>
                <p className="text-xs text-slate-500">Upload event photography, press releases, and attendance sheets.</p>
              </div>

              <div className="p-8 border-2 border-dashed border-slate-300 rounded-3xl text-center space-y-3 bg-slate-50">
                <Upload className="w-8 h-8 mx-auto text-indigo-600" />
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Upload Event Media &amp; Reports</h3>
                  <p className="text-[11px] text-slate-400">Accepts PNG, JPG, PDF up to 25MB each.</p>
                </div>
              </div>
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

          {/* =================================================================== */}
          {/* SECTION 7: INSTITUTIONAL MAPPING */}
          {/* =================================================================== */}
          {activeSection === 7 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Section 7: Institutional Accreditation Mapping (NAAC / NBA / SDG)
                </h2>
                <p className="text-xs text-slate-500">
                  Mandatory classification for university statutory audits and NAAC AQAR reporting.
                </p>
              </div>

              {/* NAAC Criterion */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">
                  NAAC Criterion <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={reportState.institutionalMapping.naacCriterion}
                  onValueChange={(val) =>
                    setReportState((prev) => ({
                      ...prev!,
                      institutionalMapping: {
                        ...prev!.institutionalMapping,
                        naacCriterion: val,
                      },
                    }))
                  }
                >
                  <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NAAC_CRITERIA.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        <div>
                          <strong className="block">{c.name}</strong>
                          <span className="text-[10px] text-slate-400">{c.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* NBA Programme Outcomes */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-bold text-slate-800">
                  NBA Programme Outcomes (POs)
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {NBA_OUTCOMES.map((po) => {
                    const isSelected =
                      reportState.institutionalMapping.nbaProgrammeOutcomes?.includes(po);
                    return (
                      <button
                        key={po}
                        type="button"
                        onClick={() => {
                          const current = reportState.institutionalMapping.nbaProgrammeOutcomes || [];
                          const updated = isSelected
                            ? current.filter((x) => x !== po)
                            : [...current, po];
                          setReportState((prev) => ({
                            ...prev!,
                            institutionalMapping: {
                              ...prev!.institutionalMapping,
                              nbaProgrammeOutcomes: updated,
                            },
                          }));
                        }}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                          isSelected
                            ? "bg-indigo-50 border-indigo-600 font-bold text-indigo-900"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {po}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* UN Sustainable Development Goals */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-bold text-slate-800">
                  UN Sustainable Development Goals (SDGs)
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {SDG_GOALS.map((sdg) => {
                    const isSelected = reportState.institutionalMapping.sdgGoals?.includes(sdg.id);
                    return (
                      <button
                        key={sdg.id}
                        type="button"
                        onClick={() => {
                          const current = reportState.institutionalMapping.sdgGoals || [];
                          const updated = isSelected
                            ? current.filter((x) => x !== sdg.id)
                            : [...current, sdg.id];
                          setReportState((prev) => ({
                            ...prev!,
                            institutionalMapping: {
                              ...prev!.institutionalMapping,
                              sdgGoals: updated,
                            },
                          }));
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs"
                            : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {sdg.name}
                      </button>
                    );
                  })}
                </div>
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
              {activeSection < 7 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    handleSaveDraft(true);
                    setActiveSection((prev) => Math.min(prev + 1, 7));
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs"
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
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs px-6 shadow-md gap-2"
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
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Send className="w-5 h-5" />
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
              className="w-full sm:w-auto rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
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
