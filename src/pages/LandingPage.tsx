import React from "react";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import {
  Ticket,
  MapPin,
  ArrowRight,
  Clock,
  Calendar,
  Cpu,
  Shield,
  Cloud,
  BrainCircuit,
  Building2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  useOngoingEvents,
  useUpcomingEvents,
  useNextStudentRegistration,
  useStudentStats,
} from "@/lib/queries/events";
import { EventCard } from "@/components/events/EventCard";
import { EventCardSkeleton } from "@/components/events/EventCardSkeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const LandingPage: React.FC = () => {
  const { firebaseUser, profile } = useAuth();

  // 1. Time-of-day Greeting & Today's Date
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 17
      ? "Good afternoon"
      : "Good evening";

  const firstName =
    profile?.displayName?.split(" ")[0] ||
    firebaseUser?.displayName?.split(" ")[0] ||
    "B.Tech Scholar";

  const todayFormatted = format(new Date(), "EEEE, MMMM d, yyyy");

  // 2. Data Queries
  const { events: ongoingEvents } = useOngoingEvents();
  const { data: upcomingEvents, isLoading: isUpcomingLoading } = useUpcomingEvents(6);
  const { data: nextBooking, isLoading: isNextBookingLoading } = useNextStudentRegistration(
    firebaseUser?.uid
  );
  const { data: stats } = useStudentStats(firebaseUser?.uid);

  return (
    <div className="space-y-8 sm:space-y-12 py-6 sm:py-8">
      {/* 1. Hero Academic Greeting & Stats Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#003847] via-[#004D61] to-[#007A99] text-white p-6 sm:p-10 shadow-xl border border-cyan-800/40">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#F5A623]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            {/* Greeting Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-700/50 pb-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#F5A623] flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>School of Technology • B.Tech Campus Hub</span>
                  </span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                  {greeting}, {firstName}
                </h1>
                <p className="text-xs sm:text-sm text-cyan-100/90 font-medium">
                  {todayFormatted} &bull; The Apollo University
                </p>
              </div>

              {/* B.Tech Specializations Strip */}
              <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                <Badge className="bg-white/15 text-white hover:bg-white/20 border-0 text-[10px] gap-1 py-1 font-medium">
                  <Cpu className="w-3 h-3 text-[#F5A623]" />
                  <span>CSE</span>
                </Badge>
                <Badge className="bg-white/15 text-white hover:bg-white/20 border-0 text-[10px] gap-1 py-1 font-medium">
                  <BrainCircuit className="w-3 h-3 text-cyan-300" />
                  <span>AI &amp; Data Science</span>
                </Badge>
                <Badge className="bg-white/15 text-white hover:bg-white/20 border-0 text-[10px] gap-1 py-1 font-medium">
                  <Shield className="w-3 h-3 text-emerald-300" />
                  <span>Cyber Security</span>
                </Badge>
                <Badge className="bg-white/15 text-white hover:bg-white/20 border-0 text-[10px] gap-1 py-1 font-medium">
                  <Cloud className="w-3 h-3 text-sky-300" />
                  <span>Cloud Computing</span>
                </Badge>
              </div>
            </div>

            {/* Quick Stat Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-cyan-200 block">
                  Registered Events
                </span>
                <span className="text-xl sm:text-3xl font-black font-mono">
                  {stats?.registeredCount || 0}
                </span>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-cyan-200 block">
                  Attended &amp; Verified
                </span>
                <span className="text-xl sm:text-3xl font-black font-mono text-emerald-300">
                  {stats?.attendedCount || 0}
                </span>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-cyan-200 block">
                  Activity Hours
                </span>
                <span className="text-xl sm:text-3xl font-black font-mono text-[#F5A623]">
                  {(stats?.attendedCount || 0) * 3} hrs
                </span>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-cyan-200 block">
                  Verified Records
                </span>
                <span className="text-xl sm:text-3xl font-black font-mono text-cyan-200">
                  {stats?.attendedCount || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Next Up Booking Card */}
      {nextBooking && !isNextBookingLoading && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="border-l-4 border-l-[#007A99] border-slate-200/90 shadow-md bg-white overflow-hidden rounded-2xl">
            <div className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-[#007A99] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                    Your Next Event
                  </span>
                  <span className="text-xs font-bold text-slate-500 font-mono">
                    Starts {formatDistanceToNow(new Date(nextBooking.event.startAt), { addSuffix: true })}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{nextBooking.event.title}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#007A99]" />
                  <span>{nextBooking.event.venueLocation || "Campus Venue"}</span>
                  <span>&bull;</span>
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{format(new Date(nextBooking.event.startAt), "h:mm a")}</span>
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Button asChild size="sm" className="bg-[#007A99] hover:bg-[#006883] text-white font-bold text-xs rounded-xl shadow-xs">
                  <Link to={`/tickets/${nextBooking.registration.id}`}>
                    <Ticket className="w-3.5 h-3.5 mr-1.5" />
                    <span>View Ticket Pass</span>
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* 3. Live Now Pulsing Strip */}
      {ongoingEvents && ongoingEvents.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
              Live Right Now on Campus
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ongoingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {/* 4. Upcoming B.Tech Campus Events */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Upcoming B.Tech Events &amp; Workshops
            </h2>
            <p className="text-xs text-slate-500">
              Technical symposiums, hackathons, guest lectures, and student club activities
            </p>
          </div>

          <Button asChild variant="outline" size="sm" className="text-xs rounded-xl font-bold border-slate-300 text-[#007A99] hover:bg-[#E0F3F7]">
            <Link to="/events">
              <span>View All Events</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        </div>

        {isUpcomingLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : upcomingEvents && upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center text-slate-400 space-y-2 rounded-2xl border-dashed">
            <Calendar className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-xs font-semibold">No scheduled events published yet.</p>
          </Card>
        )}
      </section>
    </div>
  );
};
export default LandingPage;
