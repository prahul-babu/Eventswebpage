import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, Inbox, ExternalLink } from "lucide-react";
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
}

export const NotificationBell: React.FC = () => {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!firebaseUser?.uid) {
      setNotifications([]);
      return;
    }

    // Query recent notifications for current user
    const notifsRef = collection(db, "notifications");
    const q = query(
      notifsRef,
      where("recipientUid", "==", firebaseUser.uid),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: NotificationItem[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as AdminNotification),
        }));
        setNotifications(items);
      },
      (err) => {
        console.warn("[NotificationBell] Snapshot notice:", err.message);
      }
    );

    return () => unsubscribe();
  }, [firebaseUser?.uid]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayCount = unreadCount > 9 ? "9+" : unreadCount.toString();

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.read) {
      try {
        const notifDocRef = doc(db, "notifications", item.id);
        await updateDoc(notifDocRef, { read: true });
      } catch (err) {
        console.error("[NotificationBell] Error marking read:", err);
      }
    }

    setIsOpen(false);

    // Contextual navigation based on notification payload
    if (item.type === "ACCESS_REQUEST") {
      navigate("/admin/approvals");
    } else if (item.type === "ROLE_CHANGED") {
      navigate("/");
    } else if (item.data?.link) {
      navigate(item.data.link as string);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    try {
      const batch = writeBatch(db);
      notifications
        .filter((n) => !n.read)
        .forEach((item) => {
          const docRef = doc(db, "notifications", item.id);
          batch.update(docRef, { read: true });
        });

      await batch.commit();
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("[NotificationBell] Error marking all read:", err);
      toast.error("Failed to mark all as read");
    }
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
          className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-amber-500 rounded-full border-2 border-white animate-pulse">
              {displayCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 sm:w-96 p-0 rounded-2xl shadow-2xl border-slate-200">
        {/* Popover Header */}
        <div className="flex items-center justify-between p-4 border-b bg-slate-50/70 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm text-slate-900">Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="amber" className="text-[10px] py-0 px-1.5 h-4">
                {unreadCount} new
              </Badge>
            )}
          </div>

          {unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-[11px] h-7 px-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              <span>Mark all read</span>
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="p-8 text-center space-y-2 text-slate-400">
              <Inbox className="w-8 h-8 mx-auto stroke-1 text-slate-300" />
              <p className="text-xs font-medium">No notifications yet</p>
              <p className="text-[11px] text-slate-400">We'll alert you when campus updates arrive.</p>
            </div>
          ) : (
            notifications.map((item) => {
              const dateObj = toDate(item.createdAt);
              const relativeTime = formatDistanceToNow(dateObj, { addSuffix: true });

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`p-3.5 text-left cursor-pointer transition-colors hover:bg-slate-50 flex items-start gap-3 ${
                    !item.read ? "bg-indigo-50/40" : ""
                  }`}
                >
                  <div className="pt-0.5 shrink-0">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        !item.read ? "bg-amber-500 ring-4 ring-amber-100" : "bg-slate-300"
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs truncate ${!item.read ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0">{relativeTime}</span>
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                  </div>

                  <ExternalLink className="w-3 h-3 text-slate-300 shrink-0 self-center" />
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
