import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, HelpCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { user, login, loginWithGoogle, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine portal mode from URL path
  const path = location.pathname;
  const isFacultyLogin = path.startsWith('/faculty');
  const isAdminLogin = path.startsWith('/admin');
  const portalMode = isAdminLogin ? 'admin' : isFacultyLogin ? 'faculty' : 'student';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Set sample credentials helpful for testing role portals
  useEffect(() => {
    if (isAdminLogin) {
      setEmail('admin@apollo.edu.in');
      setPassword('admin123');
    } else if (isFacultyLogin) {
      setEmail('dr.sharma@apollo.edu.in');
      setPassword('faculty123');
    } else {
      setEmail('rahul.student@apollo.edu.in');
      setPassword('student123');
    }
  }, [portalMode]);

  // If already authenticated, redirect to appropriate role space
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'faculty') {
        navigate('/faculty/dashboard', { replace: true });
      } else {
        navigate('/events', { replace: true });
      }
    }
  }, [user, navigate]);

  const authorizeAndRedirect = (userProfile) => {
    const role = userProfile?.role || 'student';

    // Authorization checks
    if (isAdminLogin && role !== 'admin') {
      setError('Access Denied: Administrator privileges are required for this portal.');
      return;
    }

    if (isFacultyLogin && role === 'student') {
      setError('Access Denied: Student accounts cannot access the Faculty Portal.');
      return;
    }

    // Navigate to role landing space
    if (role === 'admin') {
      navigate('/admin/dashboard');
    } else if (role === 'faculty') {
      navigate('/faculty/dashboard');
    } else {
      navigate('/events');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    const res = await login(email, password);
    if (res.success) {
      authorizeAndRedirect(res.user);
    } else {
      setError(res.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const res = await loginWithGoogle();
    if (res.success) {
      authorizeAndRedirect(res.user);
    } else {
      setError(res.message);
    }
  };

  // UI Theme details based on portal mode
  const portalTitle = isAdminLogin 
    ? 'Administrator Gateway' 
    : isFacultyLogin 
    ? 'Faculty Portal Sign In' 
    : 'Student Portal Sign In';

  const portalSubtitle = isAdminLogin 
    ? 'University executive moderation, management & audit system' 
    : isFacultyLogin 
    ? 'Official portal for academic event creation & management' 
    : 'Discover campus events, workshops, hackathons & symposiums';

  const badgeText = isAdminLogin 
    ? 'ADMINISTRATOR ACCESS' 
    : isFacultyLogin 
    ? 'FACULTY ACCESS' 
    : 'STUDENT ACCESS';

  const badgeBg = isAdminLogin 
    ? 'bg-apollo-gold text-apollo-dark' 
    : isFacultyLogin 
    ? 'bg-apollo-teal text-white' 
    : 'bg-apollo-navy text-white';

  return (
    <div className="min-h-screen bg-apollo-navy flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Accent Grid */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#27B8D5_1px,transparent_1px)] [background-size:24px_24px]"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-apollo-teal/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-apollo-gold/10 rounded-full blur-3xl"></div>

      <div className="max-w-md w-full relative z-10 space-y-6">
        
        {/* Main Card */}
        <div className="bg-white rounded-3xl p-8 border-2 border-apollo-gold shadow-apollo-lg space-y-6">
          
          {/* Header Branding */}
          <div className="text-center space-y-3">
            <Link to="/" className="inline-block">
              <img 
                src="/assets/apollo_logo_full.png" 
                alt="The Apollo University" 
                className="h-16 w-auto mx-auto object-contain hover:scale-105 transition-transform"
              />
            </Link>
            
            <div className="pt-2">
              <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-2 ${badgeBg}`}>
                {badgeText}
              </span>
              <h1 className="text-2xl font-extrabold font-display text-apollo-dark">
                {portalTitle}
              </h1>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                {portalSubtitle}
              </p>
            </div>
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="bg-red-50 text-red-700 p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2.5 border border-red-200 shadow-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Email/Password Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-apollo-dark mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@apollo.edu.in"
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
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-2.5 bg-apollo-light border border-apollo-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-apollo-teal"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-gray-400 hover:text-apollo-dark transition-colors"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full gold-gradient-btn py-3.5 px-4 rounded-xl font-extrabold text-apollo-dark text-sm shadow-gold flex items-center justify-center gap-2 mt-2 cursor-pointer transition-all hover:brightness-105"
            >
              <span>{loading ? 'AUTHENTICATING...' : 'SIGN IN'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Google Sign In Button */}
          <div className="pt-2 border-t border-gray-100 space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-bold text-gray-700 text-xs bg-white hover:bg-gray-50 border border-gray-300 shadow-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Sign In with Google</span>
            </button>

            {/* Portal Switch Links */}
            <div className="text-center text-xs text-gray-500 pt-2 space-y-1">
              {isAdminLogin ? (
                <p>
                  Faculty member? <Link to="/faculty/login" className="text-apollo-teal font-bold hover:underline">Faculty Login</Link> • <Link to="/login" className="text-apollo-teal font-bold hover:underline">Student Login</Link>
                </p>
              ) : isFacultyLogin ? (
                <p>
                  University Administrator? <Link to="/admin/login" className="text-apollo-gold font-bold hover:underline">Admin Gateway</Link> • <Link to="/login" className="text-apollo-teal font-bold hover:underline">Student Login</Link>
                </p>
              ) : (
                <p>
                  Faculty or Staff? <Link to="/faculty/login" className="text-apollo-teal font-bold hover:underline">Faculty Login</Link> • <Link to="/admin/login" className="text-apollo-gold font-bold hover:underline">Admin Gateway</Link>
                </p>
              )}
            </div>

            {/* Help Note */}
            <div className="pt-2 text-center text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-apollo-teal" />
              <span>Don't have access? Contact your administrator</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
