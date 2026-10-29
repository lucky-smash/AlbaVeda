import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export const ArrowRight = (p: P) => (
  <svg {...base} className="arrow" {...p}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);
export const ArrowDown = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 4v15M6 13l6 6 6-6" />
  </svg>
);
export const Bag = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 8h14l-1.2 12H6.2L5 8Z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </svg>
);
export const Search = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);
export const Menu = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 8h16M4 16h16" />
  </svg>
);
export const Close = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const Plus = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const Minus = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 12h14" />
  </svg>
);
export const Check = (p: P) => (
  <svg {...base} {...p}>
    <path d="m5 12.5 4.2 4.2L19 7" />
  </svg>
);
export const External = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5" />
  </svg>
);
/** Sprig drawn for this site — echoes, but does not reproduce, the logo's leaf. */
export const Sprig = (p: P) => (
  <svg viewBox="0 0 64 64" aria-hidden fill="currentColor" {...p}>
    <path d="M10 56C24 44 34 30 52 8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M22 44c-8-1-13-6-14-12 7 0 13 4 14 12Z" />
    <path d="M24 42c1-8 6-13 12-14 0 7-4 13-12 14Z" />
    <path d="M31 33c-7-2-11-7-11-13 6 1 11 6 11 13Z" />
    <path d="M33 31c2-7 7-11 13-11-1 6-6 11-13 11Z" />
    <path d="M40 22c-5-3-7-8-6-13 5 2 8 7 6 13Z" />
    <path d="M42 20c3-5 8-8 13-7-2 5-7 8-13 7Z" />
  </svg>
);
