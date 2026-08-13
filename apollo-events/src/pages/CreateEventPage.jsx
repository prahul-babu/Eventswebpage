import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusCircle, Calendar, Clock, MapPin, Building, Users, FileText, 
  ArrowLeft, ArrowRight, Check, AlertTriangle, Eye, Save, Send 
} from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import VenueConflictAlert from '../components/events/VenueConflictAlert';
import EventCard from '../components/events/EventCard';

export default function CreateEventPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [checkingConflict, setCheckingConflict] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: 'Workshop',
    school: user?.school || 'School of Technology',
    department: user?.department || 'Computer Science & Engineering',
    poster: '/assets/poster_ai_ml.jpg',
    startDate: '2026-09-10',
    endDate: '2026-09-10',
    startTime: '10:00',
    endTime: '16:00',
    venue: 'PCRKC Auditorium',
    building: 'Sir C.V. Raman Academic Block',
    room: 'Auditorium 101',
    mode: 'Offline',
    registrationRequired: true,
    registrationType: 'External',
    registrationUrl: 'https://forms.google.com',
    registrationDeadline: '2026-09-08',
    maxParticipants: 150,
    eligibility: {
      programs: ['B.Tech CSE', 'B.Tech AI&DS'],
      schools: ['School of Technology'],
      years: ['2nd Year', '3rd Year', '4th Year'],
      ugPg: 'All',
      facultyAllowed: true,
      externalAllowed: false
    },
    organizer: {
      school: user?.school || 'School of Technology',
      department: user?.department || 'Computer Science',
      coordinatorName: user?.name || 'Dr. Rajesh Sharma',
      email: user?.email || 'dr.sharma@apollo.edu.in',
      phone: user?.phone || '+91 98765 43210'
    },
    schedule: [
      { time: '10:00 AM', title: 'Inauguration & Keynote', speaker: 'Guest Keynote', description: 'Opening ceremony' },
      { time: '11:30 AM', title: 'Hands-on Technical Session', speaker: 'Faculty Coordinator', description: 'Lab workshop' }
    ],
    speakers: [
      { name: 'Dr. Vinod Paul', designation: 'Director of AI Research', organization: 'Apollo Health Tech Labs' }
    ],
    prizes: [
      { rank: '1st Winner', amount: '₹ 10,000', description: 'Trophy & Certificate' }
    ],
    brochureUrl: 'https://apollo.edu.in/brochure.pdf',
    rulesUrl: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  // Real-time Venue Conflict Check
  const checkVenueConflict = async () => {
    setCheckingConflict(true);
    try {
      const { data } = await API.post('/events/check-conflict', {
        venue: formData.venue,
        room: formData.room,
        startDate: formData.startDate,
        endDate: formData.endDate,
        startTime: formData.startTime,
        endTime: formData.endTime
      });
      setConflictData(data);
      setCheckingConflict(false);
      return data.hasConflict;
    } catch (error) {
      console.error('Conflict check error:', error);
      setCheckingConflict(false);
      return false;
    }
  };

  const handleNextStep = async () => {
    if (step === 2) {
      // Perform conflict check when moving past schedule step
      const hasConflict = await checkVenueConflict();
      if (hasConflict) return; // Warning banner rendered
    }
    setStep(prev => Math.min(7, prev + 1));
  };

  const handleSubmit = async (submitStatus = 'PENDING_APPROVAL') => {
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        status: submitStatus
      };
      await API.post('/events', payload);
      setSubmitting(false);
      alert(submitStatus === 'DRAFT' ? 'Event saved as draft!' : 'Event submitted for Admin Approval!');
      navigate('/faculty/dashboard');
    } catch (error) {
      setSubmitting(false);
      alert(error.response?.data?.message || 'Failed to create event');
    }
  };

  return (
    <div className="min-h-screen bg-apollo-light pb-20">
      
      {/* Header */}
      <div className="bg-apollo-navy text-white py-8 border-b-4 border-apollo-gold">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-apollo-gold text-xs font-bold uppercase tracking-wider">
                Event Creator Wizard
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-white mt-1">
                Create New Event Proposal
              </h1>
            </div>
            <button
              onClick={() => navigate('/faculty/dashboard')}
              className="text-xs font-semibold text-gray-300 hover:text-white"
            >
              Cancel & Exit
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="mt-6 grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] font-bold">
            {[
              '1. Basic Info', '2. Date & Venue', '3. Registration', 
              '4. Eligibility', '5. Organizer', '6. Additional', '7. Preview'
            ].map((label, idx) => {
              const stepNum = idx + 1;
              return (
                <div
                  key={label}
                  onClick={() => setStep(stepNum)}
                  className={`py-2 rounded-lg cursor-pointer transition-all border ${
                    step === stepNum
                      ? 'bg-apollo-gold text-apollo-dark font-extrabold border-apollo-gold shadow-gold'
                      : step > stepNum
                      ? 'bg-apollo-teal text-white border-apollo-teal'
                      : 'bg-white/10 text-gray-300 border-white/20'
                  }`}
                >
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">S{stepNum}</span>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* STEP 1: Basic Information */}
        {step === 1 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-apollo-border shadow-apollo space-y-6">
            <h2 className="text-xl font-bold font-display text-apollo-navy border-b border-gray-100 pb-3">
              Step 1 — Basic Event Details
            </h2>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                Event Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g. AI & Machine Learning Workshop 2026"
                className="w-full bg-apollo-light border border-apollo-border rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-apollo-teal"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                  Event Category / Type *
                </label>
                <select
                  value={formData.eventType}
                  onChange={(e) => handleChange('eventType', e.target.value)}
                  className="w-full bg-apollo-light border border-apollo-border rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-apollo-teal"
                >
                  {['Workshop', 'Hackathon', 'Seminar', 'Conference', 'Competition', 'Webinar', 'FDP', 'Sports', 'Cultural', 'Club Event'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                  Host School *
                </label>
                <select
                  value={formData.school}
                  onChange={(e) => handleChange('school', e.target.value)}
                  className="w-full bg-apollo-light border border-apollo-border rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-apollo-teal"
                >
                  <option value="School of Technology">School of Technology</option>
                  <option value="School of Management">School of Management</option>
                  <option value="School of Health Sciences">School of Health Sciences</option>
                  <option value="Apollo Institute of Pharmaceutical Sciences">Apollo Institute of Pharmaceutical Sciences</option>
                  <option value="School of Social Science">School of Social Science</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
                placeholder="e.g. Computer Science & Engineering"
                className="w-full bg-apollo-light border border-apollo-border rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-apollo-teal"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                Full Description & Objectives *
              </label>
              <textarea
                rows={5}
                required
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Provide complete event details, goals, outcomes, and agenda highlights..."
                className="w-full bg-apollo-light border border-apollo-border rounded-xl p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-apollo-teal"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                Poster Image Banner URL
              </label>
              <input
                type="text"
                value={formData.poster}
                onChange={(e) => handleChange('poster', e.target.value)}
                placeholder="/assets/poster_ai_ml.jpg or image URL"
                className="w-full bg-apollo-light border border-apollo-border rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* STEP 2: Date & Venue */}
        {step === 2 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-apollo-border shadow-apollo space-y-6">
            <h2 className="text-xl font-bold font-display text-apollo-navy border-b border-gray-100 pb-3">
              Step 2 — Date, Time & Campus Venue
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className="w-full bg-apollo-light border border-apollo-border rounded-xl px-4 py-2.5 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                  End Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  className="w-full bg-apollo-light border border-apollo-border rounded-xl px-4 py-2.5 text-sm font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                  Start Time *
                </label>
                <input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                  className="w-full bg-apollo-light border border-apollo-border rounded-xl px-4 py-2.5 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                  End Time *
                </label>
                <input
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) => handleChange('endTime', e.target.value)}
                  className="w-full bg-apollo-light border border-apollo-border rounded-xl px-4 py-2.5 text-sm font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                  Venue Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.venue}
                  onChange={(e) => handleChange('venue', e.target.value)}
                  placeholder="e.g. PCRKC Auditorium"
                  className="w-full bg-apollo-light border border-apollo-border rounded-xl px-4 py-2.5 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                  Building
                </label>
                <input
                  type="text"
                  value={formData.building}
                  onChange={(e) => handleChange('building', e.target.value)}
                  placeholder="e.g. Academic Block A"
                  className="w-full bg-apollo-light border border-apollo-border rounded-xl px-4 py-2.5 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                  Room No.
                </label>
                <input
                  type="text"
                  value={formData.room}
                  onChange={(e) => handleChange('room', e.target.value)}
                  placeholder="e.g. Lab 201"
                  className="w-full bg-apollo-light border border-apollo-border rounded-xl px-4 py-2.5 text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                Delivery Mode
              </label>
              <div className="flex gap-4">
                {['Offline', 'Online', 'Hybrid'].map(m => (
                  <label key={m} className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
                    <input
                      type="radio"
                      name="mode"
                      value={m}
                      checked={formData.mode === m}
                      onChange={(e) => handleChange('mode', e.target.value)}
                      className="text-apollo-teal focus:ring-apollo-teal"
                    />
                    <span>{m}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Venue Conflict Alert Banner */}
            <VenueConflictAlert
              conflictData={conflictData}
              onModifySchedule={() => setConflictData(null)}
            />

            <button
              type="button"
              onClick={checkVenueConflict}
              disabled={checkingConflict}
              className="px-4 py-2 bg-apollo-navy text-white text-xs font-bold rounded-xl hover:bg-apollo-navyDark transition-colors"
            >
              {checkingConflict ? 'Checking Venue Schedule...' : 'Run Venue Conflict Check Now'}
            </button>
          </div>
        )}

        {/* STEP 3: Registration */}
        {step === 3 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-apollo-border shadow-apollo space-y-6">
            <h2 className="text-xl font-bold font-display text-apollo-navy border-b border-gray-100 pb-3">
              Step 3 — Registration Setup
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                  Registration Mode *
                </label>
                <select
                  value={formData.registrationType}
                  onChange={(e) => handleChange('registrationType', e.target.value)}
                  className="w-full bg-apollo-light border border-apollo-border rounded-xl px-4 py-2.5 text-sm font-medium"
                >
                  <option value="External">External (Google/MS Forms URL)</option>
                  <option value="Internal">Internal (Built-in Portal Registration)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                  Registration Deadline
                </label>
                <input
                  type="date"
                  value={formData.registrationDeadline}
                  onChange={(e) => handleChange('registrationDeadline', e.target.value)}
                  className="w-full bg-apollo-light border border-apollo-border rounded-xl px-4 py-2.5 text-sm font-medium"
                />
              </div>
            </div>

            {formData.registrationType === 'External' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                  External Registration URL (Google Form / MS Form)
                </label>
                <input
                  type="url"
                  value={formData.registrationUrl}
                  onChange={(e) => handleChange('registrationUrl', e.target.value)}
                  placeholder="https://forms.google.com/..."
                  className="w-full bg-apollo-light border border-apollo-border rounded-xl px-4 py-2.5 text-sm font-medium"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                Maximum Seat Capacity
              </label>
              <input
                type="number"
                value={formData.maxParticipants}
                onChange={(e) => handleChange('maxParticipants', parseInt(e.target.value))}
                className="w-full bg-apollo-light border border-apollo-border rounded-xl px-4 py-2.5 text-sm font-medium"
              />
            </div>
          </div>
        )}

        {/* STEP 4: Eligibility */}
        {step === 4 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-apollo-border shadow-apollo space-y-6">
            <h2 className="text-xl font-bold font-display text-apollo-navy border-b border-gray-100 pb-3">
              Step 4 — Student Eligibility Rules
            </h2>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                Academic Level Restraint
              </label>
              <select
                value={formData.eligibility.ugPg}
                onChange={(e) => handleNestedChange('eligibility', 'ugPg', e.target.value)}
                className="w-full bg-apollo-light border border-apollo-border rounded-xl px-4 py-2.5 text-sm font-medium"
              >
                <option value="All">All Students (UG & PG)</option>
                <option value="UG Only">Undergraduate (UG Only)</option>
                <option value="PG Only">Postgraduate (PG Only)</option>
                <option value="Faculty Only">Faculty Only</option>
              </select>
            </div>

            <div className="flex gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={formData.eligibility.facultyAllowed}
                  onChange={(e) => handleNestedChange('eligibility', 'facultyAllowed', e.target.checked)}
                  className="rounded text-apollo-teal focus:ring-apollo-teal"
                />
                <span>Allow Faculty Attendance</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={formData.eligibility.externalAllowed}
                  onChange={(e) => handleNestedChange('eligibility', 'externalAllowed', e.target.checked)}
                  className="rounded text-apollo-teal focus:ring-apollo-teal"
                />
                <span>Allow External Participants</span>
              </label>
            </div>
          </div>
        )}

        {/* STEP 5: Organizer */}
        {step === 5 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-apollo-border shadow-apollo space-y-6">
            <h2 className="text-xl font-bold font-display text-apollo-navy border-b border-gray-100 pb-3">
              Step 5 — Coordinator & Contact Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                  Coordinator Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.organizer.coordinatorName}
                  onChange={(e) => handleNestedChange('organizer', 'coordinatorName', e.target.value)}
                  className="w-full bg-apollo-light border border-apollo-border rounded-xl px-4 py-2.5 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                  Official Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.organizer.email}
                  onChange={(e) => handleNestedChange('organizer', 'email', e.target.value)}
                  className="w-full bg-apollo-light border border-apollo-border rounded-xl px-4 py-2.5 text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                Contact Phone
              </label>
              <input
                type="text"
                value={formData.organizer.phone}
                onChange={(e) => handleNestedChange('organizer', 'phone', e.target.value)}
                className="w-full bg-apollo-light border border-apollo-border rounded-xl px-4 py-2.5 text-sm font-medium"
              />
            </div>
          </div>
        )}

        {/* STEP 6: Additional Information */}
        {step === 6 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-apollo-border shadow-apollo space-y-6">
            <h2 className="text-xl font-bold font-display text-apollo-navy border-b border-gray-100 pb-3">
              Step 6 — Brochure PDF & Additional Documents
            </h2>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                Event Brochure PDF Link
              </label>
              <input
                type="url"
                value={formData.brochureUrl}
                onChange={(e) => handleChange('brochureUrl', e.target.value)}
                placeholder="https://apollo.edu.in/brochure.pdf"
                className="w-full bg-apollo-light border border-apollo-border rounded-xl px-4 py-2.5 text-sm font-medium"
              />
            </div>
          </div>
        )}

        {/* STEP 7: LIVE STUDENT PREVIEW */}
        {step === 7 && (
          <div className="space-y-6">
            <div className="bg-apollo-navy text-white p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-apollo-gold" />
                <span className="font-bold text-sm">Live Student-View Preview Mode</span>
              </div>
              <span className="text-xs text-apollo-cyan">Review how your event will appear to students before submission</span>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-apollo-teal shadow-apollo space-y-4">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-apollo-teal text-white">
                {formData.eventType}
              </span>
              <h1 className="text-2xl font-extrabold text-apollo-navy">{formData.title}</h1>
              <p className="text-gray-600 text-sm">{formData.description}</p>

              <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-apollo-dark bg-apollo-light p-4 rounded-xl">
                <div>📅 Date: {formData.startDate} to {formData.endDate}</div>
                <div>⏰ Time: {formData.startTime} - {formData.endTime}</div>
                <div>📍 Venue: {formData.venue} ({formData.room})</div>
                <div>🏢 School: {formData.school}</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation & Action Buttons */}
        <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep(prev => Math.max(1, prev - 1))}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
              step === 1 ? 'opacity-50 cursor-not-allowed bg-gray-200' : 'bg-apollo-light text-apollo-navy hover:bg-apollo-gray'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Previous Step
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSubmit('DRAFT')}
              disabled={submitting}
              className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-apollo-dark font-bold text-xs rounded-xl flex items-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </button>

            {step < 7 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="gold-gradient-btn px-6 py-2.5 rounded-xl font-bold text-apollo-dark text-xs flex items-center gap-2 shadow-gold"
              >
                <span>Continue to Step {step + 1}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit('PENDING_APPROVAL')}
                disabled={submitting}
                className="gold-gradient-btn px-6 py-2.5 rounded-xl font-extrabold text-apollo-dark text-xs flex items-center gap-2 shadow-gold"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'SUBMIT FOR ADMIN APPROVAL'}
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
