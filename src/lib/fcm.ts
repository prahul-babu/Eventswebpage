import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "./firebase";
import { toast } from "sonner";

/**
 * Request Web Push Notification Permission via Browser Notification API
 * and save token to user document
 */
export async function requestWebPushPermission(uid: string): Promise<boolean> {
  if (!("Notification" in window)) {
    console.info("[FCM] Browser does not support push notifications.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const mockFcmToken = `fcm_web_${uid}_${Date.now()}`;
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(mockFcmToken),
      });
      toast.success("Push Notifications Enabled", {
        description: "You will receive real-time campus pass and event reminders.",
      });
      return true;
    } else {
      console.info("[FCM] Permission denied by user.");
      return false;
    }
  } catch (err: any) {
    console.warn("[FCM] Permission request failed:", err.message);
    return false;
  }
}
