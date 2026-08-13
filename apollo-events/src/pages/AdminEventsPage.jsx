import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, XCircle, MessageSquare, AlertTriangle, Star, 
  Eye, Trash2, Filter, Shield, Clock, FileText 
} from 'lucide-react';
import API from '../services/api';

export default function AdminEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING_APPROVAL');
  
  // Moderation Modal State
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalType, setModalType] = useState(null); // 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT' | 'CANCEL'
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    fetchAdminEvents();
  }, [statusFilter]);

  const fetchAdminEvents = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/admin/events', { params: { status: statusFilter } });
      setEvents(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching admin events:', error);
      setLoading(false);
    }
  };

  const handleModeration = async (action) => {
    if (!selectedEvent) return;
    try {
      await API.post(`/events/${selectedEvent._id}/review`, {
        action,
        comment: commentText,
        cancellationReason: commentText
      });
      alert(`Event moderation complete: ${action}`);
      setSelectedEvent(null);
      setModalType(null);
      setCommentText('');
      fetchAdminEvents();
    } catch (error) {
      alert(error.response?.data?.message || 'Moderation action failed');
    }
  };

  const handleToggleFeatured = async (event) => {
    try {
      await API.post(`/events/${event._id}/review`, {
        action: 'TOGGLE_FEATURED',
        isFeatured: !event.isFeatured
      });
      fetchAdminEvents();
    } catch (error) {
      alert('Failed to toggle featured status');
    }
  };

  return (
    <div className="min-h-screen bg-apollo-light pb-20">
      
      {/* Header */}
      <div className="bg-apollo-dark text-white py-8 border-b-4 border-apollo-gold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div>
            <span className="text-apollo-gold text-xs font-bold uppercase tracking-wider">
              Admin Event Moderation Desk
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white mt-1">
              Event Approval Workflow
            </h1>
          </div>
          <Link to="/admin/dashboard" className="text-xs text-apollo-gold hover:underline">
            ← Back to Overview
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        
        {/* Status Filter Tabs */}
        <div className="bg-white rounded-2xl p-2 border border-apollo-border shadow-apollo flex flex-wrap gap-2">
          {[
            { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
            { label: 'Published Events', value: 'PUBLISHED' },
            { label: 'Changes Requested', value: 'CHANGES_REQUESTED' },
            { label: 'Rejected', value: 'REJECTED' },
            { label: 'Cancelled', value: 'CANCELLED' },
            { label: 'All Events', value: 'All' }
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === tab.value
                  ? 'bg-apollo-navy text-white shadow-md'
                  : 'text-gray-600 hover:bg-apollo-light'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Events Moderation Table */}
        <div className="bg-white rounded-2xl border border-apollo-border shadow-apollo overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading moderation queue...</div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-bold text-lg text-apollo-dark">No Events Pending Moderation</h3>
              <p className="text-xs text-gray-400 mt-1">All event proposals for this queue have been processed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-apollo-navy text-white text-xs font-bold uppercase">
                  <tr>
                    <th className="px-6 py-4">Event & Organizer</th>
                    <th className="px-6 py-4">Type & School</th>
                    <th className="px-6 py-4">Date & Room</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Featured</th>
                    <th className="px-6 py-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {events.map(evt => (
                    <tr key={evt._id} className="hover:bg-apollo-light/50 transition-colors">
                      
                      <td className="px-6 py-4">
                        <div className="font-bold text-apollo-dark max-w-xs">{evt.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          By: {evt.createdBy?.name || 'Faculty'} ({evt.organizer?.email || 'N/A'})
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs">
                        <span className="px-2 py-0.5 rounded font-bold bg-apollo-teal/10 text-apollo-teal uppercase">
                          {evt.eventType}
                        </span>
                        <div className="text-gray-500 mt-1">{evt.school}</div>
                      </td>

                      <td className="px-6 py-4 text-xs">
                        <div className="font-semibold text-apollo-navy">{evt.startDate}</div>
                        <div className="text-gray-500">{evt.venue}</div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          evt.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' :
                          evt.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' :
                          evt.status === 'CHANGES_REQUESTED' ? 'bg-rose-100 text-rose-800' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {evt.status}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleFeatured(evt)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            evt.isFeatured 
                              ? 'bg-apollo-gold text-apollo-dark border-apollo-gold shadow-gold' 
                              : 'bg-apollo-light text-gray-400 border-gray-200'
                          }`}
                          title="Toggle Featured on Homepage"
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/events/${evt._id}`}
                            target="_blank"
                            className="p-2 rounded-lg bg-apollo-light text-apollo-teal hover:bg-apollo-gray"
                            title="Inspect Student View"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => { setSelectedEvent(evt); setModalType('APPROVE'); }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-sm"
                          >
                            Approve
                          </button>

                          <button
                            onClick={() => { setSelectedEvent(evt); setModalType('REQUEST_CHANGES'); }}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 shadow-sm"
                          >
                            Changes
                          </button>

                          <button
                            onClick={() => { setSelectedEvent(evt); setModalType('REJECT'); }}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 shadow-sm"
                          >
                            Reject
                          </button>
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

      {/* Moderation Feedback Modal */}
      {selectedEvent && modalType && (
        <div className="fixed inset-0 bg-apollo-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-apollo-lg space-y-4">
            
            <h3 className="font-display font-bold text-lg text-apollo-navy flex items-center gap-2 border-b pb-3">
              {modalType === 'APPROVE' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {modalType === 'REQUEST_CHANGES' && <MessageSquare className="w-5 h-5 text-amber-600" />}
              {modalType === 'REJECT' && <XCircle className="w-5 h-5 text-rose-600" />}
              <span>{modalType} Action on "{selectedEvent.title}"</span>
            </h3>

            <p className="text-xs text-gray-600">
              {modalType === 'APPROVE' && 'Approving will immediately publish this event live on the Apollo Events student platform.'}
              {modalType === 'REQUEST_CHANGES' && 'Provide feedback instructing the faculty member what changes are required before publishing.'}
              {modalType === 'REJECT' && 'Enter the official rejection reason for the organizing faculty member.'}
            </p>

            <textarea
              rows={4}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Enter admin feedback, notes, or rejection rationale..."
              className="w-full bg-apollo-light border border-apollo-border rounded-xl p-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-apollo-teal"
            ></textarea>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => { setSelectedEvent(null); setModalType(null); }}
                className="px-4 py-2 bg-gray-200 text-apollo-dark font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleModeration(modalType)}
                className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md ${
                  modalType === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  modalType === 'REQUEST_CHANGES' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm {modalType}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
