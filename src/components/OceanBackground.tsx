import { useEffect, useRef } from "react";
// Lightweight (~1MB) compressed loop — fast to load, smooth playback
import oceanVideoUrl from "@/assets/ocean-loop-light.mp4";

/**
 * Ping-pong loop: plays forward, decelerates near the end, reverses,
 * decelerates near the start, and repeats indefinitely.
 */
export const OceanBackground = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const directionRef = useRef<1 | -1>(1);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const BASE_SPEED = 1; // seconds of video per real second at full speed
    const EASE_WINDOW = 1.2; // seconds near edges where we slow down
    const MIN_SPEED = 0.15; // never fully stop

    const computeSpeed = (time: number, duration: number, dir: 1 | -1) => {
      const distFromEdge = dir === 1 ? duration - time : time;
      if (distFromEdge >= EASE_WINDOW) return BASE_SPEED;
      const t = Math.max(0, distFromEdge) / EASE_WINDOW; // 0..1
      // ease-in-out cubic
      const eased = t * t * (3 - 2 * t);
      return MIN_SPEED + (BASE_SPEED - MIN_SPEED) * eased;
    };

    const tick = (ts: number) => {
      if (!video.duration || isNaN(video.duration)) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;

      const dir = directionRef.current;
      const speed = computeSpeed(video.currentTime, video.duration, dir);

      if (dir === 1) {
        // Forward: let the video play normally with eased rate
        video.playbackRate = speed;
        if (video.paused) video.play().catch(() => {});
        if (video.currentTime >= video.duration - 0.05) {
          directionRef.current = -1;
          video.pause();
        }
      } else {
        // Reverse: manually rewind currentTime (browsers don't support negative playbackRate reliably)
        if (!video.paused) video.pause();
        let next = video.currentTime - speed * dt;
        if (next <= 0.05) {
          next = 0.05;
          directionRef.current = 1;
          video.currentTime = next;
          video.play().catch(() => {});
        } else {
          video.currentTime = next;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    const start = () => {
      video.play().catch(() => {});
      rafRef.current = requestAnimationFrame(tick);
    };

    if (video.readyState >= 1) start();
    else video.addEventListener("loadedmetadata", start, { once: true });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      video.removeEventListener("loadedmetadata", start);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover opacity-60"
        autoPlay
        muted
        playsInline
        preload="auto"
      >
        <source src={oceanVideoUrl} type="video/mp4" />
      </video>
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
