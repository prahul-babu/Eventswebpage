import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  CheckCheck,
  Inbox,
  ExternalLink,
  ShieldCheck,
  Megaphone,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  User as UserIcon,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toDate } from "@/lib/converters";
import type { AdminNotification } from "@/types";
import { toast } from "sonner";

export interface NotificationItem extends AdminNotification {
  id: string;
  isRead?: boolean;
  eventName?: string;
  eventTitle?: string;
  senderRole?: string;
  senderName?: string;
  subject?: string;
  message?: string;
}

export const NotificationBell: React.FC = () => {
  const { firebaseUser, profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!firebaseUser?.uid) {
      setNotifications([]);
      return;
    }

    const currentUid = firebaseUser.uid;
    const currentEmail = (firebaseUser.email || profile?.email || "").toLowerCase().trim();

    const notifsRef = collection(db, "notifications");
    const unsubscribers: (() => void)[] = [];
    const itemsMap = new Map<string, NotificationItem>();

    const updateAndSort = () => {
      const sorted = Array.from(itemsMap.values()).sort(
        (a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()
      );
      setNotifications(sorted);
    };

    const processSnapshot = (snapshot: any) => {
      snapshot.docs.forEach((docSnap: any) => {
        const raw = docSnap.data() as any;
        const isRead = raw.isRead ?? raw.read ?? false;
        itemsMap.set(docSnap.id, {
          id: docSnap.id,
          ...raw,
          read: isRead,
          isRead,
        });
      });
      updateAndSort();
    };

    // 1. Query by recipientUid
    try {
      const qUid = query(
        notifsRef,
        where("recipientUid", "==", currentUid),
        limit(50)
      );
      const unsubUid = onSnapshot(qUid, processSnapshot, (err) => {
        console.warn("[NotificationBell] recipientUid snapshot notice:", err.message);
      });
      unsubscribers.push(unsubUid);
    } catch (err) {
      console.warn("[NotificationBell] recipientUid query error:", err);
    }

    // 2. Query by recipientUserId
    try {
      const qUserId = query(
        notifsRef,
        where("recipientUserId", "==", currentUid),
        limit(50)
      );
      const unsubUserId = onSnapshot(qUserId, processSnapshot, (err) => {
        console.warn("[NotificationBell] recipientUserId snapshot notice:", err.message);
      });
      unsubscribers.push(unsubUserId);
    } catch (err) {
      console.warn("[NotificationBell] recipientUserId query error:", err);
    }

    // 3. Query by recipientEmail
    if (currentEmail) {
      try {
        const qEmail = query(
          notifsRef,
          where("recipientEmail", "==", currentEmail),
          limit(50)
        );
        const unsubEmail = onSnapshot(qEmail, processSnapshot, (err) => {
          console.warn("[NotificationBell] recipientEmail snapshot notice:", err.message);
        });
        unsubscribers.push(unsubEmail);
      } catch (err) {
        console.warn("[NotificationBell] recipientEmail query error:", err);
      }
    }

    // 4. Query user subcollection notifications/{currentUid}/items
    try {
      const subRef = collection(db, "notifications", currentUid, "items");
      const unsubSub = onSnapshot(subRef, processSnapshot, () => {});
      unsubscribers.push(unsubSub);
    } catch {
      // Subcollection optional
    }

    return () => {
      unsubscribers.forEach((unsub) => {
        try {
          unsub();
        } catch {}
      });
    };
  }, [firebaseUser?.uid, firebaseUser?.email, profile?.email]);

  const unreadCount = notifications.filter((n) => !(n.isRead ?? n.read)).length;
  const displayCount = unreadCount > 9 ? "9+" : unreadCount.toString();

  const handleItemClick = async (item: NotificationItem) => {
    const isCurrentlyRead = item.isRead ?? item.read;

    if (!isCurrentlyRead) {
      try {
        const notifDocRef = doc(db, "notifications", item.id);
        await updateDoc(notifDocRef, { read: true, isRead: true, readAt: new Date() });
      } catch (err) {
        console.error("[NotificationBell] Error marking read:", err);
      }
    }

    setIsOpen(false);

    // Contextual navigation based on notification payload
    const eventId = item.data?.eventId || (item as any).eventId;

    if (item.type === "ADMIN_FACULTY_UPDATE") {
      navigate(item.link || (eventId ? `/faculty/events` : "/faculty/events"));
    } else if (
      item.type === "FACULTY_EVENT_UPDATE" ||
      item.type === "EVENT_UPDATED" ||
      item.type === "EVENT_UPDATE" ||
      item.type === "event_update"
    ) {
      if (eventId) {
        navigate(`/events/${eventId}#updates`);
      } else {
        navigate(item.link || "/my-registrations");
      }
    } else if (item.type === "ACCESS_REQUEST" || item.type === "ACCESS_REQUESTED") {
      navigate("/admin/approvals");
    } else if (item.type === "ROLE_CHANGED") {
      navigate("/");
    } else if (item.link) {
      navigate(item.link);
    } else if (item.data?.link) {
      navigate(item.data.link as string);
    } else if (eventId) {
      navigate(`/events/${eventId}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    try {
      const batch = writeBatch(db);
      notifications
        .filter((n) => !(n.isRead ?? n.read))
        .forEach((item) => {
          const docRef = doc(db, "notifications", item.id);
          batch.update(docRef, { read: true, isRead: true, readAt: new Date() });
        });

      await batch.commit();
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("[NotificationBell] Error marking all read:", err);
      toast.error("Failed to mark all as read");
    }
  };

  const getNotificationBadge = (item: NotificationItem) => {
    const t = item.type;
    if (t === "ADMIN_FACULTY_UPDATE") {
      return (
        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 font-bold bg-purple-50 text-purple-700 border-purple-200">
          Admin Notice
        </Badge>
      );
    }
    if (t === "FACULTY_EVENT_UPDATE" || t === "EVENT_UPDATED" || t === "EVENT_UPDATE" || t === "event_update") {
      return (
        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 font-bold bg-[#E0F3F7] text-[#007A99] border-cyan-200">
          Faculty Update
        </Badge>
      );
    }
    if (t === "EVENT_APPROVED") {
      return (
        <Badge variant="emerald" className="text-[10px] py-0 px-1.5 h-4 font-bold">
          Approved
        </Badge>
      );
    }
    if (t === "EVENT_REJECTED") {
      return (
        <Badge variant="destructive" className="text-[10px] py-0 px-1.5 h-4 font-bold">
          Needs Revision
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 font-semibold text-slate-600">
        Notice
      </Badge>
    );
  };

  const getNotificationIcon = (item: NotificationItem) => {
    const t = item.type;
    if (t === "ADMIN_FACULTY_UPDATE") {
      return <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />;
    }
    if (t === "FACULTY_EVENT_UPDATE" || t === "EVENT_UPDATED" || t === "EVENT_UPDATE" || t === "event_update") {
      return <Megaphone className="w-4 h-4 text-[#007A99] shrink-0" />;
    }
    if (t === "EVENT_APPROVED") {
      return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
    }
    if (t === "EVENT_REJECTED") {
      return <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />;
    }
    return <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />;
  };

  if (!firebaseUser) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications (${unreadCount} unread)`}
          className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#007A99] cursor-pointer"
        >
          <Bell className="w-5 h-5 text-slate-700" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-white bg-[#F5A623] rounded-full border-2 border-white shadow-xs animate-pulse">
              {displayCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={16}
        className="w-[360px] sm:w-[420px] p-0 rounded-2xl shadow-xl border border-slate-200 overflow-hidden bg-white z-50"
      >
        {/* Popover Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/90">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#E0F3F7] text-[#007A99] flex items-center justify-center">
              <Bell className="w-3.5 h-3.5" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-900">Notifications</h4>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E0F3F7] text-[#004D61] border border-cyan-200">
                {unreadCount} new
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-[11px] h-7 px-2.5 text-[#007A99] hover:text-[#004D61] hover:bg-[#E0F3F7] font-bold rounded-lg transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              <span>Mark all as read</span>
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="py-12 px-6 text-center space-y-2 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-300">
                <Inbox className="w-6 h-6 stroke-1" />
              </div>
              <p className="text-xs font-bold text-slate-700">No notifications yet</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                We'll alert you when campus event updates or administrative notices arrive.
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const isItemRead = item.isRead ?? item.read ?? false;
              const dateObj = toDate(item.createdAt);
              const relativeTime = formatDistanceToNow(dateObj, { addSuffix: true });
              const eventContextName = item.eventName || item.eventTitle || item.data?.eventTitle;
              const senderDisplayName = item.senderName || item.data?.senderName || (item.senderRole === "admin" ? "Administration" : "Faculty Coordinator");

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`p-3.5 sm:p-4 text-left cursor-pointer transition-all hover:bg-slate-50/90 flex items-start gap-3 relative ${
                    !isItemRead ? "bg-[#F4FBFD]/80" : "bg-white"
                  }`}
                >
                  {/* Icon & Unread Dot */}
                  <div className="pt-0.5 shrink-0 relative">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center">
                      {getNotificationIcon(item)}
                    </div>
                    {!isItemRead && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#F5A623] ring-2 ring-white" />
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        {getNotificationBadge(item)}
                        {eventContextName && (
                          <span className="text-[11px] font-bold text-[#004D61] truncate max-w-[150px]">
                            {eventContextName}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1 font-medium">
                        <Clock className="w-2.5 h-2.5" />
                        {relativeTime}
                      </span>
                    </div>

                    <h5 className={`text-xs leading-snug line-clamp-1 ${!isItemRead ? "font-extrabold text-slate-900" : "font-bold text-slate-800"}`}>
                      {item.title || item.subject}
                    </h5>

                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                      {item.message || item.body}
                    </p>

                    <div className="pt-0.5 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 font-medium text-slate-500">
                        <UserIcon className="w-2.5 h-2.5 text-[#007A99]" />
                        {senderDisplayName}
                      </span>
                      <span className="text-[#007A99] font-bold inline-flex items-center gap-0.5 hover:underline">
                        <span>View Details</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
