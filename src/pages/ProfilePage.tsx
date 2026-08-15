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
} from "lucide-react";
import { DEPARTMENTS, ACADEMIC_YEARS, ACADEMIC_SECTIONS, FACULTY_DESIGNATIONS } from "@/types";
import { toast } from "sonner";

export const ProfilePage: React.FC = () => {
  const { profile, firebaseUser, role, status, updateUserProfile, isProfileComplete, missingProfileFields } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State for Profile Editing
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [school, setSchool] = useState("");
  const [programme, setProgramme] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [section, setSection] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [designation, setDesignation] = useState("");
  const [expertise, setExpertise] = useState("");
  const [officeLocation, setOfficeLocation] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [emergencyContactRelation, setEmergencyContactRelation] = useState("");

  // Sync profile values into form when opened
  const handleOpenEdit = () => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setPhoneNumber(profile.phoneNumber || profile.phone || "");
      setPersonalEmail(profile.personalEmail || "");
      setDepartment(profile.department || "School of Technology");
      setSchool(profile.school || "School of Technology");
      setProgramme(profile.programme || "B.Tech. Computer Science & Engineering");
      setYear(profile.year || "3rd Year (B.Tech / UG)");
      setSemester(profile.semester || "Semester 5");
      setSection(profile.section || "Section A");
      setRollNumber(profile.rollNumber || profile.studentId || "");
      setEmployeeId(profile.employeeId || profile.facultyId || "");
      setDesignation(profile.designation || "Assistant Professor");
      setExpertise(profile.expertise || "");
      setOfficeLocation(profile.officeLocation || "");
      setAddress(profile.address || "");
      setEmergencyContactName(profile.emergencyContactName || "");
      setEmergencyContactPhone(profile.emergencyContactPhone || "");
      setEmergencyContactRelation(profile.emergencyContactRelation || "");
    }
    setIsEditDialogOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("Name is required", { description: "Please enter your full name." });
      return;
    }
    if (!phoneNumber.trim()) {
      toast.error("Contact number required", { description: "Please provide a valid phone number for SMS and event notifications." });
      return;
    }

    try {
      setIsSaving(true);
      await updateUserProfile({
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim(),
        phone: phoneNumber.trim(),
        personalEmail: personalEmail.trim(),
        department: department.trim(),
        school: school.trim(),
        programme: programme.trim(),
        year: year.trim(),
        semester: semester.trim(),
        section: section.trim(),
        rollNumber: rollNumber.trim() ? rollNumber.trim().toUpperCase() : undefined,
        studentId: rollNumber.trim() ? rollNumber.trim().toUpperCase() : undefined,
        employeeId: employeeId.trim() ? employeeId.trim().toUpperCase() : undefined,
        facultyId: employeeId.trim() ? employeeId.trim().toUpperCase() : undefined,
        designation: designation.trim(),
        expertise: expertise.trim(),
        officeLocation: officeLocation.trim(),
        address: address.trim(),
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
        emergencyContactRelation: emergencyContactRelation.trim(),
      });
      toast.success("Profile Updated Successfully", {
        description: "Your institutional details have been saved to the campus registry.",
      });
      setIsEditDialogOpen(false);
    } catch (err: any) {
      toast.error("Failed to update profile", { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const userDisplayName = profile?.displayName || firebaseUser?.displayName || "Campus Member";
  const userEmail = profile?.email || firebaseUser?.email || "";
  const userDepartment = profile?.department || "School of Technology";
  const userRollNumber = profile?.rollNumber || profile?.studentId;
  const userEmployeeId = profile?.employeeId || profile?.facultyId;
  const userPhone = profile?.phoneNumber || profile?.phone || "Not provided";
  const userSso = profile?.ssoProvider || (firebaseUser?.providerData?.[0]?.providerId === "microsoft.com" ? "Microsoft Entra ID" : "Apollo SSO Provider");

  return (
    <div>
      <PageHeader
        title="My Campus Profile"
        description="View and manage your Apollo University institutional profile details and permissions."
        badge={{ text: role ? role.toUpperCase() : "STUDENT", variant: "indigo" }}
        actions={
          <Button
            onClick={handleOpenEdit}
            size="sm"
            className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 h-9 shadow-xs"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Profile Details</span>
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-16">
        {/* Profile Completeness Alert if Incomplete */}
        {!isProfileComplete && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
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
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 rounded-2xl bg-indigo-900 text-white flex items-center justify-center mx-auto mb-2 text-2xl font-bold shadow-md">
                {userDisplayName
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase()}
              </div>
              <CardTitle className="text-lg">{userDisplayName}</CardTitle>
              <CardDescription className="text-xs font-mono">{userEmail}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2 text-xs border-t">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Account Status</span>
                <Badge variant={status === "ACTIVE" ? "emerald" : "amber"}>{status || "ACTIVE"}</Badge>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Institutional Role</span>
                <Badge variant="indigo" className="capitalize">{role || "student"}</Badge>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Profile Status</span>
                {isProfileComplete ? (
                  <Badge variant="emerald" className="gap-1 text-[10px]">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified & Complete</span>
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
                  <span>Update Information</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Academic & Verification Details */}
          <Card className="border-slate-200 shadow-sm md:col-span-2 bg-white space-y-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
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
                Official institutional records synchronized with Microsoft Entra ID and the campus registry.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-slate-500 flex items-center gap-1 mb-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Department / School</span>
                  </div>
                  <div className="font-semibold text-slate-900">{userDepartment}</div>
                </div>

                {role === "student" && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-slate-500 flex items-center gap-1 mb-1">
                      <Hash className="w-3.5 h-3.5" />
                      <span>Student ID / Roll Number</span>
                    </div>
                    <div className="font-mono font-semibold text-slate-900">
                      {userRollNumber || <span className="text-amber-600 font-normal italic">Not provided (Click Edit)</span>}
                    </div>
                  </div>
                )}

                {role === "faculty" && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-slate-500 flex items-center gap-1 mb-1">
                      <Hash className="w-3.5 h-3.5" />
                      <span>Faculty / Employee ID</span>
                    </div>
                    <div className="font-mono font-semibold text-slate-900">
                      {userEmployeeId || <span className="text-amber-600 font-normal italic">Not provided (Click Edit)</span>}
                    </div>
                  </div>
                )}

                {role === "faculty" && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-slate-500 flex items-center gap-1 mb-1">
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Academic Designation</span>
                    </div>
                    <div className="font-semibold text-slate-900">
                      {profile?.designation || "Assistant Professor"}
                    </div>
                  </div>
                )}

                {role === "student" && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-slate-500 flex items-center gap-1 mb-1">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Academic Standing</span>
                    </div>
                    <div className="font-semibold text-slate-900">
                      {profile?.year || "3rd Year (B.Tech / UG)"} &bull; {profile?.section || "Section A"}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-slate-500 flex items-center gap-1 mb-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>Mobile Contact</span>
                  </div>
                  <div className="font-semibold text-slate-900">{userPhone}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-slate-500 flex items-center gap-1 mb-1">
                    <Mail className="w-3.5 h-3.5" />
                    <span>SSO Provider</span>
                  </div>
                  <div className="font-semibold text-slate-900">{userSso}</div>
                </div>

                {role === "student" && profile?.emergencyContactName && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 sm:col-span-2">
                    <div className="text-slate-500 flex items-center gap-1 mb-1">
                      <HeartHandshake className="w-3.5 h-3.5 text-rose-500" />
                      <span>Emergency Contact Dossier</span>
                    </div>
                    <div className="font-medium text-slate-800">
                      {profile.emergencyContactName}{" "}
                      {profile.emergencyContactRelation ? `(${profile.emergencyContactRelation})` : ""} &bull;{" "}
                      <span className="font-mono">{profile.emergencyContactPhone || "No phone on file"}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Profile Dialog Modal */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white border border-slate-200 shadow-2xl">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <DialogHeader className="border-b pb-3 text-left">
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600" />
                <span>Edit Institutional Profile</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Update your verified contact and academic records for Apollo University event records.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <UserIcon className="w-3 h-3 text-slate-400" /> Full Name *
                  </Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. John Doe"
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" /> Mobile Contact Number *
                  </Label>
                  <Input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. 9876543210"
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" /> Personal Alternate Email
                  </Label>
                  <Input
                    type="email"
                    value={personalEmail}
                    onChange={(e) => setPersonalEmail(e.target.value)}
                    placeholder="e.g. student@gmail.com"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" /> Department / School *
                  </Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger className="h-9 text-xs">
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
              </div>

              {/* Role Specific Fields */}
              {role === "student" && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600" /> Academic Information
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Student Roll Number *</Label>
                      <Input
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        placeholder="e.g. 21BCE10234"
                        className="h-9 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Year of Study</Label>
                      <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="h-9 text-xs bg-white">
                          <SelectValue placeholder="Academic Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {ACADEMIC_YEARS.map((yr) => (
                            <SelectItem key={yr} value={yr} className="text-xs">
                              {yr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Section</Label>
                      <Select value={section} onValueChange={setSection}>
                        <SelectTrigger className="h-9 text-xs bg-white">
                          <SelectValue placeholder="Academic Section" />
                        </SelectTrigger>
                        <SelectContent>
                          {ACADEMIC_SECTIONS.map((sec) => (
                            <SelectItem key={sec} value={sec} className="text-xs">
                              {sec}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {role === "faculty" && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-600" /> Faculty Credentials
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Faculty / Employee ID</Label>
                      <Input
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        placeholder="e.g. EMP-CSE-409"
                        className="h-9 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Designation</Label>
                      <Select value={designation} onValueChange={setDesignation}>
                        <SelectTrigger className="h-9 text-xs bg-white">
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
                      <Label className="text-xs font-bold text-slate-700">Area of Expertise / Research</Label>
                      <Input
                        value={expertise}
                        onChange={(e) => setExpertise(e.target.value)}
                        placeholder="e.g. Distributed Systems, Neural Networks"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Emergency Contact */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <HeartHandshake className="w-3.5 h-3.5 text-rose-500" /> Emergency Contact (Optional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Contact Name</Label>
                    <Input
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      placeholder="e.g. Parent / Guardian"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Contact Phone</Label>
                    <Input
                      type="tel"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      placeholder="e.g. 9123456780"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Relationship</Label>
                    <Input
                      value={emergencyContactRelation}
                      onChange={(e) => setEmergencyContactRelation(e.target.value)}
                      placeholder="e.g. Mother / Father"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2 border-t">
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
                className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 h-9"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Institutional Profile</span>
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
