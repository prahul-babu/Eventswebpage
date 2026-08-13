import React from 'react';
import { AlertTriangle, Clock, MapPin, Calendar, User } from 'lucide-react';

export default function VenueConflictAlert({ conflictData, onModifySchedule }) {
  if (!conflictData || !conflictData.hasConflict) return null;

  const { conflictingEvent } = conflictData;

  return (
    <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-5 shadow-lg animate-fade-in my-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-red-100 rounded-full text-red-600 shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="space-y-3 flex-1">
          <div>
            <h4 className="text-red-900 font-display font-bold text-lg flex items-center gap-2">
              Venue Conflict Detected!
            </h4>
            <p className="text-red-700 text-sm mt-0.5">
              Another event is already scheduled at this venue during the selected time window.
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-red-200 shadow-sm space-y-2 text-xs">
            <div className="font-bold text-gray-900 text-sm">
              Existing Event: <span className="text-red-700">{conflictingEvent.title}</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-gray-600 pt-1">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                <span>{conflictingEvent.venue} {conflictingEvent.room ? `(${conflictingEvent.room})` : ''}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-red-500 shrink-0" />
                <span>{conflictingEvent.startDate}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-red-500 shrink-0" />
                <span>{conflictingEvent.startTime} – {conflictingEvent.endTime}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-gray-500 pt-1 border-t border-gray-100">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <span>Organized by: {conflictingEvent.organizer}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={onModifySchedule}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
            >
              Modify Venue / Time Slot
            </button>
            <span className="text-xs text-red-600 font-medium">
              Please adjust your room or schedule parameters before submitting.
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
