import React from "react";

/**
 * Wink logo — a winking smiley.
 * Left eye: filled dot (open)
 * Right eye: curved arc (the wink)
 * Plus a rounded smile
 * From wink-design 2015ca5
 */
export function WinkLogo({
  size = 40,
  glow = true,
  className = "",
}: {
  size?: number;
  glow?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      style={{ filter: glow ? "drop-shadow(0 0 6px rgba(255,31,61,0.65)) drop-shadow(0 0 18px rgba(255,31,61,0.35))" : undefined }}
      aria-hidden="true"
    >
      <circle cx="22" cy="24" r="5.5" fill="#ff1f3d" />
      <path
        d="M37 26 Q44 18 51 26"
        stroke="#ff1f3d"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M16 38 Q32 54 48 38"
        stroke="#ff1f3d"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function WinkWordmark({
  height = 32,
  className = "",
  glow = true,
}: {
  height?: number;
  className?: string;
  glow?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 180 60"
      height={height}
      className={className}
      style={{
        filter: glow
          ? "drop-shadow(0 0 4px rgba(255,31,61,0.7)) drop-shadow(0 0 14px rgba(255,31,61,0.45))"
          : undefined,
      }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="winkStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff3355" />
          <stop offset="100%" stopColor="#ff5470" />
        </linearGradient>
      </defs>
      <text
        x="0"
        y="44"
        fontFamily="Bricolage Grotesque, sans-serif"
        fontSize="48"
        fontWeight="700"
        letterSpacing="-3"
        fill="none"
        stroke="url(#winkStroke)"
        strokeWidth="1.4"
      >
        wink
      </text>
    </svg>
  );
}

export function WinkLockup({
  size = 36,
  textHeight = 28,
  showText = true,
  className = "",
}: {
  size?: number;
  textHeight?: number;
  showText?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <WinkLogo size={size} />
      {showText && <WinkWordmark height={textHeight} />}
    </div>
  );
}
