import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, 
  MapPin, Clock, ArrowRight, Layers, Building 
} from 'lucide-react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths 
} from 'date-fns';
import API from '../services/api';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 7, 1)); // August 2026 default
  const [events, setEvents] = useState([]);
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'list'
  const [selectedSchool, setSelectedSchool] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data } = await API.get('/events');
      setEvents(data);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const filteredEvents = events.filter(evt => {
    if (selectedSchool !== 'All' && evt.school !== selectedSchool) return false;
    if (selectedCategory !== 'All' && evt.eventType !== selectedCategory) return false;
    return true;
  });

  const getEventsForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return filteredEvents.filter(e => e.startDate === dayStr);
  };

  return (
    <div className="min-h-screen bg-apollo-light pb-20">
      
      {/* Header */}
      <div className="bg-apollo-navy text-white py-10 border-b-4 border-apollo-gold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-apollo-gold text-xs font-bold uppercase tracking-wider">
                University Schedule
              </span>
              <h1 className="text-3xl font-extrabold font-display text-white mt-1">
                Event Calendar
              </h1>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-white/10 p-1 rounded-xl border border-white/20">
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'month' ? 'bg-apollo-gold text-apollo-dark shadow-gold' : 'text-white hover:text-apollo-gold'
                }`}
              >
                Month View
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'list' ? 'bg-apollo-gold text-apollo-dark shadow-gold' : 'text-white hover:text-apollo-gold'
                }`}
              >
                Agenda List
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Controls & Filter Bar */}
        <div className="bg-white rounded-2xl p-4 border border-apollo-border shadow-apollo mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Month Navigation Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 rounded-xl bg-apollo-light hover:bg-apollo-gray text-apollo-navy transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold font-display text-apollo-navy w-44 text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 rounded-xl bg-apollo-light hover:bg-apollo-gray text-apollo-navy transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* School & Category Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-apollo-light px-3 py-1.5 rounded-xl border border-apollo-border text-xs font-medium">
              <Building className="w-4 h-4 text-apollo-teal" />
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="bg-transparent text-apollo-dark font-bold focus:outline-none"
              >
                <option value="All">All Schools</option>
                <option value="School of Technology">School of Technology</option>
                <option value="School of Management">School of Management</option>
                <option value="School of Health Sciences">School of Health Sciences</option>
                <option value="Apollo Institute of Pharmaceutical Sciences">Pharmaceutical Sciences</option>
                <option value="School of Social Science">School of Social Science</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-apollo-light px-3 py-1.5 rounded-xl border border-apollo-border text-xs font-medium">
              <Layers className="w-4 h-4 text-apollo-teal" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-apollo-dark font-bold focus:outline-none"
              >
                <option value="All">All Types</option>
                <option value="Workshop">Workshop</option>
                <option value="Hackathon">Hackathon</option>
                <option value="Seminar">Seminar</option>
                <option value="Conference">Conference</option>
                <option value="Cultural">Cultural</option>
                <option value="Sports">Sports</option>
              </select>
            </div>
          </div>

        </div>

        {/* MONTH VIEW */}
        {viewMode === 'month' ? (
          <div className="bg-white rounded-2xl border border-apollo-border shadow-apollo overflow-hidden">
            
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 bg-apollo-navy text-white text-center text-xs font-bold py-3 border-b border-apollo-navyLight">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {/* Grid of Days */}
            <div className="grid grid-cols-7 auto-rows-fr gap-px bg-apollo-border">
              {days.map((day, dayIdx) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);

                return (
                  <div
                    key={day.toString()}
                    className={`min-h-[110px] p-2 bg-white flex flex-col justify-between ${
                      !isCurrentMonth ? 'bg-gray-50/60 text-gray-400' : 'text-apollo-dark'
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        isSameDay(day, new Date()) ? 'bg-apollo-gold text-apollo-dark shadow-sm' : ''
                      }`}>
                        {format(day, 'd')}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-apollo-teal/20 text-apollo-teal font-bold">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Day Events Pills */}
                    <div className="space-y-1 mt-1 overflow-y-auto max-h-20">
                      {dayEvents.map(evt => (
                        <Link
                          key={evt._id}
                          to={`/events/${evt._id}`}
                          className="block text-[11px] font-semibold px-2 py-1 rounded bg-apollo-light border border-apollo-border hover:bg-apollo-teal hover:text-white transition-colors truncate"
                          title={evt.title}
                        >
                          <span className="font-bold text-apollo-teal group-hover:text-white mr-1">•</span>
                          {evt.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        ) : (
          /* AGENDA LIST VIEW */
          <div className="bg-white rounded-2xl p-6 border border-apollo-border shadow-apollo space-y-4">
            <h3 className="font-display font-bold text-lg text-apollo-navy border-b border-gray-100 pb-3">
              Upcoming Scheduled Events Agenda
            </h3>

            {filteredEvents.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">No events scheduled for the selected criteria.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredEvents.map(evt => (
                  <div key={evt._id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="bg-apollo-light p-3 rounded-xl border border-apollo-border text-center shrink-0 w-20">
                        <span className="block text-xs font-bold text-apollo-teal uppercase">
                          {evt.startDate ? format(new Date(evt.startDate), 'MMM') : 'AUG'}
                        </span>
                        <span className="text-xl font-extrabold text-apollo-navy">
                          {evt.startDate ? format(new Date(evt.startDate), 'dd') : '25'}
                        </span>
                      </div>

                      <div>
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-apollo-teal/10 text-apollo-teal">
                          {evt.eventType}
                        </span>
                        <h4 className="font-bold text-apollo-dark text-base mt-1">{evt.title}</h4>
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-apollo-teal" /> {evt.startTime} - {evt.endTime}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-apollo-teal" /> {evt.venue}</span>
                        </div>
                      </div>
                    </div>

                    <Link
                      to={`/events/${evt._id}`}
                      className="gold-gradient-btn px-4 py-2 rounded-xl text-apollo-dark text-xs font-bold shrink-0 flex items-center gap-1"
                    >
                      <span>Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
