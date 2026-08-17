import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Event, DEPARTMENTS } from "@/types";
import { useAdminManualRegisterStudent } from "@/lib/queries/adminEvents";
import { useAdminUsersDirectory } from "@/lib/queries/adminUsers";
import { UserPlus, Loader2, Search, CheckCircle2 } from "lucide-react";
import { isValidEmail, isValidOptionalPhoneNumber, PHONE_ERROR_MESSAGES } from "@/lib/validation";
import { toast } from "sonner";

interface AdminManualRegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
}

export const AdminManualRegisterModal: React.FC<AdminManualRegisterModalProps> = ({
  open,
  onOpenChange,
  event,
}) => {
  const { data: usersList } = useAdminUsersDirectory();
  const registerMutation = useAdminManualRegisterStudent();

  const [mode, setMode] = useState<"SELECT" | "MANUAL">("SELECT");
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Manual fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [department, setDepartment] = useState("Computer Science and Engineering");
  const [phone, setPhone] = useState("");

  if (!event) return null;

  const filteredStudents = (usersList || [])
    .filter((u) => u.role === "student")
    .filter((u) => {
      if (!userSearch.trim()) return true;
      const q = userSearch.toLowerCase();
      return (
        (u.displayName || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.rollNumber || (u as any).studentId || "").toLowerCase().includes(q)
      );
    })
    .slice(0, 8);

  const handleRegister = async () => {
    let studentUid = "";
    let studentName = "";
    let studentEmail = "";
    let studentRoll = "";
    let studentDept = "";
    let studentPhone = "";

    if (mode === "SELECT") {
      if (!selectedUser) {
        toast.error("Please select a student from the directory.");
        return;
      }
      studentUid = selectedUser.uid;
      studentName = selectedUser.displayName || selectedUser.email;
      studentEmail = selectedUser.email;
      studentRoll = selectedUser.rollNumber || selectedUser.studentId || "";
      studentDept = selectedUser.department || "General";
      studentPhone = selectedUser.phoneNumber || selectedUser.phone || "";
    } else {
      if (!name.trim()) {
        toast.error("Student Name is required.");
        return;
      }
      if (!isValidEmail(email)) {
        toast.error("Please enter a valid university email address.");
        return;
      }
      if (phone.trim() && !isValidOptionalPhoneNumber(phone)) {
        toast.error(PHONE_ERROR_MESSAGES.INVALID);
        return;
      }

      studentUid = `manual-${Date.now()}`;
      studentName = name.trim();
      studentEmail = email.trim();
      studentRoll = rollNumber.trim().toUpperCase();
      studentDept = department;
      studentPhone = phone.trim();
    }

    try {
      await registerMutation.mutateAsync({
        eventId: event.id,
        studentUid,
        studentName,
        studentEmail,
        studentRollNumber: studentRoll,
        studentDepartment: studentDept,
        studentPhone,
      });

      // Reset and close
      setSelectedUser(null);
      setName("");
      setEmail("");
      setRollNumber("");
      setPhone("");
      onOpenChange(false);
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl p-6 bg-white border border-slate-200 shadow-2xl">
        <DialogHeader className="text-left space-y-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Register Student Manually
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Issue a confirmed event pass for <strong>{event.title}</strong>.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Mode Tabs */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode("SELECT")}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              mode === "SELECT" ? "bg-white text-indigo-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Select from Campus Directory
          </button>
          <button
            type="button"
            onClick={() => setMode("MANUAL")}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              mode === "MANUAL" ? "bg-white text-indigo-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Enter Details Manually
          </button>
        </div>

        <div className="space-y-4 py-1 text-xs">
          {mode === "SELECT" ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search student by name, email, roll number..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9 text-xs rounded-xl h-9"
                />
              </div>

              <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((u) => {
                    const isSelected = selectedUser?.uid === u.uid;
                    return (
                      <div
                        key={u.uid}
                        onClick={() => setSelectedUser(u)}
                        className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? "bg-indigo-50/80" : "hover:bg-slate-50"
                        }`}
                      >
                        <div>
                          <strong className="text-slate-900 block text-xs">{u.displayName || "Student"}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {u.email} &bull; {u.rollNumber || (u as any).studentId || "No Roll"}
                          </span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-slate-400">No matching students found.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="font-bold text-slate-700">Full Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="font-bold text-slate-700">Email Address *</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@apollouniversity.edu.in"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-slate-700">Roll Number</Label>
                  <Input
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. 122411520301"
                    className="h-9 text-xs rounded-xl font-mono uppercase"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="font-bold text-slate-700">Department</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue placeholder="Department" />
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
                  <Label className="font-bold text-slate-700">Mobile (10 Digits)</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    maxLength={10}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto rounded-xl text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleRegister}
            disabled={registerMutation.isPending || (mode === "SELECT" && !selectedUser)}
            className="w-full sm:w-auto rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5"
          >
            {registerMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Issue Confirmed Pass</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
