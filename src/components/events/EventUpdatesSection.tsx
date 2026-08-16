import React from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  User,
  Megaphone,
  Mail,
  Smartphone,
  CheckCheck,
  Plus,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  useEventUpdates,
  useUnreadUpdatesForStudent,
  useMarkEventUpdatesAsRead,
} from "@/lib/queries/updates";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { safeToDate } from "@/lib/utils";
import type { EventUpdate } from "@/types/update";

interface EventUpdatesSectionProps {
  eventId: string;
  onOpenSendModal?: () => void;
  canSendUpdate?: boolean;
}

export const EventUpdatesSection: React.FC<EventUpdatesSectionProps> = ({
  eventId,
  onOpenSendModal,
  canSendUpdate = false,
}) => {
  const { firebaseUser, profile } = useAuth();
  const currentUid = firebaseUser?.uid || profile?.uid;
  const currentEmail = firebaseUser?.email || profile?.email;

  const { data: updates, isLoading } = useEventUpdates(eventId);
  const { data: unreadData } = useUnreadUpdatesForStudent(currentUid, currentEmail);
  const markAsReadMutation = useMarkEventUpdatesAsRead();

  const unreadCount = unreadData?.unreadCountByEvent?.[eventId] || 0;
  const unreadUpdateIds = new Set(
    (unreadData?.unreadNotifications || [])
      .filter((n) => (n.eventId === eventId || n.data?.eventId === eventId) && !n.read)
      .map((n) => n.eventUpdateId || n.data?.eventUpdateId)
      .filter(Boolean)
  );

  const handleMarkAllRead = () => {
    if (!currentUid && !currentEmail) return;
    markAsReadMutation.mutate({
      eventId,
      studentUid: currentUid,
      studentEmail: currentEmail,
    });
  };

  return (
    <Card id="updates" className="rounded-3xl border-slate-200/90 shadow-2xs overflow-hidden bg-white">
      <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E0F3F7] text-[#007A99] flex items-center justify-center shrink-0 shadow-2xs">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
                  Event Announcements &amp; Updates
                </CardTitle>
                {unreadCount > 0 && (
                  <Badge variant="amber" className="text-[10px] font-extrabold px-2 py-0.5 animate-pulse">
                    {unreadCount} New
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Official venue changes, schedule revisions, and instructions from the coordinators.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markAsReadMutation.isPending}
                className="rounded-xl text-xs h-8 text-[#007A99] hover:bg-[#E0F3F7] border-cyan-200"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                <span>Mark all as read</span>
              </Button>
            )}

            {canSendUpdate && onOpenSendModal && (
              <Button
                size="sm"
                onClick={onOpenSendModal}
                className="rounded-xl text-xs h-8 bg-[#004D61] hover:bg-[#003847] text-white font-bold gap-1 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Post Update</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-4">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Loading announcements...
          </div>
        ) : !updates || updates.length === 0 ? (
          <div className="py-10 text-center space-y-2 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <Megaphone className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
            <p className="text-xs font-bold text-slate-700">No Announcements Posted Yet</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Any official notifications regarding venue changes, schedules, or prerequisites will appear here and be dispatched to your registered Outlook inbox.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {updates.map((upd: EventUpdate, idx) => {
              const isUnread = unreadUpdateIds.has(upd.id);
              const createdAtDate = safeToDate(upd.createdAt);
              const timeAgo = formatDistanceToNow(createdAtDate, { addSuffix: true });
              const fullDate = format(createdAtDate, "MMMM d, yyyy • h:mm a");

              return (
                <div
                  key={upd.id || idx}
                  className={`p-5 rounded-2xl border transition-all ${
                    isUnread
                      ? "bg-amber-50/40 border-amber-300 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  {/* Top Bar: Subject & Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isUnread && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500 text-white shadow-2xs">
                          NEW
                        </span>
                      )}
                      <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                        {upd.subject}
                      </h4>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span title={fullDate}>{timeAgo}</span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="text-slate-500 font-medium">{fullDate}</span>
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className="py-3 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {upd.message}
                  </div>

                  {/* Footer Meta Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                        <User className="w-3 h-3 text-[#007A99]" />
                        {upd.senderName} ({upd.senderRole || "Faculty"})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        <Smartphone className="w-2.5 h-2.5 text-indigo-500" />
                        <span>In-App</span>
                        <span className="text-slate-300">&bull;</span>
                        <Mail className="w-2.5 h-2.5 text-emerald-500" />
                        <span>Outlook Email</span>
                      </div>

                      {isUnread && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleMarkAllRead}
                          className="text-[11px] h-6 px-2 text-[#007A99] hover:bg-cyan-50 font-bold"
                        >
                          Mark as Read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
