import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Calendar, Eye, Search, Filter, RotateCcw, Building, 
  Layers, CheckCircle2, ChevronRight, BookOpen, Clock 
} from 'lucide-react';
import API, { INITIAL_SEED_EVENTS } from '../services/api';
import Navbar from '../components/layout/Navbar';

export default function HomePage() {
  const [events, setEvents] = useState(INITIAL_SEED_EVENTS);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeSchool, setActiveSchool] = useState('All');
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'registered'
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, [searchQuery, activeCategory, activeSchool]);

  const fetchEvents = async () => {
    try {
      const params = {
        search: searchQuery,
        eventType: activeCategory,
        school: activeSchool
      };
      const { data } = await API.get('/events', { params });
      if (Array.isArray(data) && data.length > 0) {
        setEvents(data);
      } else {
        applyClientFilters(INITIAL_SEED_EVENTS);
      }
    } catch (error) {
      // Fallback for Firebase Hosting static environment
      applyClientFilters(INITIAL_SEED_EVENTS);
    }
  };

  const applyClientFilters = (dataset) => {
    let filtered = dataset;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.title.toLowerCase().includes(q) || 
        e.school.toLowerCase().includes(q) || 
        e.eventType.toLowerCase().includes(q)
      );
    }
    if (activeCategory !== 'All') {
      filtered = filtered.filter(e => e.eventType === activeCategory);
    }
    if (activeSchool !== 'All') {
      filtered = filtered.filter(e => e.school === activeSchool);
    }
    setEvents(filtered);
  };

  const handleReset = () => {
    setSearchQuery('');
    setActiveCategory('All');
    setActiveSchool('All');
    setEvents(INITIAL_SEED_EVENTS);
  };

  return (
    <div className="min-h-screen bg-apollo-light flex flex-col">
      
      {/* Header Bar */}
      <Navbar
        searchValue={searchQuery}
        onSearchChange={(val) => setSearchQuery(val)}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        
        {/* LEFT SIDEBAR (Matching reference image) */}
        <aside className="w-full md:w-56 shrink-0 bg-white rounded-2xl p-4 border border-apollo-border shadow-sm h-fit space-y-3">
          
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('home')}
              className={`w-full text-left px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                activeTab === 'home'
                  ? 'bg-apollo-navy text-white shadow-sm'
                  : 'text-gray-700 hover:bg-apollo-light'
              }`}
            >
              <Calendar className="w-4 h-4 text-apollo-gold" />
              <span>Home</span>
            </button>

            <button
              onClick={() => setActiveTab('registered')}
              className={`w-full text-left px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                activeTab === 'registered'
                  ? 'bg-apollo-navy text-white shadow-sm'
                  : 'text-gray-700 hover:bg-apollo-light'
              }`}
            >
              <BookOpen className="w-4 h-4 text-apollo-teal" />
              <span>Registered Events</span>
            </button>
          </nav>

          <div className="pt-4 border-t border-gray-100 text-[11px] text-gray-500 space-y-2">
            <span className="font-bold text-apollo-navy block uppercase">Quick School Filter</span>
            {[
              'All',
              'School of Technology',
              'School of Management',
              'School of Health Sciences',
              'Apollo Institute of Pharmaceutical Sciences',
              'School of Social Science'
            ].map(sch => (
              <button
                key={sch}
                onClick={() => setActiveSchool(sch)}
                className={`block w-full text-left truncate py-1 px-2 rounded font-medium transition-colors ${
                  activeSchool === sch ? 'bg-apollo-teal text-white font-bold' : 'hover:bg-apollo-light text-gray-600'
                }`}
              >
                {sch === 'All' ? 'All Schools' : sch}
              </button>
            ))}
          </div>

        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 bg-white rounded-2xl p-6 border border-apollo-border shadow-apollo space-y-6">
          
          {/* Main Title Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h1 className="text-2xl font-extrabold font-display text-apollo-navy flex items-center gap-2">
                <Calendar className="w-6 h-6 text-apollo-teal" />
                <span>Upcoming events</span>
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                The Apollo University Central Event Registry
              </p>
            </div>

            {/* Category Pill Filters */}
            <div className="flex flex-wrap gap-1.5">
              {['All', 'Workshop', 'Hackathon', 'Seminar', 'Conference', 'Competition', 'Cultural'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    activeCategory === cat
                      ? 'bg-apollo-teal text-white border-apollo-teal shadow-sm'
                      : 'bg-apollo-light text-gray-700 border-apollo-border hover:bg-apollo-gray'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Table View */}
          {events.length === 0 ? (
            <div className="py-16 text-center text-gray-500 space-y-3">
              <p className="font-bold text-apollo-navy text-base">No events found matching your criteria.</p>
              <button
                onClick={handleReset}
                className="px-4 py-2 gold-gradient-btn rounded-xl font-bold text-apollo-dark text-xs"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-apollo-border">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-700 text-white font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 border-b border-slate-600">Event Type</th>
                    <th className="px-4 py-3.5 border-b border-slate-600">School</th>
                    <th className="px-4 py-3.5 border-b border-slate-600 min-w-[240px]">Event Title</th>
                    <th className="px-4 py-3.5 border-b border-slate-600">Start Date</th>
                    <th className="px-4 py-3.5 border-b border-slate-600">End Date</th>
                    <th className="px-4 py-3.5 border-b border-slate-600 text-center">-</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-800 font-medium">
                  {events.map((evt, idx) => (
                    <tr 
                      key={evt._id} 
                      className={`hover:bg-apollo-light/80 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                      }`}
                    >
                      <td className="px-4 py-3.5 font-bold uppercase text-apollo-navy">
                        {evt.eventType || 'EVENT'}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">
                        {evt.school || 'School of Technology'}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-apollo-dark leading-snug">
                        {evt.title}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap font-mono">
                        {evt.startDate} {evt.startTime || '09:00'}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap font-mono">
                        {evt.endDate || evt.startDate} {evt.endTime || '17:00'}
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <Link
                          to={`/events/${evt._id}`}
                          className="px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View details</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </main>

      </div>

    </div>
  );
}
