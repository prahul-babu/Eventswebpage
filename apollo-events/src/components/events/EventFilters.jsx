import React from 'react';
import { Filter, RotateCcw, Calendar, Building, Layers, Monitor, Activity } from 'lucide-react';

export default function EventFilters({
  filters,
  onFilterChange,
  onReset,
  schools = [],
  categories = []
}) {
  const eventTypes = [
    'All', 'Workshop', 'Hackathon', 'Seminar', 'Conference', 
    'Competition', 'Webinar', 'FDP', 'Sports', 'Cultural', 'Club Event'
  ];

  const dateOptions = ['All', 'Today', 'Tomorrow', 'This Week', 'Upcoming'];
  const modeOptions = ['All', 'Offline', 'Online', 'Hybrid'];
  const statusOptions = ['All', 'UPCOMING', 'ONGOING', 'COMPLETED'];

  const schoolList = schools.length > 0 
    ? ['All', ...schools.map(s => s.name)]
    : [
        'All',
        'School of Technology',
        'School of Management',
        'School of Health Sciences',
        'Apollo Institute of Pharmaceutical Sciences',
        'School of Social Science'
      ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-apollo-border shadow-apollo space-y-6">
      
      {/* Filter Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2 text-apollo-navy font-display font-bold text-lg">
          <Filter className="w-5 h-5 text-apollo-teal" />
          <span>Filter Events</span>
        </div>
        <button
          onClick={onReset}
          className="text-xs font-semibold text-gray-500 hover:text-apollo-teal flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset All
        </button>
      </div>

      {/* 1. Event Type */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-2.5 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-apollo-teal" />
          Event Category
        </label>
        <select
          value={filters.eventType || 'All'}
          onChange={(e) => onFilterChange('eventType', e.target.value)}
          className="w-full bg-apollo-light border border-apollo-border rounded-xl px-3.5 py-2.5 text-sm text-apollo-dark font-medium focus:outline-none focus:ring-2 focus:ring-apollo-teal"
        >
          {eventTypes.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* 2. School */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-2.5 flex items-center gap-1.5">
          <Building className="w-4 h-4 text-apollo-teal" />
          School / Institute
        </label>
        <select
          value={filters.school || 'All'}
          onChange={(e) => onFilterChange('school', e.target.value)}
          className="w-full bg-apollo-light border border-apollo-border rounded-xl px-3.5 py-2.5 text-sm text-apollo-dark font-medium focus:outline-none focus:ring-2 focus:ring-apollo-teal"
        >
          {schoolList.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* 3. Date Range */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-2.5 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-apollo-teal" />
          Timeline
        </label>
        <div className="grid grid-cols-2 gap-2">
          {dateOptions.map(d => (
            <button
              key={d}
              onClick={() => onFilterChange('dateFilter', d)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                (filters.dateFilter || 'All') === d
                  ? 'bg-apollo-teal text-white border-apollo-teal shadow-sm'
                  : 'bg-apollo-light text-gray-700 border-apollo-border hover:bg-apollo-gray'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Event Mode */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-2.5 flex items-center gap-1.5">
          <Monitor className="w-4 h-4 text-apollo-teal" />
          Delivery Mode
        </label>
        <div className="flex gap-2">
          {modeOptions.map(m => (
            <button
              key={m}
              onClick={() => onFilterChange('mode', m)}
              className={`flex-1 py-2 px-2 text-center rounded-xl text-xs font-semibold transition-all border ${
                (filters.mode || 'All') === m
                  ? 'bg-apollo-navy text-white border-apollo-navy shadow-sm'
                  : 'bg-apollo-light text-gray-700 border-apollo-border hover:bg-apollo-gray'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Status */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-2.5 flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-apollo-teal" />
          Status
        </label>
        <select
          value={filters.statusFilter || 'All'}
          onChange={(e) => onFilterChange('statusFilter', e.target.value)}
          className="w-full bg-apollo-light border border-apollo-border rounded-xl px-3.5 py-2.5 text-sm text-apollo-dark font-medium focus:outline-none focus:ring-2 focus:ring-apollo-teal"
        >
          {statusOptions.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

    </div>
  );
}
