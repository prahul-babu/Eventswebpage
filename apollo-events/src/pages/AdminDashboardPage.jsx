import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, Calendar, CheckCircle2, Clock, Users, AlertTriangle, 
  BarChart3, Activity, ArrowRight, Layers, Building, RefreshCw 
} from 'lucide-react';
import API from '../services/api';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/dashboard');
      setData(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching admin dashboard stats:', error);
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-apollo-light flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-apollo-gold border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-apollo-dark font-medium text-sm">Loading Admin Console Data...</p>
        </div>
      </div>
    );
  }

  const { metrics, charts } = data;

  return (
    <div className="min-h-screen bg-apollo-light pb-20">
      
      {/* Header */}
      <div className="bg-apollo-dark text-white py-10 border-b-4 border-apollo-gold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-apollo-gold text-xs font-bold uppercase tracking-wider">
              <Shield className="w-4 h-4" />
              University Executive Admin Portal
            </div>
            <h1 className="text-3xl font-extrabold font-display text-white mt-1">
              Admin Overview & Analytics
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/events"
              className="gold-gradient-btn px-5 py-2.5 rounded-xl text-apollo-dark font-bold text-xs flex items-center gap-2 shadow-gold"
            >
              <Clock className="w-4 h-4" />
              Pending Moderation Queue ({metrics.pendingEvents})
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-white rounded-2xl p-6 border border-apollo-border shadow-apollo flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase">Total Campus Events</span>
              <p className="text-3xl font-extrabold text-apollo-navy mt-1">{metrics.totalEvents}</p>
            </div>
            <div className="p-3 bg-apollo-light rounded-xl text-apollo-teal">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-amber-300 shadow-apollo flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-700 uppercase">Pending Approval</span>
              <p className="text-3xl font-extrabold text-amber-600 mt-1">{metrics.pendingEvents}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-apollo-border shadow-apollo flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase">Active Faculty</span>
              <p className="text-3xl font-extrabold text-apollo-teal mt-1">{metrics.totalFaculty}</p>
            </div>
            <div className="p-3 bg-apollo-light rounded-xl text-apollo-teal">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-apollo-border shadow-apollo flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase">Total Registrations</span>
              <p className="text-3xl font-extrabold text-emerald-600 mt-1">{metrics.totalRegistrations}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

        </div>

        {/* Analytics Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Chart 1: Events by Category */}
          <div className="bg-white rounded-2xl p-6 border border-apollo-border shadow-apollo space-y-4">
            <h3 className="font-display font-bold text-lg text-apollo-navy flex items-center gap-2 border-b border-gray-100 pb-3">
              <BarChart3 className="w-5 h-5 text-apollo-teal" />
              Events Distribution by Category
            </h3>
            
            <div className="space-y-3 pt-2">
              {charts.eventsByCategory.map(item => (
                <div key={item.category} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-gray-600">
                    <span>{item.category}</span>
                    <span className="text-apollo-navy font-bold">{item.count} Events</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-apollo-teal rounded-full"
                      style={{ width: `${Math.min(100, (item.count / metrics.totalEvents) * 100 || 20)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 2: Events by School */}
          <div className="bg-white rounded-2xl p-6 border border-apollo-border shadow-apollo space-y-4">
            <h3 className="font-display font-bold text-lg text-apollo-navy flex items-center gap-2 border-b border-gray-100 pb-3">
              <Building className="w-5 h-5 text-apollo-gold" />
              Events Distribution by University School
            </h3>

            <div className="space-y-3 pt-2">
              {charts.eventsBySchool.map(item => (
                <div key={item.school} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-gray-600">
                    <span>{item.school}</span>
                    <span className="text-apollo-navy font-bold">{item.count} Events</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-apollo-gold rounded-full"
                      style={{ width: `${Math.min(100, (item.count / metrics.totalEvents) * 100 || 20)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Navigation Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Link
            to="/admin/events"
            className="bg-white rounded-2xl p-6 border border-apollo-border shadow-apollo hover:border-apollo-teal transition-all group"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-apollo-dark text-base group-hover:text-apollo-teal">Review Events</h4>
              <ArrowRight className="w-5 h-5 text-apollo-teal transition-transform group-hover:translate-x-1" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Approve, reject, or request changes on submitted faculty event proposals.</p>
          </Link>

          <Link
            to="/admin/users"
            className="bg-white rounded-2xl p-6 border border-apollo-border shadow-apollo hover:border-apollo-teal transition-all group"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-apollo-dark text-base group-hover:text-apollo-teal">Manage Users</h4>
              <ArrowRight className="w-5 h-5 text-apollo-teal transition-transform group-hover:translate-x-1" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Add faculty accounts, activate/disable users, and manage access privileges.</p>
          </Link>

          <Link
            to="/admin/categories"
            className="bg-white rounded-2xl p-6 border border-apollo-border shadow-apollo hover:border-apollo-teal transition-all group"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-apollo-dark text-base group-hover:text-apollo-teal">Categories & Schools</h4>
              <ArrowRight className="w-5 h-5 text-apollo-teal transition-transform group-hover:translate-x-1" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Configure dynamic event types, school departments, and platform settings.</p>
          </Link>
        </div>

      </div>

    </div>
  );
}
