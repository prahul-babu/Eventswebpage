import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowRight,
  List,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';

import API, { INITIAL_SEED_EVENTS } from '../services/api';
import Navbar from '../components/layout/Navbar';

export default function UpcomingEventsPage() {
  const [events, setEvents] = useState(INITIAL_SEED_EVENTS);
  const [view, setView] = useState('list');

  const [currentMonth, setCurrentMonth] = useState(
    new Date().getMonth()
  );

  const [currentYear, setCurrentYear] = useState(
    new Date().getFullYear()
  );

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const { data } = await API.get('/events');

      if (Array.isArray(data) && data.length > 0) {
        setEvents(data);
      }
    } catch (error) {
      console.warn('Using local event data:', error.message);
    }
  };

  /*
   * Only upcoming events
   */
  const upcomingEvents = useMemo(() => {
    return events
      .filter((event) => {
        const status =
          event.computedStatus || event.status;

        return (
          status === 'UPCOMING' &&
          event.startDate
        );
      })
      .sort(
        (a, b) =>
          new Date(`${a.startDate}T00:00:00`) -
          new Date(`${b.startDate}T00:00:00`)
      );
  }, [events]);


  /*
   * Calendar events for the currently selected month
   */
  const calendarEvents = useMemo(() => {
    return upcomingEvents.filter((event) => {
      const date = new Date(
        `${event.startDate}T00:00:00`
      );

      return (
        date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear
      );
    });
  }, [
    upcomingEvents,
    currentMonth,
    currentYear
  ]);


  /*
   * Change month
   */
  const changeMonth = (direction) => {
    if (direction === 'next') {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear((year) => year + 1);
      } else {
        setCurrentMonth((month) => month + 1);
      }
    } else {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear((year) => year - 1);
      } else {
        setCurrentMonth((month) => month - 1);
      }
    }
  };


  return (
    <div className="min-h-screen bg-apollo-light">

      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* =================================================
            PAGE HEADER
        ================================================== */}

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-8">

          <div>

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-apollo-teal">
              What's coming next
            </p>

            <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold font-display text-apollo-navy">
              Upcoming Events
            </h1>

            <p className="mt-2 text-base text-gray-500">
              Discover events happening soon across The Apollo University.
            </p>

          </div>


          {/* VIEW SWITCHER */}

          <div className="flex items-center bg-white border border-apollo-border rounded-xl p-1 self-start lg:self-auto">

            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
                view === 'list'
                  ? 'bg-apollo-navy text-white'
                  : 'text-gray-500 hover:bg-apollo-light'
              }`}
            >
              <List className="w-4 h-4" />
              List
            </button>


            <button
              onClick={() => setView('calendar')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
                view === 'calendar'
                  ? 'bg-apollo-navy text-white'
                  : 'text-gray-500 hover:bg-apollo-light'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Calendar
            </button>

          </div>

        </div>


        {/* =================================================
            LIST VIEW
        ================================================== */}

        {view === 'list' && (

          <>

            {upcomingEvents.length === 0 ? (

              <EmptyState />

            ) : (

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

                {upcomingEvents.map((event) => (

                  <UpcomingEventCard
                    key={event._id}
                    event={event}
                  />

                ))}

              </div>

            )}

          </>

        )}


        {/* =================================================
            CALENDAR VIEW
        ================================================== */}

        {view === 'calendar' && (

          <CalendarView
            year={currentYear}
            month={currentMonth}
            events={calendarEvents}
            onPrevious={() => changeMonth('previous')}
            onNext={() => changeMonth('next')}
          />

        )}

      </main>

    </div>
  );
}


/* ============================================================
   UPCOMING EVENT CARD
============================================================ */

function UpcomingEventCard({ event }) {

  const seatsLeft =
    event.maxParticipants != null
      ? Math.max(
          0,
          event.maxParticipants -
            (event.currentParticipantsCount || 0)
        )
      : null;


  return (

    <div className="group bg-white rounded-2xl overflow-hidden border border-apollo-border hover:border-apollo-teal hover:shadow-apollo transition-all">

      {/* Poster */}

      <div className="h-56 overflow-hidden bg-apollo-navy">

        <img
          src={
            event.poster ||
            '/assets/poster_ai_ml.jpg'
          }
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

      </div>


      {/* Content */}

      <div className="p-5">

        <div className="flex items-center justify-between gap-3">

          <span className="text-xs font-bold uppercase tracking-wider text-apollo-teal">
            {event.eventType || 'Event'}
          </span>

          {event.mode && (
            <span className="text-xs font-medium text-gray-400">
              {event.mode}
            </span>
          )}

        </div>


        <h2 className="mt-2 text-lg font-bold text-apollo-navy line-clamp-2">
          {event.title}
        </h2>


        <div className="mt-4 space-y-2.5 text-sm text-gray-500">

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-apollo-teal" />
            {formatDate(event.startDate)}
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-apollo-teal" />
            {event.startTime || 'Time TBD'}
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-apollo-teal" />

            <span className="truncate">
              {event.venue || 'Venue TBD'}
            </span>

          </div>

          {seatsLeft !== null && (

            <div className="flex items-center gap-2">

              <Users className="w-4 h-4 text-apollo-teal" />

              <span>
                {seatsLeft} seats left
              </span>

            </div>

          )}

        </div>


        {/* Actions */}

        <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">

          <Link
            to={`/events/${event._id}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-apollo-navy hover:text-apollo-teal"
          >
            View Details
            <ArrowRight className="w-4 h-4" />
          </Link>


          <button
            onClick={() => downloadCalendarEvent(event)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-apollo-border text-xs font-bold text-apollo-navy hover:bg-apollo-light transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add to Calendar
          </button>

        </div>

      </div>

    </div>

  );
}


/* ============================================================
   CALENDAR VIEW
============================================================ */

function CalendarView({
  year,
  month,
  events,
  onPrevious,
  onNext
}) {

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const firstDay = new Date(
    year,
    month,
    1
  ).getDay();


  const monthName = new Date(
    year,
    month,
    1
  ).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric'
  });


  const calendarDays = [];

  /*
   * Empty cells before first day
   */
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }

  /*
   * Actual days
   */
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }


  return (

    <div className="bg-white rounded-2xl border border-apollo-border overflow-hidden">

      {/* Calendar header */}

      <div className="flex items-center justify-between px-5 sm:px-7 py-5 border-b border-apollo-border">

        <div>

          <p className="text-xs font-bold uppercase tracking-wider text-apollo-teal">
            Event Calendar
          </p>

          <h2 className="mt-1 text-xl sm:text-2xl font-bold text-apollo-navy">
            {monthName}
          </h2>

        </div>


        <div className="flex items-center gap-2">

          <button
            onClick={onPrevious}
            className="w-9 h-9 rounded-lg border border-apollo-border flex items-center justify-center hover:bg-apollo-light"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={onNext}
            className="w-9 h-9 rounded-lg border border-apollo-border flex items-center justify-center hover:bg-apollo-light"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

        </div>

      </div>


      {/* Week days */}

      <div className="grid grid-cols-7 border-b border-apollo-border bg-apollo-light">

        {[
          'Sun',
          'Mon',
          'Tue',
          'Wed',
          'Thu',
          'Fri',
          'Sat'
        ].map((day) => (

          <div
            key={day}
            className="px-2 py-3 text-center text-xs font-bold text-gray-500"
          >
            {day}
          </div>

        ))}

      </div>


      {/* Calendar grid */}

      <div className="grid grid-cols-7">

        {calendarDays.map((day, index) => {

          const dayEvents = day
            ? events.filter((event) => {

                const eventDate =
                  new Date(
                    `${event.startDate}T00:00:00`
                  );

                return (
                  eventDate.getDate() === day
                );

              })
            : [];


          return (

            <div
              key={index}
              className="min-h-[125px] border-r border-b border-apollo-border p-2 sm:p-3"
            >

              {day && (

                <div>

                  <span className="text-sm font-bold text-apollo-navy">
                    {day}
                  </span>


                  <div className="mt-2 space-y-1.5">

                    {dayEvents.map((event) => (

                      <div
                        key={event._id}
                        className="rounded-lg bg-apollo-light border border-apollo-border p-2"
                      >

                        <p className="text-[11px] font-bold text-apollo-navy line-clamp-2">
                          {event.title}
                        </p>

                        <p className="mt-1 text-[10px] text-gray-500">
                          {event.startTime || 'Time TBD'}
                        </p>

                        <button
                          onClick={() =>
                            downloadCalendarEvent(event)
                          }
                          className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-apollo-teal"
                        >
                          <Plus className="w-3 h-3" />
                          Add
                        </button>

                      </div>

                    ))}

                  </div>

                </div>

              )}

            </div>

          );

        })}

      </div>


      {/* No events in month */}

      {events.length === 0 && (

        <div className="px-6 py-10 text-center text-sm text-gray-500">
          No upcoming events scheduled for this month.
        </div>

      )}

    </div>

  );
}


/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyState() {

  return (

    <div className="bg-white border border-apollo-border rounded-2xl p-12 sm:p-16 text-center">

      <Calendar className="mx-auto w-10 h-10 text-apollo-teal" />

      <h2 className="mt-5 text-xl font-bold text-apollo-navy">
        No upcoming events
      </h2>

      <p className="mt-2 text-sm text-gray-500">
        There are currently no upcoming events available.
      </p>

    </div>

  );
}


/* ============================================================
   ADD EVENT TO CALENDAR
============================================================ */

function downloadCalendarEvent(event) {

  if (!event.startDate) {
    return;
  }


  const startDate =
    event.startDate.replace(/-/g, '') +
    'T' +
    (event.startTime || '09:00').replace(':', '') +
    '00';


  const endDate =
    (
      event.endDate ||
      event.startDate
    ).replace(/-/g, '') +
    'T' +
    (event.endTime || '17:00').replace(':', '') +
    '00';


  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Apollo University//Apollo Events//EN',
    'BEGIN:VEVENT',
    `UID:${event._id}@apollo-events`,
    `DTSTART:${startDate}`,
    `DTEND:${endDate}`,
    `SUMMARY:${escapeICS(event.title || 'Apollo University Event')}`,
    `DESCRIPTION:${escapeICS(event.description || '')}`,
    `LOCATION:${escapeICS(event.venue || '')}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');


  const blob = new Blob(
    [icsContent],
    { type: 'text/calendar;charset=utf-8' }
  );


  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');

  link.href = url;

  link.download =
    `${slugify(event.title || 'apollo-event')}.ics`;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}


/* ============================================================
   HELPERS
============================================================ */

function escapeICS(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}


function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}


function formatDate(dateString) {

  if (!dateString) {
    return 'Date TBD';
  }

  try {

    return new Date(
      `${dateString}T00:00:00`
    ).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

  } catch {

    return dateString;

  }
}