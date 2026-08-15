import React from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Calendar, MapPin, Video, Layers, Sparkles, Users } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Event, EventCategory } from "@/types";

export interface EventCardProps {
  event: Event;
  className?: string;
}

/**
 * Returns tailored category gradient and badge styling
 */
const getCategoryMeta = (category: EventCategory) => {
  switch (category) {
    case "HACKATHON":
    case "WORKSHOP":
      return {
        bgGradient: "from-indigo-950 via-indigo-900 to-indigo-800",
        badgeVariant: "indigo" as const,
        label: category === "HACKATHON" ? "Hackathon" : "Workshop",
      };
    case "CULTURAL":
      return {
        bgGradient: "from-purple-950 via-indigo-900 to-pink-900",
        badgeVariant: "amber" as const,
        label: "Cultural",
      };
    case "SPORTS":
      return {
        bgGradient: "from-emerald-950 via-teal-900 to-slate-900",
        badgeVariant: "emerald" as const,
        label: "Sports",
      };
    case "SEMINAR":
    case "GUEST_LECTURE":
    case "CONFERENCE":
      return {
        bgGradient: "from-amber-950 via-stone-900 to-slate-900",
        badgeVariant: "amber" as const,
        label: category === "GUEST_LECTURE" ? "Guest Lecture" : category === "CONFERENCE" ? "Conference" : "Seminar",
      };
    default:
      return {
        bgGradient: "from-slate-950 via-indigo-950 to-slate-900",
        badgeVariant: "secondary" as const,
        label: "Academic",
      };
  }
};

export const EventCard: React.FC<EventCardProps> = ({ event, className = "" }) => {
  const categoryMeta = getCategoryMeta(event.category);
  const seatsLeft = Math.max(0, (event.capacity || 0) - (event.registeredCount || 0));
  const isSoldOut = (event.capacity || 0) > 0 && (event.registeredCount || 0) >= (event.capacity || 0);
  const isFewSeatsLeft =
    !isSoldOut &&
    event.capacity > 0 &&
    (seatsLeft <= 10 || (event.registeredCount / event.capacity) >= 0.85);

  const formattedDate = format(event.startAt, "EEE, MMM d, yyyy");
  const formattedTime = format(event.startAt, "h:mm a");

  // Mode icon
  const renderModeIcon = () => {
    if (event.venueType === "ONLINE") {
      return <Video className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
    }
    if (event.venueType === "HYBRID") {
      return <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
    }
    return <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
  };

  return (
    <Link
      to={`/events/${event.id}`}
      className={`group block focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-2xl ${className}`}
    >
      <Card className="h-full flex flex-col overflow-hidden border-slate-200/90 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-indigo-300/80 hover:-translate-y-1 bg-white">
        {/* 16:9 Banner with Gradient Overlay & Category Emblem */}
        <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
          {event.bannerUrl ? (
            <img
              src={event.bannerUrl}
              alt={event.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className={`h-full w-full bg-gradient-to-tr ${categoryMeta.bgGradient} p-4 flex flex-col justify-between text-white relative overflow-hidden`}
            >
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
              <div className="absolute -left-8 -top-8 w-32 h-32 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
              <Sparkles className="w-6 h-6 text-amber-400/40 self-end" />
            </div>
          )}

          {/* Banner Overlays & Badges */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 p-3.5 flex flex-col justify-between pointer-events-none">
            <div className="flex items-center justify-between gap-2">
              {/* Category Badge Top-Left */}
              <Badge
                variant={categoryMeta.badgeVariant}
                className="bg-white/95 text-slate-900 border-none shadow-md backdrop-blur-md text-[10px] font-bold uppercase tracking-wider py-0.5 px-2"
              >
                {categoryMeta.label}
              </Badge>

              {/* Status Pill Top-Right */}
              {event.status === "ONGOING" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-lg shadow-rose-600/30 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  Live Now
                </span>
              ) : isSoldOut ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 shadow-md">
                  Sold Out
                </span>
              ) : isFewSeatsLeft ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-md">
                  Few Seats Left
                </span>
              ) : null}
            </div>

            {/* Organiser Tag Overlay */}
            <div className="text-[11px] font-semibold text-amber-300/90 tracking-wide truncate">
              {event.organiserName || "The Apollo University"}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            {/* Title Clamped to 2 Lines */}
            <h3 className="font-bold text-sm sm:text-base text-slate-900 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
              {event.title}
            </h3>

            {/* Date & Time Row */}
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="truncate">
                {formattedDate} &bull; {formattedTime}
              </span>
            </div>

            {/* Venue & Mode Row */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {renderModeIcon()}
              <span className="truncate">{event.venueLocation || "Campus Venue"}</span>
            </div>
          </div>
        </CardContent>

        {/* Card Footer: Pricing & Remaining Capacity */}
        <CardFooter className="px-4 py-3 border-t bg-slate-50/70 flex items-center justify-between text-xs text-slate-600">
          {/* Price */}
          <div className="font-extrabold text-sm text-slate-900">
            {!event.isPaid || event.price === 0 ? (
              <span className="text-emerald-600 font-bold">Free</span>
            ) : (
              <span>₹{event.price}</span>
            )}
          </div>

          {/* Seats Info */}
          <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
            <Users className="w-3 h-3 text-slate-400" />
            {isSoldOut ? (
              <span className="text-rose-600 font-semibold">Housefull ({event.capacity})</span>
            ) : event.capacity > 0 ? (
              <span>
                <strong className="text-slate-800">{seatsLeft}</strong> / {event.capacity} left
              </span>
            ) : (
              <span>Open Entry</span>
            )}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
};
