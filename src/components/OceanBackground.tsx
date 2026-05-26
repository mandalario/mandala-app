import { useEffect, useRef } from "react";
// Lightweight (~1MB) compressed loop — fast to load, smooth playback
import oceanVideoUrl from "@/assets/ocean-loop-light.mp4";

/** Full-screen ocean loop behind page content (see `.ocean-bg` in index.css). */
export const OceanBackground = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const play = () => {
      video.playbackRate = 1;
      void video.play().catch(() => {});
    };

    video.addEventListener("canplay", play, { once: true });
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) play();

    return () => video.removeEventListener("canplay", play);
  }, []);

  return (
    <div
      className="ocean-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <video
        ref={videoRef}
        src={oceanVideoUrl}
        className="absolute inset-0 h-full w-full object-cover opacity-60"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      />
      {/* Color overlays for depth + readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/55 to-background/85" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at top, hsl(195 100% 55% / 0.15), transparent 60%)",
        }}
      />
    </div>
  );
};
