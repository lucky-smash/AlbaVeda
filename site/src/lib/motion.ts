import { useEffect, useRef, useSyncExternalStore } from "react";

const RM_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeRM(cb: () => void) {
  const mq = window.matchMedia(RM_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeRM,
    () => window.matchMedia(RM_QUERY).matches,
    () => false,
  );
}

export type StageTier = "full" | "lite" | "static";

/**
 * Decide how much of the 3D stage a device gets.
 *  full   — desktop/laptop GPUs: shadows, dense particles
 *  lite   — phones/tablets and modest hardware: no shadows, fewer particles, DPR ≤ 1.5
 *  static — no WebGL, reduced motion, data-saver, or very weak hardware: layered 2.5D images
 */
export function detectStageTier(): StageTier {
  if (window.matchMedia(RM_QUERY).matches) return "static";
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return "static";
  if (!hasWebGL()) return "static";
  const cores = nav.hardwareConcurrency ?? 4;
  if (cores <= 2 || (nav.deviceMemory !== undefined && nav.deviceMemory <= 2)) return "static";
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = window.innerWidth < 900;
  if (coarse || small || cores <= 4 || (nav.deviceMemory !== undefined && nav.deviceMemory <= 4)) return "lite";
  return "full";
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Adds `.is-in` to every [data-reveal] descendant when it enters the viewport.
 * One-shot: elements stay revealed when scrolling back up (avoids text flicker).
 */
export function useReveal<T extends HTMLElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}
