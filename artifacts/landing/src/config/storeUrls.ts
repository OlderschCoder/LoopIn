/**
 * App store listing URLs.
 *
 * Set these environment variables to activate the download buttons.
 * Until a URL is configured the button renders in "Coming soon" state.
 *
 *   VITE_APP_STORE_URL   – Apple App Store listing URL
 *   VITE_GOOGLE_PLAY_URL – Google Play Store listing URL
 */

export const APP_STORE_URL: string | undefined =
  import.meta.env.VITE_APP_STORE_URL || undefined;

export const GOOGLE_PLAY_URL: string | undefined =
  import.meta.env.VITE_GOOGLE_PLAY_URL || undefined;
