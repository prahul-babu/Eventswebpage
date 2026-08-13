import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowLeft, Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('admin@apollo.edu.in');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(email, password);
    if (res.success) {
      if (res.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        setError('Authorized for Administrator accounts only.');
      }
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-apollo-dark flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background glow */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#FBB91B_1px,transparent_1px)] [background-size:24px_24px]"></div>
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-apollo-gold/20 rounded-full blur-3xl"></div>

      <div className="max-w-md w-full relative z-10">
        
        <Link to="/" className="inline-flex items-center gap-2 text-apollo-gold hover:text-white text-xs font-semibold mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Events Discovery
        </Link>

        <div className="bg-white rounded-3xl p-8 border-2 border-apollo-gold shadow-apollo-lg space-y-6">
          
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-apollo-navy text-apollo-gold flex items-center justify-center mx-auto shadow-md">
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold font-display text-apollo-navy pt-2">
              Administrator Portal
            </h2>
            <p className="text-xs text-gray-500">
              The Apollo University Academic Affairs & Event Moderation Gateway
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
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@apollo.edu.in"
                  className="w-full pl-11 pr-4 py-2.5 bg-apollo-light border border-apollo-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-apollo-gold"
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
                  className="w-full pl-11 pr-4 py-2.5 bg-apollo-light border border-apollo-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-apollo-gold"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-gray-500">Default Credentials: <code className="text-apollo-navy font-bold">admin@apollo.edu.in</code></span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full gold-gradient-btn py-3.5 px-4 rounded-xl font-extrabold text-apollo-dark text-sm shadow-gold mt-2"
            >
              {loading ? 'Authenticating Admin...' : 'LOG IN AS ADMINISTRATOR'}
            </button>

          </form>

          <div className="pt-3 text-center text-[11px] text-gray-400">
            Protected Console • All login attempts are audited for security.
          </div>

        </div>
      </div>

    </div>
  );
}
