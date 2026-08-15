import React, { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { format, formatDistanceToNow, differenceInMinutes, isPast } from "date-fns";
import DOMPurify from "dompurify";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Layers,
  Sparkles,
  Users,
  ShieldCheck,
  CheckCircle2,
  Mail,
  Phone,
  ArrowLeft,
  AlertCircle,
  Ticket,
  Maximize2,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useEventDetail, useEventUserRegistration } from "@/lib/queries/registrations";
import { RegistrationDialog } from "@/components/events/RegistrationDialog";
import { TicketPassDialog } from "@/components/events/TicketPassDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserRole } from "@/types";

export type RegistrationButtonState =
  | "REGISTER_NOW"
  | "ALREADY_REGISTERED"
  | "NOT_YET_OPEN"
  | "CLOSED"
  | "SOLD_OUT"
  | "WAITLIST_AVAILABLE"
  | "COMPLETED"
  | "CANCELLED";

export const EventDetailPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { firebaseUser, isAuthenticated, role, profile } = useAuth();

  const { data: event, isLoading: isEventLoading, isError } = useEventDetail(eventId);
  const { data: userRegistration } = useEventUserRegistration(
    eventId,
    firebaseUser?.uid
  );

  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [createdRegistration, setCreatedRegistration] = useState<any>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const activeRegistration = userRegistration || createdRegistration;

  const activeRole: UserRole | null = profile?.role || role || (typeof window !== "undefined" ? (localStorage.getItem("apollo_user_role") as UserRole) : null);
  const isFaculty = activeRole === "faculty";
  const isAdmin = activeRole === "admin";
  const isOrganiser = Boolean(
    firebaseUser &&
    event &&
    (event.organiserId === firebaseUser.uid ||
     (event.organiserEmail && firebaseUser.email && event.organiserEmail.toLowerCase() === firebaseUser.email.toLowerCase()))
  );

  // 1. Determine Button State Machine
  const buttonState: {
    state: RegistrationButtonState | "MANAGE_EVENT" | "FACULTY_VIEW" | "ADMIN_VIEW";
    text: string;
    subtext?: string;
    disabled: boolean;
  } = useMemo(() => {
    if (!event) {
      return { state: "CLOSED", text: "Unavailable", disabled: true };
    }

    // Role-based Handling for Non-Students:
    if (isFaculty) {
      if (isOrganiser) {
        return {
          state: "MANAGE_EVENT",
          text: "Manage Event",
          subtext: "Faculty Organiser Console • View registrants & check-ins",
          disabled: false,
        };
      }
      return {
        state: "FACULTY_VIEW",
        text: "Faculty & Staff View",
        subtext: "Student registration only • Academic oversight portal",
        disabled: true,
      };
    }

    if (isAdmin) {
      return {
        state: "ADMIN_VIEW",
        text: "Admin Oversight",
        subtext: "Institutional Admin Console • Governance & Approvals",
        disabled: false,
      };
    }

    // STUDENT FLOW:
    if (activeRegistration && activeRegistration.status !== "CANCELLED") {
      return {
        state: "ALREADY_REGISTERED",
        text: "View Your Entry Ticket",
        subtext: `Status: ${activeRegistration.status} (${activeRegistration.ticketCode})`,
        disabled: false,
      };
    }

    if (event.status === "CANCELLED") {
      return { state: "CANCELLED", text: "Event Cancelled", subtext: "This event will not take place", disabled: true };
    }

    const now = new Date();
    if (event.status === "COMPLETED" || (event.endAt && isPast(new Date(event.endAt)))) {
      return { state: "COMPLETED", text: "Event Ended", subtext: "This event has already concluded", disabled: true };
    }

    if (event.registrationStartAt && now < new Date(event.registrationStartAt)) {
      return {
        state: "NOT_YET_OPEN",
        text: "Registration Opening Soon",
        subtext: `Opens on ${format(new Date(event.registrationStartAt), "MMM d, yyyy")}`,
        disabled: true,
      };
    }

    if (event.registrationDeadline && now > new Date(event.registrationDeadline)) {
      return {
        state: "CLOSED",
        text: "Registration Closed",
        subtext: `Deadline passed on ${format(new Date(event.registrationDeadline), "MMM d, h:mm a")}`,
        disabled: true,
      };
    }

    const capacity = event.capacity || 0;
    const registered = event.registeredCount || 0;
    const isFull = capacity > 0 && registered >= capacity;

    if (isFull) {
      if (event.allowWaitlist) {
        return {
          state: "WAITLIST_AVAILABLE",
          text: "Join Priority Waitlist",
          subtext: "Seats are full; you will be notified if a spot opens up",
          disabled: false,
        };
      }
      return {
        state: "SOLD_OUT",
        text: "Housefull / Sold Out",
        subtext: "All available seats have been booked",
        disabled: true,
      };
    }

    return {
      state: "REGISTER_NOW",
      text: !event.isPaid || event.price === 0 ? "Register for Free" : `Register & Pay • ₹${event.price}`,
      subtext: "Instant digital pass & QR code confirmation",
      disabled: false,
    };
  }, [event, activeRegistration, isFaculty, isAdmin, isOrganiser]);

  const handleActionClick = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (!event) return;

    if (buttonState.state === "MANAGE_EVENT") {
      navigate(`/faculty/events/${event.id}/registrants`);
      return;
    }

    if (buttonState.state === "ADMIN_VIEW") {
      navigate(`/admin/approvals/${event.id}`);
      return;
    }

    if (buttonState.state === "FACULTY_VIEW") {
      return;
    }

    if (buttonState.state === "ALREADY_REGISTERED") {
      setTicketModalOpen(true);
      return;
    }
    if (buttonState.state === "REGISTER_NOW" || buttonState.state === "WAITLIST_AVAILABLE") {
      setRegistrationModalOpen(true);
    }
  };

  if (isEventLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <Skeleton className="h-8 w-48 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="aspect-video w-full rounded-2xl" />
            <Skeleton className="h-10 w-3/4 rounded" />
            <Skeleton className="h-24 w-full rounded" />
          </div>
          <div>
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto stroke-1" />
        <h2 className="text-xl font-bold text-slate-900">Event Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested event may have been unpublished or removed.
        </p>
        <Button asChild variant="outline" className="rounded-xl text-xs">
          <Link to="/events">Back to Events Catalog</Link>
        </Button>
      </div>
    );
  }

  // Duration computation
  const durationMins = Math.max(0, differenceInMinutes(event.endAt, event.startAt));
  const durationHours = Math.floor(durationMins / 60);
  const remainingMins = durationMins % 60;
  const durationText =
    durationHours > 0
      ? `${durationHours} hr${durationHours > 1 ? "s" : ""}${remainingMins > 0 ? ` ${remainingMins} min` : ""}`
      : `${durationMins} mins`;

  // Capacity Progress
  const capacity = event.capacity || 0;
  const registeredCount = event.registeredCount || 0;
  const seatsLeft = Math.max(0, capacity - registeredCount);
  const percentBooked = capacity > 0 ? Math.min(100, Math.round((registeredCount / capacity) * 100)) : 0;

  // Sanitized description
  const sanitizedDescription = DOMPurify.sanitize(event.description);

  return (
    <div className="space-y-8 pb-24 lg:pb-12">
      {/* Top Breadcrumb Navigation Bar */}
      <div className="border-b bg-white/70 backdrop-blur-sm py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Events Catalog</span>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* =================================================================== */}
          {/* LEFT COLUMN: Main Event Details */}
          {/* =================================================================== */}
          <div className="lg:col-span-2 space-y-8">
            {/* 1. Full-Width 16:9 Banner */}
            <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-slate-950 shadow-xl border border-slate-200/80">
              {event.bannerUrl ? (
                <img
                  src={event.bannerUrl}
                  alt={event.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-tr from-indigo-950 via-indigo-900 to-slate-900 p-8 flex flex-col justify-between text-white relative">
                  <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                  <Sparkles className="w-10 h-10 text-amber-400/50 self-end" />
                </div>
              )}

              {/* Overlaid Badges */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/30 p-6 flex flex-col justify-between pointer-events-none">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="indigo" className="bg-white/95 text-slate-900 font-bold uppercase tracking-wider text-xs px-3 py-1 shadow-md">
                    {event.category}
                  </Badge>

                  {event.status === "ONGOING" && (
                    <Badge variant="destructive" className="animate-pulse text-xs font-bold uppercase gap-1.5 px-3 py-1">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      Live Now
                    </Badge>
                  )}
                </div>

                <div className="text-xs font-semibold text-amber-300 tracking-wide uppercase">
                  {event.department || "The Apollo University"}
                </div>
              </div>
            </div>

            {/* 2. H1 Title & Organiser Row */}
            <div className="space-y-4">
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                {event.title}
              </h1>

              {/* Organiser Row */}
              <div className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                <Avatar className="h-10 w-10 ring-2 ring-indigo-50">
                  <AvatarFallback className="bg-indigo-900 text-white font-bold text-xs">
                    {event.organiserName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {event.organiserName}
                    </span>
                    <Badge variant="indigo" className="text-[10px] py-0 px-1.5 h-4 capitalize">
                      {event.organiserRole}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {event.department || "Faculty Organiser"} &bull; The Apollo University
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Meta Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Date & Range</span>
                </div>
                <div className="font-semibold text-xs text-slate-900">
                  {event.startAt ? format(new Date(event.startAt), "MMM d, yyyy") : "Date TBA"}
                </div>
                <div className="text-[11px] text-slate-500">
                  {event.startAt ? format(new Date(event.startAt), "h:mm a") : ""} {event.endAt ? `- ${format(new Date(event.endAt), "h:mm a")}` : ""}
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Duration</span>
                </div>
                <div className="font-semibold text-xs text-slate-900">{durationText}</div>
                <div className="text-[11px] text-slate-500">Official Schedule</div>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                  {event.venueType === "ONLINE" ? (
                    <Video className="w-3.5 h-3.5 text-indigo-600" />
                  ) : event.venueType === "HYBRID" ? (
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  ) : (
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                  <span>Delivery Mode</span>
                </div>
                <div className="font-semibold text-xs text-slate-900 capitalize">
                  {event.venueType.replace("_", " ").toLowerCase()}
                </div>
                <div className="text-[11px] text-slate-500 truncate">{event.venueLocation}</div>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Team Format</span>
                </div>
                <div className="font-semibold text-xs text-slate-900">
                  {(event.maxTeamSize || 1) > 1 ? `Team (Max ${event.maxTeamSize})` : "Individual"}
                </div>
                <div className="text-[11px] text-slate-500">Single Pass Entry</div>
              </div>
            </div>

            {/* 4. Rich-Text Description */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">About this Event</h2>
              <div
                className="prose prose-sm prose-slate max-w-none text-slate-600 leading-relaxed text-xs sm:text-sm space-y-3"
                dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
              />
            </div>

            {/* 5. Eligibility & Prerequisites */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Eligibility & Requirements</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 space-y-2">
                  <p>{event.eligibility || "Open to all enrolled students and faculty of The Apollo University."}</p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>What to Bring / Prerequisites</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 space-y-2">
                  <p>{event.prerequisites || "University Student ID Card and mobile digital entry pass."}</p>
                </CardContent>
              </Card>
            </div>

            {/* 6. Tags as Chips */}
            {event.tags && event.tags.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Topics & Tags</div>
                <div className="flex flex-wrap gap-1.5">
                  {event.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs py-1 px-3 rounded-lg font-medium">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 7. Photo Gallery with Lightbox */}
            {event.gallery && event.gallery.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Event Highlights & Gallery</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {event.gallery.map((imgUrl, i) => (
                    <div
                      key={i}
                      onClick={() => setLightboxImage(imgUrl)}
                      className="group relative aspect-video rounded-xl overflow-hidden cursor-pointer bg-slate-100 border shadow-sm"
                    >
                      <img src={imgUrl} alt={`Gallery ${i}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                        <Maximize2 className="w-5 h-5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 8. Organiser Contact Card */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-900">Need help or have queries?</div>
                <div className="text-[11px] text-slate-500">Directly contact the departmental event organizers.</div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Button asChild size="sm" variant="outline" className="rounded-xl text-xs h-8 gap-1.5">
                  <a href={`mailto:${event.organiserEmail}?subject=Query:%20${encodeURIComponent(event.title)}`}>
                    <Mail className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Email Organiser</span>
                  </a>
                </Button>

                {event.organiserPhone && (
                  <Button asChild size="sm" variant="outline" className="rounded-xl text-xs h-8 gap-1.5">
                    <a href={`tel:${event.organiserPhone}`}>
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Call Support</span>
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* =================================================================== */}
          {/* RIGHT COLUMN: Sticky Registration Card (Desktop) */}
          {/* =================================================================== */}
          <div className="hidden lg:block">
            <div className="sticky top-20">
              <Card className="border-slate-200/90 shadow-xl rounded-3xl overflow-hidden bg-white">
                {/* Fee Header */}
                <div className="p-6 bg-slate-900 text-white space-y-1 text-center relative overflow-hidden">
                  <div className="text-xs font-semibold text-indigo-200 uppercase tracking-widest">
                    Registration Fee
                  </div>
                  <div className="text-3xl font-extrabold text-white">
                    {!event.isPaid || event.price === 0 ? (
                      <span className="text-emerald-400 font-extrabold">Free Entry</span>
                    ) : (
                      <span>₹{event.price}</span>
                    )}
                  </div>
                </div>

                <CardContent className="p-6 space-y-5 text-xs text-slate-700">
                  {/* Live Deadline Countdown */}
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-amber-950 space-y-0.5">
                    <div className="font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-amber-900">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Registration Window</span>
                    </div>
                    <div className="font-semibold text-xs">
                      {isPast(event.registrationDeadline) ? (
                        <span className="text-rose-600">Registration deadline passed</span>
                      ) : (
                        <span>Closes in {formatDistanceToNow(event.registrationDeadline, { addSuffix: false })}</span>
                      )}
                    </div>
                  </div>

                  {/* Seats Capacity Progress Bar */}
                  {capacity > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-semibold text-slate-600">Capacity</span>
                        <span className="font-bold text-slate-900">
                          {registeredCount} / {capacity} booked
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            percentBooked >= 100
                              ? "bg-rose-500"
                              : percentBooked >= 85
                              ? "bg-amber-500"
                              : "bg-indigo-600"
                          }`}
                          style={{ width: `${percentBooked}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-500 text-right">
                        {seatsLeft > 0 ? (
                          <span>
                            <strong className="text-emerald-600">{seatsLeft} seats</strong> remaining
                          </span>
                        ) : (
                          <span className="text-rose-600 font-semibold">Housefull</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Primary State Machine Button */}
                  <div className="space-y-2 pt-2">
                    <Button
                      type="button"
                      size="lg"
                      onClick={handleActionClick}
                      disabled={buttonState.disabled}
                      className={`w-full h-12 rounded-2xl font-bold text-xs shadow-md transition-all ${
                        buttonState.state === "ALREADY_REGISTERED"
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : buttonState.state === "WAITLIST_AVAILABLE"
                          ? "bg-amber-600 hover:bg-amber-700 text-white"
                          : buttonState.state === "FACULTY_VIEW"
                          ? "bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed"
                          : buttonState.state === "MANAGE_EVENT"
                          ? "bg-indigo-700 hover:bg-indigo-800 text-white"
                          : buttonState.state === "ADMIN_VIEW"
                          ? "bg-amber-600 hover:bg-amber-700 text-white"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white"
                      }`}
                    >
                      {buttonState.state === "ALREADY_REGISTERED" ? (
                        <Ticket className="w-4 h-4 mr-2" />
                      ) : buttonState.state === "FACULTY_VIEW" ? (
                        <ShieldCheck className="w-4 h-4 mr-2 text-indigo-500" />
                      ) : buttonState.state === "MANAGE_EVENT" ? (
                        <Users className="w-4 h-4 mr-2" />
                      ) : buttonState.state === "ADMIN_VIEW" ? (
                        <ShieldCheck className="w-4 h-4 mr-2 text-amber-300" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      <span>{buttonState.text}</span>
                    </Button>

                    {buttonState.subtext && (
                      <p className="text-[11px] text-slate-400 text-center leading-normal">
                        {buttonState.subtext}
                      </p>
                    )}
                  </div>

                  {/* Institutional Terms & Refund Policy */}
                  <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 space-y-1 text-center">
                    <div>&bull; Verified Apollo University passes only</div>
                    <div>&bull; Free cancellation available before event commencement</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* MOBILE FIXED BOTTOM ACTION BAR (Below 1024px) */}
      {/* =================================================================== */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-2xl z-40 flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] text-slate-500 font-medium">Registration Fee</div>
          <div className="text-lg font-extrabold text-slate-900">
            {!event.isPaid || event.price === 0 ? "Free Entry" : `₹${event.price}`}
          </div>
        </div>

        <Button
          size="sm"
          onClick={handleActionClick}
          disabled={buttonState.disabled}
          className={`h-11 px-6 rounded-xl font-bold text-xs shadow-md ${
            buttonState.state === "FACULTY_VIEW"
              ? "bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed"
              : buttonState.state === "MANAGE_EVENT"
              ? "bg-indigo-700 hover:bg-indigo-800 text-white"
              : buttonState.state === "ADMIN_VIEW"
              ? "bg-amber-600 hover:bg-amber-700 text-white"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          }`}
        >
          <span>{buttonState.text}</span>
        </Button>
      </div>

      {/* Registration Modal Dialog */}
      <RegistrationDialog
        event={event}
        isOpen={registrationModalOpen}
        onClose={() => setRegistrationModalOpen(false)}
        onSuccess={(createdResult) => {
          if (createdResult) {
            setCreatedRegistration({
              id: createdResult.registrationId,
              eventId: event.id,
              userId: firebaseUser?.uid || "",
              userDisplayName: firebaseUser?.displayName || "Student Participant",
              userEmail: firebaseUser?.email || "",
              status: createdResult.status || "CONFIRMED",
              ticketCode: createdResult.ticketCode,
              qrCodePayload: JSON.stringify({ ticketCode: createdResult.ticketCode, eventId: event.id }),
              isPaid: true,
              amountPaid: createdResult.amount || 0,
              checkedIn: false,
              registeredAt: new Date(),
              updatedAt: new Date(),
            });
          }
          setRegistrationModalOpen(false);
          setTicketModalOpen(true);
        }}
      />

      {/* Ticket Pass QR Dialog */}
      {activeRegistration && (
        <TicketPassDialog
          registration={activeRegistration}
          event={event}
          isOpen={ticketModalOpen}
          onClose={() => setTicketModalOpen(false)}
        />
      )}

      {/* Lightbox Viewer */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Enlarged gallery photo"
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
export default EventDetailPage;
