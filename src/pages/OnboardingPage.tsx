import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/lib/auth-context";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";
import {
  requestAccessSchema,
  RequestAccessFormValues,
} from "@/lib/schemas/user";
import {
  DEPARTMENTS,
  ACADEMIC_YEARS,
  ACADEMIC_SECTIONS,
  FACULTY_DESIGNATIONS,
} from "@/types/user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  GraduationCap,
  Briefcase,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Building2,
  Phone,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";

export const OnboardingPage: React.FC = () => {
  const { firebaseUser, isAuthenticated, profile, status, isLoading, isAuthenticating, submitAccessRequest } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<"student" | "faculty">("student");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Show loading screen while auth resolves
  if (isLoading || isAuthenticating) {
    return <AuthLoadingScreen />;
  }

  // If user already has an active profile, redirect to home
  if (status === "ACTIVE") {
    return <Navigate to="/" replace />;
  }

  // If user is already pending approval, redirect to /pending
  if (status === "PENDING" || (profile && profile.status === "PENDING")) {
    return <Navigate to="/pending" replace />;
  }

  // If unauthenticated, redirect to login
  if (!isAuthenticated || !firebaseUser) {
    console.error("REDIRECTING TO LOGIN:", {
      reason: "Unauthenticated access on /onboarding",
      firebaseUser: firebaseUser?.uid || null,
      email: firebaseUser?.email || null,
    });
    return <Navigate to="/login" replace />;
  }

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<RequestAccessFormValues>({
    resolver: zodResolver(requestAccessSchema),
    defaultValues: {
      requestedRole: "student",
      displayName: firebaseUser.displayName || "",
      department: "Computer Science & Engineering",
      phoneNumber: "",
      rollNumber: "",
      year: "1st Year (B.Tech / UG)",
      section: "Section A",
      employeeId: "",
      designation: "Assistant Professor",
    },
  });

  const handleRoleSelect = (role: "student" | "faculty") => {
    setSelectedRole(role);
    setValue("requestedRole", role);
  };

  const handleContinueToStep2 = () => {
    setStep(2);
  };

  const onSubmit = async (data: RequestAccessFormValues) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await submitAccessRequest(data);
      toast.success("Access Request Submitted", {
        description: "Your academic verification details have been forwarded to the administrator.",
      });
      navigate("/pending");
    } catch (err: unknown) {
      const error = err as { message?: string };
      const msg = error.message || "Failed to submit access request. Please check your inputs.";
      setErrorMessage(msg);
      toast.error("Submission Error", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10">
      <div className="w-full max-w-2xl">
        {/* Step Indicator */}
        <div className="mb-8 max-w-md mx-auto">
          <div className="flex items-center justify-between relative">
            <div className="w-full absolute top-1/2 h-0.5 bg-slate-200 -z-10" />
            
            {/* Step 1 Pill */}
            <div
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                step >= 1
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-4 ring-indigo-50"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <span>1</span>
              <span>Select Role</span>
            </div>

            {/* Step 2 Pill */}
            <div
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                step === 2
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-4 ring-indigo-50"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <span>2</span>
              <span>Academic Details</span>
            </div>
          </div>
        </div>

        <Card className="border-slate-200/80 shadow-2xl rounded-2xl bg-white/95 backdrop-blur-sm overflow-hidden">
          <CardHeader className="text-center pb-4 pt-6">
            <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2 mx-auto">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Step {step} of 2</span>
            </div>

            <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900">
              {step === 1 ? "Choose Your Academic Role" : "Complete Your Campus Profile"}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 max-w-md mx-auto">
              {step === 1
                ? "Select your primary affiliation with The Apollo University to configure your access tier."
                : "Provide your institutional identification to verify your academic credentials."}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
            {errorMessage && (
              <Alert variant="destructive" className="mb-6 border-rose-300 bg-rose-50 text-rose-900 text-xs">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* STEP 1: ROLE SELECTION */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Student Selection Card */}
                  <div
                    onClick={() => handleRoleSelect("student")}
                    className={`cursor-pointer rounded-2xl p-6 border-2 transition-all text-left relative group ${
                      selectedRole === "student"
                        ? "border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20"
                        : "border-slate-200 hover:border-indigo-200 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          selectedRole === "student"
                            ? "bg-indigo-600 text-white shadow-md"
                            : "bg-slate-100 text-slate-700 group-hover:bg-indigo-100 group-hover:text-indigo-600"
                        }`}
                      >
                        <GraduationCap className="w-6 h-6" />
                      </div>
                      {selectedRole === "student" && (
                        <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                      )}
                    </div>

                    <div className="mt-4 space-y-1">
                      <h3 className="font-bold text-base text-slate-900">I am a Student</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Undergraduate, Postgraduate, and PhD scholars attending The Apollo University.
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11px] text-slate-500 space-y-1">
                      <div>&bull; Register for campus events & workshops</div>
                      <div>&bull; Download dynamic QR entry passes</div>
                    </div>
                  </div>

                  {/* Faculty Selection Card */}
                  <div
                    onClick={() => handleRoleSelect("faculty")}
                    className={`cursor-pointer rounded-2xl p-6 border-2 transition-all text-left relative group ${
                      selectedRole === "faculty"
                        ? "border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20"
                        : "border-slate-200 hover:border-indigo-200 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          selectedRole === "faculty"
                            ? "bg-indigo-600 text-white shadow-md"
                            : "bg-slate-100 text-slate-700 group-hover:bg-indigo-100 group-hover:text-indigo-600"
                        }`}
                      >
                        <Briefcase className="w-6 h-6" />
                      </div>
                      {selectedRole === "faculty" && (
                        <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                      )}
                    </div>

                    <div className="mt-4 space-y-1">
                      <h3 className="font-bold text-base text-slate-900">I am a Faculty Member</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Professors, department heads, and academic staff organizing university events.
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11px] text-slate-500 space-y-1">
                      <div>&bull; Host and manage university symposiums</div>
                      <div>&bull; Scan student QR passes at check-in gates</div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    type="button"
                    size="lg"
                    onClick={handleContinueToStep2}
                    className="w-full sm:w-auto h-11 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                  >
                    <span>Continue to Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: PROFILE FORM */}
            {step === 2 && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Locked Microsoft Email Banner */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Verified Institutional Account (Locked)
                      </div>
                      <div className="text-xs font-bold text-slate-800 font-mono">
                        {firebaseUser.email}
                      </div>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="displayName" className="flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>Full Name</span>
                    </Label>
                    <Input
                      id="displayName"
                      placeholder="e.g. Aarav Patel"
                      {...register("displayName")}
                      className={errors.displayName ? "border-rose-500" : ""}
                    />
                    {errors.displayName && (
                      <p className="text-[11px] text-rose-600">{errors.displayName.message}</p>
                    )}
                  </div>

                  {/* Department */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="department" className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Department / School</span>
                    </Label>
                    <Controller
                      name="department"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger id="department">
                            <SelectValue placeholder="Select Department" />
                          </SelectTrigger>
                          <SelectContent>
                            {DEPARTMENTS.map((dept) => (
                              <SelectItem key={dept} value={dept}>
                                {dept}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.department && (
                      <p className="text-[11px] text-rose-600">{errors.department.message}</p>
                    )}
                  </div>

                  {/* CONDITIONAL STUDENT FIELDS */}
                  {selectedRole === "student" && (
                    <>
                      {/* Roll Number */}
                      <div className="space-y-1.5">
                        <Label htmlFor="rollNumber">University Roll Number</Label>
                        <Input
                          id="rollNumber"
                          placeholder="e.g. AP21CS001"
                          {...register("rollNumber")}
                          className={errors.rollNumber ? "border-rose-500 font-mono uppercase" : "font-mono uppercase"}
                        />
                        {errors.rollNumber && (
                          <p className="text-[11px] text-rose-600">{errors.rollNumber.message}</p>
                        )}
                      </div>

                      {/* Academic Year */}
                      <div className="space-y-1.5">
                        <Label htmlFor="year">Current Academic Year</Label>
                        <Controller
                          name="year"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger id="year">
                                <SelectValue placeholder="Select Year" />
                              </SelectTrigger>
                              <SelectContent>
                                {ACADEMIC_YEARS.map((yr) => (
                                  <SelectItem key={yr} value={yr}>
                                    {yr}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      {/* Section */}
                      <div className="space-y-1.5">
                        <Label htmlFor="section">Class Section</Label>
                        <Controller
                          name="section"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger id="section">
                                <SelectValue placeholder="Select Section" />
                              </SelectTrigger>
                              <SelectContent>
                                {ACADEMIC_SECTIONS.map((sec) => (
                                  <SelectItem key={sec} value={sec}>
                                    {sec}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </>
                  )}

                  {/* CONDITIONAL FACULTY FIELDS */}
                  {selectedRole === "faculty" && (
                    <>
                      {/* Employee ID */}
                      <div className="space-y-1.5">
                        <Label htmlFor="employeeId">Employee / Staff ID</Label>
                        <Input
                          id="employeeId"
                          placeholder="e.g. FAC-CSE-101"
                          {...register("employeeId")}
                          className={errors.employeeId ? "border-rose-500 font-mono uppercase" : "font-mono uppercase"}
                        />
                        {errors.employeeId && (
                          <p className="text-[11px] text-rose-600">{errors.employeeId.message}</p>
                        )}
                      </div>

                      {/* Designation */}
                      <div className="space-y-1.5">
                        <Label htmlFor="designation">Academic Designation</Label>
                        <Controller
                          name="designation"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger id="designation">
                                <SelectValue placeholder="Select Designation" />
                              </SelectTrigger>
                              <SelectContent>
                                {FACULTY_DESIGNATIONS.map((desig) => (
                                  <SelectItem key={desig} value={desig}>
                                    {desig}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </>
                  )}

                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <Label htmlFor="phoneNumber" className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>Contact Mobile Number</span>
                    </Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="e.g. 9876543210"
                      {...register("phoneNumber")}
                      className={errors.phoneNumber ? "border-rose-500" : ""}
                    />
                    {errors.phoneNumber && (
                      <p className="text-[11px] text-rose-600">{errors.phoneNumber.message}</p>
                    )}
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto rounded-xl"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    <span>Back to Role Selection</span>
                  </Button>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto h-11 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Access Request</span>
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
