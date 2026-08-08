import { useState, useEffect } from "react";
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

interface SubscribeOptions {
  waitlistSignupId?: string;
  participantEmail?: string;
  topics?: string[];
}

export function usePushNotifications() {
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const isSupported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

  // Reflect an existing browser subscription on mount, instead of always
  // showing "off" and letting someone re-click a button that already worked.
  useEffect(() => {
    if (!isSupported) return;
    let cancelled = false;
    (async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration("/push-sw.js");
        const existing = await registration?.pushManager.getSubscription();
        if (!cancelled && existing) setIsSubscribed(true);
      } catch {
        // No existing registration/subscription — leave isSubscribed false.
      }
    })();
    return () => { cancelled = true; };
  }, [isSupported]);

  const subscribe = async (options: SubscribeOptions = {}) => {
    const { waitlistSignupId, participantEmail, topics } = options;
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

      // Upsert on endpoint — a plain insert would silently no-op on the
      // unique-endpoint conflict, so re-subscribing with a new topic (e.g.
      // "community") on a browser that already had a waitlist subscription
      // would report success without actually saving the new topic.
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({
          endpoint: subJson.endpoint!,
          p256dh: subJson.keys!.p256dh!,
          auth: subJson.keys!.auth!,
          waitlist_signup_id: waitlistSignupId || null,
          participant_email: participantEmail || null,
          topics: topics || [],
        }, { onConflict: "endpoint" });

      if (error) {
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

  // The bell button used to only ever go one direction — once subscribed it
  // disabled itself permanently, with no way to turn notifications back off.
  const unsubscribe = async () => {
    if (!isSupported) return false;
    try {
      const registration = await navigator.serviceWorker.getRegistration("/push-sw.js");
      const existing = await registration?.pushManager.getSubscription();
      if (existing) {
        const endpoint = existing.endpoint;
        await existing.unsubscribe();
        await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
      }
      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error("Push unsubscribe failed:", err);
      return false;
    }
  };

  return { subscribe, unsubscribe, isSubscribing, isSubscribed, isSupported };
}
