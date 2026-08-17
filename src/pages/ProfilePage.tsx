import React, { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
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
  Edit2,
  GraduationCap,
  HeartHandshake,
  User as UserIcon,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Save,
  Loader2,
} from "lucide-react";
import {
  BTECH_PROGRAMMES,
  BTECH_ACADEMIC_YEARS,
  normalizeBTechDepartment,
} from "@/config/departments";
import { FACULTY_DESIGNATIONS } from "@/types";
import type { User } from "@/types";
import {
  validateProfileForm,
  sanitizeFirestoreData,
} from "@/lib/validation";

interface ProfileErrors {
  displayName?: string;
  phoneNumber?: string;
  rollNumber?: string;
  year?: string;
  btechProgramme?: string;
  employeeId?: string;
  designation?: string;
  personalEmail?: string;
  emergencyContactPhone?: string;
}

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
  const [errors, setErrors] = useState<ProfileErrors>({});

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

  const clearError = (field: keyof ProfileErrors) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Sync profile values into form when opened
  const handleOpenEdit = () => {
    setErrors({});
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

    // 1. Centralized Form-First Validation
    const validationResult = validateProfileForm({
      displayName,
      phoneNumber,
      role: role || "student",
      rollNumber,
      year,
      btechProgramme,
      personalEmail,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      employeeId,
      designation,
      department: btechProgramme,
      expertise,
    });

    if (!validationResult.valid) {
      setErrors(validationResult.errors as ProfileErrors);
      return;
    }

    try {
      setIsSaving(true);
      let updatesPayload: Partial<User> = {};

      if (role === "student") {
        const validProgramme = normalizeBTechDepartment(
          btechProgramme.trim(),
          "B.Tech. Computer Science and Engineering"
        );

        updatesPayload = {
          displayName: displayName.trim(),
          phoneNumber: phoneNumber.trim(),
          phone: phoneNumber.trim(),
          personalEmail: personalEmail.trim() || "",
          btechProgramme: validProgramme,
          department: validProgramme,
          rollNumber: rollNumber.trim().toUpperCase(),
          studentId: rollNumber.trim().toUpperCase(),
          year: year.trim() || "1st Year (B.Tech / UG)",
          yearOfStudy: year.trim() || "1st Year (B.Tech / UG)",
          emergencyContactName: emergencyContactName.trim() || "",
          emergencyContactPhone: emergencyContactPhone.trim() || "",
          emergencyContactRelation: emergencyContactRelation.trim() || "",
        };
      } else if (role === "faculty") {
        const validProgramme = normalizeBTechDepartment(
          btechProgramme.trim(),
          "B.Tech. Computer Science and Engineering"
        );

        updatesPayload = {
          displayName: displayName.trim(),
          phoneNumber: phoneNumber.trim(),
          phone: phoneNumber.trim(),
          personalEmail: personalEmail.trim() || "",
          employeeId: employeeId.trim().toUpperCase(),
          facultyId: employeeId.trim().toUpperCase(),
          designation: designation.trim() || "Assistant Professor",
          btechProgramme: validProgramme,
          department: "Department of Computer Science & Engineering",
          expertise: expertise.trim() || "",
        };
      } else {
        // Admin
        updatesPayload = {
          displayName: displayName.trim(),
          phoneNumber: phoneNumber.trim(),
          phone: phoneNumber.trim(),
        };
      }

      // 2. Sanitize payload
      const sanitizedPayload = sanitizeFirestoreData(updatesPayload);

      await updateUserProfile(sanitizedPayload);
      setIsEditDialogOpen(false);
      setErrors({});
    } catch (err: any) {
      console.error("[ProfilePage] Profile update error:", err);
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title="Institutional Profile"
        description="Manage your official Apollo University School of Technology records, credentials, and contact details."
      >
        <Button
          onClick={handleOpenEdit}
          className="rounded-xl text-xs bg-[#004D61] hover:bg-[#003847] text-white font-bold gap-2 cursor-pointer shadow-xs"
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>Edit Profile</span>
        </Button>
      </PageHeader>

      {/* Profile Completeness Alert Banner */}
      {!isProfileComplete && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold">Profile Incomplete</h4>
            <p className="text-xs text-amber-700">
              Please complete your mandatory profile fields (
              {missingProfileFields.join(", ")}) to unlock full event registration and pass generation capabilities.
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleOpenEdit}
            className="ml-auto bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-xl shrink-0"
          >
            Complete Now
          </Button>
        </div>
      )}

      {/* Main Profile Summary Card */}
      <Card className="rounded-3xl border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="bg-gradient-to-r from-[#004D61] to-[#007A99] p-6 sm:p-8 text-white relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-2xl sm:text-3xl font-extrabold shadow-inner">
                {userDisplayName.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">{userDisplayName}</h2>
                  <Badge className="bg-white/20 text-white border-white/30 text-[11px] font-bold uppercase tracking-wider backdrop-blur-xs">
                    {role}
                  </Badge>
                  {status === "ACTIVE" && (
                    <Badge className="bg-emerald-500/30 text-emerald-200 border-emerald-400/40 text-[11px] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Verified</span>
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-cyan-100 flex items-center gap-1.5 font-medium">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{userEmail}</span>
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenEdit}
              className="bg-white/10 hover:bg-white/20 text-white border-white/30 rounded-xl text-xs gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Update Details</span>
            </Button>
          </div>
        </div>

        {/* Profile Details Sections */}
        <CardContent className="p-6 sm:p-8 space-y-8 bg-white">
          {/* SECTION 1: PERSONAL & CONTACT INFORMATION */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-[#007A99]" />
              <span>Personal &amp; Contact Records</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 block">Full Name</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800">{userDisplayName}</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 block">Official Institutional Email</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 break-all">{userEmail}</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 block">Contact Mobile Number</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800">
                  {profile?.phoneNumber || profile?.phone || "Not Provided"}
                </span>
              </div>

              {profile?.personalEmail && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 sm:col-span-2 md:col-span-3">
                  <span className="text-[11px] font-semibold text-slate-400 block">Personal Alternate Email</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 break-all">
                    {profile.personalEmail}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: ACADEMIC / INSTITUTIONAL INFORMATION */}
          {role !== "admin" && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                {role === "student" ? (
                  <>
                    <GraduationCap className="w-4 h-4 text-[#007A99]" />
                    <span>Academic &amp; Programme Details</span>
                  </>
                ) : (
                  <>
                    <Briefcase className="w-4 h-4 text-[#007A99]" />
                    <span>Faculty &amp; Department Credentials</span>
                  </>
                )}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 sm:col-span-2">
                  <span className="text-[11px] font-semibold text-slate-400 block">B.Tech Programme / Stream</span>
                  <span className="text-xs sm:text-sm font-bold text-[#004D61]">
                    {userBTechProgramme}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 block">School / Faculty</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800">
                    School of Technology (B.Tech)
                  </span>
                </div>

                {role === "student" && (
                  <>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-400 block">Student Roll Number</span>
                      <span className="text-xs sm:text-sm font-bold font-mono text-slate-800">
                        {userRollNumber || "Not Configured"}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-400 block">Year of Study</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-800">
                        {profile?.year || (profile as any)?.yearOfStudy || "Not Configured"}
                      </span>
                    </div>
                  </>
                )}

                {role === "faculty" && (
                  <>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-400 block">Faculty / Employee ID</span>
                      <span className="text-xs sm:text-sm font-bold font-mono text-slate-800">
                        {userEmployeeId || "Not Configured"}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-400 block">Academic Designation</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-800">
                        {profile?.designation || "Assistant Professor"}
                      </span>
                    </div>

                    {profile?.expertise && (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 sm:col-span-2 md:col-span-3">
                        <span className="text-[11px] font-semibold text-slate-400 block">Research Expertise</span>
                        <span className="text-xs sm:text-sm font-bold text-slate-800">
                          {profile.expertise}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* SECTION 3: STUDENT EMERGENCY CONTACT */}
          {role === "student" && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-rose-500" />
                <span>Emergency Contact Records</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 block">Contact Name</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800">
                    {profile?.emergencyContactName || "Not Configured"}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 block">Contact Phone</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800">
                    {profile?.emergencyContactPhone || "Not Configured"}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 block">Relationship</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800">
                    {profile?.emergencyContactRelation || "Not Configured"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* EDIT INSTITUTIONAL PROFILE MODAL */}
      {/* ========================================================================= */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveProfile} className="space-y-6" noValidate>
            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900">
                {role === "admin" ? "Edit Profile" : "Edit Institutional Profile"}
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
                      onChange={(e) => {
                        setDisplayName(e.target.value);
                        clearError("displayName");
                      }}
                      placeholder="e.g. Rahul Sharma"
                      className={`h-9 text-xs rounded-xl ${
                        errors.displayName ? "border-rose-400 ring-2 ring-rose-100" : ""
                      }`}
                    />
                    {errors.displayName && (
                      <p className="text-[11px] text-rose-600 font-medium">{errors.displayName}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Mobile Contact Number *</Label>
                    <Input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        clearError("phoneNumber");
                      }}
                      placeholder="e.g. 9876543210"
                      className={`h-9 text-xs rounded-xl ${
                        errors.phoneNumber ? "border-rose-400 ring-2 ring-rose-100" : ""
                      }`}
                    />
                    {errors.phoneNumber && (
                      <p className="text-[11px] text-rose-600 font-medium">{errors.phoneNumber}</p>
                    )}
                  </div>

                  {role !== "admin" && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs font-bold text-slate-700">Personal Alternate Email (Optional)</Label>
                      <Input
                        type="email"
                        value={personalEmail}
                        onChange={(e) => {
                          setPersonalEmail(e.target.value);
                          clearError("personalEmail");
                        }}
                        placeholder="e.g. personal@gmail.com"
                        className={`h-9 text-xs rounded-xl ${
                          errors.personalEmail ? "border-rose-400 ring-2 ring-rose-100" : ""
                        }`}
                      />
                      {errors.personalEmail && (
                        <p className="text-[11px] text-rose-600 font-medium">{errors.personalEmail}</p>
                      )}
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
                        onChange={(e) => {
                          setRollNumber(e.target.value);
                          clearError("rollNumber");
                        }}
                        placeholder="e.g. 21BCE10234"
                        className={`h-9 text-xs font-mono rounded-xl ${
                          errors.rollNumber ? "border-rose-400 ring-2 ring-rose-100" : ""
                        }`}
                      />
                      {errors.rollNumber && (
                        <p className="text-[11px] text-rose-600 font-medium">{errors.rollNumber}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Year of Study *</Label>
                      <Select
                        value={year}
                        onValueChange={(val) => {
                          setYear(val);
                          clearError("year");
                        }}
                      >
                        <SelectTrigger
                          className={`h-9 text-xs bg-white rounded-xl ${
                            errors.year ? "border-rose-400 ring-2 ring-rose-100" : ""
                          }`}
                        >
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
                      {errors.year && (
                        <p className="text-[11px] text-rose-600 font-medium">{errors.year}</p>
                      )}
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs font-bold text-slate-700">B.Tech Programme *</Label>
                      <Select
                        value={btechProgramme}
                        onValueChange={(val) => {
                          setBtechProgramme(val);
                          clearError("btechProgramme");
                        }}
                      >
                        <SelectTrigger
                          className={`h-9 text-xs bg-white rounded-xl ${
                            errors.btechProgramme ? "border-rose-400 ring-2 ring-rose-100" : ""
                          }`}
                        >
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
                      {errors.btechProgramme && (
                        <p className="text-[11px] text-rose-600 font-medium">{errors.btechProgramme}</p>
                      )}
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
                        onChange={(e) => {
                          setEmployeeId(e.target.value);
                          clearError("employeeId");
                        }}
                        placeholder="e.g. EMP-CSE-409"
                        className={`h-9 text-xs font-mono rounded-xl ${
                          errors.employeeId ? "border-rose-400 ring-2 ring-rose-100" : ""
                        }`}
                      />
                      {errors.employeeId && (
                        <p className="text-[11px] text-rose-600 font-medium">{errors.employeeId}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Designation *</Label>
                      <Select
                        value={designation}
                        onValueChange={(val) => {
                          setDesignation(val);
                          clearError("designation");
                        }}
                      >
                        <SelectTrigger
                          className={`h-9 text-xs bg-white rounded-xl ${
                            errors.designation ? "border-rose-400 ring-2 ring-rose-100" : ""
                          }`}
                        >
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
                      {errors.designation && (
                        <p className="text-[11px] text-rose-600 font-medium">{errors.designation}</p>
                      )}
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs font-bold text-slate-700">B.Tech Programme *</Label>
                      <Select
                        value={btechProgramme}
                        onValueChange={(val) => {
                          setBtechProgramme(val);
                          clearError("btechProgramme");
                        }}
                      >
                        <SelectTrigger
                          className={`h-9 text-xs bg-white rounded-xl ${
                            errors.btechProgramme ? "border-rose-400 ring-2 ring-rose-100" : ""
                          }`}
                        >
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
                      {errors.btechProgramme && (
                        <p className="text-[11px] text-rose-600 font-medium">{errors.btechProgramme}</p>
                      )}
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
                        onChange={(e) => {
                          setEmergencyContactPhone(e.target.value);
                          clearError("emergencyContactPhone");
                        }}
                        placeholder="e.g. 9123456780"
                        className={`h-9 text-xs rounded-xl ${
                          errors.emergencyContactPhone ? "border-rose-400 ring-2 ring-rose-100" : ""
                        }`}
                      />
                      {errors.emergencyContactPhone && (
                        <p className="text-[11px] text-rose-600 font-medium">{errors.emergencyContactPhone}</p>
                      )}
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
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setErrors({});
                }}
                className="rounded-xl text-xs h-9 cursor-pointer"
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
