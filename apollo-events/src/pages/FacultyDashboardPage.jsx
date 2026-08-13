import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  PlusCircle, Calendar, Clock, CheckCircle2, AlertTriangle, 
  FileEdit, Trash2, Eye, Copy, Filter, RefreshCw 
} from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function FacultyDashboardPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const navigate = useNavigate();

  useEffect(() => {
    fetchFacultyEvents();
  }, []);

  const fetchFacultyEvents = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/events/faculty/my-events');
      setEvents(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching faculty events:', error);
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this draft event?')) return;
    try {
      await API.delete(`/events/${id}`);
      fetchFacultyEvents();
    } catch (error) {
      alert(error.response?.data?.message || 'Delete failed');
    }
  };

  const stats = {
    total: events.length,
    upcoming: events.filter(e => (e.computedStatus === 'UPCOMING' || e.computedStatus === 'ONGOING') && e.status === 'PUBLISHED').length,
    pending: events.filter(e => e.status === 'PENDING_APPROVAL').length,
    changesRequested: events.filter(e => e.status === 'CHANGES_REQUESTED').length,
    completed: events.filter(e => e.computedStatus === 'COMPLETED').length
  };

  const filteredEvents = events.filter(e => {
    if (statusFilter === 'All') return true;
    return e.status === statusFilter || e.computedStatus === statusFilter;
  });

  return (
    <div className="min-h-screen bg-apollo-light pb-20">
      
      {/* Header Banner */}
      <div className="bg-apollo-navy text-white py-10 border-b-4 border-apollo-gold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-apollo-gold text-xs font-bold uppercase tracking-wider">
              Faculty Workspace
            </span>
            <h1 className="text-3xl font-extrabold font-display text-white mt-1">
              Welcome, {user?.name || 'Faculty Coordinator'}
            </h1>
            <p className="text-gray-300 text-sm mt-0.5">
              {user?.school || 'School of Technology'} • {user?.department || 'Computer Science'}
            </p>
          </div>

          <Link
            to="/faculty/events/create"
            className="gold-gradient-btn px-6 py-3 rounded-xl font-bold text-apollo-dark text-sm flex items-center gap-2 shadow-gold shrink-0"
          >
            <PlusCircle className="w-5 h-5" />
            Create New Event Proposal
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Metrics Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-apollo-border shadow-apollo flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase">Total Proposed</span>
              <p className="text-3xl font-extrabold text-apollo-navy mt-1">{stats.total}</p>
            </div>
            <div className="p-3.5 bg-apollo-light rounded-xl text-apollo-teal">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-apollo-border shadow-apollo flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase">Published & Active</span>
              <p className="text-3xl font-extrabold text-emerald-600 mt-1">{stats.upcoming}</p>
            </div>
            <div className="p-3.5 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-apollo-border shadow-apollo flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase">Pending Approval</span>
              <p className="text-3xl font-extrabold text-amber-600 mt-1">{stats.pending}</p>
            </div>
            <div className="p-3.5 bg-amber-50 rounded-xl text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-apollo-border shadow-apollo flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase">Action Required</span>
              <p className="text-3xl font-extrabold text-rose-600 mt-1">{stats.changesRequested}</p>
            </div>
            <div className="p-3.5 bg-rose-50 rounded-xl text-rose-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* My Events Management Workspace */}
        <div className="bg-white rounded-2xl border border-apollo-border shadow-apollo overflow-hidden">
          
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-xl font-bold font-display text-apollo-dark">
              My Created Events & Proposals
            </h2>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-apollo-teal" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-apollo-light border border-apollo-border rounded-xl px-3 py-1.5 text-xs font-bold text-apollo-dark focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="CHANGES_REQUESTED">Changes Requested</option>
                <option value="DRAFT">Draft</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading your events...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>No events found for the selected status.</p>
              <Link to="/faculty/events/create" className="mt-4 inline-block gold-gradient-btn px-4 py-2 rounded-xl text-xs font-bold text-apollo-dark">
                + Create New Event
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-apollo-navy text-white text-xs font-bold uppercase">
                  <tr>
                    <th className="px-6 py-4">Event Details</th>
                    <th className="px-6 py-4">Category & School</th>
                    <th className="px-6 py-4">Date & Venue</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Participants</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredEvents.map(evt => (
                    <tr key={evt._id} className="hover:bg-apollo-light/50 transition-colors">
                      
                      <td className="px-6 py-4">
                        <div className="font-bold text-apollo-dark max-w-xs truncate">{evt.title}</div>
                        {evt.approvalComment && (evt.status === 'CHANGES_REQUESTED' || evt.status === 'REJECTED') && (
                          <div className="mt-1 text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
                            <strong>Feedback:</strong> {evt.approvalComment}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-apollo-teal/10 text-apollo-teal uppercase">
                          {evt.eventType}
                        </span>
                        <div className="text-xs text-gray-500 mt-1 truncate max-w-[150px]">{evt.school}</div>
                      </td>

                      <td className="px-6 py-4 text-xs">
                        <div className="font-semibold text-apollo-navy">{evt.startDate}</div>
                        <div className="text-gray-500">{evt.venue}</div>
                      </td>

                      <td className="px-6 py-4">
                        {evt.status === 'PUBLISHED' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            PUBLISHED ({evt.computedStatus})
                          </span>
                        )}
                        {evt.status === 'PENDING_APPROVAL' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            PENDING APPROVAL
                          </span>
                        )}
                        {evt.status === 'CHANGES_REQUESTED' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                            CHANGES REQUIRED
                          </span>
                        )}
                        {evt.status === 'DRAFT' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-700">
                            DRAFT
                          </span>
                        )}
                        {evt.status === 'REJECTED' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                            REJECTED
                          </span>
                        )}
                        {evt.status === 'CANCELLED' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-800 text-white">
                            CANCELLED
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs font-semibold text-apollo-navy">
                        {evt.currentParticipantsCount || 0} / {evt.maxParticipants}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/events/${evt._id}`}
                            className="p-2 rounded-lg bg-apollo-light hover:bg-apollo-gray text-apollo-teal"
                            title="View Public Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <Link
                            to={`/faculty/events/edit/${evt._id}`}
                            className="p-2 rounded-lg bg-apollo-light hover:bg-apollo-gray text-apollo-navy"
                            title="Edit Event"
                          >
                            <FileEdit className="w-4 h-4" />
                          </Link>

                          {evt.status === 'DRAFT' && (
                            <button
                              onClick={() => handleDelete(evt._id)}
                              className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                              title="Delete Draft"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
