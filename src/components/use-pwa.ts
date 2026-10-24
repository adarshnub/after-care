"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function usePwa() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null),
    [installed, setInstalled] = useState(false);
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const before = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", before);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", before);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  async function install() {
    if (!prompt) return false;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    setPrompt(null);
    return choice.outcome === "accepted";
  }
  async function enableNotifications() {
    if (
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    )
      throw new Error(
        "Web Push isn’t available here. On iPhone, install After Care from Safari first.",
      );
    const { publicKey } = await api<{ publicKey: string | null }>(
      "/api/notifications",
    );
    if (!publicKey)
      throw new Error(
        "Background notifications will be available after your hospital connects Supabase and Web Push.",
      );
    const permission = await Notification.requestPermission();
    if (permission !== "granted")
      throw new Error(
        "Allow notifications in your browser settings to receive care reminders.",
      );
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const padded = publicKey + "=".repeat((4 - (publicKey.length % 4)) % 4);
      const bytes = Uint8Array.from(
        atob(padded.replace(/-/g, "+").replace(/_/g, "/")),
        (c) => c.charCodeAt(0),
      );
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: bytes,
      });
    }
    await api("/api/notifications", subscription.toJSON());
  }
  async function disableNotifications() {
    if (!("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await api(
        "/api/notifications",
        { endpoint: subscription.endpoint },
        "DELETE",
      );
      await subscription.unsubscribe();
    }
  }
  return {
    installed,
    canInstall: Boolean(prompt),
    install,
    enableNotifications,
    disableNotifications,
  };
}
