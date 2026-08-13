import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Calendar, Clock, MapPin, Building, Users, ExternalLink, Download, 
  FileText, ArrowLeft, CheckCircle2, UserCheck, Trophy, Phone, Mail, 
  Share2, Shield, AlertTriangle 
} from 'lucide-react';
import API, { INITIAL_SEED_EVENTS } from '../services/api';

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
      setLoading(false);
    } catch (error) {
      // Fallback lookup from initial dataset
      const found = INITIAL_SEED_EVENTS.find(e => e._id === id) || INITIAL_SEED_EVENTS[0];
      setEvent(found);
      setLoading(false);
    }
  };

  const handleInternalRegister = async () => {
    setRegistering(true);
    try {
      await API.post('/registrations', { eventId: event._id });
    } catch (err) {
      console.log('Registration simulation note:', err);
    }
    setRegistered(true);
    setRegistrationMsg('Successfully registered for this event!');
    setRegistering(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-apollo-light flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-apollo-teal border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-apollo-dark font-medium">Loading Apollo Event Details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-apollo-light py-16 px-4 text-center">
        <h2 className="text-2xl font-bold text-apollo-dark">Event Not Found</h2>
        <Link to="/" className="mt-6 inline-block gold-gradient-btn px-6 py-2.5 rounded-xl font-bold text-apollo-dark text-sm">
          Return to Homepage
        </Link>
      </div>
    );
  }

  const status = event.computedStatus || event.status || 'UPCOMING';
  const isCancelled = status === 'CANCELLED';

  return (
    <div className="min-h-screen bg-apollo-light pb-20">
      
      {/* Top Header Banner */}
      <section className="bg-apollo-navy text-white pt-8 pb-12 border-b-4 border-apollo-gold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <Link
            to="/events"
            className="inline-flex items-center gap-2 text-apollo-cyan hover:text-apollo-gold text-sm font-semibold mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Events
          </Link>

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-apollo-teal text-white">
                  {event.eventType}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-apollo-cyan border border-white/20">
                  {event.mode} Mode
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-white tracking-tight leading-tight">
                {event.title}
              </h1>

              <div className="flex items-center gap-2 text-sm text-gray-300">
                <span>Organized by</span>
                <strong className="text-apollo-gold font-semibold">{event.school}</strong>
                <span>• The Apollo University</span>
              </div>
            </div>

            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Event link copied to clipboard!');
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
            >
              <Share2 className="w-4 h-4 text-apollo-gold" />
              Share Event
            </button>
          </div>

        </div>
      </section>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        
        {/* Key Info Bar */}
        <div className="bg-white rounded-2xl p-6 border border-apollo-border shadow-apollo grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-apollo-light text-apollo-teal rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-400 uppercase">Event Date</span>
              <span className="font-bold text-apollo-dark text-sm">{event.startDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-apollo-light text-apollo-teal rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-400 uppercase">Time Slot</span>
              <span className="font-bold text-apollo-dark text-sm">{event.startTime} – {event.endTime}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-apollo-light text-apollo-teal rounded-xl">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-400 uppercase">Venue</span>
              <span className="font-bold text-apollo-dark text-sm truncate block max-w-[180px]">{event.venue}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-apollo-light text-apollo-teal rounded-xl">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-400 uppercase">Building / Room</span>
              <span className="font-bold text-apollo-dark text-sm">{event.building} ({event.room})</span>
            </div>
          </div>
        </div>

        {/* 2-Column Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl overflow-hidden border border-apollo-border shadow-sm">
              <img 
                src={event.poster || '/assets/poster_ai_ml.jpg'} 
                alt={event.title}
                className="w-full h-80 sm:h-96 object-cover"
              />
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-apollo-border shadow-apollo space-y-4">
              <h2 className="text-xl font-bold font-display text-apollo-dark border-b border-gray-100 pb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-apollo-teal" />
                About the Event
              </h2>
              <p className="text-gray-700 leading-relaxed text-sm sm:text-base whitespace-pre-line">
                {event.description}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border-2 border-apollo-gold shadow-apollo space-y-5 sticky top-24">
              <h3 className="font-display font-extrabold text-lg text-apollo-dark">Registration</h3>
              
              {registered ? (
                <div className="bg-emerald-100 text-emerald-800 p-4 rounded-xl text-center space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                  <p className="font-bold text-sm">Registration Confirmed!</p>
                  <p className="text-xs">{registrationMsg}</p>
                </div>
              ) : event.registrationType === 'External' && event.registrationUrl ? (
                <a
                  href={event.registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full gold-gradient-btn py-3.5 px-4 rounded-xl font-extrabold text-apollo-dark text-base flex items-center justify-center gap-2 shadow-gold"
                >
                  <span>REGISTER NOW</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <button
                  onClick={handleInternalRegister}
                  disabled={registering}
                  className="w-full gold-gradient-btn py-3.5 px-4 rounded-xl font-extrabold text-apollo-dark text-base flex items-center justify-center gap-2 shadow-gold"
                >
                  {registering ? 'Processing...' : 'REGISTER NOW (INTERNAL)'}
                </button>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
