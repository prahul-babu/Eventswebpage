import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowLeft, Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function FacultyLoginPage() {
  const [email, setEmail] = useState('dr.sharma@apollo.edu.in');
  const [password, setPassword] = useState('faculty123');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(email, password);
    if (res.success) {
      if (res.user.role === 'faculty') {
        navigate('/faculty/dashboard');
      } else if (res.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-apollo-navy flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background accents */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#27B8D5_1px,transparent_1px)] [background-size:24px_24px]"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-apollo-teal/20 rounded-full blur-3xl"></div>

      <div className="max-w-md w-full relative z-10">
        
        {/* Back Link */}
        <Link to="/" className="inline-flex items-center gap-2 text-apollo-cyan hover:text-apollo-gold text-xs font-semibold mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Events Discovery
        </Link>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 border border-apollo-border shadow-apollo-lg space-y-6">
          
          <div className="text-center space-y-2">
            <img 
              src="/assets/apollo_logo_full.png" 
              alt="The Apollo University" 
              className="h-16 w-auto mx-auto object-contain"
            />
            <h2 className="text-2xl font-bold font-display text-apollo-dark pt-2">
              Faculty Login Portal
            </h2>
            <p className="text-xs text-gray-500">
              Sign in with your official university credentials to create and manage academic events.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-medium flex items-center gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                University Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="faculty@apollo.edu.in"
                  className="w-full pl-11 pr-4 py-2.5 bg-apollo-light border border-apollo-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-apollo-teal"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-2.5 bg-apollo-light border border-apollo-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-apollo-teal"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-gray-500">Demo Faculty: <code className="text-apollo-teal font-bold">dr.sharma@apollo.edu.in</code></span>
              <span className="text-apollo-teal hover:underline cursor-pointer">Forgot Password?</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full gold-gradient-btn py-3 px-4 rounded-xl font-bold text-apollo-dark text-sm shadow-gold mt-2"
            >
              {loading ? 'Authenticating...' : 'LOG IN TO FACULTY PORTAL'}
            </button>

          </form>

          <div className="pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
            Faculty accounts are provisioned by the Office of Academic Affairs.
          </div>

        </div>
      </div>

    </div>
  );
}
