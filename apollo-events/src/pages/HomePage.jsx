import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Users
} from 'lucide-react';

import API, { INITIAL_SEED_EVENTS } from '../services/api';
import Navbar from '../components/layout/Navbar';


export default function HomePage() {
  const [events, setEvents] = useState(INITIAL_SEED_EVENTS);
  const [activeSlide, setActiveSlide] = useState(0);

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
   * Upcoming events sorted by nearest event date.
   */
  const upcomingEvents = useMemo(() => {
    return events
      .filter((event) => {
        const status = event.computedStatus || event.status;
        return status === 'UPCOMING' && event.startDate;
      })
      .sort(
        (a, b) =>
          new Date(`${a.startDate}T00:00:00`) -
          new Date(`${b.startDate}T00:00:00`)
      );
  }, [events]);

  /*
   * Past / completed events.
   */
const pastEvents = useMemo(() => {
  const completedEvents = events
    .filter((event) => {
      const status = event.computedStatus || event.status;
      return status === 'COMPLETED';
    })
    .sort(
      (a, b) =>
        new Date(`${b.startDate}T00:00:00`) -
        new Date(`${a.startDate}T00:00:00`)
    )
    .slice(0, 3);

  // Temporary sample past events for Home Page UI
  if (completedEvents.length === 0) {
    return [
      {
        ...events[0],
        _id: 'past_demo_01',
        title: 'Apollo Innovation & Technology Summit 2026',
        eventType: 'Conference',
        startDate: '2026-07-18',
        venue: 'PCRKC Auditorium',
        computedStatus: 'COMPLETED'
      },
      {
        ...events[1],
        _id: 'past_demo_02',
        title: 'National Coding Challenge 2026',
        eventType: 'Competition',
        startDate: '2026-07-25',
        venue: 'APU Innovation Hub',
        computedStatus: 'COMPLETED'
      },
      {
        ...events[2],
        _id: 'past_demo_03',
        title: 'Healthcare Technology Seminar',
        eventType: 'Seminar',
        startDate: '2026-08-02',
        venue: 'AHEHF Convention Center',
        computedStatus: 'COMPLETED'
      }
    ];
  }

  return completedEvents;
}, [events]);

  /*
   * Only the first few upcoming events are shown
   * in the Home page carousel.
   */
  const carouselEvents = useMemo(() => {
    return upcomingEvents.slice(0, 5);
  }, [upcomingEvents]);

  /*
   * Three upcoming events below the carousel.
   */
  const upcomingPreview = useMemo(() => {
    return upcomingEvents.slice(1, 4);
  }, [upcomingEvents]);

  /*
   * Featured events.
   */
  const featuredEvents = useMemo(() => {
    const featured = upcomingEvents.filter(
      (event) => event.isFeatured
    );

    return featured.slice(0, 3);
  }, [upcomingEvents]);

  /*
   * Automatically move the carousel.
   */
  useEffect(() => {
    if (carouselEvents.length <= 1) return;

    const interval = setInterval(() => {
      setActiveSlide((current) =>
        (current + 1) % carouselEvents.length
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [carouselEvents.length]);

  const goPrevious = () => {
    if (!carouselEvents.length) return;

    setActiveSlide((current) =>
      current === 0
        ? carouselEvents.length - 1
        : current - 1
    );
  };

  const goNext = () => {
    if (!carouselEvents.length) return;

    setActiveSlide(
      (current) =>
        (current + 1) % carouselEvents.length
    );
  };

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-apollo-dark">

      <Navbar />

      {/* =====================================================
          1. UPCOMING EVENTS CAROUSEL
      ====================================================== */}
      <section className="bg-apollo-navy">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">

          <div className="flex items-center justify-between mb-5">

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-apollo-gold">
                What's next
              </p>

              <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold font-display text-white">
                Upcoming Events
              </h1>
            </div>

            <Link
              to="/events"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-white/80 hover:text-apollo-gold transition-colors"
            >
              Explore all events
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

          </div>


          {carouselEvents.length > 0 ? (

            <div className="relative rounded-2xl overflow-hidden bg-black">

              {/* Slides */}
              {carouselEvents.map((event, index) => (

                <div
                  key={event._id}
                  className={`home-carousel-slide ${
                    index === activeSlide
                      ? 'home-carousel-slide-active'
                      : ''
                  }`}
                >

                  <div className="grid lg:grid-cols-[1.15fr_0.85fr] min-h-[440px] sm:min-h-[500px]">

                    {/* Poster */}
                    <div className="relative min-h-[250px] lg:min-h-full">

                      <img
                        src={
                          event.poster ||
                          '/assets/poster_ai_ml.jpg'
                        }
                        alt={event.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-black/80" />

                    </div>


                    {/* Information */}
                    <div className="relative bg-[#071e2a] p-6 sm:p-8 lg:p-10 flex flex-col justify-center">

                      <span className="inline-flex self-start px-2.5 py-1 rounded-md bg-apollo-gold text-apollo-dark text-sm font-extrabold uppercase tracking-wider">
                        {event.eventType || 'Event'}
                      </span>

                      <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold font-display text-white leading-tight">
                        {event.title}
                      </h2>

                      <p className="mt-3 text-sm text-white/60 line-clamp-3">
                        {event.description}
                      </p>


                      <div className="mt-5 space-y-2.5">

                        <div className="flex items-center gap-2 text-sm text-white/75">
                          <Calendar className="w-4 h-4 text-apollo-teal" />
                          {formatDate(event.startDate)}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-white/75">
                          <Clock className="w-4 h-4 text-apollo-teal" />
                          {event.startTime || 'Time TBD'}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-white/75">
                          <MapPin className="w-4 h-4 text-apollo-teal" />
                          <span className="truncate">
                            {event.venue || 'Venue TBD'}
                          </span>
                        </div>

                      </div>


                      {/* Urgency information */}
                      <div className="mt-5 flex flex-wrap gap-2">

                        <span className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-sm font-semibold text-white">
                          {getDaysLeft(event.startDate)}
                        </span>

                        {event.maxParticipants != null && (
                          <span
                            className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${
                              getSeatsLeft(event) <= 10
                                ? 'bg-red-500/15 border-red-400/30 text-red-300'
                                : 'bg-white/10 border-white/10 text-white'
                            }`}
                          >
                            {getSeatsLeft(event)} seats left
                          </span>
                        )}

                      </div>


                      <Link
                        to={`/events/${event._id}`}
                        className="inline-flex self-start items-center gap-2 mt-6 px-4 py-2.5 rounded-lg bg-apollo-gold text-apollo-dark text-sm font-bold hover:brightness-95 transition"
                      >
                        View Details
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>

                    </div>

                  </div>

                </div>

              ))}


              {/* Previous */}
              {carouselEvents.length > 1 && (
                <>
                  <button
                    onClick={goPrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 border border-white/20 text-white flex items-center justify-center hover:bg-black/60 transition"
                    aria-label="Previous event"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={goNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 border border-white/20 text-white flex items-center justify-center hover:bg-black/60 transition"
                    aria-label="Next event"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}


              {/* Indicators */}
              {carouselEvents.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">

                  {carouselEvents.map((event, index) => (
                    <button
                      key={event._id}
                      onClick={() => setActiveSlide(index)}
                      className={`h-1.5 rounded-full transition-all ${
                        index === activeSlide
                          ? 'w-6 bg-apollo-gold'
                          : 'w-1.5 bg-white/50'
                      }`}
                      aria-label={`Go to event ${index + 1}`}
                    />
                  ))}

                </div>
              )}

            </div>

          ) : (

            <div className="rounded-2xl bg-white/10 border border-white/10 p-12 text-center text-white/60 text-sm">
              No upcoming events available.
            </div>

          )}

        </div>

      </section>


      {/* =====================================================
    2. ABOUT APOLLO EVENTS
====================================================== */}
<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

  <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-8 items-center">

    {/* Heading */}
    <div>

      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-apollo-teal">
        Apollo Events
      </p>

      <h2 className="mt-2 text-3xl sm:text-4xl lg:text-[40px] font-extrabold font-display text-apollo-navy leading-tight">
        Everything happening across the university.
      </h2>

    </div>


    {/* Description */}
    <div className="max-w-2xl">

      <p className="text-base sm:text-base text-gray-600 leading-relaxed">
        Apollo Events brings university events together in one place.
        Discover workshops, hackathons, seminars, conferences,
        competitions, cultural programs and other activities
        happening across different schools and departments.
      </p>

      <p className="mt-4 text-base text-gray-500 leading-relaxed">
        Find an event that interests you, explore its details and
        register before the available seats are filled.
      </p>

      <Link
        to="/events"
        className="inline-flex items-center gap-2 mt-5 text-sm font-bold text-apollo-navy hover:text-apollo-teal transition-colors"
      >
        Browse all events
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>

    </div>

  </div>

</section>


      {/* =====================================================
          3. UPCOMING EVENTS
      ====================================================== */}
      <section className="bg-white border-y border-apollo-border">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          <div className="flex items-end justify-between mb-6">

            <SectionTitle
              eyebrow="Coming up"
              title="Upcoming Events"
              description="A quick look at what's happening next."
            />

            <Link
              to="/events"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-apollo-navy hover:text-apollo-teal"
            >
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

          </div>


          {upcomingPreview.length > 0 ? (

            <div className="grid md:grid-cols-3 gap-5">

              {upcomingPreview.map((event) => (
                <UpcomingEventCard
                  key={event._id}
                  event={event}
                />
              ))}

            </div>

          ) : (

            <EmptyMessage text="No upcoming events available." />

          )}

        </div>

      </section>


      {/* =====================================================
          4. FEATURED EVENTS
      ====================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        <SectionTitle
          eyebrow="Selected for you"
          title="Featured Events"
          description="Explore some of the events we think you should not miss."
        />

        {featuredEvents.length > 0 ? (

          <div className="grid md:grid-cols-3 gap-5">

            {featuredEvents.map((event) => (
              <FeaturedEventCard
                key={event._id}
                event={event}
              />
            ))}

          </div>

        ) : (

          <EmptyMessage text="No featured events available." />

        )}

      </section>


      {/* =====================================================
          5. EXPLORE EVENTS
      ====================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">

        <div className="rounded-2xl bg-apollo-navy px-6 sm:px-10 py-9 flex flex-col sm:flex-row items-center justify-between gap-5">

          <div className="text-center sm:text-left">

            <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
              Looking for a specific event?
            </h2>

            <p className="mt-1.5 text-sm text-white/60">
              Browse all events and find one that interests you.
            </p>

          </div>

          <Link
            to="/events"
            className="shrink-0 inline-flex items-center gap-2 px-7 py-5 rounded-lg bg-apollo-gold text-apollo-dark text-sm font-bold hover:brightness-95 transition"
          >
            Explore Events
            <ArrowRight className="w-4 h-4" />
          </Link>

        </div>

      </section>

    </div>
  );
}


/* ============================================================
   SECTION TITLE
============================================================ */

function SectionTitle({
  eyebrow,
  title,
  description
}) {
  return (
    <div className="mb-5">

      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-apollo-teal">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold font-display text-apollo-navy">
        {title}
      </h2>

      <p className="mt-1.5 text-sm text-gray-500">
        {description}
      </p>

    </div>
  );
}


/* ============================================================
   PAST EVENT CARD
============================================================ */

function PastEventCard({ event }) {
  return (
    <Link
      to={`/events/${event._id}`}
      className="group bg-white rounded-2xl overflow-hidden border border-apollo-border hover:shadow-apollo transition-shadow"
    >

      <div className="h-44 overflow-hidden bg-gray-200">

        <img
          src={
            event.poster ||
            '/assets/poster_ai_ml.jpg'
          }
          alt={event.title}
          className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
        />

      </div>

      <div className="p-4">

        <div className="flex items-center justify-between gap-2">

          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            {event.eventType || 'Event'}
          </span>

          <span className="text-[10px] font-semibold text-gray-400">
            Completed
          </span>

        </div>

        <h3 className="mt-2 font-bold text-apollo-navy leading-snug line-clamp-2">
          {event.title}
        </h3>

        <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="w-3.5 h-3.5" />
          {formatDate(event.startDate)}
        </div>

        <span className="inline-flex items-center gap-1.5 mt-4 text-sm font-bold text-apollo-navy group-hover:text-apollo-teal">
          View Details
          <ArrowRight className="w-3.5 h-3.5" />
        </span>

      </div>

    </Link>
  );
}


/* ============================================================
   UPCOMING EVENT CARD
============================================================ */

function UpcomingEventCard({ event }) {
  return (
    <Link
      to={`/events/${event._id}`}
      className="group bg-[#f7f8fa] rounded-2xl overflow-hidden border border-apollo-border hover:border-apollo-teal hover:shadow-sm transition-all"
    >

      <div className="h-40 overflow-hidden">

        <img
          src={
            event.poster ||
            '/assets/poster_ai_ml.jpg'
          }
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

      </div>

      <div className="p-4">

        <div className="flex items-center justify-between gap-2">

          <span className="text-[10px] font-bold uppercase tracking-wider text-apollo-teal">
            {event.eventType || 'Event'}
          </span>

          {event.mode && (
            <span className="text-[10px] font-semibold text-gray-400">
              {event.mode}
            </span>
          )}

        </div>

        <h3 className="mt-2 font-bold text-apollo-navy line-clamp-2">
          {event.title}
        </h3>

        <div className="mt-3 space-y-2 text-sm text-gray-500">

          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-apollo-teal" />
            {formatDate(event.startDate)}
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-apollo-teal" />

            <span>
              {getSeatsLeft(event)} seats left
            </span>
          </div>

        </div>

        <span className="inline-flex items-center gap-1.5 mt-4 text-sm font-bold text-apollo-navy group-hover:text-apollo-teal">
          View Details
          <ArrowRight className="w-3.5 h-3.5" />
        </span>

      </div>

    </Link>
  );
}


/* ============================================================
   FEATURED EVENT CARD
============================================================ */

function FeaturedEventCard({ event }) {
  return (
    <Link
      to={`/events/${event._id}`}
      className="group bg-white rounded-2xl overflow-hidden border border-apollo-border hover:shadow-apollo transition-shadow"
    >

      <div className="relative h-48 overflow-hidden bg-apollo-navy">

        <img
          src={
            event.poster ||
            '/assets/poster_ai_ml.jpg'
          }
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        <div className="absolute top-3 left-3">

          <span className="px-2.5 py-1 rounded-md bg-apollo-gold text-apollo-dark text-[9px] font-extrabold uppercase tracking-wider">
            Featured
          </span>

        </div>

      </div>

      <div className="p-4">

        <p className="text-[10px] font-bold uppercase tracking-wider text-apollo-teal">
          {event.eventType || 'Event'}
        </p>

        <h3 className="mt-1.5 font-bold text-apollo-navy line-clamp-2">
          {event.title}
        </h3>

        <div className="mt-3 space-y-2 text-sm text-gray-500">

          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-apollo-teal" />
            {formatDate(event.startDate)}
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-apollo-teal" />

            <span className="truncate">
              {event.venue || 'Venue TBD'}
            </span>
          </div>

        </div>

        <span className="inline-flex items-center gap-1.5 mt-4 text=sm font-bold text-apollo-navy group-hover:text-apollo-teal">
          View Details
          <ArrowRight className="w-3.5 h-3.5" />
        </span>

      </div>

    </Link>
  );
}


/* ============================================================
   EMPTY MESSAGE
============================================================ */

function EmptyMessage({ text }) {
  return (
    <div className="bg-white rounded-2xl border border-apollo-border p-8 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}


/* ============================================================
   HELPERS
============================================================ */

function getSeatsLeft(event) {
  if (event.maxParticipants == null) {
    return '—';
  }

  return Math.max(
    0,
    event.maxParticipants -
      (event.currentParticipantsCount || 0)
  );
}


function getDaysLeft(dateString) {
  if (!dateString) return 'Date TBD';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eventDate = new Date(`${dateString}T00:00:00`);
  eventDate.setHours(0, 0, 0, 0);

  const difference =
    eventDate.getTime() - today.getTime();

  const days = Math.ceil(
    difference / (1000 * 60 * 60 * 24)
  );

  if (days === 0) return 'Today';
  if (days === 1) return '1 day left';

  return `${days} days left`;
}


function formatDate(dateString) {
  if (!dateString) return 'Date TBD';

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