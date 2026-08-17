import React from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  Mail,
  ShieldCheck,
  ExternalLink,
  LifeBuoy,
  MapPin,
  FileText,
} from "lucide-react";
import { EVENT_HUB_CONFIG } from "@/config/event-hub";
import { useAuth } from "@/lib/auth-context";

export const AppFooter: React.FC = () => {
  const { role } = useAuth();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600 text-xs mt-auto">
      {/* Top Institutional Bar Accent */}
      <div className="h-1 bg-gradient-to-r from-[#004D61] via-[#007A99] to-[#F5A623]" />

      {/* Main Multi-Column Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Column 1 & 2: Official Apollo University Logo & Brand Summary */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3.5">
              <img
                src="/apollo-logo.png"
                alt="The Apollo University"
                className="h-12 w-auto object-contain"
              />
              <div className="border-l border-slate-200 pl-3">
                <h3 className="font-extrabold text-sm text-slate-900 tracking-tight leading-tight">
                  The Apollo University
                </h3>
                <p className="text-[11px] font-bold text-[#007A99] tracking-wide uppercase mt-0.5">
                  School of Technology &bull; B.Tech Event Hub
                </p>
              </div>
            </div>

            <p className="text-slate-500 text-xs leading-relaxed max-w-sm">
              The official campus event coordination platform for technical symposiums, hackathons, coding contests, industry guest lectures, and student activities.
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Microsoft Entra ID Single Sign-On</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 font-medium">
                <MapPin className="w-3.5 h-3.5 text-[#007A99] shrink-0" />
                <span>Chittoor, AP – 517127</span>
              </span>
            </div>
          </div>

          {/* Column 3: Event Hub Navigation */}
          <div className="space-y-3.5">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-[#004D61]">
              <CalendarCheck className="w-3.5 h-3.5 text-[#007A99]" />
              <span>Event Hub</span>
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link
                  to="/events"
                  className="text-slate-600 hover:text-[#007A99] font-medium transition-colors inline-flex items-center gap-1"
                >
                  <span>Events Catalog</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/my-registrations"
                  className="text-slate-600 hover:text-[#007A99] font-medium transition-colors"
                >
                  Student Portal
                </Link>
              </li>
              <li>
                <Link
                  to="/faculty"
                  className="text-slate-600 hover:text-[#007A99] font-medium transition-colors"
                >
                  Faculty Portal
                </Link>
              </li>
              <li>
                <Link
                  to="/help"
                  className="text-slate-600 hover:text-[#007A99] font-medium transition-colors"
                >
                  Event Guidelines
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Support */}
          <div className="space-y-3.5">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-[#004D61]">
              <LifeBuoy className="w-3.5 h-3.5 text-[#007A99]" />
              <span>Support</span>
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link
                  to="/help"
                  className="text-slate-600 hover:text-[#007A99] font-medium transition-colors"
                >
                  Helpdesk &amp; FAQ
                </Link>
              </li>
              <li>
                <a
                  href={`mailto:${EVENT_HUB_CONFIG.contacts.supportEmail}?subject=Technical%20Support%20Request%20-%20Apollo%20Event%20Hub`}
                  className="text-slate-600 hover:text-[#007A99] font-medium transition-colors inline-flex items-center gap-1"
                >
                  <span>Technical Support</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${EVENT_HUB_CONFIG.contacts.eventHubEmail}?subject=Report%20an%20Issue%20-%20Apollo%20Event%20Hub`}
                  className="text-slate-600 hover:text-[#007A99] font-medium transition-colors inline-flex items-center gap-1"
                >
                  <span>Report an Issue</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
              <li>
                <Link
                  to="/help"
                  className="text-slate-600 hover:text-[#007A99] font-medium transition-colors"
                >
                  Help Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Contact & Legal */}
          <div className="space-y-3.5">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-[#004D61]">
              <Mail className="w-3.5 h-3.5 text-[#007A99]" />
              <span>Contact &amp; Legal</span>
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <div className="text-[11px] text-slate-400 font-semibold uppercase">Official Email</div>
                <a
                  href={`mailto:${EVENT_HUB_CONFIG.contacts.eventHubEmail}`}
                  className="text-slate-700 hover:text-[#007A99] font-mono text-[11px] font-medium block truncate transition-colors"
                  title={EVENT_HUB_CONFIG.contacts.eventHubEmail}
                >
                  {EVENT_HUB_CONFIG.contacts.eventHubEmail}
                </a>
              </li>
              <li>
                <div className="text-[11px] text-slate-400 font-semibold uppercase">Support Desk</div>
                <a
                  href={`mailto:${EVENT_HUB_CONFIG.contacts.supportEmail}`}
                  className="text-slate-700 hover:text-[#007A99] font-mono text-[11px] font-medium block truncate transition-colors"
                  title={EVENT_HUB_CONFIG.contacts.supportEmail}
                >
                  {EVENT_HUB_CONFIG.contacts.supportEmail}
                </a>
              </li>
              <li className="pt-1 flex items-center gap-3">
                <Link
                  to="/help"
                  className="text-slate-500 hover:text-[#007A99] text-[11px] font-medium transition-colors inline-flex items-center gap-1"
                >
                  <FileText className="w-3 h-3 text-slate-400" />
                  <span>Privacy Policy</span>
                </Link>
                <span className="text-slate-300">&bull;</span>
                <Link
                  to="/help"
                  className="text-slate-500 hover:text-[#007A99] text-[11px] font-medium transition-colors"
                >
                  Terms of Use
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Sub-Footer Bar */}
      <div className="border-t border-slate-100 bg-slate-50/90 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
          <div className="flex items-center gap-2 flex-wrap text-center sm:text-left">
            <span className="font-semibold text-slate-700">
              &copy; {currentYear} The Apollo University. All rights reserved.
            </span>
            <span className="text-slate-300 hidden sm:inline">&bull;</span>
            <span className="text-slate-500">
              School of Technology (B.Tech Event Hub)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {role && (
              <span className="bg-[#E0F3F7] text-[#004D61] border border-cyan-200 text-[10px] font-extrabold py-0.5 px-2.5 rounded-full uppercase tracking-wider">
                {role} Console
              </span>
            )}
            <span className="text-slate-400 font-medium">Campus Event Management System</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
