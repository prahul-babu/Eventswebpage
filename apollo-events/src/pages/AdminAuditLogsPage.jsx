import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Clock, User, FileText } from 'lucide-react';
import API from '../services/api';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/admin/audit-logs');
      setLogs(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-apollo-light pb-20">
      
      <div className="bg-apollo-dark text-white py-8 border-b-4 border-apollo-gold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div>
            <span className="text-apollo-gold text-xs font-bold uppercase tracking-wider">
              Governance & Traceability
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white mt-1">
              System Audit Logs
            </h1>
          </div>
          <Link to="/admin/dashboard" className="text-xs text-apollo-gold hover:underline">
            ← Back to Overview
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-white rounded-2xl border border-apollo-border shadow-apollo overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading audit log entries...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-apollo-navy text-white text-xs font-bold uppercase">
                  <tr>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Target Title</th>
                    <th className="px-6 py-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {logs.map(log => (
                    <tr key={log._id} className="hover:bg-apollo-light/50 transition-colors text-xs">
                      <td className="px-6 py-4 font-mono text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-apollo-navy">
                        {log.userName} ({log.userRole})
                      </td>
                      <td className="px-6 py-4 font-extrabold text-apollo-teal">
                        {log.action}
                      </td>
                      <td className="px-6 py-4 font-semibold text-apollo-dark">
                        {log.targetTitle || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {log.details}
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
