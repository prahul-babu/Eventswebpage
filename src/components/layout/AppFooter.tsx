import React from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  CalendarCheck,
  Mail,
  ShieldCheck,
  ExternalLink,
  LifeBuoy,
} from "lucide-react";
import { EVENT_HUB_CONFIG } from "@/config/event-hub";
import { useAuth } from "@/lib/auth-context";

export const AppFooter: React.FC = () => {
  const { role } = useAuth();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200/90 bg-white text-slate-600 text-xs mt-auto">
      {/* Top Multi-column Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-6">
          {/* Column 1: Institutional & Event Hub Identity */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[#004D61] text-white flex items-center justify-center shadow-xs">
                <Building2 className="w-5 h-5 text-[#F5A623]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 tracking-tight leading-tight">
                  {EVENT_HUB_CONFIG.universityName}
                </h3>
                <p className="text-[11px] text-[#007A99] font-semibold">
                  {EVENT_HUB_CONFIG.schoolName} &bull; {EVENT_HUB_CONFIG.programName}
                </p>
              </div>
            </div>

            <p className="text-slate-500 text-[11px] leading-relaxed max-w-sm">
              Official institutional event management, registration, and academic coordination hub for workshops, seminars, hackathons, and technical symposiums.
            </p>

            <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Microsoft Entra ID Institutional Single Sign-On</span>
            </div>
          </div>

          {/* Column 2: Event Hub Navigation */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-[#004D61]">
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Event Hub</span>
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to={EVENT_HUB_CONFIG.links.events}
                  className="hover:text-[#007A99] transition-colors"
                >
                  Events Catalog
                </Link>
              </li>
              <li>
                <Link
                  to={EVENT_HUB_CONFIG.links.studentPortal}
                  className="hover:text-[#007A99] transition-colors"
                >
                  Student Portal
                </Link>
              </li>
              <li>
                <Link
                  to={EVENT_HUB_CONFIG.links.facultyPortal}
                  className="hover:text-[#007A99] transition-colors"
                >
                  Faculty Portal
                </Link>
              </li>
              <li>
                <Link
                  to={EVENT_HUB_CONFIG.links.eventGuidelines}
                  className="hover:text-[#007A99] transition-colors"
                >
                  Event Guidelines
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-[#004D61]">
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>Support</span>
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to={EVENT_HUB_CONFIG.links.helpCenter}
                  className="hover:text-[#007A99] transition-colors"
                >
                  Helpdesk
                </Link>
              </li>
              <li>
                <a
                  href={`mailto:${EVENT_HUB_CONFIG.contacts.supportEmail}?subject=Technical%20Support%20Request%20-%20Apollo%20Event%20Hub`}
                  className="hover:text-[#007A99] transition-colors inline-flex items-center gap-1"
                >
                  <span>Technical Support</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${EVENT_HUB_CONFIG.contacts.eventHubEmail}?subject=Report%20an%20Issue%20-%20Apollo%20Event%20Hub`}
                  className="hover:text-[#007A99] transition-colors inline-flex items-center gap-1"
                >
                  <span>Report an Issue</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
              <li>
                <Link
                  to={EVENT_HUB_CONFIG.links.helpCenter}
                  className="hover:text-[#007A99] transition-colors"
                >
                  Help Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Resources */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-[#004D61]">
              <Mail className="w-3.5 h-3.5" />
              <span>Contact &amp; Legal</span>
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href={`mailto:${EVENT_HUB_CONFIG.contacts.eventHubEmail}`}
                  className="hover:text-[#007A99] transition-colors font-mono text-[11px] block truncate"
                  title={EVENT_HUB_CONFIG.contacts.eventHubEmail}
                >
                  {EVENT_HUB_CONFIG.contacts.eventHubEmail}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${EVENT_HUB_CONFIG.contacts.supportEmail}`}
                  className="hover:text-[#007A99] transition-colors font-mono text-[11px] block truncate"
                  title={EVENT_HUB_CONFIG.contacts.supportEmail}
                >
                  {EVENT_HUB_CONFIG.contacts.supportEmail}
                </a>
              </li>
              <li className="pt-1">
                <Link
                  to={EVENT_HUB_CONFIG.links.privacyPolicy}
                  className="hover:text-[#007A99] transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to={EVENT_HUB_CONFIG.links.termsOfUse}
                  className="hover:text-[#007A99] transition-colors"
                >
                  Terms of Use
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Sub-Footer Bar */}
      <div className="border-t border-slate-100 bg-slate-50/80 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              &copy; {currentYear} {EVENT_HUB_CONFIG.universityName}. All rights reserved.
            </span>
            <span className="text-slate-300 hidden sm:inline">&bull;</span>
            <span className="hidden sm:inline text-slate-400">
              {EVENT_HUB_CONFIG.schoolName} ({EVENT_HUB_CONFIG.programName})
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-400">
            {role && (
              <span className="bg-slate-200/70 text-slate-700 text-[10px] font-bold py-0.5 px-2 rounded-full uppercase tracking-wider">
                {role} Console
              </span>
            )}
            <span>Institutional Event Management System</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
