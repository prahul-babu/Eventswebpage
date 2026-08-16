import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Ticket,
  Calendar,
  MapPin,
  QrCode,
  XCircle,
  Inbox,
  AlertTriangle,
  Loader2,
  Bell,
  Megaphone,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/lib/auth-context";
import {
  useStudentRegistrations,
  useCancelRegistration,
  StudentRegistrationItem,
} from "@/lib/queries/registrations";
import {
  useUnreadUpdatesForStudent,
  useAllEventsUpdatesMap,
} from "@/lib/queries/updates";
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
  const { data: unreadUpdatesData } = useUnreadUpdatesForStudent(currentUid, currentEmail);
  const { data: updatesMap } = useAllEventsUpdatesMap();
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
    const unreadCount = unreadUpdatesData?.unreadCountByEvent?.[item.event.id] || 0;
    const eventUpdates = updatesMap?.[item.event.id] || [];

    return (
      <Card
        key={item.registration.id}
        className={`border transition-all rounded-2xl overflow-hidden bg-white ${
          unreadCount > 0
            ? "border-amber-300 shadow-sm ring-1 ring-amber-100"
            : "border-slate-200/90 shadow-2xs hover:border-slate-300"
        }`}
      >
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Left: Thumbnail & Title/Meta */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-100 relative">
                {item.event.bannerUrl ? (
                  <img
                    src={item.event.bannerUrl}
                    alt={item.event.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-[#004D61] to-[#007A99] flex items-center justify-center text-white">
                    <Ticket className="w-6 h-6 text-amber-300" />
                  </div>
                )}

                {unreadCount > 0 && (
                  <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-amber-500 ring-2 ring-white animate-ping" />
                )}
              </div>

              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(item.registration.status)}
                  <span className="font-mono text-[11px] font-bold text-slate-500">
                    {item.registration.ticketCode}
                  </span>

                  {unreadCount > 0 && (
                    <Link
                      to={`/events/${item.event.id}#updates`}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white shadow-2xs hover:bg-amber-600 transition-colors"
                    >
                      <Bell className="w-3 h-3" />
                      <span>{unreadCount} New Update{unreadCount > 1 ? "s" : ""}</span>
                    </Link>
                  )}
                </div>

                <Link
                  to={`/events/${item.event.id}`}
                  className="font-bold text-sm sm:text-base text-slate-900 hover:text-[#007A99] transition-colors line-clamp-1 block"
                >
                  {item.event.title}
                </Link>

                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#007A99]" />
                    {safeFormatDate(item.event.startAt, "MMM d, yyyy • h:mm a", "Date TBA")}
                  </span>
                  <span className="flex items-center gap-1 truncate max-w-[200px]">
                    <MapPin className="w-3.5 h-3.5 text-[#007A99]" />
                    {item.event.venueLocation || "Campus Venue"}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-none border-slate-100 flex-wrap">
              {unreadCount > 0 && (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs border-amber-300 bg-amber-50/50 hover:bg-amber-100 text-amber-900 font-bold gap-1 h-9"
                >
                  <Link to={`/events/${item.event.id}#updates`}>
                    <Megaphone className="w-3.5 h-3.5 text-amber-600" />
                    <span>View Updates ({unreadCount})</span>
                  </Link>
                </Button>
              )}

              {!isCancelled && (
                <Button
                  size="sm"
                  onClick={() => setSelectedPass(item)}
                  className="rounded-xl text-xs bg-[#004D61] hover:bg-[#003847] text-white gap-1.5 shadow-2xs flex-1 sm:flex-none h-9"
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
                  className="rounded-xl text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 flex-1 sm:flex-none h-9"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  <span>Cancel</span>
                </Button>
              )}
            </div>
          </div>

          {/* Event-specific Updates Feed Section */}
          {eventUpdates.length > 0 && (
            <div className="pt-3 border-t border-slate-100 bg-slate-50/80 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#004D61] flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-[#007A99]" />
                  Event Updates ({eventUpdates.length})
                </span>
                <Link
                  to={`/events/${item.event.id}#updates`}
                  className="text-[11px] text-[#007A99] font-bold hover:underline inline-flex items-center gap-1"
                >
                  <span>All Announcements</span>
                  <span>&rarr;</span>
                </Link>
              </div>

              <div className="space-y-2">
                {eventUpdates.slice(0, 3).map((upd) => (
                  <div
                    key={upd.id}
                    className="p-2.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#007A99] shrink-0" />
                        {upd.subject}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                        {safeFormatDate(upd.createdAt, "MMM d, yyyy", "Recent")}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2 pl-3">
                      {upd.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="My Registered Events & Ticket Passes"
        description="Access verified QR entry passes, seat reservations, and official updates for your registered events."
        badge={{ text: "Student Portal", variant: "indigo" }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Tabs defaultValue="upcoming" className="w-full space-y-6">
          <TabsList className="bg-slate-100 p-1 rounded-2xl w-full sm:w-auto">
            <TabsTrigger value="upcoming" className="rounded-xl text-xs font-bold px-4 py-2">
              Upcoming ({data?.upcoming.length || 0})
            </TabsTrigger>
            <TabsTrigger value="past" className="rounded-xl text-xs font-bold px-4 py-2">
              Past / Attended ({data?.past.length || 0})
            </TabsTrigger>
            <TabsTrigger value="all" className="rounded-xl text-xs font-bold px-4 py-2">
              All Registrations ({data?.all.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Upcoming */}
          <TabsContent value="upcoming" className="space-y-4">
            {isLoading ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#007A99] mx-auto" />
                <p className="text-xs text-slate-500 font-medium">Loading your registered passes...</p>
              </div>
            ) : (data?.upcoming.length || 0) > 0 ? (
              <div className="space-y-3">
                {data?.upcoming.map((item) => renderRegistrationRow(item))}
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-4">
                <Inbox className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">No Upcoming Registrations</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    You have not registered for any upcoming events yet. Explore university symposiums and workshops.
                  </p>
                </div>
                <Button asChild size="sm" className="rounded-xl text-xs bg-[#004D61] hover:bg-[#003847] text-white">
                  <Link to="/events">Browse Events &rarr;</Link>
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Past */}
          <TabsContent value="past" className="space-y-4">
            {isLoading ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#007A99] mx-auto" />
                <p className="text-xs text-slate-500">Loading registration history...</p>
              </div>
            ) : (data?.past.length || 0) > 0 ? (
              <div className="space-y-3">
                {data?.past.map((item) => renderRegistrationRow(item))}
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-2 text-slate-400">
                <Inbox className="w-10 h-10 mx-auto stroke-1" />
                <p className="text-xs font-bold text-slate-700">No Past Event Records</p>
                <p className="text-[11px]">Your completed event attendance will be archived here.</p>
              </div>
            )}
          </TabsContent>

          {/* Tab 3: All */}
          <TabsContent value="all" className="space-y-4">
            {isLoading ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#007A99] mx-auto" />
                <p className="text-xs text-slate-500">Loading registrations...</p>
              </div>
            ) : (data?.all.length || 0) > 0 ? (
              <div className="space-y-3">
                {data?.all.map((item) => renderRegistrationRow(item))}
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-2 text-slate-400">
                <Inbox className="w-10 h-10 mx-auto stroke-1" />
                <p className="text-xs font-bold text-slate-700">No Registrations Found</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Ticket Pass Dialog */}
      {selectedPass && (
        <TicketPassDialog
          isOpen={Boolean(selectedPass)}
          onClose={() => setSelectedPass(null)}
          registration={selectedPass.registration}
          event={selectedPass.event}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={Boolean(cancelTarget)} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader className="text-left space-y-2">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Cancel Event Registration?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to cancel your registration for{" "}
              <strong className="text-slate-900">"{cancelTarget?.event.title}"</strong>? Your reserved seat will be released.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelTarget(null)}
              className="rounded-xl text-xs"
            >
              Keep Registration
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmCancel}
              disabled={cancelMutation.isPending}
              className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyRegistrationsPage;
