import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Ticket,
  Calendar,
  MapPin,
  QrCode,
  XCircle,
  Clock,
  ArrowRight,
  Inbox,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/lib/auth-context";
import {
  useStudentRegistrations,
  useCancelRegistration,
  StudentRegistrationItem,
} from "@/lib/queries/registrations";
import { TicketPassDialog } from "@/components/events/TicketPassDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { safeFormatDate, safeToDate } from "@/lib/utils";

export const MyRegistrationsPage: React.FC = () => {
  const { firebaseUser, profile } = useAuth();
  const currentUid = firebaseUser?.uid || profile?.uid;
  const currentEmail = firebaseUser?.email || profile?.email;
  const { data, isLoading } = useStudentRegistrations(currentUid, currentEmail);
  const cancelMutation = useCancelRegistration();

  const [selectedPass, setSelectedPass] = useState<StudentRegistrationItem | null>(null);
  const [cancelTarget, setCancelTarget] = useState<StudentRegistrationItem | null>(null);

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelMutation.mutateAsync({
        registrationId: cancelTarget.registration.id,
      });
      setCancelTarget(null);
    } catch {
      // Error handled by mutation toast
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge variant="emerald">Confirmed</Badge>;
      case "WAITLISTED":
        return <Badge variant="amber">Waitlisted</Badge>;
      case "PENDING_PAYMENT":
        return <Badge variant="amber">Pending Payment</Badge>;
      case "ATTENDED":
        return <Badge variant="indigo">Attended</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderRegistrationRow = (item: StudentRegistrationItem) => {
    const isCancelled = item.registration.status === "CANCELLED";
    const canCancel = !isCancelled && safeToDate(item.event.startAt).getTime() > new Date().getTime();

    return (
      <Card
        key={item.registration.id}
        className="border-slate-200/90 shadow-sm hover:border-indigo-300 transition-all rounded-2xl overflow-hidden bg-white"
      >
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Left: Thumbnail & Title/Meta */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-100">
              {item.event.bannerUrl ? (
                <img
                  src={item.event.bannerUrl}
                  alt={item.event.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-indigo-950 to-indigo-700 flex items-center justify-center text-white">
                  <Ticket className="w-6 h-6 text-amber-300" />
                </div>
              )}
            </div>

            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(item.registration.status)}
                <span className="font-mono text-[11px] font-bold text-slate-500">
                  {item.registration.ticketCode}
                </span>
              </div>

              <Link
                to={`/events/${item.event.id}`}
                className="font-bold text-sm sm:text-base text-slate-900 hover:text-indigo-600 transition-colors line-clamp-1 block"
              >
                {item.event.title}
              </Link>

              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  {safeFormatDate(item.event.startAt, "MMM d, yyyy • h:mm a", "Date TBA")}
                </span>
                <span className="flex items-center gap-1 truncate max-w-[200px]">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  {item.event.venueLocation || "Campus Venue"}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-none border-slate-100">
            {!isCancelled && (
              <Button
                size="sm"
                onClick={() => setSelectedPass(item)}
                className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm flex-1 sm:flex-none"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>View Ticket Pass</span>
              </Button>
            )}

            {canCancel && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCancelTarget(item)}
                className="rounded-xl text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 flex-1 sm:flex-none"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                <span>Cancel</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="My Event Registrations"
        description="Access and present your digital QR entry tickets for upcoming symposiums and track event attendance history."
        badge={{ text: "Student Passes", variant: "indigo" }}
        actions={
          <Button asChild size="sm" className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5">
            <Link to="/events">
              <span>Browse Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="bg-slate-100 p-1 rounded-2xl">
            <TabsTrigger value="upcoming" className="rounded-xl text-xs font-semibold">
              Upcoming Events ({data?.upcoming.length || 0})
            </TabsTrigger>
            <TabsTrigger value="past" className="rounded-xl text-xs font-semibold">
              Past &amp; Cancelled ({data?.past.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* 1. UPCOMING EVENTS TAB */}
          <TabsContent value="upcoming" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="h-24 animate-pulse bg-slate-100 rounded-2xl" />
                ))}
              </div>
            ) : data && data.upcoming.length > 0 ? (
              <div className="space-y-3">{data.upcoming.map(renderRegistrationRow)}</div>
            ) : (
              <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 space-y-3">
                <Inbox className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
                <h3 className="text-base font-bold text-slate-800">No upcoming event bookings</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  You haven't registered for any upcoming events yet. Discover university symposiums and workshops.
                </p>
                <Button asChild size="sm" className="rounded-xl bg-indigo-600 text-white text-xs">
                  <Link to="/events">Explore Campus Events</Link>
                </Button>
              </div>
            )}
          </TabsContent>

          {/* 2. PAST & CANCELLED EVENTS TAB */}
          <TabsContent value="past" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Card key={i} className="h-24 animate-pulse bg-slate-100 rounded-2xl" />
                ))}
              </div>
            ) : data && data.past.length > 0 ? (
              <div className="space-y-3">{data.past.map(renderRegistrationRow)}</div>
            ) : (
              <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 space-y-2 text-slate-400">
                <Clock className="w-10 h-10 mx-auto stroke-1" />
                <p className="text-xs font-medium">No past registration records</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* QR Ticket Pass Modal */}
      {selectedPass && (
        <TicketPassDialog
          registration={selectedPass.registration}
          event={selectedPass.event}
          isOpen={Boolean(selectedPass)}
          onClose={() => setSelectedPass(null)}
        />
      )}

      {/* Cancel Confirmation Modal */}
      {cancelTarget && (
        <Dialog open={Boolean(cancelTarget)} onOpenChange={(open) => !open && setCancelTarget(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader className="text-left space-y-2">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Cancel Registration?
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to cancel your registration for{" "}
                <strong className="text-slate-800">{cancelTarget.event.title}</strong>? Your seat will be released and offered to students on the waitlist.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelTarget(null)}
                disabled={cancelMutation.isPending}
                className="w-full sm:w-auto rounded-xl text-xs"
              >
                Keep Booking
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmCancel}
                disabled={cancelMutation.isPending}
                className="w-full sm:w-auto rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white"
              >
                {cancelMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Yes, Cancel Booking</span>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
export default MyRegistrationsPage;
