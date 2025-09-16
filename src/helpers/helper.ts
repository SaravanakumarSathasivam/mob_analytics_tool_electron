export const isAnalyticsEvent = (event: any) => {
  const host = (event.host || "").toLowerCase();

  // Google
  if (host.includes("google-analytics.com")) return true;
  if (host.includes("analytics.google.com")) return true;
  if (host.includes("googletagmanager.com")) return true;

  // Firebase
  if (host.includes("firebase")) return true;
  if (host.includes("crashlytics")) return true;

  // Adobe
  if (host.includes("omtrdc.net")) return true;
  if (host.includes("adobedc.net")) return true;
  if (host.includes("2o7.net")) return true;

  // Mixpanel / Segment / Amplitude etc
  if (host.includes("mixpanel.com")) return true;
  if (host.includes("segment.io")) return true;
  if (host.includes("amplitude.com")) return true;

  return false;
};
