import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  User as UserIcon,
  Calendar,
  DollarSign,
  Ticket,
  Save,
  Shield,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAdminUserDetail } from "@/lib/queries/adminUsers";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { safeFormatDate } from "@/lib/utils";

export const AdminUserProfilePage: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const { data, isLoading } = useAdminUserDetail(uid);

  const [activeTab, setActiveTab] = useState<"overview" | "events" | "registrations" | "payments">("overview");

  // Editable fields
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [programme, setProgramme] = useState("");
  const [year, setYear] = useState("");
  const [section, setSection] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sync initial values
  React.useEffect(() => {
    if (data?.user) {
      setDepartment(data.user.department || "");
      setDesignation(data.user.designation || "");
      setPhoneNumber(data.user.phoneNumber || data.user.phone || "");
      setRollNumber(data.user.rollNumber || (data.user as any).studentId || "");
      setEmployeeId(data.user.employeeId || (data.user as any).facultyId || "");
      setProgramme((data.user as any).programme || "");
      setYear((data.user as any).year || "");
      setSection((data.user as any).section || "");
    }
  }, [data?.user]);

  const handleSaveChanges = async () => {
    if (!uid) return;
    try {
      setIsSaving(true);
      const rawUpdates: Record<string, any> = {
        department: department.trim(),
        designation: designation.trim(),
        phoneNumber: phoneNumber.trim(),
        phone: phoneNumber.trim(),
        programme: programme.trim(),
        year: year.trim(),
        section: section.trim(),
        updatedAt: new Date(),
      };

      if (rollNumber.trim()) {
        rawUpdates.rollNumber = rollNumber.trim().toUpperCase();
        rawUpdates.studentId = rollNumber.trim().toUpperCase();
      }
      if (employeeId.trim()) {
        rawUpdates.employeeId = employeeId.trim().toUpperCase();
        rawUpdates.facultyId = employeeId.trim().toUpperCase();
      }

      await setDoc(doc(db, "users", uid), rawUpdates, { merge: true });
      toast.success("Profile Details Updated", { description: "User dossier changes saved to Firestore." });
    } catch (err: any) {
      toast.error("Update Failed", { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Loading user dossier...</p>
      </div>
    );
  }

  if (!data?.user) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto stroke-1" />
        <h2 className="text-xl font-bold text-slate-900">User Not Found</h2>
        <p className="text-xs text-slate-500">The requested campus identity does not exist in the database.</p>
        <Button asChild variant="outline" className="rounded-xl text-xs">
          <Link to="/admin/users">Back to User Directory</Link>
        </Button>
      </div>
    );
  }

  const { user, eventsOrganised, registrations, payments } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20">
      {/* Back Link */}
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to User Directory</span>
      </Link>

      {/* Profile Header Dossier */}
      <Card className="rounded-3xl border-slate-200/90 shadow-sm bg-white p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-3xl bg-indigo-900 text-white flex items-center justify-center font-black text-2xl uppercase shadow-md">
              {(user.displayName || user.email || "AP").slice(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">{user.displayName || "Campus Member"}</h1>
                <Badge
                  variant={user.role === "admin" ? "amber" : user.role === "faculty" ? "indigo" : "secondary"}
                  className="text-[10px] font-bold uppercase"
                >
                  {user.role}
                </Badge>
                <Badge
                  variant={user.status === "ACTIVE" ? "emerald" : user.status === "PENDING" ? "amber" : "destructive"}
                  className="text-[10px]"
                >
                  {user.status}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-mono">{user.email || "No email on record"}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Joined</span>
              <strong className="text-slate-800">
                {safeFormatDate(user.createdAt, "MMM d, yyyy", "N/A")}
              </strong>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">UID</span>
              <strong className="text-slate-800 font-mono">{(user.uid || "").slice(0, 10)}...</strong>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b pb-1 text-xs">
        {[
          { id: "overview", label: "Overview & Credentials", icon: UserIcon },
          { id: "events", label: `Events Organised (${eventsOrganised.length})`, icon: Calendar },
          { id: "registrations", label: `Registrations (${registrations.length})`, icon: Ticket },
          { id: "payments", label: `Payments (${payments.length})`, icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview & Editable Fields */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="rounded-3xl border-slate-200 bg-white p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Institutional &amp; Departmental Data</h3>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Department</Label>
                <Input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science & Engineering"
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Designation / Title</Label>
                <Input
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Associate Professor / Student Scholar"
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Mobile Contact Number</Label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="h-10 text-xs"
                />
              </div>

              {user.role === "student" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Student Roll Number</Label>
                    <Input
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      placeholder="e.g. 21BCE10234"
                      className="h-10 text-xs font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="font-bold text-slate-700">Academic Year</Label>
                      <Input
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        placeholder="e.g. 3rd Year"
                        className="h-10 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-bold text-slate-700">Section</Label>
                      <Input
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        placeholder="e.g. Section A"
                        className="h-10 text-xs"
                      />
                    </div>
                  </div>
                </>
              )}

              {(user.role === "faculty" || user.role === "admin") && (
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Employee ID</Label>
                  <Input
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="e.g. EMP-CSE-409"
                    className="h-10 text-xs font-mono"
                  />
                </div>
              )}

              <Button
                type="button"
                size="sm"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 h-9"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? "Saving..." : "Save Dossier Details"}</span>
              </Button>
            </div>
          </Card>

          <Card className="rounded-3xl border-slate-200 bg-white p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">System Permissions &amp; Authentication</h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                <div>
                  <strong className="block text-slate-800">Microsoft SSO Identity</strong>
                  <span className="text-[10px] text-slate-400">Authenticated via Entra ID tenant</span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                <div>
                  <strong className="block text-slate-800">Phone Verification</strong>
                  <span className="text-[10px] text-slate-400">{user.phoneNumber || user.phone || "No phone provided"}</span>
                </div>
                <Shield className="w-4 h-4 text-indigo-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Events Organised */}
      {activeTab === "events" && (
        <Card className="rounded-3xl border-slate-200 bg-white overflow-hidden">
          <div className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-b">
            Hosted Events Catalog
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {eventsOrganised.length > 0 ? (
              eventsOrganised.map((ev: any) => (
                <div key={ev.id || Math.random()} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <strong className="text-slate-900 text-sm block">{ev.title || "Untitled Event"}</strong>
                    <span className="text-[10px] text-slate-400">
                      {ev.category || "General"} &bull; {safeFormatDate(ev.startAt, "MMM d, yyyy", "Date TBA")}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{ev.status || "DRAFT"}</Badge>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400">No events hosted by this user.</div>
            )}
          </div>
        </Card>
      )}

      {/* Tab 3: Registrations */}
      {activeTab === "registrations" && (
        <Card className="rounded-3xl border-slate-200 bg-white overflow-hidden">
          <div className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-b">
            Campus Bookings &amp; Passes
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {registrations.length > 0 ? (
              registrations.map((reg: any) => (
                <div key={reg.id || Math.random()} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <strong className="text-slate-900 block">{reg.eventTitle || "Event Booking"}</strong>
                    <span className="text-[10px] text-slate-400">Ticket: {reg.ticketCode || "N/A"} &bull; {safeFormatDate(reg.registeredAt || reg.createdAt, "MMM d, yyyy", "Registered")}</span>
                  </div>
                  <Badge variant="emerald" className="text-[10px]">{reg.status || "CONFIRMED"}</Badge>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400">No event registrations found.</div>
            )}
          </div>
        </Card>
      )}

      {/* Tab 4: Payments */}
      {activeTab === "payments" && (
        <Card className="rounded-3xl border-slate-200 bg-white overflow-hidden">
          <div className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-b">
            Razorpay Transaction History
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {payments.length > 0 ? (
              payments.map((pm: any) => (
                <div key={pm.id || Math.random()} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <strong className="text-slate-900 block font-mono">₹{((pm.amount || 0) / 100).toLocaleString()}</strong>
                    <span className="text-[10px] text-slate-400">Order: {pm.orderId || "N/A"}</span>
                  </div>
                  <Badge variant="emerald" className="text-[10px]">{pm.status || "SUCCESS"}</Badge>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400">No payment transactions recorded.</div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
export default AdminUserProfilePage;
