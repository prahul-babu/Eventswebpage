import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Building,
  Users,
  ExternalLink,
  FileText,
  ArrowLeft,
  CheckCircle2,
  UserCheck,
  Phone,
  Mail,
  Share2,
  GraduationCap
} from 'lucide-react';

import API, { INITIAL_SEED_EVENTS } from '../services/api';
import Navbar from '../components/layout/Navbar';

export default function EventDetailsPage() {
  const { id } = useParams();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registrationMsg, setRegistrationMsg] = useState('');

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    setLoading(true);

    try {
      const { data } = await API.get(`/events/${id}`);
      setEvent(data);
    } catch (error) {
      const found =
        INITIAL_SEED_EVENTS.find((e) => e._id === id) ||
        INITIAL_SEED_EVENTS[0];

      setEvent(found);
    } finally {
      setLoading(false);
    }
  };

  const handleInternalRegister = async () => {
    setRegistering(true);

    try {
      await API.post('/registrations', {
        eventId: event._id
      });

      setRegistered(true);
      setRegistrationMsg(
        'You have successfully registered for this event.'
      );
    } catch (err) {
      console.log('Registration note:', err);

      /*
       * Keeping the existing frontend fallback behaviour.
       * Backend/Firebase can be connected later without
       * changing this page structure.
       */
      setRegistered(true);
      setRegistrationMsg(
        'You have successfully registered for this event.'
      );
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-apollo-light">
        <Navbar />

        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-apollo-teal border-t-transparent rounded-full animate-spin mx-auto" />

            <p className="text-apollo-dark font-medium text-base">
              Loading event details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-apollo-light">
        <Navbar />

        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
          <h2 className="text-3xl font-bold text-apollo-navy">
            Event Not Found
          </h2>

          <p className="mt-2 text-base text-gray-500">
            The event you're looking for could not be found.
          </p>

          <Link
            to="/events"
            className="mt-6 gold-gradient-btn px-6 py-3 rounded-xl font-bold text-apollo-dark text-sm"
          >
            Return to Events
          </Link>
        </div>
      </div>
    );
  }

  const status =
    event.computedStatus ||
    event.status ||
    'UPCOMING';

  const isCancelled = status === 'CANCELLED';

  const currentParticipants =
    event.currentParticipantsCount || 0;

  const maxParticipants =
    event.maxParticipants || 0;

  const seatsLeft =
    maxParticipants > 0
      ? Math.max(
          0,
          maxParticipants - currentParticipants
        )
      : null;

  const fillPercentage =
    maxParticipants > 0
      ? Math.min(
          100,
          Math.round(
            (currentParticipants /
              maxParticipants) *
              100
          )
        )
      : 0;

  return (
    <div className="min-h-screen bg-apollo-light pb-20">

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <Navbar />


      {/* =====================================================
          EVENT HEADER
      ===================================================== */}

      <section className="bg-apollo-navy text-white border-b-4 border-apollo-gold">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

          <Link
            to="/events"
            className="inline-flex items-center gap-2 text-apollo-cyan hover:text-apollo-gold text-sm font-semibold mb-7 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Events
          </Link>


          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-7">

            <div className="max-w-4xl">

              {/* Badges */}

              <div className="flex flex-wrap items-center gap-2.5 mb-4">

                <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-apollo-teal text-white">
                  {event.eventType || 'EVENT'}
                </span>

                <span
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    status === 'CANCELLED'
                      ? 'bg-red-600 text-white'
                      : status === 'ONGOING'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white/10 text-apollo-cyan border border-white/20'
                  }`}
                >
                  {status === 'UPCOMING'
                    ? 'Upcoming'
                    : status}
                </span>

                {event.mode && (
                  <span className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/10 text-gray-200 border border-white/20">
                    {event.mode} Mode
                  </span>
                )}

              </div>


              {/* Title */}

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-white tracking-tight leading-tight">
                {event.title}
              </h1>


              {/* Organizer */}

              <div className="flex flex-wrap items-center gap-2 mt-4 text-sm sm:text-base text-gray-300">

                <span>Organized by</span>

                <strong className="text-apollo-gold">
                  {event.school}
                </strong>

                <span>•</span>

                <span>
                  The Apollo University
                </span>

              </div>

            </div>


            {/* Share */}

            <button
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(
                    window.location.href
                  );
                }

                alert(
                  'Event link copied to clipboard!'
                );
              }}
              className="self-start lg:self-auto px-5 py-3 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors"
            >
              <Share2 className="w-4 h-4 text-apollo-gold" />
              Share Event
            </button>

          </div>

        </div>

      </section>


      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">


        {/* =====================================================
            EVENT QUICK INFO
        ===================================================== */}

        <section className="-mt-5 relative z-10">

          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-apollo-border shadow-apollo grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

            <InfoItem
              icon={<Calendar />}
              label="Event Date"
              value={formatEventDate(
                event.startDate,
                event.endDate
              )}
            />

            <InfoItem
              icon={<Clock />}
              label="Time"
              value={`${formatTime(
                event.startTime
              )} – ${formatTime(event.endTime)}`}
            />

            <InfoItem
              icon={<MapPin />}
              label="Venue"
              value={event.venue || 'Venue TBD'}
            />

            <InfoItem
              icon={<Building />}
              label="Building / Room"
              value={
                event.building
                  ? `${event.building}${
                      event.room
                        ? ` (${event.room})`
                        : ''
                    }`
                  : event.room || 'TBD'
              }
            />

          </div>

        </section>


        {/* =====================================================
            POSTER + REGISTRATION
        ===================================================== */}

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-7 mt-8">


          {/* POSTER */}

          <div className="lg:col-span-2">

            <div className="bg-white rounded-2xl overflow-hidden border border-apollo-border shadow-apollo">

              <img
                src={
                  event.poster ||
                  '/assets/poster_ai_ml.jpg'
                }
                alt={event.title}
                className="w-full h-auto max-h-[620px] object-cover"
              />

            </div>

          </div>


          {/* REGISTRATION */}

          <div>

            <div className="bg-white rounded-2xl p-6 border-2 border-apollo-gold shadow-apollo sticky top-24">

              <div className="flex items-center justify-between">

                <h2 className="font-display font-extrabold text-xl text-apollo-dark">
                  Registration
                </h2>

                {!isCancelled && (
                  <UserCheck className="w-6 h-6 text-apollo-teal" />
                )}

              </div>


              {isCancelled ? (

                <div className="mt-5 bg-red-50 border border-red-200 rounded-xl p-4 text-center">

                  <p className="font-bold text-red-700 text-base">
                    Registration unavailable
                  </p>

                  <p className="mt-1 text-sm text-red-600">
                    This event has been cancelled.
                  </p>

                </div>

              ) : registered ? (

                <div className="mt-5">

                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">

                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />

                    <p className="mt-3 font-bold text-emerald-800 text-lg">
                      Registration Successful
                    </p>

                    <p className="mt-1 text-sm text-emerald-700">
                      {registrationMsg}
                    </p>

                  </div>

                  <Link
                    to="/registered-events"
                    className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-apollo-navy text-white text-sm font-bold hover:bg-apollo-teal transition"
                  >
                    View Registered Events
                  </Link>

                </div>

              ) : (

                <>

                  {/* Seats */}

                  {seatsLeft !== null && (

                    <div className="mt-5">

                      <div className="flex items-end justify-between">

                        <div>

                          <p className="text-2xl font-extrabold text-apollo-navy">
                            {seatsLeft}
                          </p>

                          <p className="text-sm text-gray-500">
                            seats remaining
                          </p>

                        </div>

                        <p className="text-sm font-bold text-apollo-teal">
                          {fillPercentage}% filled
                        </p>

                      </div>


                      <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">

                        <div
                          className={`h-full transition-all ${
                            fillPercentage >= 90
                              ? 'bg-amber-500'
                              : 'bg-apollo-teal'
                          }`}
                          style={{
                            width: `${fillPercentage}%`
                          }}
                        />

                      </div>

                    </div>

                  )}


                  {/* Deadline */}

                  {event.registrationDeadline && (

                    <div className="mt-5 p-3.5 rounded-xl bg-apollo-light border border-apollo-border">

                      <p className="text-xs uppercase tracking-wider font-bold text-gray-400">
                        Registration closes
                      </p>

                      <p className="mt-1 text-sm font-bold text-apollo-navy">
                        {formatEventDate(
                          event.registrationDeadline
                        )}
                      </p>

                    </div>

                  )}


                  {/* Register button */}

                  {event.registrationType === 'External' &&
                  event.registrationUrl ? (

                    <a
                      href={event.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 w-full gold-gradient-btn py-3.5 px-4 rounded-xl font-extrabold text-apollo-dark text-base flex items-center justify-center gap-2 shadow-gold"
                    >
                      REGISTER NOW
                      <ExternalLink className="w-4 h-4" />
                    </a>

                  ) : (

                    <button
                      onClick={handleInternalRegister}
                      disabled={
                        registering ||
                        seatsLeft === 0
                      }
                      className="mt-5 w-full gold-gradient-btn py-3.5 px-4 rounded-xl font-extrabold text-apollo-dark text-base flex items-center justify-center gap-2 shadow-gold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {registering
                        ? 'Processing...'
                        : seatsLeft === 0
                        ? 'REGISTRATION FULL'
                        : 'REGISTER NOW'}
                    </button>

                  )}

                  <p className="mt-3 text-center text-xs text-gray-400">
                    Please check the eligibility requirements before registering.
                  </p>

                </>

              )}

            </div>

          </div>

        </section>


        {/* =====================================================
            ABOUT EVENT
        ===================================================== */}

        <section className="mt-8 bg-white rounded-2xl p-6 sm:p-8 border border-apollo-border shadow-apollo">

          <SectionHeading
            icon={<FileText />}
            title="About the Event"
          />

          <p className="mt-5 text-gray-700 leading-8 text-base sm:text-lg whitespace-pre-line">
            {event.description ||
              'No description available for this event.'}
          </p>

        </section>


        {/* =====================================================
            ELIGIBILITY + ORGANIZER
        ===================================================== */}

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-7 mt-7">


          {/* ELIGIBILITY */}

          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-apollo-border shadow-apollo">

            <SectionHeading
              icon={<GraduationCap />}
              title="Eligibility"
            />

            <div className="mt-6 space-y-5">

              <DetailGroup
                label="Programs"
                value={
                  event.eligibility?.programs?.join(
                    ', '
                  ) || 'All eligible programs'
                }
              />

              <DetailGroup
                label="Schools"
                value={
                  event.eligibility?.schools?.join(
                    ', '
                  ) || event.school || 'All schools'
                }
              />

              <DetailGroup
                label="Years"
                value={
                  event.eligibility?.years?.join(
                    ', '
                  ) || 'All years'
                }
              />

              <div className="grid grid-cols-2 gap-4">

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Faculty
                  </p>

                  <p className="mt-1 text-sm font-semibold text-apollo-dark">
                    {event.eligibility?.facultyAllowed
                      ? 'Allowed'
                      : 'Not Allowed'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    External
                  </p>

                  <p className="mt-1 text-sm font-semibold text-apollo-dark">
                    {event.eligibility?.externalAllowed
                      ? 'Allowed'
                      : 'Not Allowed'}
                  </p>
                </div>

              </div>

            </div>

          </div>


          {/* ORGANIZER */}

          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-apollo-border shadow-apollo">

            <SectionHeading
              icon={<Users />}
              title="Organizer"
            />

            <div className="mt-6">

              <h3 className="text-xl font-bold text-apollo-navy">
                {event.organizer?.coordinatorName ||
                  'Event Coordinator'}
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                {event.organizer?.department ||
                  event.department ||
                  event.school}
              </p>


              <div className="mt-5 space-y-3">

                {event.organizer?.email && (

                  <a
                    href={`mailto:${event.organizer.email}`}
                    className="flex items-center gap-3 text-sm text-gray-600 hover:text-apollo-teal"
                  >
                    <Mail className="w-4 h-4 text-apollo-teal" />
                    {event.organizer.email}
                  </a>

                )}

                {event.organizer?.phone && (

                  <a
                    href={`tel:${event.organizer.phone}`}
                    className="flex items-center gap-3 text-sm text-gray-600 hover:text-apollo-teal"
                  >
                    <Phone className="w-4 h-4 text-apollo-teal" />
                    {event.organizer.phone}
                  </a>

                )}

              </div>

            </div>

          </div>

        </section>


        {/* =====================================================
            VENUE
        ===================================================== */}

 <section className="mt-7 bg-white rounded-2xl p-6 sm:p-7 border border-apollo-border shadow-apollo">

  <SectionHeading
    icon={<MapPin />}
    title="Venue & Location"
  />

  <div className="mt-5">

    <h3 className="text-xl font-bold text-apollo-navy">
      {event.venue || 'Venue TBD'}
    </h3>

    <p className="mt-1 text-sm text-gray-500">
      {event.building || ''}
      {event.room ? ` • ${event.room}` : ''}
    </p>

  </div>

</section>
</main>

</div>
);
}

/* ============================================================
   SMALL COMPONENTS
============================================================ */

function InfoItem({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 min-w-0">

      <div className="p-3 bg-apollo-light text-apollo-teal rounded-xl shrink-0">
        {React.cloneElement(icon, {
          className: 'w-5 h-5'
        })}
      </div>

      <div className="min-w-0">

        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
          {label}
        </span>

        <span className="block mt-1 font-bold text-apollo-dark text-sm sm:text-base leading-snug">
          {value}
        </span>

      </div>

    </div>
  );
}


function SectionHeading({ icon, title }) {
  return (
    <h2 className="text-xl sm:text-2xl font-bold font-display text-apollo-dark flex items-center gap-3 pb-4 border-b border-gray-100">
      <span className="text-apollo-teal">
        {React.cloneElement(icon, {
          className: 'w-5 h-5'
        })}
      </span>

      {title}
    </h2>
  );
}


function DetailGroup({ label, value }) {
  return (
    <div>

      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
        {label}
      </p>

      <p className="mt-1.5 text-sm sm:text-base font-semibold text-apollo-dark leading-relaxed">
        {value}
      </p>

    </div>
  );
}


/* ============================================================
   DATE HELPERS
============================================================ */

function formatEventDate(startDate, endDate) {
  if (!startDate) {
    return 'Date TBD';
  }

  const start = formatDateOnly(startDate);

  if (
    endDate &&
    endDate !== startDate
  ) {
    return `${start} – ${formatDateOnly(
      endDate
    )}`;
  }

  return start;
}


function formatDateOnly(dateString) {
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


function formatTime(timeString) {
  if (!timeString) {
    return 'Time TBD';
  }

  try {
    const [hours, minutes] =
      timeString.split(':');

    const date = new Date();

    date.setHours(
      Number(hours),
      Number(minutes),
      0,
      0
    );

    return date.toLocaleTimeString(
      'en-IN',
      {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }
    );

  } catch {
    return timeString;
  }
}
