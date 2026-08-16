import React, { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import {
  Mail,
  Building2,
  ShieldCheck,
  Phone,
  Hash,
  Edit2,
  GraduationCap,
  HeartHandshake,
  User as UserIcon,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Save,
  Loader2,
  BookOpen,
} from "lucide-react";
import {
  BTECH_PROGRAMMES,
  BTECH_ACADEMIC_YEARS,
  normalizeBTechDepartment,
} from "@/config/departments";
import { FACULTY_DESIGNATIONS } from "@/types";
import type { User } from "@/types";
import { toast } from "sonner";

export const ProfilePage: React.FC = () => {
  const {
    profile,
    firebaseUser,
    role,
    status,
    updateUserProfile,
    isProfileComplete,
    missingProfileFields,
  } = useAuth();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State for Profile Editing
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [btechProgramme, setBtechProgramme] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [year, setYear] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [designation, setDesignation] = useState("");
  const [expertise, setExpertise] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [emergencyContactRelation, setEmergencyContactRelation] = useState("");

  // Sync profile values into form when opened
  const handleOpenEdit = () => {
    if (profile) {
      setDisplayName(profile.displayName || firebaseUser?.displayName || "");
      setPhoneNumber(profile.phoneNumber || profile.phone || "");
      setPersonalEmail(profile.personalEmail || (profile as any).alternateEmail || "");

      const currentProg = profile.btechProgramme || profile.department;
      setBtechProgramme(
        normalizeBTechDepartment(currentProg, "B.Tech. Computer Science and Engineering")
      );

      setRollNumber(profile.rollNumber || profile.studentId || "");
      setYear(profile.year || (profile as any).yearOfStudy || "3rd Year (B.Tech / UG)");
      setEmployeeId(profile.employeeId || profile.facultyId || "");
      setDesignation(profile.designation || "Assistant Professor");
      setExpertise(profile.expertise || "");
      setEmergencyContactName(profile.emergencyContactName || "");
      setEmergencyContactPhone(profile.emergencyContactPhone || "");
      setEmergencyContactRelation(profile.emergencyContactRelation || "");
    }
    setIsEditDialogOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      toast.error("Full Name Required", { description: "Please enter your full name." });
      return;
    }
    if (!phoneNumber.trim()) {
      toast.error("Contact Number Required", {
        description: "Please provide a valid contact number for campus notifications.",
      });
      return;
    }

    try {
      setIsSaving(true);
      let updatesPayload: Partial<User> = {};

      if (role === "student") {
        if (!rollNumber.trim()) {
          toast.error("Roll Number Required", {
            description: "Please enter your B.Tech student roll number.",
          });
          setIsSaving(false);
          return;
        }

        const validProgramme = normalizeBTechDepartment(
          btechProgramme,
          "B.Tech. Computer Science and Engineering"
        );

        updatesPayload = {
          displayName: displayName.trim(),
          phoneNumber: phoneNumber.trim(),
          phone: phoneNumber.trim(),
          personalEmail: personalEmail.trim() || undefined,
          btechProgramme: validProgramme,
          department: validProgramme,
          rollNumber: rollNumber.trim().toUpperCase(),
          studentId: rollNumber.trim().toUpperCase(),
          year: year.trim() || "1st Year (B.Tech / UG)",
          yearOfStudy: year.trim() || "1st Year (B.Tech / UG)",
          emergencyContactName: emergencyContactName.trim() || undefined,
          emergencyContactPhone: emergencyContactPhone.trim() || undefined,
          emergencyContactRelation: emergencyContactRelation.trim() || undefined,
        };
      } else if (role === "faculty") {
        if (!employeeId.trim()) {
          toast.error("Employee ID Required", {
            description: "Please enter your official faculty / employee ID.",
          });
          setIsSaving(false);
          return;
        }

        const validProgramme = normalizeBTechDepartment(
          btechProgramme,
          "B.Tech. Computer Science and Engineering"
        );

        updatesPayload = {
          displayName: displayName.trim(),
          phoneNumber: phoneNumber.trim(),
          phone: phoneNumber.trim(),
          personalEmail: personalEmail.trim() || undefined,
          btechProgramme: validProgramme,
          department: validProgramme,
          employeeId: employeeId.trim().toUpperCase(),
          facultyId: employeeId.trim().toUpperCase(),
          designation: designation.trim() || "Assistant Professor",
          expertise: expertise.trim() || undefined,
        };
      } else {
        // Admin Profile - Strict personal/account information only
        updatesPayload = {
          displayName: displayName.trim(),
          phoneNumber: phoneNumber.trim(),
          phone: phoneNumber.trim(),
        };
      }

      await updateUserProfile(updatesPayload);
      setIsEditDialogOpen(false);
    } catch {
      // Toast error handled by updateUserProfile
    } finally {
      setIsSaving(false);
    }
  };

  const userDisplayName = profile?.displayName || firebaseUser?.displayName || "Campus Member";
  const userEmail = profile?.email || firebaseUser?.email || "";
  const userBTechProgramme = normalizeBTechDepartment(
    profile?.btechProgramme || profile?.department,
    "B.Tech. Computer Science and Engineering"
  );
  const userRollNumber = profile?.rollNumber || profile?.studentId;
  const userEmployeeId = profile?.employeeId || profile?.facultyId;
  const userPhone = profile?.phoneNumber || profile?.phone || "Not provided";
  const userPersonalEmail = profile?.personalEmail || (profile as any)?.alternateEmail || "Not provided";
  const userSso =
    profile?.ssoProvider ||
    (firebaseUser?.providerData?.[0]?.providerId === "microsoft.com"
      ? "Microsoft Entra ID"
      : "Apollo SSO Provider");

  return (
    <div>
      <PageHeader
        title="My Campus Profile"
        description="View and manage your Apollo University B.Tech Event Hub profile details and credentials."
        badge={{ text: role ? role.toUpperCase() : "STUDENT", variant: "indigo" }}
        actions={
          <Button
            onClick={handleOpenEdit}
            size="sm"
            className="rounded-xl text-xs bg-[#004D61] hover:bg-[#003847] text-white font-bold gap-1.5 h-9 shadow-2xs cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{role === "admin" ? "Edit Profile" : "Edit Institutional Profile"}</span>
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-16">
        {/* Profile Completeness Alert if Incomplete */}
        {!isProfileComplete && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <strong className="text-xs font-bold text-amber-900 block">Profile Information Incomplete</strong>
                <span className="text-[11px] text-amber-700">
                  Please complete the following required fields to enable instant event bookings:{" "}
                  <strong>{missingProfileFields.join(", ")}</strong>
                </span>
              </div>
            </div>
            <Button
              onClick={handleOpenEdit}
              size="sm"
              variant="outline"
              className="rounded-xl text-xs border-amber-300 bg-white hover:bg-amber-100 text-amber-900 font-bold shrink-0"
            >
              Complete Now
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Identity Summary Card */}
          <Card className="border-slate-200 shadow-2xs bg-white rounded-3xl overflow-hidden">
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 rounded-2xl bg-[#004D61] text-white flex items-center justify-center mx-auto mb-2 text-2xl font-bold shadow-md">
                {userDisplayName
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase()}
              </div>
              <CardTitle className="text-lg font-bold text-slate-900">{userDisplayName}</CardTitle>
              <CardDescription className="text-xs font-mono">{userEmail}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2 text-xs border-t">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Account Status</span>
                <Badge variant={status === "ACTIVE" ? "emerald" : "amber"}>{status || "ACTIVE"}</Badge>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Institutional Role</span>
                <Badge variant="indigo" className="capitalize font-bold">{role || "student"}</Badge>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">SSO Provider</span>
                <span className="font-semibold text-slate-800 text-[11px]">{userSso}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Profile Status</span>
                {isProfileComplete ? (
                  <Badge variant="emerald" className="gap-1 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified &amp; Complete</span>
                  </Badge>
                ) : (
                  <Badge variant="amber" className="text-[10px]">
                    Action Required
                  </Badge>
                )}
              </div>
              <div className="pt-3 border-t">
                <Button
                  onClick={handleOpenEdit}
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl text-xs gap-1.5 h-8 font-semibold"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Update Profile</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Role-Specific Credentials & Details Card */}
          <Card className="border-slate-200 shadow-2xs md:col-span-2 bg-white space-y-4 rounded-3xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-slate-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  {role === "faculty"
                    ? "Verified Faculty & Institutional Credentials"
                    : role === "admin"
                    ? "Administrative Console Permissions"
                    : "Verified Academic Credentials"}
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                {role === "admin"
                  ? "Official administrative console record for university governance and event oversight."
                  : "Official records synchronized with Microsoft Entra ID and the B.Tech campus registry."}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. STUDENT CREDENTIALS */}
                {role === "student" && (
                  <>
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 sm:col-span-2">
                      <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                        <BookOpen className="w-3.5 h-3.5 text-[#007A99]" />
                        <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                          B.Tech Programme / Stream
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 text-sm">{userBTechProgramme}</div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                        <Hash className="w-3.5 h-3.5 text-[#007A99]" />
                        <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                          Student Roll Number
                        </span>
                      </div>
                      <div className="font-mono font-bold text-slate-900">
                        {userRollNumber || <span className="text-amber-600 font-normal italic">Not provided</span>}
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                        <GraduationCap className="w-3.5 h-3.5 text-[#007A99]" />
                        <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                          Year of Study
                        </span>
                      </div>
                      <div className="font-bold text-slate-900">
                        {profile?.year || (profile as any)?.yearOfStudy || "3rd Year (B.Tech / UG)"}
                      </div>
                    </div>
                  </>
                )}

                {/* 2. FACULTY CREDENTIALS */}
                {role === "faculty" && (
                  <>
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 sm:col-span-2">
                      <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                        <Building2 className="w-3.5 h-3.5 text-[#007A99]" />
                        <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                          B.Tech Department / Programme
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 text-sm">{userBTechProgramme}</div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                        <Hash className="w-3.5 h-3.5 text-[#007A99]" />
                        <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                          Faculty / Employee ID
                        </span>
                      </div>
                      <div className="font-mono font-bold text-slate-900">
                        {userEmployeeId || <span className="text-amber-600 font-normal italic">Not provided</span>}
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                        <Briefcase className="w-3.5 h-3.5 text-[#007A99]" />
                        <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                          Academic Designation
                        </span>
                      </div>
                      <div className="font-bold text-slate-900">
                        {profile?.designation || "Assistant Professor"}
                      </div>
                    </div>

                    {profile?.expertise && (
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 sm:col-span-2">
                        <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                          <BookOpen className="w-3.5 h-3.5 text-[#007A99]" />
                          <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                            Area of Expertise / Research
                          </span>
                        </div>
                        <div className="text-slate-800 font-medium">{profile.expertise}</div>
                      </div>
                    )}
                  </>
                )}

                {/* 3. ADMIN CREDENTIALS */}
                {role === "admin" && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 sm:col-span-2">
                    <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                        Administrative Authority
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm">
                      {profile?.adminRole || "System Administrator • Full Platform Oversight"}
                    </div>
                  </div>
                )}

                {/* Common Contact Fields */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                    <Phone className="w-3.5 h-3.5 text-[#007A99]" />
                    <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                      Mobile Contact
                    </span>
                  </div>
                  <div className="font-semibold text-slate-900">{userPhone}</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                    <Mail className="w-3.5 h-3.5 text-[#007A99]" />
                    <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                      Official University Email
                    </span>
                  </div>
                  <div className="font-semibold text-slate-900 truncate font-mono text-[11px]">{userEmail}</div>
                </div>

                {role !== "admin" && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 sm:col-span-2">
                    <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                      <Mail className="w-3.5 h-3.5 text-[#007A99]" />
                      <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                        Personal Alternate Email
                      </span>
                    </div>
                    <div className="font-semibold text-slate-900">{userPersonalEmail}</div>
                  </div>
                )}

                {role === "student" && profile?.emergencyContactName && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 sm:col-span-2">
                    <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                      <HeartHandshake className="w-3.5 h-3.5 text-rose-500" />
                      <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                        Emergency Contact Dossier
                      </span>
                    </div>
                    <div className="font-medium text-slate-800">
                      {profile.emergencyContactName}{" "}
                      {profile.emergencyContactRelation ? `(${profile.emergencyContactRelation})` : ""} &bull;{" "}
                      <span className="font-mono font-bold text-slate-900">
                        {profile.emergencyContactPhone || "No phone on file"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Role-Aware Edit Profile Dialog Modal */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white border border-slate-200 shadow-2xl">
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <DialogHeader className="border-b pb-3 text-left">
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#007A99]" />
                <span>{role === "admin" ? "Edit Profile" : "Edit Institutional Profile"}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {role === "student"
                  ? "Update your verified personal, academic, and emergency contact records."
                  : role === "faculty"
                  ? "Update your verified faculty credentials and department contact information."
                  : "Update your administrator contact details and profile name."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              {/* SECTION 1: PERSONAL INFORMATION (ALL ROLES) */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-[#007A99]" /> Personal Information
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Full Name *</Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      required
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Mobile Contact Number *</Label>
                    <Input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 9876543210"
                      required
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>

                  {role !== "admin" && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs font-bold text-slate-700">Personal Alternate Email</Label>
                      <Input
                        type="email"
                        value={personalEmail}
                        onChange={(e) => setPersonalEmail(e.target.value)}
                        placeholder="e.g. personal@gmail.com"
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                  )}

                  {role === "admin" && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs font-bold text-slate-700">Official Email</Label>
                      <Input
                        type="email"
                        value={userEmail}
                        disabled
                        className="h-9 text-xs rounded-xl bg-slate-100 font-mono text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 2: STUDENT ACADEMIC INFORMATION */}
              {role === "student" && (
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-[#007A99]" /> Academic Information
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Student Roll Number *</Label>
                      <Input
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        placeholder="e.g. 21BCE10234"
                        required
                        className="h-9 text-xs font-mono rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Year of Study *</Label>
                      <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="h-9 text-xs bg-white rounded-xl">
                          <SelectValue placeholder="Select Year of Study" />
                        </SelectTrigger>
                        <SelectContent>
                          {BTECH_ACADEMIC_YEARS.map((yr) => (
                            <SelectItem key={yr} value={yr} className="text-xs">
                              {yr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs font-bold text-slate-700">B.Tech Programme *</Label>
                      <Select value={btechProgramme} onValueChange={setBtechProgramme}>
                        <SelectTrigger className="h-9 text-xs bg-white rounded-xl">
                          <SelectValue placeholder="Select B.Tech Programme" />
                        </SelectTrigger>
                        <SelectContent>
                          {BTECH_PROGRAMMES.map((prog) => (
                            <SelectItem key={prog} value={prog} className="text-xs">
                              {prog}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2: FACULTY INSTITUTIONAL INFORMATION */}
              {role === "faculty" && (
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#007A99]" /> Institutional Information
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Faculty / Employee ID *</Label>
                      <Input
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        placeholder="e.g. EMP-CSE-409"
                        required
                        className="h-9 text-xs font-mono rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Designation *</Label>
                      <Select value={designation} onValueChange={setDesignation}>
                        <SelectTrigger className="h-9 text-xs bg-white rounded-xl">
                          <SelectValue placeholder="Select Designation" />
                        </SelectTrigger>
                        <SelectContent>
                          {FACULTY_DESIGNATIONS.map((desig) => (
                            <SelectItem key={desig} value={desig} className="text-xs">
                              {desig}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs font-bold text-slate-700">B.Tech Programme *</Label>
                      <Select value={btechProgramme} onValueChange={setBtechProgramme}>
                        <SelectTrigger className="h-9 text-xs bg-white rounded-xl">
                          <SelectValue placeholder="Select B.Tech Programme" />
                        </SelectTrigger>
                        <SelectContent>
                          {BTECH_PROGRAMMES.map((prog) => (
                            <SelectItem key={prog} value={prog} className="text-xs">
                              {prog}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs font-bold text-slate-700">Area of Expertise / Research (Optional)</Label>
                      <Input
                        value={expertise}
                        onChange={(e) => setExpertise(e.target.value)}
                        placeholder="e.g. Distributed Systems, Machine Learning"
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: STUDENT EMERGENCY CONTACT (OPTIONAL) */}
              {role === "student" && (
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <HeartHandshake className="w-3.5 h-3.5 text-rose-500" /> Emergency Contact (Optional)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Contact Name</Label>
                      <Input
                        value={emergencyContactName}
                        onChange={(e) => setEmergencyContactName(e.target.value)}
                        placeholder="e.g. Parent / Guardian"
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Contact Phone</Label>
                      <Input
                        type="tel"
                        value={emergencyContactPhone}
                        onChange={(e) => setEmergencyContactPhone(e.target.value)}
                        placeholder="e.g. 9123456780"
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Relationship</Label>
                      <Input
                        value={emergencyContactRelation}
                        onChange={(e) => setEmergencyContactRelation(e.target.value)}
                        placeholder="e.g. Mother / Father"
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2 border-t flex items-center justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="rounded-xl text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="rounded-xl text-xs bg-[#004D61] hover:bg-[#003847] text-white font-bold gap-1.5 h-9 shadow-2xs cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{role === "admin" ? "Save Profile" : "Save Institutional Profile"}</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
