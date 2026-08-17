import React, { useState, useEffect } from "react";
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
  Mail,
  KeyRound,
  GraduationCap,
} from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAdminUserDetail } from "@/lib/queries/adminUsers";
import { SendFacultyNotificationModal } from "@/components/admin/SendFacultyNotificationModal";
import { ResetPasswordModal } from "@/components/admin/ResetPasswordModal";
import {
  isValidOptionalPhoneNumber,
  isValidEmailFormat,
  sanitizeFirestoreData,
  PHONE_ERROR_MESSAGES,
} from "@/lib/validation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEPARTMENTS, UserRole, UserStatus } from "@/types";
import { toast } from "sonner";
import { safeFormatDate } from "@/lib/utils";

export const AdminUserProfilePage: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const { data, isLoading } = useAdminUserDetail(uid);

  const [activeTab, setActiveTab] = useState<
    "overview" | "events" | "registrations" | "payments" | "reports"
  >("overview");
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  // Editable fields
  const [displayName, setDisplayName] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [alternateEmail, setAlternateEmail] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [programme, setProgramme] = useState("");
  const [year, setYear] = useState("");
  const [section, setSection] = useState("");
  const [school, setSchool] = useState("School of Technology");
  const [role, setRole] = useState<UserRole>("student");
  const [status, setStatus] = useState<UserStatus>("ACTIVE");
  const [isSaving, setIsSaving] = useState(false);

  // Sync initial values
  useEffect(() => {
    if (data?.user) {
      setDisplayName(data.user.displayName || "");
      setDepartment(data.user.department || "Computer Science and Engineering");
      setDesignation(data.user.designation || "");
      setPhoneNumber(data.user.phoneNumber || data.user.phone || "");
      setAlternateEmail((data.user as any).alternateEmail || (data.user as any).personalEmail || "");
      setRollNumber(data.user.rollNumber || (data.user as any).studentId || "");
      setEmployeeId(data.user.employeeId || (data.user as any).facultyId || "");
      setProgramme((data.user as any).programme || "");
      setYear((data.user as any).year || "");
      setSection((data.user as any).section || "");
      setSchool((data.user as any).school || "School of Technology");
      setRole(data.user.role || "student");
      setStatus(data.user.status || "ACTIVE");
    }
  }, [data?.user]);

  const handleSaveChanges = async () => {
    if (!uid) return;

    if (phoneNumber.trim() && !isValidOptionalPhoneNumber(phoneNumber)) {
      toast.error("Validation Failed", { description: PHONE_ERROR_MESSAGES.INVALID });
      return;
    }

    if (alternateEmail.trim() && !isValidEmailFormat(alternateEmail)) {
      toast.error("Validation Failed", { description: "Please enter a valid alternate email address." });
      return;
    }

    try {
      setIsSaving(true);
      const rawUpdates: Record<string, any> = {
        displayName: displayName.trim(),
        department: department.trim(),
        designation: designation.trim(),
        phoneNumber: phoneNumber.trim(),
        phone: phoneNumber.trim(),
        alternateEmail: alternateEmail.trim(),
        programme: programme.trim(),
        year: year.trim(),
        section: section.trim(),
        school: school.trim(),
        role,
        status,
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

      const sanitizedUpdates = sanitizeFirestoreData(rawUpdates);
      await setDoc(doc(db, "users", uid), sanitizedUpdates, { merge: true });
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
  const isFaculty = user.role === "faculty";
  const isStudent = user.role === "student";

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
              <div className="flex items-center gap-3 flex-wrap">
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

          <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap sm:flex-nowrap justify-between sm:justify-end w-full sm:w-auto">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Joined</span>
              <strong className="text-slate-800">
                {safeFormatDate(user.createdAt, "MMM d, yyyy", "N/A")}
              </strong>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">UID</span>
              <strong className="text-slate-800 font-mono">{(user.uid || "").slice(0, 10)}...</strong>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setResetModalOpen(true)}
              className="rounded-xl text-xs font-bold gap-1.5 h-9"
            >
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
              <span>Reset Password</span>
            </Button>

            {isFaculty && (
              <Button
                size="sm"
                onClick={() => setNotifyModalOpen(true)}
                className="bg-[#007A99] hover:bg-[#006883] text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs h-9"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Send Notification</span>
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b pb-1 text-xs overflow-x-auto">
        {[
          { id: "overview", label: "Overview & Credentials", icon: UserIcon },
          { id: "events", label: `Events Organised (${eventsOrganised.length})`, icon: Calendar, visible: isFaculty || user.role === "admin" },
          { id: "registrations", label: `Registrations (${registrations.length})`, icon: Ticket },
          { id: "payments", label: `Payments (${payments.length})`, icon: DollarSign },
        ]
          .filter((t) => t.visible !== false)
          .map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
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
          {/* Institutional & Personal Information Card */}
          <Card className="rounded-3xl border-slate-200 bg-white p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <span>Identity &amp; Institutional Profile</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Full Name *</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="h-10 text-xs rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Mobile Contact Number (10 Digits)</Label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="9876543210"
                    maxLength={10}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Alternate Email</Label>
                  <Input
                    type="email"
                    value={alternateEmail}
                    onChange={(e) => setAlternateEmail(e.target.value)}
                    placeholder="personal.email@gmail.com"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Department / Stream</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="h-10 text-xs rounded-xl">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept} className="text-xs">
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isFaculty && (
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Academic Designation</Label>
                  <Input
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Assistant Professor, Associate Professor"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              )}

              {isStudent && (
                <>
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Student Roll Number</Label>
                    <Input
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. 122411520301"
                      className="h-10 text-xs font-mono uppercase rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="font-bold text-slate-700">Academic Year</Label>
                      <Input
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        placeholder="e.g. 3rd Year"
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-bold text-slate-700">Section</Label>
                      <Input
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        placeholder="e.g. Section A"
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>
                  </div>
                </>
              )}

              {!isStudent && (
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Employee ID</Label>
                  <Input
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                    placeholder="e.g. EMP-CSE-409"
                    className="h-10 text-xs font-mono uppercase rounded-xl"
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

          {/* Account Governance & Security Card */}
          <Card className="rounded-3xl border-slate-200 bg-white p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>System Permissions &amp; Authentication</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between">
                <div>
                  <strong className="block text-slate-800">Verified Institutional Email</strong>
                  <span className="text-[10px] text-slate-500 font-mono">{user.email}</span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>

              {/* Masked Password & Reset Button */}
              <div className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between">
                <div>
                  <strong className="block text-slate-800">Password Security</strong>
                  <span className="text-[11px] text-slate-400 font-mono tracking-widest font-bold">••••••••••••••</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setResetModalOpen(true)}
                  className="rounded-xl text-xs font-bold text-indigo-700 bg-white h-8 gap-1"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Reset Password</span>
                </Button>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between">
                <div>
                  <strong className="block text-slate-800">Campus Account Status</strong>
                  <span className="text-[10px] text-slate-500">Current authorization state</span>
                </div>
                <Badge variant={user.status === "ACTIVE" ? "emerald" : "amber"} className="text-[10px]">
                  {user.status}
                </Badge>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between">
                <div>
                  <strong className="block text-slate-800">Unique Identity UID</strong>
                  <span className="text-[10px] text-slate-400 font-mono">{user.uid}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Events Organised */}
      {activeTab === "events" && (
        <Card className="rounded-3xl border-slate-200 bg-white overflow-hidden shadow-2xs">
          <div className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-b">
            Hosted &amp; Managed Campus Events
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {eventsOrganised.length > 0 ? (
              eventsOrganised.map((ev: any) => (
                <div key={ev.id || Math.random()} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <strong className="text-slate-900 text-sm block">{ev.title || "Untitled Event"}</strong>
                    <span className="text-[10px] text-slate-400">
                      {ev.category || "General"} &bull; {safeFormatDate(ev.startAt, "MMM d, yyyy", "Date TBA")} &bull; Venue: {ev.venueLocation || "Campus"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{ev.status || "DRAFT"}</Badge>
                    <Button asChild size="sm" variant="ghost" className="h-8 rounded-lg text-xs">
                      <Link to={`/events/${ev.id}`}>View</Link>
                    </Button>
                  </div>
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
        <Card className="rounded-3xl border-slate-200 bg-white overflow-hidden shadow-2xs">
          <div className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-b">
            Campus Bookings &amp; Event Passes
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {registrations.length > 0 ? (
              registrations.map((reg: any) => (
                <div key={reg.id || Math.random()} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <strong className="text-slate-900 block">{reg.eventTitle || "Event Booking"}</strong>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Ticket: {reg.ticketCode || "N/A"} &bull; {safeFormatDate(reg.registeredAt || reg.createdAt, "MMM d, yyyy", "Registered")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={reg.checkedIn || reg.status === "ATTENDED" ? "emerald" : "secondary"}
                      className="text-[10px]"
                    >
                      {reg.checkedIn || reg.status === "ATTENDED" ? "Checked In ✓" : reg.status || "CONFIRMED"}
                    </Badge>
                  </div>
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
        <Card className="rounded-3xl border-slate-200 bg-white overflow-hidden shadow-2xs">
          <div className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-b">
            Payment Transactions &amp; Receipts
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {payments.length > 0 ? (
              payments.map((pm: any) => (
                <div key={pm.id || Math.random()} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <strong className="text-slate-900 block font-mono">₹{((pm.amount || 0) / 100).toLocaleString()}</strong>
                    <span className="text-[10px] text-slate-400 font-mono">Order: {pm.orderId || "N/A"}</span>
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

      {/* Send Faculty Notification Modal */}
      {isFaculty && (
        <SendFacultyNotificationModal
          open={notifyModalOpen}
          onOpenChange={setNotifyModalOpen}
          faculty={{
            uid: user.uid,
            name: user.displayName || "Faculty Member",
            email: user.email,
            department: user.department,
            employeeId: user.employeeId,
          }}
        />
      )}

      {/* Reset Password Modal */}
      <ResetPasswordModal
        open={resetModalOpen}
        onOpenChange={setResetModalOpen}
        user={user}
      />
    </div>
  );
};
export default AdminUserProfilePage;
