import React, { useEffect, useState } from 'react';
import { Calendar, Search } from 'lucide-react';
import API, { INITIAL_SEED_EVENTS } from '../services/api';
import Navbar from '../components/layout/Navbar';
import EventCard from '../components/events/EventCard';
import EventFilters from '../components/events/EventFilters';

export default function EventsPage() {
  const [events, setEvents] = useState(INITIAL_SEED_EVENTS);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const [filters, setFilters] = useState({
    eventType: 'All',
    school: 'All',
    dateFilter: 'All',
    mode: 'All',
    statusFilter: 'All'
  });

  const [schools, setSchools] = useState([]);

  useEffect(() => {
    fetchEvents();
  }, [
    searchQuery,
    filters.eventType,
    filters.school,
    filters.dateFilter,
    filters.mode,
    filters.statusFilter
  ]);

  const fetchEvents = async () => {
    setLoading(true);

    try {
      const params = {
        search: searchQuery,
        eventType: filters.eventType,
        school: filters.school,
        dateFilter: filters.dateFilter,
        mode: filters.mode,
        status: filters.statusFilter
      };

      const { data } = await API.get('/events', { params });

      if (Array.isArray(data) && data.length > 0) {
        setEvents(data);
      } else {
        applyClientFilters(INITIAL_SEED_EVENTS);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
      applyClientFilters(INITIAL_SEED_EVENTS);
    } finally {
      setLoading(false);
    }
  };

  const applyClientFilters = (dataset) => {
    let filtered = [...dataset];

    /* Search */
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();

      filtered = filtered.filter((event) =>
        event.title?.toLowerCase().includes(query) ||
        event.school?.toLowerCase().includes(query) ||
        event.eventType?.toLowerCase().includes(query) ||
        event.venue?.toLowerCase().includes(query)
      );
    }

    /* Event Type */
    if (filters.eventType !== 'All') {
      filtered = filtered.filter(
        (event) => event.eventType === filters.eventType
      );
    }

    /* School */
    if (filters.school !== 'All') {
      filtered = filtered.filter(
        (event) => event.school === filters.school
      );
    }

    /* Delivery Mode */
    if (filters.mode !== 'All') {
      filtered = filtered.filter(
        (event) => event.mode === filters.mode
      );
    }

    /* Status */
    if (filters.statusFilter !== 'All') {
      filtered = filtered.filter(
        (event) =>
          (event.computedStatus || event.status) === filters.statusFilter
      );
    }

    /* Date Filter */
    if (filters.dateFilter !== 'All') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      filtered = filtered.filter((event) => {
        if (!event.startDate) return false;

        const eventDate = new Date(`${event.startDate}T00:00:00`);
        eventDate.setHours(0, 0, 0, 0);

        const difference = Math.ceil(
          (eventDate.getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        switch (filters.dateFilter) {
          case 'Today':
            return difference === 0;

          case 'Tomorrow':
            return difference === 1;

          case 'This Week':
            return difference >= 0 && difference <= 7;

          case 'Upcoming':
            return difference >= 0;

          default:
            return true;
        }
      });
    }

    setEvents(filtered);
  };

  const handleFilterChange = (filterName, value) => {
    setFilters((previous) => ({
      ...previous,
      [filterName]: value
    }));
  };

  const handleReset = () => {
    setSearchQuery('');

    setFilters({
      eventType: 'All',
      school: 'All',
      dateFilter: 'All',
      mode: 'All',
      statusFilter: 'All'
    });

    setEvents(INITIAL_SEED_EVENTS);
  };

  return (
    <div className="min-h-screen bg-apollo-light flex flex-col">

      {/* Navbar */}
      <Navbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main Page */}
      <main className="flex-1 w-full max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-10 py-10">

        {/* =====================================================
            PAGE HEADER
        ====================================================== */}

        <div className="mb-8">

          <div className="flex items-center gap-4">

            <div className="w-14 h-14 rounded-2xl bg-apollo-navy flex items-center justify-center shrink-0">
              <Calendar className="w-7 h-7 text-apollo-gold" />
            </div>

            <div>

              <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-apollo-navy">
                Events
              </h1>

              <p className="text-base text-gray-500 mt-1">
                Discover upcoming events at The Apollo University
              </p>

            </div>

          </div>

        </div>

        {/* =====================================================
            SEARCH
        ====================================================== */}

        <div className="mb-8">

          <div className="relative w-full">

            <Search className="w-5 h-5 text-apollo-teal absolute left-4 top-1/2 -translate-y-1/2" />

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events, workshops, hackathons..."
              className="
                w-full
                pl-12
                pr-5
                py-4
                bg-white
                border
                border-apollo-border
                rounded-2xl
                text-base
                font-medium
                text-apollo-dark
                placeholder:text-gray-400
                focus:outline-none
                focus:ring-2
                focus:ring-apollo-teal
                shadow-sm
              "
            />

          </div>

        </div>

        {/* =====================================================
            FILTER + EVENTS
        ====================================================== */}

        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-8">

          {/* =================================================
              LEFT FILTER SIDEBAR
          ================================================== */}

          <aside className="w-full">

            <EventFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onReset={handleReset}
              schools={schools}
            />

          </aside>

          {/* =================================================
              EVENTS SECTION
          ================================================== */}

          <section className="min-w-0">

            {/* Events Heading */}

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">

              <div>

                <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-apollo-navy">
                  Upcoming Events
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  {events.length} event
                  {events.length !== 1 ? 's' : ''} found
                </p>

              </div>

            </div>

            {/* =================================================
                LOADING
            ================================================== */}

            {loading && (

              <div className="bg-white rounded-2xl border border-apollo-border p-16 text-center">

                <div className="w-10 h-10 border-4 border-apollo-teal border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>

                <p className="text-base font-semibold text-gray-500">
                  Loading events...
                </p>

              </div>

            )}

            {/* =================================================
                NO EVENTS
            ================================================== */}

            {!loading && events.length === 0 && (

              <div className="bg-white rounded-2xl border border-apollo-border p-16 text-center">

                <p className="text-xl font-bold text-apollo-navy">
                  No events found
                </p>

                <p className="text-sm text-gray-500 mt-2">
                  Try changing your search or filters.
                </p>

                <button
                  onClick={handleReset}
                  className="
                    mt-6
                    px-6
                    py-3
                    rounded-xl
                    bg-apollo-navy
                    text-white
                    text-sm
                    font-bold
                    hover:bg-apollo-teal
                    transition-colors
                  "
                >
                  Reset Filters
                </button>

              </div>

            )}

            {/* =================================================
                EVENT CARDS
            ================================================== */}

            {!loading && events.length > 0 && (

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-7">

                {events.map((event) => (

                  <EventCard
                    key={event._id}
                    event={event}
                  />

                ))}

              </div>

            )}

          </section>

        </div>

      </main>

    </div>
  );
}

