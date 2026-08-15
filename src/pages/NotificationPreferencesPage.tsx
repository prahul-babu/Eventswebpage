import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  Mail,
  Calendar,
  CreditCard,
  UserCheck,
  Clock,
  Megaphone,
  Save,
  ArrowLeft,
  Smartphone,
  CheckCircle2,
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { requestWebPushPermission } from "@/lib/fcm";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationPreferences, DEFAULT_NOTIFICATION_PREFS } from "@/types";
import { toast } from "sonner";

export const NotificationPreferencesPage: React.FC = () => {
  const { firebaseUser, profile } = useAuth();

  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFS);
  const [isSaving, setIsSaving] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    if (profile?.notificationPrefs) {
      setPrefs(profile.notificationPrefs);
    }
    if (profile?.fcmTokens && profile.fcmTokens.length > 0) {
      setPushEnabled(true);
    }
  }, [profile]);

  const handleToggle = (category: keyof NotificationPreferences) => {
    setPrefs((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleEnablePush = async () => {
    if (!firebaseUser?.uid) return;
    const ok = await requestWebPushPermission(firebaseUser.uid);
    if (ok) setPushEnabled(true);
  };

  const handleSave = async () => {
    if (!firebaseUser?.uid) return;
    try {
      setIsSaving(true);
      const userRef = doc(db, "users", firebaseUser.uid);
      await updateDoc(userRef, {
        notificationPrefs: prefs,
        updatedAt: new Date(),
      });
      toast.success("Notification Preferences Saved", {
        description: "Your email dispatch preferences have been updated.",
      });
    } catch (err: any) {
      toast.error("Failed to Save Preferences", { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const prefItems: {
    id: keyof NotificationPreferences;
    title: string;
    description: string;
    icon: any;
  }[] = [
    {
      id: "eventUpdates",
      title: "Event Updates & Schedule Adjustments",
      description: "Receive emails for changes to venue locations, timings, or speakers on events you're attending.",
      icon: Calendar,
    },
    {
      id: "registrationAndPayments",
      title: "Registration Confirmations & Payment Receipts",
      description: "Official ticket pass vouchers, QR code check-in emails, and Razorpay tax invoices.",
      icon: CreditCard,
    },
    {
      id: "approvalsAndAccess",
      title: "Role Approvals & Proposal Clearance",
      description: "Administrative notifications regarding your student/faculty role verification and event submissions.",
      icon: UserCheck,
    },
    {
      id: "reminders",
      title: "Event Reminders (24 Hours & 1 Hour Ahead)",
      description: "Automated countdown alerts prior to event commencement so you never miss a session.",
      icon: Clock,
    },
    {
      id: "announcements",
      title: "University Campus Announcements & Bulletins",
      description: "Occasional major festival releases, guest keynotes, and campus-wide hackathon invitations.",
      icon: Megaphone,
    },
  ];

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="Notification &amp; Email Preferences"
        description="Choose which categories of transactional emails you wish to receive from The Apollo University Event Hub."
        badge={{ text: "Communication Center", variant: "indigo" }}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="rounded-xl text-xs gap-1.5 h-9 bg-white">
              <Link to="/profile">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>My Profile</span>
              </Link>
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 h-9 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving..." : "Save Preferences"}</span>
            </Button>
          </div>
        }
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* In-App Notifications Banner */}
        <Card className="p-5 rounded-3xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Bell className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <strong className="text-sm font-bold text-indigo-950 block">In-App Notifications are Always Active</strong>
            <p className="text-indigo-800 leading-relaxed">
              Real-time security notices, pass updates, and gate check-ins will always appear in your top navigation bell menu to protect your campus account.
            </p>
          </div>
        </Card>

        {/* Web Push Banner */}
        <Card className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Browser Push Notifications</h3>
              <p className="text-xs text-slate-500">Get 1-hour event reminders directly on your desktop or mobile browser.</p>
            </div>
          </div>

          <div>
            {pushEnabled ? (
              <Badge variant="emerald" className="text-xs py-1 px-3 rounded-xl gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Push Active</span>
              </Badge>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleEnablePush}
                className="rounded-xl text-xs font-bold h-9"
              >
                Enable Web Push
              </Button>
            )}
          </div>
        </Card>

        {/* Category Toggles List */}
        <Card className="rounded-3xl border-slate-200/90 shadow-sm bg-white overflow-hidden divide-y divide-slate-100">
          <div className="p-5 bg-slate-50 border-b flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-indigo-600" />
              <span>Email Delivery Channels ({profile?.email || "Account"})</span>
            </span>
          </div>

          {prefItems.map((item) => {
            const Icon = item.icon;
            const isChecked = prefs[item.id];

            return (
              <div
                key={item.id}
                onClick={() => handleToggle(item.id)}
                className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50/60 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <strong className="text-xs sm:text-sm font-bold text-slate-900 block">
                      {item.title}
                    </strong>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(item.id)}
                    className="w-5 h-5 accent-indigo-600 cursor-pointer rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
};
export default NotificationPreferencesPage;
