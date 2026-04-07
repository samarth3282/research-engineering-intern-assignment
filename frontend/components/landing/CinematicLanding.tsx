"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const FRAME_COUNT = 480;

function buildFrameName(index: number) {
  return `frame_${String(index + 1).padStart(4, "0")}.png`;
}

function buildFrameUrl(index: number) {
  return `/frames/${buildFrameName(index)}`;
}

export function CinematicLanding() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageCacheRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const pendingLoadsRef = useRef<Map<number, Promise<HTMLImageElement>>>(new Map());
  const activeFrameRef = useRef(0);
  const lastDrawnRef = useRef(-1);
  const [isReady, setIsReady] = useState(false);

  const pruneCache = useCallback((centerIndex: number) => {
    const keepDistance = 24;
    const cache = imageCacheRef.current;

    for (const key of cache.keys()) {
      if (Math.abs(key - centerIndex) > keepDistance) {
        const img = cache.get(key);
        if (img) img.src = "";
        cache.delete(key);
      }
    }
  }, []);

  const loadFrame = useCallback(async (index: number) => {
    const safeIndex = Math.max(0, Math.min(index, FRAME_COUNT - 1));
    const cached = imageCacheRef.current.get(safeIndex);

    if (cached) {
      return cached;
    }

    const existingPending = pendingLoadsRef.current.get(safeIndex);
    if (existingPending) {
      return existingPending;
    }

    const image = new Image();
    image.decoding = "async";

    const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      image.onload = () => {
        pendingLoadsRef.current.delete(safeIndex);
        imageCacheRef.current.set(safeIndex, image);
        resolve(image);
      };
      image.onerror = () => {
        pendingLoadsRef.current.delete(safeIndex);
        reject(new Error(`Failed to load frame ${safeIndex}.`));
      };
    });

    pendingLoadsRef.current.set(safeIndex, loadPromise);
    image.src = buildFrameUrl(safeIndex);
    return loadPromise;
  }, []);

  const drawImageCover = useCallback((image: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(rect.width * pixelRatio));
    const height = Math.max(1, Math.floor(rect.height * pixelRatio));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    if (!image.naturalWidth || !image.naturalHeight) {
      return;
    }

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);

    const scale = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
    const renderWidth = image.naturalWidth * scale;
    const renderHeight = image.naturalHeight * scale;
    const offsetX = (rect.width - renderWidth) / 2;
    const offsetY = (rect.height - renderHeight) / 2;

    try {
      context.drawImage(image, offsetX, offsetY, renderWidth, renderHeight);
    } catch {
      // Ignore decoded data loss crashes in heavily memory-constrained browsers
    }
  }, []);

  const drawFrame = useCallback(
    async (index: number) => {
      // 1. Try to fast-draw synchronously if it's already completely loaded and cached
      const cached = imageCacheRef.current.get(index);
      if (cached && cached.complete) {
        const currentDist = Math.abs(index - activeFrameRef.current);
        const lastDist = lastDrawnRef.current === -1 ? Infinity : Math.abs(lastDrawnRef.current - activeFrameRef.current);

        if (currentDist <= lastDist) {
          drawImageCover(cached);
          lastDrawnRef.current = index;
        }
        return;
      }

      // 2. Not cached: trigger async load
      try {
        const image = await loadFrame(index);
        
        // 3. Ensure we still want it (user hasn't scrubbed far away)
        const currentDist = Math.abs(index - activeFrameRef.current);
        const lastDist = lastDrawnRef.current === -1 ? Infinity : Math.abs(lastDrawnRef.current - activeFrameRef.current);

        if (currentDist <= lastDist) {
          drawImageCover(image);
          lastDrawnRef.current = index;
        }
      } catch {
        // Ignore missing frames and keep rendering the previous one.
      }
    },
    [drawImageCover, loadFrame],
  );

  const preloadNearbyFrames = useCallback(
    (centerIndex: number) => {
      // Much more aggressive forward preload for fast scrolls
      const start = Math.max(0, centerIndex - 2);
      const end = Math.min(FRAME_COUNT - 1, centerIndex + 14);

      pruneCache(centerIndex);

      for (let index = start; index <= end; index += 1) {
        if (!imageCacheRef.current.has(index) && !pendingLoadsRef.current.has(index)) {
          void loadFrame(index).catch(() => undefined);
        }
      }
    },
    [loadFrame, pruneCache],
  );

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const sticky = stickyRef.current;

    if (!wrapper || !sticky) {
      return;
    }

    let isMounted = true;

    const refreshCanvas = () => {
      const cachedFrame = imageCacheRef.current.get(activeFrameRef.current);
      if (cachedFrame) {
        drawImageCover(cachedFrame);
        lastDrawnRef.current = activeFrameRef.current;
      } else {
        const fallback = imageCacheRef.current.get(lastDrawnRef.current);
        if (fallback) drawImageCover(fallback);
        void drawFrame(activeFrameRef.current);
      }
    };

    void loadFrame(0)
      .then((image) => {
        if (!isMounted) {
          return;
        }

        imageCacheRef.current.set(0, image);
        drawImageCover(image);
        setIsReady(true);
        preloadNearbyFrames(0);
      })
      .catch(() => undefined);

    const context = gsap.context(() => {
      const playhead = { frame: 0 };

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: wrapper,
          start: "top top",
          end: () => `+=${window.innerHeight * 7}`,
          scrub: true,
        },
      });

      timeline.to(
        playhead,
        {
          frame: FRAME_COUNT - 1,
          duration: 8,
          ease: "none",
          onUpdate: () => {
            const nextFrame = Math.round(playhead.frame);
            if (nextFrame === activeFrameRef.current) {
              return;
            }

            activeFrameRef.current = nextFrame;
            void drawFrame(nextFrame);
            preloadNearbyFrames(nextFrame);
          },
        },
        0,
      );

      timeline.fromTo(
        ".landing-hero",
        { opacity: 0, y: 54, filter: "blur(20px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.3, ease: "power2.out" },
        0.25,
      );

      timeline.fromTo(
        ".landing-card-1",
        { opacity: 0, y: 44, filter: "blur(18px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, ease: "power1.out" },
        1.3,
      );

      timeline.fromTo(
        ".landing-card-2",
        { opacity: 0, y: 44, filter: "blur(18px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, ease: "power1.out" },
        1.95,
      );

      timeline.fromTo(
        ".landing-card-3",
        { opacity: 0, y: 44, filter: "blur(18px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, ease: "power1.out" },
        2.6,
      );

      timeline.fromTo(
        ".landing-cta",
        { opacity: 0, y: 36, filter: "blur(14px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.95, ease: "power1.out" },
        4.45,
      );
    }, wrapper);

    window.addEventListener("resize", refreshCanvas);

    return () => {
      isMounted = false;
      window.removeEventListener("resize", refreshCanvas);
      context.revert();
    };
  }, [drawFrame, drawImageCover, loadFrame, preloadNearbyFrames]);

  return (
    <div className="theme-safe relative">
      <section ref={wrapperRef} className="relative min-h-[800vh]">
        <div ref={stickyRef} className="sticky top-0 h-screen w-full overflow-hidden bg-[#04080f]">
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(210,93,53,0.32),transparent_38%),radial-gradient(circle_at_88%_18%,rgba(14,71,166,0.24),transparent_40%),radial-gradient(circle_at_62%_78%,rgba(116,28,48,0.23),transparent_40%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/36 via-black/16 to-black/72" />

          {!isReady ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#04080f]/88">
              <div className="rounded-full border border-white/35 bg-white/15 px-4 py-1 text-xs uppercase tracking-[0.32em] text-white/90 backdrop-blur-md">
                Loading Narrative Sequence
              </div>
            </div>
          ) : null}

          <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col justify-between p-6 pb-10 pt-8 lg:p-12">
            <div className="landing-hero max-w-2xl rounded-3xl border border-white/35 bg-white/[0.14] p-6 text-white shadow-[0_26px_80px_rgba(2,8,20,0.5)] backdrop-blur-2xl">
              <p className="mb-3 text-xs uppercase tracking-[0.34em] text-white/75">SimPPL</p>
              <h1 className="text-3xl font-semibold leading-tight md:text-5xl">Scroll Through the Political Narrative as It Forms</h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/80 md:text-base">
                Move through the frame stream to reveal hidden discourse structures, coalition shifts, and sentiment transitions in one cinematic timeline.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <article className="landing-card-1 rounded-2xl border border-white/30 bg-white/[0.12] p-5 text-white shadow-[0_18px_56px_rgba(2,8,20,0.46)] backdrop-blur-xl">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Signal Density</p>
                <p className="mt-2 text-xl font-medium">Narrative Clusters</p>
                <p className="mt-2 text-sm text-white/75">See themes condense and split as communities react in real time.</p>
              </article>

              <article className="landing-card-2 rounded-2xl border border-white/30 bg-white/[0.12] p-5 text-white shadow-[0_18px_56px_rgba(2,8,20,0.46)] backdrop-blur-xl">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Interaction Drift</p>
                <p className="mt-2 text-xl font-medium">Network Motion</p>
                <p className="mt-2 text-sm text-white/75">Track the velocity of opinion migration and bridge communities.</p>
              </article>

              <article className="landing-card-3 rounded-2xl border border-white/30 bg-white/[0.12] p-5 text-white shadow-[0_18px_56px_rgba(2,8,20,0.46)] backdrop-blur-xl">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Narrative Intelligence</p>
                <p className="mt-2 text-xl font-medium">Explorable Context</p>
                <p className="mt-2 text-sm text-white/75">Pivot from cinematic overview directly into grounded source evidence.</p>
              </article>
            </div>

            <div className="landing-cta flex justify-end">
              <a
                href="/explore"
                className="rounded-full border border-white/45 bg-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                Enter SimPPL
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
