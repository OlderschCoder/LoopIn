import { APP_STORE_URL, GOOGLE_PLAY_URL } from "@/config/storeUrls";
import appStoreBadge from "@/assets/badges/app-store.svg";
import googlePlayBadge from "@/assets/badges/google-play.png";

interface StoreBadgesProps {
  className?: string;
  rating?: number;
  reviewCount?: string;
}

function AppStoreBadge({ href }: { href?: string }) {
  const img = (
    <img
      src={appStoreBadge}
      alt="Download on the App Store"
      width={160}
      height={53}
      className="h-[53px] w-auto"
    />
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
        aria-label="Download on the App Store"
      >
        {img}
      </a>
    );
  }

  return (
    <div
      className="inline-block opacity-40 cursor-not-allowed select-none"
      title="App Store — Coming Soon"
      aria-label="App Store — Coming Soon"
    >
      {img}
    </div>
  );
}

function GooglePlayBadge({ href }: { href?: string }) {
  const img = (
    <img
      src={googlePlayBadge}
      alt="Get it on Google Play"
      width={180}
      height={53}
      className="h-[53px] w-auto"
    />
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
        aria-label="Get it on Google Play"
      >
        {img}
      </a>
    );
  }

  return (
    <div
      className="inline-block opacity-40 cursor-not-allowed select-none"
      title="Google Play — Coming Soon"
      aria-label="Google Play — Coming Soon"
    >
      {img}
    </div>
  );
}

export function StoreBadges({ className = "", rating, reviewCount }: StoreBadgesProps) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-4">
        <AppStoreBadge href={APP_STORE_URL} />
        <GooglePlayBadge href={GOOGLE_PLAY_URL} />
      </div>
      {rating != null && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`w-4 h-4 ${
                  star <= Math.floor(rating)
                    ? "text-amber-400"
                    : star - 0.5 <= rating
                    ? "text-amber-400 opacity-60"
                    : "text-muted-foreground/30"
                }`}
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </span>
          <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
          {reviewCount && (
            <span>· {reviewCount} reviews</span>
          )}
        </div>
      )}
    </div>
  );
}
