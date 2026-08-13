import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserPlus, Shield, CheckCircle2, XCircle, Search, Mail, Building } from 'lucide-react';
import API from '../services/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Faculty Form
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: 'faculty123',
    role: 'faculty',
    school: 'School of Technology',
    department: 'Computer Science'
  });

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/admin/users', { params: { role: roleFilter } });
      setUsers(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await API.put(`/admin/users/${id}/status`);
      fetchUsers();
    } catch (error) {
      alert('Failed to update user status');
    }
  };

  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    try {
      await API.post('/admin/users', newUser);
      alert('Faculty account created successfully!');
      setShowAddModal(false);
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create faculty account');
    }
  };

  return (
    <div className="min-h-screen bg-apollo-light pb-20">
      
      {/* Header */}
      <div className="bg-apollo-dark text-white py-8 border-b-4 border-apollo-gold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div>
            <span className="text-apollo-gold text-xs font-bold uppercase tracking-wider">
              Directory & Access Management
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white mt-1">
              User Accounts Console
            </h1>
          </div>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="gold-gradient-btn px-4 py-2 rounded-xl text-apollo-dark font-bold text-xs flex items-center gap-2 shadow-gold"
          >
            <UserPlus className="w-4 h-4" />
            + Provision Faculty Account
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        
        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 border border-apollo-border shadow-apollo flex items-center justify-between">
          <div className="flex gap-2">
            {['All', 'faculty', 'student', 'admin'].map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                  roleFilter === r ? 'bg-apollo-navy text-white' : 'bg-apollo-light text-gray-600'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-apollo-border shadow-apollo overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading user directory...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-apollo-navy text-white text-xs font-bold uppercase">
                  <tr>
                    <th className="px-6 py-4">User Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">School / Department</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {users.map(u => (
                    <tr key={u._id} className="hover:bg-apollo-light/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-apollo-dark">{u.name}</td>
                      <td className="px-6 py-4 text-xs font-medium text-apollo-teal">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.role === 'admin' ? 'bg-apollo-gold text-apollo-dark' :
                          u.role === 'faculty' ? 'bg-apollo-teal text-white' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div className="font-semibold text-apollo-navy">{u.school || 'General'}</div>
                        <div className="text-gray-400">{u.department}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleToggleStatus(u._id)}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
                            u.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          {u.isActive ? 'Disable Account' : 'Activate Account'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Provision Faculty Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-apollo-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apollo-lg space-y-4">
            <h3 className="font-display font-bold text-lg text-apollo-navy border-b pb-3">
              Provision New Faculty Account
            </h3>

            <form onSubmit={handleCreateFaculty} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Dr. Full Name"
                  className="w-full bg-apollo-light border p-2.5 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Official University Email</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="faculty@apollo.edu.in"
                  className="w-full bg-apollo-light border p-2.5 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">School</label>
                <select
                  value={newUser.school}
                  onChange={(e) => setNewUser({ ...newUser, school: e.target.value })}
                  className="w-full bg-apollo-light border p-2.5 rounded-xl"
                >
                  <option value="School of Technology">School of Technology</option>
                  <option value="School of Management">School of Management</option>
                  <option value="School of Health Sciences">School of Health Sciences</option>
                  <option value="Apollo Institute of Pharmaceutical Sciences">Apollo Institute of Pharmaceutical Sciences</option>
                  <option value="School of Social Science">School of Social Science</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Department</label>
                <input
                  type="text"
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  placeholder="e.g. Computer Science & Engineering"
                  className="w-full bg-apollo-light border p-2.5 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-200 text-apollo-dark rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gold-gradient-btn px-5 py-2 rounded-xl text-apollo-dark font-extrabold shadow-gold"
                >
                  Create Faculty Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
