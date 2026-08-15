import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Mail,
  ArrowRight,
  Home,
  ShieldCheck,
} from "lucide-react";

export const FacultyApplicationSubmittedPage: React.FC = () => {
  const location = useLocation();
  const applicationData = (location.state as any) || {};

  const fullName = applicationData.fullName || "Faculty Member";
  const officialEmail = applicationData.officialEmail || "faculty@apollouniversity.edu.in";
  const employeeId = applicationData.employeeId || "—";
  const department = applicationData.department || "School of Technology";
  const school = applicationData.school || "School of Technology";
  const designation = applicationData.designation || "Assistant Professor";
  const submittedAt = applicationData.submittedAt
    ? new Date(applicationData.submittedAt).toLocaleString()
    : new Date().toLocaleString();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 bg-[#F0F9FB]">
      <div className="w-full max-w-lg space-y-4">
        <Card className="border-slate-200/90 shadow-2xl rounded-2xl bg-white overflow-hidden">
          {/* Official University Header */}
          <div className="bg-gradient-to-r from-[#004D61] via-[#006883] to-[#007A99] p-6 text-white text-center space-y-2">
            <div className="bg-white/95 rounded-xl p-2 inline-block shadow-md mb-1">
              <img
                src="/apollo-logo.png"
                alt="The Apollo University"
                className="h-10 w-auto mx-auto object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
            </div>
            <div className="text-[11px] font-bold tracking-widest uppercase opacity-90">
              The Apollo University • Access Gate
            </div>
            <h1 className="text-xl font-black tracking-tight">
              Faculty Registration Submitted
            </h1>
          </div>

          <CardContent className="pt-6 pb-6 px-6 sm:px-8 space-y-5">
            {/* Status Indicator */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-sm relative">
                <Clock className="w-7 h-7 animate-pulse" />
              </div>
              <Badge variant="amber" className="text-xs px-3 py-1 font-bold">
                Application Status: PENDING
              </Badge>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                Your faculty registration has been successfully submitted and is awaiting administrator approval.
              </p>
            </div>

            {/* Application Dossier Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3 text-xs">
              <div className="font-bold text-slate-900 flex items-center justify-between pb-2 border-b border-slate-200 text-[11px]">
                <span className="uppercase tracking-wider text-indigo-700">Submitted Information</span>
                <span className="text-slate-400 font-normal">{submittedAt}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Faculty Name</div>
                  <div className="font-bold text-slate-800 text-xs">{fullName}</div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Faculty / Employee ID</div>
                  <div className="font-mono font-bold text-slate-800">{employeeId}</div>
                </div>

                <div className="col-span-2">
                  <div className="text-[10px] text-slate-400 font-medium">Official Institutional Email</div>
                  <div className="font-mono text-slate-900 font-semibold flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-[#007A99]" />
                    <span>{officialEmail}</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Designation</div>
                  <div className="font-medium text-slate-700">{designation}</div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Department &amp; School</div>
                  <div className="font-medium text-slate-700 truncate" title={`${department} • ${school}`}>{department} • {school}</div>
                </div>
              </div>
            </div>

            {/* Notification Notice Box */}
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-950 space-y-0.5">
                <div className="font-bold">Administrator Verification in Progress</div>
                <p className="text-[11px] text-indigo-800 leading-relaxed">
                  You will receive an email once your Apollo University faculty account has been approved. Once activated, you can sign in to access the Faculty Portal.
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-slate-50/80 px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Link to="/" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto text-xs rounded-xl h-10 border-slate-300 text-slate-700 hover:bg-slate-100 gap-1.5"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Back to Home</span>
              </Button>
            </Link>

            <Link to="/login" className="w-full sm:w-auto">
              <Button
                size="sm"
                className="w-full sm:w-auto text-xs rounded-xl h-10 bg-[#007A99] hover:bg-[#006883] text-white font-bold gap-1.5 shadow-md"
              >
                <span>Go to Faculty Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <div className="text-center">
          <p className="text-[11px] text-slate-400">
            The Apollo University Event Hub • School of Technology
          </p>
        </div>
      </div>
    </div>
  );
};
export default FacultyApplicationSubmittedPage;
