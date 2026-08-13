import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Building, Users, Star, ArrowRight, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function EventCard({ event }) {
  if (!event) return null;

  const status = event.computedStatus || event.status;
  const fillPercentage = Math.min(
    100, 
    Math.round(((event.currentParticipantsCount || 0) / (event.maxParticipants || 100)) * 100)
  );

  const formatEventDate = (dateStr) => {
    try {
      if (!dateStr) return 'Date TBD';
      const [year, month, day] = dateStr.split('-');
      const date = new Date(year, month - 1, day);
      return format(date, 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-apollo-border shadow-apollo apollo-card-hover flex flex-col group relative">
      
      {/* Event Poster Image & Badges Overlay */}
      <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-apollo-navyDark">
        <img
          src={event.poster || '/assets/poster_ai_ml.jpg'}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-apollo-dark/90 via-apollo-dark/20 to-transparent"></div>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-apollo-navy/90 text-apollo-cyan border border-apollo-cyan/30 backdrop-blur-md">
            {event.eventType || 'Event'}
          </span>

          {event.isFeatured && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-apollo-gold text-apollo-dark flex items-center gap-1 shadow-gold">
              <Star className="w-3.5 h-3.5 fill-apollo-dark" />
              FEATURED
            </span>
          )}
        </div>

        {/* Bottom Status Tag */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          {status === 'ONGOING' && (
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-500 text-white flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white"></span>
              LIVE NOW
            </span>
          )}
          {status === 'UPCOMING' && (
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-apollo-teal text-white">
              UPCOMING
            </span>
          )}
          {status === 'COMPLETED' && (
            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-gray-700 text-gray-200">
              COMPLETED
            </span>
          )}
          {status === 'CANCELLED' && (
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-red-600 text-white flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              CANCELLED
            </span>
          )}

          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-black/60 text-white border border-white/20">
            {event.mode || 'Offline'}
          </span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* School / Department */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-apollo-teal mb-1.5">
            <Building className="w-3.5 h-3.5" />
            <span className="truncate">{event.school}</span>
          </div>

          {/* Title */}
          <h3 className="font-display font-bold text-lg text-apollo-dark leading-snug group-hover:text-apollo-teal transition-colors line-clamp-2">
            {event.title}
          </h3>

          {/* Date, Time & Venue info */}
          <div className="mt-3.5 space-y-2 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-apollo-teal shrink-0" />
              <span className="font-semibold text-apollo-dark">
                {formatEventDate(event.startDate)}
                {event.endDate && event.endDate !== event.startDate && ` – ${formatEventDate(event.endDate)}`}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-apollo-teal shrink-0" />
              <span>{event.startTime || '10:00 AM'} – {event.endTime || '04:00 PM'}</span>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-apollo-teal shrink-0" />
              <span className="truncate">{event.venue} {event.room ? `(${event.room})` : ''}</span>
            </div>
          </div>
        </div>

        {/* Bottom Section: Registration & CTA */}
        <div className="pt-3 border-t border-gray-100 space-y-3">
          {/* Capacity Progress Bar */}
          {event.registrationRequired && (
            <div>
              <div className="flex justify-between text-[11px] font-medium text-gray-500 mb-1">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-apollo-teal" />
                  {event.currentParticipantsCount || 0} / {event.maxParticipants} Seats
                </span>
                <span className="font-bold text-apollo-navy">{fillPercentage}% filled</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    fillPercentage >= 90 ? 'bg-amber-500' : 'bg-apollo-teal'
                  }`}
                  style={{ width: `${fillPercentage}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Details CTA Button */}
          <Link
            to={`/events/${event._id}`}
            className="w-full gold-gradient-btn py-2.5 px-4 rounded-xl font-bold text-sm text-apollo-dark flex items-center justify-center gap-2 shadow-sm"
          >
            <span>View Complete Details</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

      </div>
    </div>
  );
}
