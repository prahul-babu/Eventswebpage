import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Save,
  Send,
  Upload,
  MapPin,
  CheckCircle2,
  Clock,
  Layers,
  Video,
  X,
  Plus,
  Trash2,
  Loader2,
  Eye,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useEventDetail } from "@/lib/queries/events";
import {
  useSaveEventDraft,
  useSubmitEventForApproval,
} from "@/lib/queries/faculty";
import {
  eventWizardSchema,
  EventWizardFormValues,
} from "@/lib/schemas/event";
import { RichTextEditor } from "@/components/events/RichTextEditor";
import { EventCard } from "@/components/events/EventCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { EVENT_CATEGORIES, EventCategory, EventVenueType, CustomQuestion, Event, CreateEventPayload } from "@/types";
import { toast } from "sonner";

const STEPS = [
  { id: 1, name: "Basics & Media", desc: "Title, Category & Banner" },
  { id: 2, name: "Schedule & Venue", desc: "Timings & Mode" },
  { id: 3, name: "Capacity & Pricing", desc: "Seats, Fee & Custom Questions" },
  { id: 4, name: "Review & Submit", desc: "Live Preview & Approval" },
];

export const EventWizardPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const isEditing = Boolean(eventId);
  const navigate = useNavigate();
  const { firebaseUser, profile } = useAuth();

  const { data: existingEvent, isLoading: isEventLoading } = useEventDetail(eventId);
  const saveDraftMutation = useSaveEventDraft();
  const submitForApprovalMutation = useSubmitEventForApproval();

  const [currentStep, setCurrentStep] = useState(1);
  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>(eventId);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);

  // Form setup
  const {
    register,
    control,
    watch,
    setValue,
    trigger,
    formState: { errors },
    reset,
  } = useForm<EventWizardFormValues>({
    resolver: zodResolver(eventWizardSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      category: "ACADEMIC",
      shortSummary: "",
      description: "",
      tags: [],
      bannerUrl: "",
      startAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16),
      endAt: new Date(Date.now() + 7 * 24 * 3600 * 1000 + 3600 * 1000 * 3).toISOString().slice(0, 16),
      venueType: "ON_CAMPUS",
      venueLocation: "Main Auditorium, Campus Block A",
      registrationOpensAt: new Date().toISOString().slice(0, 16),
      registrationDeadline: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString().slice(0, 16),
      capacity: 100,
      allowWaitlist: true,
      isPaid: false,
      price: 0,
      refundPolicy: "Full refund available if cancelled 24 hours prior to event start.",
      eligibility: "Open to all enrolled students across all years and departments.",
      prerequisites: "Please bring your student ID card and laptop.",
      maxTeamSize: 1,
      customQuestions: [],
    },
  });

  // Populate existing event data when in edit mode
  useEffect(() => {
    if (existingEvent) {
      reset({
        title: existingEvent.title,
        category: existingEvent.category,
        description: existingEvent.description,
        tags: existingEvent.tags || [],
        bannerUrl: existingEvent.bannerUrl || "",
        startAt: new Date(existingEvent.startAt).toISOString().slice(0, 16),
        endAt: new Date(existingEvent.endAt).toISOString().slice(0, 16),
        venueType: existingEvent.venueType,
        venueLocation: existingEvent.venueLocation,
        registrationOpensAt: existingEvent.registrationStartAt
          ? new Date(existingEvent.registrationStartAt).toISOString().slice(0, 16)
          : undefined,
        registrationDeadline: new Date(existingEvent.registrationDeadline).toISOString().slice(0, 16),
        capacity: existingEvent.capacity || 100,
        allowWaitlist: Boolean(existingEvent.allowWaitlist),
        isPaid: Boolean(existingEvent.isPaid),
        price: existingEvent.price || 0,
        eligibility: existingEvent.eligibility || "",
        prerequisites: existingEvent.prerequisites || "",
        maxTeamSize: existingEvent.maxTeamSize || 1,
        customQuestions: existingEvent.customQuestions || [],
      });
      setCurrentDraftId(existingEvent.id);
    }
  }, [existingEvent, reset]);

  const formValues = watch();

  // 1. Autosave Draft Engine
  const performSaveDraft = useCallback(
    async (isSilent = false) => {
      if (!firebaseUser) return null;
      try {
        if (!isSilent) setIsAutosaving(true);
        const targetId = currentDraftId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const result = await saveDraftMutation.mutateAsync({
          eventId: targetId,
          data: formValues as Partial<CreateEventPayload>,
          organiser: {
            uid: firebaseUser.uid,
            name: profile?.displayName || firebaseUser.displayName || "Dr. Priya Nair",
            email: profile?.email || firebaseUser.email || "faculty@apollo.edu.in",
            department: profile?.department || "B.Tech. Computer Science and Engineering",
          },
        });

        setCurrentDraftId(result.eventId);
        setLastSavedTime(format(new Date(), "HH:mm:ss"));
        if (!isSilent) {
          toast.success("Draft Saved", { description: `Saved at ${format(new Date(), "HH:mm")}` });
        }
        return result.eventId;
      } catch (err: any) {
        if (!isSilent) {
          toast.error("Save Failed", { description: err.message });
        }
        return null;
      } finally {
        if (!isSilent) setIsAutosaving(false);
      }
    },
    [currentDraftId, formValues, firebaseUser, profile, saveDraftMutation]
  );

  // Autosave interval every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (formValues.title && formValues.title.trim()) {
        performSaveDraft(true);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [performSaveDraft, formValues.title]);

  // Step Navigation Handlers with Per-Step Validation
  const handleNextStep = async () => {
    let isValid = false;

    if (currentStep === 1) {
      isValid = await trigger(["title", "category", "description"]);
    } else if (currentStep === 2) {
      isValid = await trigger(["startAt", "endAt", "venueType", "venueLocation", "registrationDeadline"]);
    } else if (currentStep === 3) {
      isValid = await trigger(["capacity", "isPaid", "price", "maxTeamSize"]);
    }

    if (isValid) {
      performSaveDraft(true);
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Submit For Approval Action
  const handleConfirmSubmit = async () => {
    try {
      const targetId = currentDraftId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await submitForApprovalMutation.mutateAsync({
        eventId: targetId,
        data: formValues as Partial<CreateEventPayload>,
        organiser: {
          uid: firebaseUser?.uid || "fac_001",
          name: profile?.displayName || firebaseUser?.displayName || "Dr. Priya Nair",
          email: profile?.email || firebaseUser?.email || "faculty@apollo.edu.in",
          department: profile?.department || "B.Tech. Computer Science and Engineering",
        },
      });
      setSubmitConfirmOpen(false);
      navigate("/faculty/events");
    } catch {
      // Error handled by mutation toast
    }
  };

  // Tag Management
  const [tagInput, setTagInput] = useState("");
  const handleAddTag = () => {
    if (tagInput.trim()) {
      const currentTags = formValues.tags || [];
      if (!currentTags.includes(tagInput.trim())) {
        setValue("tags", [...currentTags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };
  const handleRemoveTag = (tagToRemove: string) => {
    setValue(
      "tags",
      (formValues.tags || []).filter((t: string) => t !== tagToRemove)
    );
  };

  // Custom Question Management
  const handleAddQuestion = () => {
    const currentQ = formValues.customQuestions || [];
    const newQ: CustomQuestion = {
      id: `q_${Date.now()}`,
      label: "",
      type: "text",
      required: false,
    };
    setValue("customQuestions", [...currentQ, newQ]);
  };
  const handleRemoveQuestion = (qId: string) => {
    setValue(
      "customQuestions",
      (formValues.customQuestions || []).filter((q: CustomQuestion) => q.id !== qId)
    );
  };

  // Banner Upload with 16:9 check & compression
  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image Too Large", { description: "Banner image size must be under 5MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas for 16:9 compression
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const targetWidth = Math.min(img.width, 1280);
        const targetHeight = Math.round(targetWidth * (9 / 16));
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        if (ctx) {
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setValue("bannerUrl", compressedDataUrl);
          toast.success("Banner Processed & Attached");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Preview Event Object representation for Step 4
  const previewEvent: Event = {
    id: currentDraftId || "draft_preview",
    title: formValues.title || "Untitled Campus Event",
    description: formValues.description || "No description provided yet.",
    category: formValues.category as EventCategory,
    status: "PUBLISHED",
    venueType: formValues.venueType as EventVenueType,
    venueLocation: formValues.venueLocation || "Campus Venue",
    startAt: new Date(formValues.startAt),
    endAt: new Date(formValues.endAt),
    registrationDeadline: new Date(formValues.registrationDeadline),
    isPaid: formValues.isPaid,
    price: formValues.price || 0,
    currency: "INR",
    capacity: formValues.capacity || 100,
    registeredCount: 0,
    allowWaitlist: formValues.allowWaitlist,
    maxTeamSize: formValues.maxTeamSize,
    bannerUrl: formValues.bannerUrl,
    tags: formValues.tags || [],
    eligibility: formValues.eligibility,
    prerequisites: formValues.prerequisites,
    customQuestions: formValues.customQuestions,
    organiserId: firebaseUser?.uid || "",
    organiserName: profile?.displayName || "Faculty Organiser",
    organiserEmail: profile?.email || "faculty@apollo.edu.in",
    organiserRole: "faculty",
    department: profile?.department || "Department of Computer Science & Engineering",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (isEventLoading) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Loading event wizard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20">
      {/* Top Header & Autosave Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <Link
            to="/faculty/events"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to My Events</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {isEditing ? "Edit Campus Event" : "Create New Campus Event"}
          </h1>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {lastSavedTime && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-slate-50 border px-2.5 py-1 rounded-full">
              <Clock className="w-3 h-3 text-emerald-600" />
              <span>Saved at {lastSavedTime}</span>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => performSaveDraft()}
            disabled={isAutosaving}
            className="rounded-xl text-xs gap-1.5 h-9"
          >
            <Save className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isAutosaving ? "Saving..." : "Save Draft"}</span>
          </Button>
        </div>
      </div>

      {/* 4-Step Progress Indicator */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STEPS.map((step) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <div
              key={step.id}
              onClick={() => isCompleted && setCurrentStep(step.id)}
              className={`p-3.5 rounded-2xl border transition-all text-left ${
                isActive
                  ? "bg-indigo-50/80 border-indigo-600 shadow-sm"
                  : isCompleted
                  ? "bg-white border-slate-200 cursor-pointer hover:border-indigo-300"
                  : "bg-slate-50 border-slate-200/60 opacity-60 pointer-events-none"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isActive ? "text-indigo-700" : isCompleted ? "text-emerald-600" : "text-slate-400"
                  }`}
                >
                  Step 0{step.id}
                </span>
                {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              </div>
              <div className="font-bold text-xs text-slate-900">{step.name}</div>
              <div className="text-[10px] text-slate-500 truncate">{step.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Form Content Body */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
        {/* =================================================================== */}
        {/* STEP 1: BASICS & MEDIA */}
        {/* =================================================================== */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Step 1: Event Basics &amp; Banner</h2>
              <p className="text-xs text-slate-500">Provide the title, category, description, and visual poster for the event.</p>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <Label htmlFor="title" className="font-bold text-slate-800">
                  Event Title <span className="text-rose-500">*</span>
                </Label>
                <span className="text-[11px] text-slate-400">{(formValues.title || "").length} / 120</span>
              </div>
              <Input
                id="title"
                placeholder="e.g. National Symposium on Quantum Computing & Cyber Physical Systems"
                {...register("title")}
                className={`h-10 text-xs sm:text-sm ${errors.title ? "border-rose-500" : ""}`}
              />
              {errors.title?.message && <p className="text-[11px] text-rose-600">{errors.title.message}</p>}
            </div>

            {/* Category Select */}
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs font-bold text-slate-800">
                Category <span className="text-rose-500">*</span>
              </Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Rich Text Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-bold text-slate-800">
                Detailed Description <span className="text-rose-500">*</span>
              </Label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <RichTextEditor
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Write event overview, keynote schedule, student outcomes, and session highlights..."
                  />
                )}
              />
              {errors.description?.message && (
                <p className="text-[11px] text-rose-600">{errors.description.message}</p>
              )}
            </div>

            {/* Tags Input */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-800">Keywords &amp; Topic Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                  placeholder="e.g. AI, Quantum, Robotics"
                  className="h-9 text-xs flex-1"
                />
                <Button type="button" size="sm" onClick={handleAddTag} className="rounded-xl text-xs h-9">
                  Add Tag
                </Button>
              </div>

              {formValues.tags && formValues.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {formValues.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="gap-1 text-xs py-1 px-2.5 rounded-lg">
                      <span>#{tag}</span>
                      <button type="button" onClick={() => handleRemoveTag(tag)}>
                        <X className="w-3 h-3 hover:text-slate-900" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Banner Upload */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-800">Event Banner Poster (16:9, Max 5MB)</Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="aspect-video w-48 rounded-2xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center relative">
                  {formValues.bannerUrl ? (
                    <img src={formValues.bannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-3 space-y-1">
                      <Upload className="w-5 h-5 mx-auto text-slate-400" />
                      <span className="text-[10px] text-slate-400 block">16:9 Preview</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <input
                    type="file"
                    id="bannerUpload"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    className="hidden"
                  />
                  <Button asChild size="sm" variant="outline" className="rounded-xl text-xs cursor-pointer">
                    <label htmlFor="bannerUpload">
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      <span>Upload Banner Image</span>
                    </label>
                  </Button>
                  <p className="text-[10px] text-slate-400">
                    JPG, PNG, or WebP. Automatically cropped to 16:9 ratio and optimized.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 2: SCHEDULE & VENUE */}
        {/* =================================================================== */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Step 2: Schedule &amp; Delivery Venue</h2>
              <p className="text-xs text-slate-500">Configure event timelines, delivery mode, and registration closing window.</p>
            </div>

            {/* Event Start & End Times */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startAt" className="text-xs font-bold text-slate-800">
                  Event Starts At <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="startAt"
                  type="datetime-local"
                  {...register("startAt")}
                  className="h-10 text-xs sm:text-sm"
                />
                {errors.startAt?.message && <p className="text-[11px] text-rose-600">{errors.startAt.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endAt" className="text-xs font-bold text-slate-800">
                  Event Ends At <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="endAt"
                  type="datetime-local"
                  {...register("endAt")}
                  className="h-10 text-xs sm:text-sm"
                />
                {errors.endAt?.message && <p className="text-[11px] text-rose-600">{errors.endAt.message}</p>}
              </div>
            </div>

            {/* Delivery Mode Radio/Select */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-800">Delivery Mode</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { mode: "ON_CAMPUS", label: "On Campus", icon: MapPin },
                  { mode: "ONLINE", label: "Virtual / Online", icon: Video },
                  { mode: "HYBRID", label: "Hybrid", icon: Layers },
                ].map(({ mode, label, icon: Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setValue("venueType", mode as EventVenueType)}
                    className={`p-3.5 rounded-2xl border text-center transition-all ${
                      formValues.venueType === mode
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-xs font-bold block">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Venue Location / Meeting Link */}
            <div className="space-y-1.5">
              <Label htmlFor="venueLocation" className="text-xs font-bold text-slate-800">
                {formValues.venueType === "ONLINE" ? "Meeting URL / Platform" : "Physical Venue / Room Number"}{" "}
                <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="venueLocation"
                placeholder={
                  formValues.venueType === "ONLINE"
                    ? "e.g. Microsoft Teams Link (teams.microsoft.com/...)"
                    : "e.g. Dr. APJ Abdul Kalam Auditorium, Block 3"
                }
                {...register("venueLocation")}
                className="h-10 text-xs sm:text-sm"
              />
              {errors.venueLocation?.message && (
                <p className="text-[11px] text-rose-600">{errors.venueLocation.message}</p>
              )}
            </div>

            {/* Registration Deadline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="space-y-1.5">
                <Label htmlFor="registrationOpensAt" className="text-xs font-bold text-slate-800">
                  Registration Opens
                </Label>
                <Input
                  id="registrationOpensAt"
                  type="datetime-local"
                  {...register("registrationOpensAt")}
                  className="h-10 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="registrationDeadline" className="text-xs font-bold text-slate-800">
                  Registration Closes At <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="registrationDeadline"
                  type="datetime-local"
                  {...register("registrationDeadline")}
                  className="h-10 text-xs sm:text-sm"
                />
                {errors.registrationDeadline?.message && (
                  <p className="text-[11px] text-rose-600">{errors.registrationDeadline.message}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 3: CAPACITY & PRICING */}
        {/* =================================================================== */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Step 3: Capacity, Pricing &amp; Questionnaire</h2>
              <p className="text-xs text-slate-500">Define seating capacity, registration fees, eligibility, and custom questions.</p>
            </div>

            {/* Capacity & Waitlist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="capacity" className="text-xs font-bold text-slate-800">
                  Maximum Seating Capacity <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  placeholder="e.g. 150"
                  {...register("capacity")}
                  className="h-10 text-xs sm:text-sm"
                />
                {errors.capacity?.message && <p className="text-[11px] text-rose-600">{errors.capacity.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="maxTeamSize" className="text-xs font-bold text-slate-800">
                  Max Team Size (1 = Individual)
                </Label>
                <Input
                  id="maxTeamSize"
                  type="number"
                  min={1}
                  max={10}
                  {...register("maxTeamSize")}
                  className="h-10 text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Allow Waitlist Switch */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-900">Enable Automated Waitlist</div>
                <div className="text-[11px] text-slate-500">
                  Allow students to queue when full; automatically promotes when a seat opens up.
                </div>
              </div>
              <Controller
                name="allowWaitlist"
                control={control}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>

            {/* Paid Event Switch & Pricing */}
            <div className="p-4 bg-slate-50 rounded-2xl border space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900">Paid Registration Event</div>
                  <div className="text-[11px] text-slate-500">Collect registration fees via Razorpay gateway.</div>
                </div>
                <Controller
                  name="isPaid"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>

              {formValues.isPaid && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t">
                  <div className="space-y-1.5">
                    <Label htmlFor="price" className="text-xs font-bold text-slate-800">
                      Registration Fee (INR ₹) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      placeholder="e.g. 250"
                      {...register("price")}
                      className="h-10 text-xs sm:text-sm bg-white"
                    />
                    {errors.price?.message && <p className="text-[11px] text-rose-600">{errors.price.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="refundPolicy" className="text-xs font-bold text-slate-800">
                      Refund Policy Notice
                    </Label>
                    <Input
                      id="refundPolicy"
                      placeholder="e.g. Refund available if cancelled 24h prior"
                      {...register("refundPolicy")}
                      className="h-10 text-xs sm:text-sm bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Eligibility & Prerequisites */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="eligibility" className="text-xs font-bold text-slate-800">
                  Eligibility Criteria
                </Label>
                <Textarea
                  id="eligibility"
                  placeholder="e.g. Open to all B.Tech / M.Tech students"
                  {...register("eligibility")}
                  className="text-xs sm:text-sm rounded-xl"
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prerequisites" className="text-xs font-bold text-slate-800">
                  What to Bring / Prerequisites
                </Label>
                <Textarea
                  id="prerequisites"
                  placeholder="e.g. Laptop with Node.js and student ID card"
                  {...register("prerequisites")}
                  className="text-xs sm:text-sm rounded-xl"
                  rows={2}
                />
              </div>
            </div>

            {/* Custom Questions Builder */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-900">Custom Registration Questionnaire</div>
                <Button type="button" size="sm" variant="outline" onClick={handleAddQuestion} className="rounded-xl text-xs h-8">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Question</span>
                </Button>
              </div>

              {formValues.customQuestions?.map((q: CustomQuestion, index: number) => (
                <div key={q.id} className="p-3 bg-slate-50 rounded-xl border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">Question #{index + 1}</span>
                    <button type="button" onClick={() => handleRemoveQuestion(q.id)} className="text-rose-600 hover:text-rose-800">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      placeholder="Question label (e.g. T-Shirt Size)"
                      value={q.label}
                      onChange={(e) => {
                        const updated = [...(formValues.customQuestions || [])];
                        updated[index].label = e.target.value;
                        setValue("customQuestions", updated);
                      }}
                      className="h-8 text-xs bg-white sm:col-span-2"
                    />
                    <Select
                      value={q.type}
                      onValueChange={(val) => {
                        const updated = [...(formValues.customQuestions || [])];
                        updated[index].type = val as any;
                        setValue("customQuestions", updated);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text Response</SelectItem>
                        <SelectItem value="select">Dropdown</SelectItem>
                        <SelectItem value="radio">Radio Choice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 4: REVIEW & LIVE PREVIEW */}
        {/* =================================================================== */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Step 4: Review &amp; Submit for Approval</h2>
              <p className="text-xs text-slate-500">Preview exactly how students will discover and register for your event.</p>
            </div>

            {/* Student-facing EventCard Preview */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-indigo-600" />
                <span>Catalog Card Preview</span>
              </div>
              <div className="max-w-sm mx-auto sm:mx-0">
                <EventCard event={previewEvent} />
              </div>
            </div>

            {/* Validation Checklist Box */}
            <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-100 space-y-2 text-xs text-slate-700">
              <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Approval Readiness Checklist</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Title &amp; category configured</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Future start date &amp; venue verified</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Capacity limits &amp; pricing set</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Organiser verification active</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrevStep}
            disabled={currentStep === 1}
            className="rounded-xl text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            <span>Previous Step</span>
          </Button>

          <div className="flex items-center gap-2">
            {currentStep < 4 ? (
              <Button
                type="button"
                size="sm"
                onClick={handleNextStep}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs"
              >
                <span>Continue to Step {currentStep + 1}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => setSubmitConfirmOpen(true)}
                disabled={submitForApprovalMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs px-6 shadow-md gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit for Approval</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Submission */}
      <Dialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader className="text-left space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Submit Event for Administrator Review?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              Once submitted, this event will be sent to the Campus Administration Board for policy review.
              Its status will update to <strong className="text-indigo-950">PENDING_APPROVAL</strong> and editing will be locked until approved or withdrawn.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSubmitConfirmOpen(false)}
              disabled={submitForApprovalMutation.isPending}
              className="w-full sm:w-auto rounded-xl text-xs"
            >
              Back to Editing
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmSubmit}
              disabled={submitForApprovalMutation.isPending}
              className="w-full sm:w-auto rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {submitForApprovalMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Confirm &amp; Submit</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default EventWizardPage;
