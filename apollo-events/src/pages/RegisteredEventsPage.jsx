import React from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import Navbar from '../components/layout/Navbar';

export default function RegisteredEventsPage() {
  return (
    <div className="min-h-screen bg-apollo-light">

      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        <div className="mb-8">

          <p className="text-xs font-bold uppercase tracking-[0.18em] text-apollo-teal">
            Your activity
          </p>

          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold font-display text-apollo-navy">
            Registered Events
          </h1>

          <p className="mt-2 text-base text-gray-500">
            View the events you have registered for.
          </p>

        </div>


        {/* Temporary empty state */}

        <div className="bg-white border border-apollo-border rounded-2xl p-12 sm:p-16 text-center">

          <div className="mx-auto w-14 h-14 rounded-full bg-apollo-light flex items-center justify-center">
            <Calendar className="w-7 h-7 text-apollo-teal" />
          </div>

          <h2 className="mt-5 text-xl font-bold text-apollo-navy">
            No registered events yet
          </h2>

          <p className="mt-2 max-w-md mx-auto text-sm text-gray-500">
            Once you register for an event, it will appear here so you
            can easily keep track of your registrations.
          </p>

          <Link
            to="/events"
            className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-lg bg-apollo-navy text-white text-sm font-bold hover:bg-apollo-teal transition-colors"
          >
            Explore Events
            <ArrowRight className="w-4 h-4" />
          </Link>

        </div>

      </main>

    </div>
  );
}