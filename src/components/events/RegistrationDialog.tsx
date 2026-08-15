import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/lib/auth-context";
import { useCreateRegistration } from "@/lib/queries/registrations";
import {
  createRegistrationSchema,
  CreateRegistrationFormValues,
} from "@/lib/schemas/registration";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Event, TeamMember } from "@/types";
import {
  User as UserIcon,
  Mail,
  Building2,
  Hash,
  Phone,
  Users,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Ticket,
} from "lucide-react";

interface RegistrationDialogProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RegistrationDialog: React.FC<RegistrationDialogProps> = ({
  event,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const { firebaseUser, profile } = useAuth();
  const createMutation = useCreateRegistration();

  const [teamMembersList, setTeamMembersList] = useState<TeamMember[]>([]);
  const isTeamEvent = (event.maxTeamSize || 1) > 1;
  const isPaid = Boolean(event.isPaid && event.price > 0);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<CreateRegistrationFormValues>({
    resolver: zodResolver(createRegistrationSchema),
    defaultValues: {
      eventId: event.id,
      contactPhone: profile?.phoneNumber || "",
      teamName: "",
      teamMembers: [],
      answers: {},
      acceptTerms: true,
    },
  });

  const handleAddTeamMember = () => {
    if (teamMembersList.length + 1 < (event.maxTeamSize || 1)) {
      setTeamMembersList((prev) => [...prev, { name: "", email: "", rollNumber: "" }]);
    }
  };

  const handleRemoveTeamMember = (index: number) => {
    setTeamMembersList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTeamMemberChange = (index: number, field: keyof TeamMember, value: string) => {
    setTeamMembersList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const onSubmit = async (data: CreateRegistrationFormValues) => {
    try {
      const payload = {
        ...data,
        eventId: event.id,
        teamMembers: isTeamEvent ? teamMembersList : undefined,
      };

      const result = await createMutation.mutateAsync(payload);
      reset();
      onClose();

      if (result.requiresPayment) {
        navigate(`/checkout/${result.registrationId}`);
      } else if (onSuccess) {
        onSuccess();
      }
    } catch {
      // Error handled by mutation toast
    }
  };

  const displayName = profile?.displayName || firebaseUser?.displayName || "Campus Scholar";
  const userEmail = profile?.email || firebaseUser?.email || "";
  const department = profile?.department || "General Administration";
  const rollNumber = profile?.rollNumber || "Not on file";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-slate-200 shadow-2xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Header Summary */}
          <DialogHeader className="p-6 border-b bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 text-white rounded-t-2xl">
            <div className="flex items-center justify-between gap-2 mb-1">
              <Badge variant="indigo" className="bg-white/20 text-white border-none text-[10px] uppercase">
                {event.category}
              </Badge>
              <div className="text-right">
                <span className="text-xs text-indigo-200">Registration Fee: </span>
                <span className="text-sm font-extrabold text-amber-300">
                  {!isPaid ? "Free Entry" : `₹${event.price}`}
                </span>
              </div>
            </div>
            <DialogTitle className="text-xl font-bold text-white text-left">
              Confirm Event Pass
            </DialogTitle>
            <DialogDescription className="text-xs text-indigo-200 text-left">
              {event.title}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-6 text-xs text-slate-700">
            {/* 1. Verified Institutional Profile Snapshot (Read-Only) */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Verified Applicant Credentials</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <UserIcon className="w-3 h-3 text-slate-400" /> Name
                  </span>
                  <div className="font-semibold text-slate-900">{displayName}</div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" /> Email
                  </span>
                  <div className="font-mono text-slate-800 text-[11px] truncate">{userEmail}</div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" /> Department
                  </span>
                  <div className="font-medium text-slate-800 truncate">{department}</div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Hash className="w-3 h-3 text-slate-400" /> Roll / Staff ID
                  </span>
                  <div className="font-mono font-semibold text-slate-900">{rollNumber}</div>
                </div>
              </div>
            </div>

            {/* 2. Optional Contact Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="contactPhone" className="flex items-center gap-1.5 text-xs">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Contact Phone Number (For event SMS / WhatsApp alerts)</span>
              </Label>
              <Input
                id="contactPhone"
                type="tel"
                placeholder="e.g. 9876543210"
                {...register("contactPhone")}
                className={`h-9 text-xs ${errors.contactPhone ? "border-rose-500" : ""}`}
              />
              {errors.contactPhone && (
                <p className="text-[11px] text-rose-600">{errors.contactPhone.message}</p>
              )}
            </div>

            {/* 3. Conditional Team Registration Fields */}
            {isTeamEvent && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Team Details (Max: {event.maxTeamSize} Members)</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="teamName" className="text-xs">Team Name</Label>
                  <Input
                    id="teamName"
                    placeholder="e.g. Apollo ByteCrafters"
                    {...register("teamName")}
                    className="h-9 text-xs"
                  />
                </div>

                {/* Team Members List */}
                <div className="space-y-2">
                  {teamMembersList.map((member, index) => (
                    <div
                      key={index}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span>Member #{index + 2}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTeamMember(index)}
                          className="text-rose-600 hover:text-rose-800"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Input
                          placeholder="Name"
                          value={member.name}
                          onChange={(e) => handleTeamMemberChange(index, "name", e.target.value)}
                          className="h-8 text-xs bg-white"
                        />
                        <Input
                          placeholder="Institutional Email"
                          value={member.email}
                          onChange={(e) => handleTeamMemberChange(index, "email", e.target.value)}
                          className="h-8 text-xs bg-white"
                        />
                        <Input
                          placeholder="Roll No."
                          value={member.rollNumber || ""}
                          onChange={(e) => handleTeamMemberChange(index, "rollNumber", e.target.value)}
                          className="h-8 text-xs bg-white"
                        />
                      </div>
                    </div>
                  ))}

                  {teamMembersList.length + 1 < (event.maxTeamSize || 1) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddTeamMember}
                      className="w-full text-xs h-8 rounded-lg border-dashed border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                    >
                      + Add Team Member ({teamMembersList.length + 2} of {event.maxTeamSize})
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* 4. Custom Organizer Questions */}
            {event.customQuestions && event.customQuestions.length > 0 && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="font-bold text-slate-900 text-xs">
                  Event Specific Questionnaire
                </div>

                {event.customQuestions.map((q) => (
                  <div key={q.id} className="space-y-1.5">
                    <Label htmlFor={q.id} className="text-xs font-medium">
                      {q.label} {q.required && <span className="text-rose-500">*</span>}
                    </Label>

                    {q.type === "select" && q.options ? (
                      <Controller
                        name={`answers.${q.id}` as any}
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value as string}>
                            <SelectTrigger id={q.id} className="h-9 text-xs">
                              <SelectValue placeholder="Select Option" />
                            </SelectTrigger>
                            <SelectContent>
                              {q.options?.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    ) : (
                      <Input
                        id={q.id}
                        placeholder={q.placeholder || "Your response"}
                        {...register(`answers.${q.id}` as any)}
                        className="h-9 text-xs"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 5. Institutional Terms Checkbox */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-slate-600">
                <input
                  type="checkbox"
                  {...register("acceptTerms")}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  I confirm that my academic details are accurate and agree to adhere to The Apollo
                  University event code of conduct and attendance regulations.
                </span>
              </label>
              {errors.acceptTerms && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.acceptTerms.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-slate-50/80 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="w-full sm:w-auto rounded-xl text-xs"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending}
              className="w-full sm:w-auto h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-md"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Processing Pass...</span>
                </>
              ) : isPaid ? (
                <>
                  <Ticket className="w-4 h-4 mr-1.5" />
                  <span>Proceed to Payment &bull; ₹{event.price}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  <span>Confirm Free Registration</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
