import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Loader2,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  ShieldAlert,
  Building,
  GraduationCap,
  Sparkles,
  FileText,
  AlertTriangle,
  Upload,
  X,
} from "lucide-react";
import { useEventDetail } from "@/lib/queries/events";
import { useAdminEditEvent, AdminEventFormPayload } from "@/lib/queries/adminEvents";
import { RichTextEditor } from "@/components/events/RichTextEditor";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  EVENT_CATEGORIES,
  EVENT_VENUE_TYPES,
  EVENT_STATUSES,
  DEPARTMENTS,
  EventCategory,
  EventVenueType,
  EventStatus,
} from "@/types";
import {
  isValidOptionalPhoneNumber,
  isValidEmail,
  PHONE_ERROR_MESSAGES,
} from "@/lib/validation";
import { toast } from "sonner";

export const AdminEventEditPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const { data: event, isLoading: isEventLoading } = useEventDetail(eventId);
  const editEventMutation = useAdminEditEvent();

  // 1. Basic Information
  const [title, setTitle] = useState("");
  const [shortSummary, setShortSummary] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<EventCategory>("ACADEMIC");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // 2. Date & Time
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [registrationStartAt, setRegistrationStartAt] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [cancellationDeadline, setCancellationDeadline] = useState("");

  // 3. Venue & Delivery Mode
  const [venueType, setVenueType] = useState<EventVenueType>("ON_CAMPUS");
  const [venueLocation, setVenueLocation] = useState("");
  const [roomBuilding, setRoomBuilding] = useState("");

  // 4. Organizer & Coordinators
  const [organiserName, setOrganiserName] = useState("");
  const [organiserEmail, setOrganiserEmail] = useState("");
  const [organiserPhone, setOrganiserPhone] = useState("");
  const [department, setDepartment] = useState("Computer Science and Engineering");
  const [school, setSchool] = useState("School of Technology");
  const [facultyCoordinator, setFacultyCoordinator] = useState("");
  const [studentCoordinators, setStudentCoordinators] = useState("");

  // 5. Registration Settings & Capacity
  const [capacity, setCapacity] = useState<number>(100);
  const [allowWaitlist, setAllowWaitlist] = useState(false);
  const [maxTeamSize, setMaxTeamSize] = useState<number>(1);
  const [prerequisites, setPrerequisites] = useState("");
  const [externalLink, setExternalLink] = useState("");

  // 6. Eligibility & Restrictions
  const [eligibility, setEligibility] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);

  // 7. Media & Attachments
  const [bannerUrl, setBannerUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  // 8. Communication & Support
  const [contactPerson, setContactPerson] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [instructions, setInstructions] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");

  // 9. Financial Information
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState<number>(0);
  const [budgetAllocated, setBudgetAllocated] = useState<number>(0);
  const [amountSpent, setAmountSpent] = useState<number>(0);

  // 10. Advanced Settings
  const [status, setStatus] = useState<EventStatus>("PUBLISHED");
  const [isFeatured, setIsFeatured] = useState(false);

  // Load existing event data
  useEffect(() => {
    if (event) {
      setTitle(event.title || "");
      setShortSummary((event as any).shortSummary || "");
      setDescription(event.description || "");
      setCategory(event.category || "ACADEMIC");
      setTags(event.tags || []);

      const formatInputDate = (d: any) => {
        if (!d) return "";
        try {
          const dateObj = d instanceof Date ? d : new Date(d);
          if (isNaN(dateObj.getTime())) return "";
          return dateObj.toISOString().slice(0, 16);
        } catch {
          return "";
        }
      };

      setStartAt(formatInputDate(event.startAt));
      setEndAt(formatInputDate(event.endAt));
      setRegistrationStartAt(formatInputDate(event.registrationStartAt));
      setRegistrationDeadline(formatInputDate(event.registrationDeadline));
      setCancellationDeadline(formatInputDate(event.cancellationDeadline));

      setVenueType(event.venueType || "ON_CAMPUS");
      setVenueLocation(event.venueLocation || "");
      setRoomBuilding((event as any).roomBuilding || "");

      setOrganiserName(event.organiserName || "");
      setOrganiserEmail(event.organiserEmail || "");
      setOrganiserPhone(event.organiserPhone || "");
      setDepartment(event.department || "Computer Science and Engineering");
      setSchool((event as any).school || "School of Technology");
      setFacultyCoordinator((event as any).facultyCoordinator || "");
      setStudentCoordinators((event as any).studentCoordinators || "");

      setCapacity(event.capacity || 100);
      setAllowWaitlist(Boolean(event.allowWaitlist));
      setMaxTeamSize(event.maxTeamSize || 1);
      setPrerequisites(event.prerequisites || "");
      setExternalLink((event as any).externalLink || "");

      setEligibility(event.eligibility || "");
      setTargetAudience((event as any).targetAudience || "");
      setSelectedYears((event as any).yearRestrictions || []);
      setSelectedDepts((event as any).departmentRestrictions || []);

      setBannerUrl(event.bannerUrl || "");
      setThumbnailUrl((event as any).thumbnailUrl || event.bannerUrl || "");

      setContactPerson((event as any).contactPerson || "");
      setContactEmail((event as any).contactEmail || "");
      setContactPhone((event as any).contactPhone || "");
      setInstructions((event as any).instructions || "");
      setTermsAndConditions((event as any).termsAndConditions || "");

      setIsPaid(Boolean(event.isPaid));
      setPrice(event.price || 0);
      setBudgetAllocated(Number((event as any).budgetAllocated) || 0);
      setAmountSpent(Number((event as any).amountSpent) || 0);

      setStatus(event.status || "PUBLISHED");
      setIsFeatured(Boolean((event as any).isFeatured));
    }
  }, [event]);

  // Tag helper
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const balanceRemaining = Math.max(0, budgetAllocated - amountSpent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;

    // Strict Validations
    if (!title.trim() || title.trim().length < 3) {
      toast.error("Validation Failed", { description: "Event title must be at least 3 characters." });
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      toast.error("Validation Failed", { description: "Event description must be at least 10 characters." });
      return;
    }
    if (!startAt || !endAt) {
      toast.error("Validation Failed", { description: "Start date and End date are required." });
      return;
    }
    if (new Date(endAt) <= new Date(startAt)) {
      toast.error("Validation Failed", { description: "Event end time must be after start time." });
      return;
    }
    if (!venueLocation.trim()) {
      toast.error("Validation Failed", { description: "Venue location / meeting link is required." });
      return;
    }
    if (capacity < 1) {
      toast.error("Validation Failed", { description: "Event capacity must be at least 1." });
      return;
    }
    if (organiserPhone.trim() && !isValidOptionalPhoneNumber(organiserPhone)) {
      toast.error("Validation Failed", { description: `Organizer phone: ${PHONE_ERROR_MESSAGES.INVALID}` });
      return;
    }
    if (contactPhone.trim() && !isValidOptionalPhoneNumber(contactPhone)) {
      toast.error("Validation Failed", { description: `Contact phone: ${PHONE_ERROR_MESSAGES.INVALID}` });
      return;
    }
    if (contactEmail.trim() && !isValidEmail(contactEmail)) {
      toast.error("Validation Failed", { description: "Please enter a valid contact email address." });
      return;
    }

    const payload: AdminEventFormPayload = {
      title: title.trim(),
      shortSummary: shortSummary.trim(),
      description: description.trim(),
      category,
      venueType,
      venueLocation: venueLocation.trim(),
      roomBuilding: roomBuilding.trim(),
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      registrationStartAt: registrationStartAt ? new Date(registrationStartAt) : undefined,
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : new Date(startAt),
      cancellationDeadline: cancellationDeadline ? new Date(cancellationDeadline) : undefined,
      capacity: Number(capacity),
      allowWaitlist,
      maxTeamSize: Number(maxTeamSize),
      isPaid,
      price: isPaid ? Number(price) : 0,
      bannerUrl: bannerUrl.trim(),
      thumbnailUrl: thumbnailUrl.trim(),
      tags,
      eligibility: eligibility.trim(),
      targetAudience: targetAudience.trim(),
      yearRestrictions: selectedYears,
      departmentRestrictions: selectedDepts,
      prerequisites: prerequisites.trim(),
      externalLink: externalLink.trim(),
      organiserName: organiserName.trim(),
      organiserEmail: organiserEmail.trim(),
      organiserPhone: organiserPhone.trim(),
      facultyCoordinator: facultyCoordinator.trim(),
      studentCoordinators: studentCoordinators.trim(),
      department,
      school,
      contactPerson: contactPerson.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      instructions: instructions.trim(),
      termsAndConditions: termsAndConditions.trim(),
      budgetAllocated: Number(budgetAllocated) || 0,
      amountSpent: Number(amountSpent) || 0,
      status,
      isFeatured,
    };

    try {
      await editEventMutation.mutateAsync({ eventId, data: payload });
      navigate(`/admin/events/${eventId}`);
    } catch {}
  };

  if (isEventLoading) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading event editor configuration...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Event Not Found</h2>
        <Button asChild variant="outline" className="rounded-xl text-xs">
          <Link to="/admin/events">Back to Events Master Registry</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 pb-32">
      {/* Top Header / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <Link
            to={`/admin/events/${eventId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Event Control Center</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900">Administrative Event Editor</h1>
            <Badge variant="amber" className="text-[10px] font-bold">Admin Override Active</Badge>
          </div>
          <p className="text-xs text-slate-500">
            Editing <strong className="text-slate-800">"{event.title}"</strong> (ID: {event.id})
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/events/${eventId}`)}
            className="rounded-xl text-xs font-bold h-9"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={editEventMutation.isPending}
            className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 h-9 shadow-md"
          >
            {editEventMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save All Changes</span>
          </Button>
        </div>
      </div>

      {/* 1. Basic Information */}
      <Card className="p-6 rounded-3xl border-slate-200 bg-white space-y-5 shadow-2xs">
        <div className="border-b pb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Section 1: Basic Information &amp; Overview</span>
          </h2>
          <span className="text-[10px] text-slate-400 font-bold uppercase">Core Identity</span>
        </div>

        <div className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Event Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. National Symposium on Quantum Computing"
              className="h-10 text-xs rounded-xl font-bold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Event Category *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as EventCategory)}>
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      {cat.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Short Summary</Label>
              <Input
                value={shortSummary}
                onChange={(e) => setShortSummary(e.target.value)}
                placeholder="Brief one-line summary for event cards..."
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Detailed Description &amp; Agenda *</Label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Write comprehensive description, schedule, takeaways, and speaker details..."
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="font-bold text-slate-700">Event Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                placeholder="Type tag and press Add..."
                className="h-9 text-xs rounded-xl max-w-xs"
              />
              <Button type="button" size="sm" variant="outline" onClick={handleAddTag} className="rounded-xl text-xs h-9 font-bold">
                Add Tag
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[11px] gap-1 pr-1.5">
                  <span>#{tag}</span>
                  <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-rose-600">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Date & Time */}
      <Card className="p-6 rounded-3xl border-slate-200 bg-white space-y-5 shadow-2xs">
        <div className="border-b pb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Section 2: Date, Time &amp; Registration Schedule</span>
          </h2>
          <span className="text-[10px] text-slate-400 font-bold uppercase">Timings</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Event Starts At *</Label>
            <Input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Event Concludes At *</Label>
            <Input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Registration Opens At</Label>
            <Input
              type="datetime-local"
              value={registrationStartAt}
              onChange={(e) => setRegistrationStartAt(e.target.value)}
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Registration Closes At *</Label>
            <Input
              type="datetime-local"
              value={registrationDeadline}
              onChange={(e) => setRegistrationDeadline(e.target.value)}
              className="h-10 text-xs rounded-xl"
            />
          </div>
        </div>
      </Card>

      {/* 3. Venue & Delivery Mode */}
      <Card className="p-6 rounded-3xl border-slate-200 bg-white space-y-5 shadow-2xs">
        <div className="border-b pb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-600" />
            <span>Section 3: Delivery Mode &amp; Campus Location</span>
          </h2>
          <span className="text-[10px] text-slate-400 font-bold uppercase">Logistics</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Delivery Mode *</Label>
            <Select value={venueType} onValueChange={(v) => setVenueType(v as EventVenueType)}>
              <SelectTrigger className="h-10 text-xs rounded-xl">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_VENUE_TYPES.map((vt) => (
                  <SelectItem key={vt} value={vt} className="text-xs">
                    {vt.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="font-bold text-slate-700">Venue Location / URL *</Label>
            <Input
              value={venueLocation}
              onChange={(e) => setVenueLocation(e.target.value)}
              placeholder="e.g. Main Auditorium Block A or Teams Link"
              className="h-10 text-xs rounded-xl"
            />
          </div>
        </div>
      </Card>

      {/* 4. Organizer & Coordinators */}
      <Card className="p-6 rounded-3xl border-slate-200 bg-white space-y-5 shadow-2xs">
        <div className="border-b pb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-600" />
            <span>Section 4: Organizer, Department &amp; Coordinators</span>
          </h2>
          <span className="text-[10px] text-slate-400 font-bold uppercase">Ownership</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Lead Organizer Name *</Label>
            <Input
              value={organiserName}
              onChange={(e) => setOrganiserName(e.target.value)}
              placeholder="e.g. Dr. K. Ramanathan"
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Organizer Email *</Label>
            <Input
              type="email"
              value={organiserEmail}
              onChange={(e) => setOrganiserEmail(e.target.value)}
              placeholder="faculty@apollouniversity.edu.in"
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Organizer Mobile (10 Digits)</Label>
            <Input
              value={organiserPhone}
              onChange={(e) => setOrganiserPhone(e.target.value)}
              placeholder="9876543210"
              maxLength={10}
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Academic Department</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="h-10 text-xs rounded-xl">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d} className="text-xs">
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Faculty Coordinator</Label>
            <Input
              value={facultyCoordinator}
              onChange={(e) => setFacultyCoordinator(e.target.value)}
              placeholder="e.g. Prof. Sneha Sen (CSE)"
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Student Coordinators</Label>
            <Input
              value={studentCoordinators}
              onChange={(e) => setStudentCoordinators(e.target.value)}
              placeholder="e.g. Amit Verma (Roll 101), Neha R (Roll 104)"
              className="h-10 text-xs rounded-xl"
            />
          </div>
        </div>
      </Card>

      {/* 5. Registration Settings & Capacity */}
      <Card className="p-6 rounded-3xl border-slate-200 bg-white space-y-5 shadow-2xs">
        <div className="border-b pb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Section 5: Registration Settings &amp; Capacity</span>
          </h2>
          <span className="text-[10px] text-slate-400 font-bold uppercase">Gate Limits</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Total Capacity (Seats) *</Label>
            <Input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="h-10 text-xs rounded-xl font-bold font-mono"
            />
            {event.registeredCount > capacity && (
              <p className="text-[11px] text-amber-600 font-bold flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Warning: Current bookings ({event.registeredCount}) exceed new capacity ({capacity}).</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Max Team Size</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={maxTeamSize}
              onChange={(e) => setMaxTeamSize(Number(e.target.value))}
              className="h-10 text-xs rounded-xl font-mono"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 mt-2 sm:mt-0">
            <div>
              <Label className="font-bold text-slate-800 block">Allow Waitlisting</Label>
              <span className="text-[10px] text-slate-400">Queue attendees if housefull</span>
            </div>
            <Switch checked={allowWaitlist} onCheckedChange={setAllowWaitlist} />
          </div>
        </div>
      </Card>

      {/* 6. Eligibility & Restrictions */}
      <Card className="p-6 rounded-3xl border-slate-200 bg-white space-y-5 shadow-2xs">
        <div className="border-b pb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span>Section 6: Eligibility Criteria &amp; Target Audience</span>
          </h2>
          <span className="text-[10px] text-slate-400 font-bold uppercase">Audience</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Eligibility Criteria</Label>
            <Input
              value={eligibility}
              onChange={(e) => setEligibility(e.target.value)}
              placeholder="e.g. Open to all B.Tech / M.Tech / PhD students"
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Prerequisites</Label>
            <Input
              value={prerequisites}
              onChange={(e) => setPrerequisites(e.target.value)}
              placeholder="e.g. Basic knowledge of Python and Linux"
              className="h-10 text-xs rounded-xl"
            />
          </div>
        </div>
      </Card>

      {/* 7. Media & Assets */}
      <Card className="p-6 rounded-3xl border-slate-200 bg-white space-y-5 shadow-2xs">
        <div className="border-b pb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-600" />
            <span>Section 7: Event Poster &amp; Media Assets</span>
          </h2>
          <span className="text-[10px] text-slate-400 font-bold uppercase">Visuals</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Banner / Poster URL</Label>
            <Input
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="https://... image link or storage URL"
              className="h-10 text-xs rounded-xl font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Thumbnail URL</Label>
            <Input
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://... square thumbnail"
              className="h-10 text-xs rounded-xl font-mono"
            />
          </div>
        </div>

        {bannerUrl && (
          <div className="p-2 border rounded-2xl bg-slate-50 max-w-sm">
            <img src={bannerUrl} alt="Banner Preview" className="w-full h-36 object-cover rounded-xl" />
          </div>
        )}
      </Card>

      {/* 8. Communication & Support */}
      <Card className="p-6 rounded-3xl border-slate-200 bg-white space-y-5 shadow-2xs">
        <div className="border-b pb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Section 8: Communication, Support &amp; Terms</span>
          </h2>
          <span className="text-[10px] text-slate-400 font-bold uppercase">Inquiries</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Contact Person</Label>
            <Input
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="e.g. Student Helpdesk Lead"
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Support Email</Label>
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="event-support@apollouniversity.edu.in"
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Support Mobile (10 Digits)</Label>
            <Input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="9876543210"
              maxLength={10}
              className="h-10 text-xs rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Event Instructions</Label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Instructions for attendees on event day..."
              rows={3}
              className="text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Terms &amp; Conditions / Code of Conduct</Label>
            <Textarea
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              placeholder="Campus rules, disciplinary standards, and safety policy..."
              rows={3}
              className="text-xs rounded-xl"
            />
          </div>
        </div>
      </Card>

      {/* 9. Financial Information */}
      <Card className="p-6 rounded-3xl border-slate-200 bg-white space-y-5 shadow-2xs">
        <div className="border-b pb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Section 9: Financial Management &amp; Budget Statement</span>
          </h2>
          <span className="text-[10px] text-slate-400 font-bold uppercase">Budget &amp; Fee</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div>
              <Label className="font-bold text-slate-800 block">Is Paid Event?</Label>
              <span className="text-[10px] text-slate-400">Requires online payment</span>
            </div>
            <Switch checked={isPaid} onCheckedChange={setIsPaid} />
          </div>

          {isPaid && (
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Registration Fee (INR) *</Label>
              <Input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="h-10 text-xs rounded-xl font-bold font-mono"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Institutional Budget Allocated (INR)</Label>
            <Input
              type="number"
              min={0}
              value={budgetAllocated}
              onChange={(e) => setBudgetAllocated(Number(e.target.value))}
              className="h-10 text-xs rounded-xl font-bold font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Total Amount Spent (INR)</Label>
            <Input
              type="number"
              min={0}
              value={amountSpent}
              onChange={(e) => setAmountSpent(Number(e.target.value))}
              className="h-10 text-xs rounded-xl font-bold font-mono"
            />
          </div>
        </div>

        <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-100 flex items-center justify-between text-xs">
          <div>
            <strong className="text-emerald-900 block font-bold">Auto-Calculated Balance Remaining</strong>
            <span className="text-[10px] text-emerald-700 font-mono">Budget Allocated (₹{budgetAllocated.toLocaleString()}) - Total Spent (₹{amountSpent.toLocaleString()})</span>
          </div>
          <span className="text-lg font-black text-emerald-800 font-mono">
            ₹{balanceRemaining.toLocaleString()}
          </span>
        </div>
      </Card>

      {/* 10. Advanced Settings & Lifecycle */}
      <Card className="p-6 rounded-3xl border-slate-200 bg-white space-y-5 shadow-2xs">
        <div className="border-b pb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Section 10: Lifecycle Governance &amp; Administrative Overrides</span>
          </h2>
          <span className="text-[10px] text-amber-700 font-bold uppercase">Admin Controls</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Override Lifecycle Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as EventStatus)}>
              <SelectTrigger className="h-10 text-xs rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_STATUSES.map((st) => (
                  <SelectItem key={st} value={st} className="text-xs">
                    {st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <Label className="font-bold text-slate-800 block">Featured Event</Label>
              <span className="text-[10px] text-slate-400">Promote to hero banner section</span>
            </div>
            <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
          </div>
        </div>
      </Card>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-2xl z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            Ensure all mandatory fields are verified before committing administrative updates.
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/events/${eventId}`)}
              className="rounded-xl text-xs font-bold h-9"
            >
              Discard Changes
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={editEventMutation.isPending}
              className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 h-9 shadow-md"
            >
              {editEventMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save &amp; Commit Event Updates</span>
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default AdminEventEditPage;
