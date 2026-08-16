import React, { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Megaphone,
  Mail,
  Smartphone,
  AlertTriangle,
  Eye,
  Send,
  Users,
} from "lucide-react";
import { useEventUpdates } from "@/lib/queries/updates";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { safeToDate } from "@/lib/utils";
import type { EventUpdate } from "@/types/update";

interface EventUpdatesHistoryProps {
  eventId: string;
  onOpenSendModal?: () => void;
}

export const EventUpdatesHistory: React.FC<EventUpdatesHistoryProps> = ({
  eventId,
  onOpenSendModal,
}) => {
  const { data: updates, isLoading } = useEventUpdates(eventId);
  const [selectedUpdate, setSelectedUpdate] = useState<EventUpdate | null>(null);

  return (
    <>
      <Card className="rounded-3xl border-slate-200/90 shadow-2xs overflow-hidden bg-white">
        <CardHeader className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E0F3F7] text-[#007A99] flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
                Dispatched Event Announcements &amp; Updates
              </CardTitle>
              <p className="text-xs text-slate-500">
                Audit history of in-app notifications and emails sent to confirmed attendees.
              </p>
            </div>
          </div>

          {onOpenSendModal && (
            <Button
              size="sm"
              onClick={onOpenSendModal}
              className="rounded-xl text-xs h-9 bg-[#004D61] hover:bg-[#003847] text-white font-bold gap-1.5 shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send New Update</span>
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Loading update history...
            </div>
          ) : !updates || updates.length === 0 ? (
            <div className="py-10 text-center space-y-2 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <Megaphone className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
              <p className="text-xs font-bold text-slate-700">No Updates Dispatched Yet</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Use the "Send New Update" button above to notify all confirmed attendees about schedule adjustments or important event notes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {updates.map((upd: EventUpdate, idx) => {
                const createdAtDate = safeToDate(upd.createdAt);
                const timeAgo = formatDistanceToNow(createdAtDate, { addSuffix: true });
                const fullDate = format(createdAtDate, "MMM d, yyyy • h:mm a");

                return (
                  <div
                    key={upd.id || idx}
                    className="p-4 rounded-2xl border border-slate-200/90 hover:border-slate-300 transition-all bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {upd.subject}
                        </h4>
                        <span title={fullDate} className="text-[10px] text-slate-400">&bull; {timeAgo}</span>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-1">
                        {upd.message}
                      </p>

                      {/* Delivery Metrics Breakdown */}
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-1 flex-wrap">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Users className="w-3 h-3 text-[#007A99]" />
                          {upd.recipientsCount} recipients
                        </span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="flex items-center gap-1 text-indigo-700">
                          <Smartphone className="w-3 h-3" />
                          {upd.notificationsCreated} in-app
                        </span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="flex items-center gap-1 text-emerald-700">
                          <Mail className="w-3 h-3" />
                          {upd.emailsSent} emails sent
                        </span>
                        {upd.emailsFailed > 0 && (
                          <>
                            <span className="text-slate-300">&bull;</span>
                            <span className="flex items-center gap-1 text-rose-600 font-bold">
                              <AlertTriangle className="w-3 h-3" />
                              {upd.emailsFailed} failed
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedUpdate(upd)}
                        className="rounded-xl text-xs h-8 text-[#007A99] hover:bg-cyan-50 gap-1 font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={Boolean(selectedUpdate)} onOpenChange={() => setSelectedUpdate(null)}>
        <DialogContent className="max-w-lg rounded-3xl p-6 space-y-4">
          <DialogHeader className="text-left space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#007A99]">
              Dispatched Announcement Dossier
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {selectedUpdate?.subject}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {selectedUpdate?.createdAt &&
                format(safeToDate(selectedUpdate.createdAt), "MMMM d, yyyy • h:mm a")}
            </DialogDescription>
          </DialogHeader>

          {/* Announcement Full Text */}
          <div className="p-4 rounded-2xl bg-slate-50 border text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
            {selectedUpdate?.message}
          </div>

          {/* Delivery Statistics Grid */}
          <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Recipients</span>
              <strong className="text-base text-slate-900">{selectedUpdate?.recipientsCount ?? 0}</strong>
            </div>
            <div className="p-3 bg-indigo-50/50 rounded-xl">
              <span className="text-[10px] text-indigo-700 font-bold uppercase block">In-App Notifs</span>
              <strong className="text-base text-indigo-900">{selectedUpdate?.notificationsCreated ?? 0}</strong>
            </div>
            <div className="p-3 bg-emerald-50/50 rounded-xl">
              <span className="text-[10px] text-emerald-700 font-bold uppercase block">Emails Queued</span>
              <strong className="text-base text-emerald-900">{selectedUpdate?.emailsSent ?? 0}</strong>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
