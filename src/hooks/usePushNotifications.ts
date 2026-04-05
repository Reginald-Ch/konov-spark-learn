import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// VAPID public key generated for this project
const VAPID_PUBLIC_KEY = "BI3C64tzgI4LIQnaj6e-roiWw4Kur4hVEtKjN_BIWWGyqcITBGeoIwZhLKkb-iPa9frRWjx0y9ia4Qjjxfttlkk";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const isSupported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

  const subscribe = async (waitlistSignupId?: string) => {
    if (!isSupported) return false;
    setIsSubscribing(true);

    try {
      const registration = await navigator.serviceWorker.register("/push-sw.js");
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setIsSubscribing(false);
        return false;
      }

      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      const subJson = subscription.toJSON();

      const { error } = await supabase.from("push_subscriptions").insert({
        endpoint: subJson.endpoint!,
        p256dh: subJson.keys!.p256dh!,
        auth: subJson.keys!.auth!,
        waitlist_signup_id: waitlistSignupId || null,
      });

      if (error && error.code !== "23505") {
        console.error("Failed to save push subscription:", error);
        setIsSubscribing(false);
        return false;
      }

      setIsSubscribed(true);
      setIsSubscribing(false);
      return true;
    } catch (err) {
      console.error("Push subscription failed:", err);
      setIsSubscribing(false);
      return false;
    }
  };

  return { subscribe, isSubscribing, isSubscribed, isSupported };
}
