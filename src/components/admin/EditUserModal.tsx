import React, { useState, useEffect } from "react";
import { User, UserRole, UserStatus, DEPARTMENTS } from "@/types";
import { useAdminEditUser } from "@/lib/queries/adminUsers";
import { isValidOptionalPhoneNumber, isValidEmailFormat, PHONE_ERROR_MESSAGES } from "@/lib/validation";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, UserCog } from "lucide-react";

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  open,
  onOpenChange,
  user,
}) => {
  const editUserMutation = useAdminEditUser();

  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [alternateEmail, setAlternateEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [programme, setProgramme] = useState("");
  const [year, setYear] = useState("");
  const [section, setSection] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [designation, setDesignation] = useState("");
  const [school, setSchool] = useState("School of Technology");
  const [role, setRole] = useState<UserRole>("student");
  const [status, setStatus] = useState<UserStatus>("ACTIVE");

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setPhoneNumber(user.phoneNumber || user.phone || "");
      setAlternateEmail((user as any).alternateEmail || (user as any).personalEmail || "");
      setDepartment(user.department || "Computer Science and Engineering");
      setProgramme((user as any).programme || "");
      setYear((user as any).year || "");
      setSection((user as any).section || "");
      setRollNumber(user.rollNumber || (user as any).studentId || "");
      setEmployeeId(user.employeeId || (user as any).facultyId || "");
      setDesignation(user.designation || "");
      setSchool((user as any).school || "School of Technology");
      setRole(user.role || "student");
      setStatus(user.status || "ACTIVE");
      setErrors({});
    }
  }, [user]);

  if (!user) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!displayName.trim()) {
      errs.displayName = "Full name is required.";
    }

    if (phoneNumber.trim() && !isValidOptionalPhoneNumber(phoneNumber.trim())) {
      errs.phoneNumber = PHONE_ERROR_MESSAGES.INVALID;
    }

    if (alternateEmail.trim() && !isValidEmailFormat(alternateEmail.trim())) {
      errs.alternateEmail = "Please enter a valid alternate email address.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await editUserMutation.mutateAsync({
        uid: user.uid,
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim(),
        alternateEmail: alternateEmail.trim(),
        department: department.trim(),
        programme: programme.trim(),
        year: year.trim(),
        section: section.trim(),
        rollNumber: rollNumber.trim(),
        employeeId: employeeId.trim(),
        designation: designation.trim(),
        school: school.trim(),
        role,
        status,
      });
      onOpenChange(false);
    } catch {
      // Error handled by mutation toast
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl p-6 bg-white border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-slate-900 tracking-tight">
                Edit User Identity Record
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-mono">
                {user.email} &bull; UID: {user.uid.slice(0, 10)}...
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-3 text-xs">
          {/* Section: Personal Details */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Personal Information
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold text-slate-700">Full Name *</Label>
                <Input
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (errors.displayName) setErrors((prev) => ({ ...prev, displayName: "" }));
                  }}
                  placeholder="e.g. Rahul Sharma"
                  className={`h-9 text-xs rounded-xl ${errors.displayName ? "border-rose-400 ring-1 ring-rose-300" : ""}`}
                />
                {errors.displayName && (
                  <p className="text-[11px] text-rose-600 font-medium">{errors.displayName}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-slate-700">Mobile Number (10 Digits)</Label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (errors.phoneNumber) setErrors((prev) => ({ ...prev, phoneNumber: "" }));
                  }}
                  placeholder="9876543210"
                  maxLength={10}
                  className={`h-9 text-xs rounded-xl ${errors.phoneNumber ? "border-rose-400 ring-1 ring-rose-300" : ""}`}
                />
                {errors.phoneNumber && (
                  <p className="text-[11px] text-rose-600 font-medium">{errors.phoneNumber}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-bold text-slate-700">Alternate / Personal Email</Label>
              <Input
                type="email"
                value={alternateEmail}
                onChange={(e) => {
                  setAlternateEmail(e.target.value);
                  if (errors.alternateEmail) setErrors((prev) => ({ ...prev, alternateEmail: "" }));
                }}
                placeholder="e.g. rahul.personal@gmail.com"
                className={`h-9 text-xs rounded-xl ${errors.alternateEmail ? "border-rose-400 ring-1 ring-rose-300" : ""}`}
              />
              {errors.alternateEmail && (
                <p className="text-[11px] text-rose-600 font-medium">{errors.alternateEmail}</p>
              )}
            </div>
          </div>

          {/* Section: Academic / Institutional Details */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Academic &amp; Institutional Profile
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold text-slate-700">Department / Stream</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-white">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d} className="text-xs">
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-slate-700">School</Label>
                <Input
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="School of Technology"
                  className="h-9 text-xs rounded-xl bg-white"
                />
              </div>
            </div>

            {role === "student" ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold text-slate-700">Roll Number</Label>
                  <Input
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                    placeholder="122411520301"
                    className="h-9 text-xs rounded-xl font-mono uppercase bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-slate-700">Year of Study</Label>
                  <Input
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="e.g. 3rd Year"
                    className="h-9 text-xs rounded-xl bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-slate-700">Section</Label>
                  <Input
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="e.g. Section A"
                    className="h-9 text-xs rounded-xl bg-white"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold text-slate-700">Employee ID</Label>
                  <Input
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                    placeholder="EMP-CSE-102"
                    className="h-9 text-xs rounded-xl font-mono uppercase bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-slate-700">Academic Designation</Label>
                  <Input
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="Assistant Professor"
                    className="h-9 text-xs rounded-xl bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section: Authorization & Status */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Role &amp; Account Governance
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold text-slate-700">User Role</Label>
                <Select value={role} onValueChange={(val) => setRole(val as UserRole)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-white font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="faculty">Faculty</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-slate-700">Account Status</Label>
                <Select value={status} onValueChange={(val) => setStatus(val as UserStatus)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-white font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PENDING">Pending Approval</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    <SelectItem value="REJECTED">Rejected / Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={editUserMutation.isPending}
              className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 gap-1.5 shadow-xs"
            >
              {editUserMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Updates...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
