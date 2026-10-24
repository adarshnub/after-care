import Image from "next/image";

export const productScreens = {
  patient: "/showcase/patient-overview-desktop.png",
  caregiver: "/showcase/caregiver-shared-progress.png",
  nurse: "/showcase/nurse-workspace-desktop.png",
  mobile: "/showcase/patient-overview-mobile.png",
  medications: "/showcase/patient-medications-desktop.png",
  appointments: "/showcase/patient-appointments-desktop.png",
  assistant: "/showcase/patient-assistant-desktop.png",
  review: "/showcase/nurse-ai-review.png",
} as const;

export function ProductBrowser({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`product-browser ${className}`}>
      <div className="browser-chrome" aria-hidden="true">
        <span />
        <span />
        <span />
        <div>aftercare · your recovery, together</div>
        <i />
      </div>
      <div className="browser-picture">
        <Image
          src={src}
          alt={alt}
          width={1440}
          height={1158}
          sizes="(max-width: 760px) 90vw, 850px"
          {...(priority ? { preload: true } : {})}
        />
      </div>
    </div>
  );
}

export function ProductPhone({
  className = "",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`product-phone ${className}`}>
      <div className="phone-camera" aria-hidden="true" />
      <Image
        src={productScreens.mobile}
        width={390}
        height={844}
        alt="After Care patient mobile app showing a fictional recovery plan"
        sizes="(max-width: 760px) 220px, 290px"
        {...(priority ? { preload: true } : {})}
      />
      <span className="phone-home" aria-hidden="true" />
    </div>
  );
}

export function CareFlower({ className = "" }: { className?: string }) {
  return (
    <div className={`care-flower ${className}`} aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <i key={i} style={{ rotate: `${i * 60}deg` }} />
      ))}
      <span />
    </div>
  );
}
