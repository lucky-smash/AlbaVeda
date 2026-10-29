/**
 * The original Alba trademark artwork, unaltered (only its transparent margin
 * is trimmed). It sits directly on the page: the letters' white fill and the
 * white "TM" pill are part of the artwork, so it reads on ivory and dark soil alike.
 */
export function Logo({ width = 104, className = "" }: { width?: number; className?: string }) {
  return (
    <span className={`logo ${className}`}>
      <img src="/brand/alba-logo-trim.png" alt="Alba" width={222} height={140} style={{ width }} decoding="async" />
    </span>
  );
}
