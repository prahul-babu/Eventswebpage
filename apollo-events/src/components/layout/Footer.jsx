import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Mail, MapPin, Phone, Shield, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-apollo-navy text-white pt-16 pb-8 border-t-4 border-apollo-gold">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10">
          
          {/* Col 1 & 2: Branding */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src="/assets/apollo_logo_white.png" 
                alt="The Apollo University" 
                className="h-14 w-auto object-contain"
              />
            </div>
            <p className="text-gray-300 text-sm leading-relaxed max-w-md mt-3">
              Apollo Events is the centralized university event discovery and management platform for <strong>The Apollo University</strong>. Empowering students and faculty to foster innovation, academic excellence, and vibrant campus life.
            </p>
            <div className="flex items-center gap-3 text-xs text-apollo-cyan font-medium pt-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Centralized Campus Event Portal & Lifecycle Management
            </div>
          </div>

          {/* Col 3: Quick Links */}
          <div>
            <h4 className="text-apollo-gold font-display font-semibold text-base mb-4 tracking-wider uppercase">
              Quick Discovery
            </h4>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li><Link to="/" className="hover:text-apollo-gold transition-colors">Homepage</Link></li>
              <li><Link to="/events" className="hover:text-apollo-gold transition-colors">Browse All Events</Link></li>
              <li><Link to="/calendar" className="hover:text-apollo-gold transition-colors">University Calendar</Link></li>
              <li><Link to="/categories" className="hover:text-apollo-gold transition-colors">Event Categories</Link></li>
            </ul>
          </div>

          {/* Col 4: University Schools */}
          <div>
            <h4 className="text-apollo-gold font-display font-semibold text-base mb-4 tracking-wider uppercase">
              University Schools
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-300">
              <li>School of Technology (SOT)</li>
              <li>School of Management (SOM)</li>
              <li>School of Health Sciences (SOHS)</li>
              <li>Apollo Inst. of Pharmaceutical Sciences</li>
              <li>School of Social Science (SOSS)</li>
            </ul>
          </div>

          {/* Col 5: University Portals */}
          <div>
            <h4 className="text-apollo-gold font-display font-semibold text-base mb-4 tracking-wider uppercase">
              Faculty & Admin
            </h4>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li>
                <Link to="/faculty/login" className="hover:text-apollo-gold flex items-center gap-1.5 transition-colors">
                  <span>Faculty Portal</span>
                  <ExternalLink className="w-3 h-3 text-apollo-cyan" />
                </Link>
              </li>
              <li>
                <Link to="/admin/login" className="hover:text-apollo-gold flex items-center gap-1.5 transition-colors">
                  <span>Administrator Portal</span>
                  <Shield className="w-3 h-3 text-apollo-gold" />
                </Link>
              </li>
              <li className="pt-3 text-xs text-gray-400">
                <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-apollo-teal" /> Chittoor Campus, AP</p>
                <p className="flex items-center gap-1.5 mt-1"><Mail className="w-3.5 h-3.5 text-apollo-teal" /> events@apollo.edu.in</p>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-gray-400 gap-4">
          <p>© {new Date().getFullYear()} The Apollo University. All Rights Reserved. A Division of AHERF.</p>
          <div className="flex gap-6">
            <span className="hover:text-gray-200 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-gray-200 cursor-pointer">Terms of Service</span>
            <span className="hover:text-gray-200 cursor-pointer">Campus Directory</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
