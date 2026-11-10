import React from "react";

export interface ByteHubLogoProps {
  /**
   * - "light": Primary logo for light backgrounds (Dark "Byte" + Blue "HUB")
   * - "dark": Inverted logo for dark backgrounds (White "Byte" + Golden-Amber "HUB")
   * - "mark": Standalone network node symbol
   * - "app-icon": Dark squircle container badge with symbol inside
   */
  variant?: "light" | "dark" | "mark" | "app-icon";
  /** Preset sizes */
  size?: "sm" | "md" | "lg" | "xl";
  /** Optional tagline ("TRAIN. INTERN. LAUNCH.") */
  withTagline?: boolean;
  /** Custom extra CSS classes */
  className?: string;
  /** Custom height in pixels (overrides size preset) */
  height?: number;
}

const SIZE_HEIGHTS: Record<"sm" | "md" | "lg" | "xl", number> = {
  sm: 28,
  md: 38,
  lg: 48,
  xl: 64,
};

/**
 * ByteHUB Network Hub Symbol
 * Central blue circle with 8 radiating nodes, featuring an amber milestone node with dashed path.
 */
export const ByteHubSymbol: React.FC<{
  isDark?: boolean;
  className?: string;
  size?: number;
}> = ({ isDark = false, className = "", size = 48 }) => {
  const nodeFill = isDark ? "#FFFFFF" : "#0A1128";
  const spokeStroke = "#2563EB";
  const amberColor = "#F59E0B";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Radiating Spokes from Center (70, 70) */}
      {/* 1. Spoke to top (70, 28) */}
      <line x1="70" y1="70" x2="70" y2="28" stroke={spokeStroke} strokeWidth="2.5" />
      {/* 2. Spoke to upper-right (108, 34) - Special Amber Destination with Dashed Line */}
      <line
        x1="70"
        y1="70"
        x2="108"
        y2="34"
        stroke={amberColor}
        strokeWidth="2.5"
        strokeDasharray="4 3"
      />
      {/* 3. Spoke to right (114, 70) */}
      <line x1="70" y1="70" x2="114" y2="70" stroke={spokeStroke} strokeWidth="2.5" />
      {/* 4. Spoke to bottom-right (98, 102) */}
      <line x1="70" y1="70" x2="98" y2="102" stroke={spokeStroke} strokeWidth="2.5" />
      {/* 5. Spoke to bottom (70, 114) */}
      <line x1="70" y1="70" x2="70" y2="114" stroke={spokeStroke} strokeWidth="2.5" />
      {/* 6. Spoke to bottom-left (40, 104) */}
      <line x1="70" y1="70" x2="40" y2="104" stroke={spokeStroke} strokeWidth="2.5" />
      {/* 7. Spoke to left (26, 70) */}
      <line x1="70" y1="70" x2="26" y2="70" stroke={spokeStroke} strokeWidth="2.5" />
      {/* 8. Spoke to top-left (38, 38) */}
      <line x1="70" y1="70" x2="38" y2="38" stroke={spokeStroke} strokeWidth="2.5" />

      {/* Central Blue Hub Node */}
      <circle cx="70" cy="70" r="18" fill="#2563EB" />

      {/* Outer Nodes */}
      {/* Top node */}
      <circle cx="70" cy="28" r="8" fill={nodeFill} />
      {/* Upper-right Amber Node */}
      <circle cx="108" cy="34" r="9" fill={amberColor} />
      {/* Right small node */}
      <circle cx="114" cy="70" r="4" fill={nodeFill} />
      {/* Bottom-right small node */}
      <circle cx="98" cy="102" r="4.5" fill={nodeFill} />
      {/* Bottom node */}
      <circle cx="70" cy="114" r="5.5" fill={nodeFill} />
      {/* Bottom-left node */}
      <circle cx="40" cy="104" r="6" fill={nodeFill} />
      {/* Left node */}
      <circle cx="26" cy="70" r="6.5" fill={nodeFill} />
      {/* Top-left node */}
      <circle cx="38" cy="38" r="7.5" fill={nodeFill} />
    </svg>
  );
};

/**
 * Squircle App Icon Badge
 * Dark navy squircle container hosting the ByteHUB symbol.
 */
export const ByteHubAppIcon: React.FC<{
  size?: number;
  className?: string;
}> = ({ size = 48, className = "" }) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center bg-[#0A1128] rounded-[22%] shadow-sm overflow-hidden flex-shrink-0 ${className}`}
      aria-label="ByteHUB App Icon"
    >
      <ByteHubSymbol isDark size={Math.round(size * 0.78)} />
    </div>
  );
};

/**
 * Main Scalable ByteHUB Logo Component
 */
export const ByteHubLogo: React.FC<ByteHubLogoProps> = ({
  variant = "light",
  size = "md",
  withTagline = false,
  className = "",
  height,
}) => {
  const pixelHeight = height || SIZE_HEIGHTS[size];
  const isDark = variant === "dark";

  // If standalone mark is requested
  if (variant === "mark") {
    return <ByteHubSymbol isDark={false} size={pixelHeight} className={className} />;
  }

  // If squircle app icon badge is requested
  if (variant === "app-icon") {
    return <ByteHubAppIcon size={pixelHeight} className={className} />;
  }

  const byteColor = isDark ? "#FFFFFF" : "#0A1128";
  const hubColor = isDark ? "#F59E0B" : "#2563EB";
  const taglineColor = isDark ? "#94A3B8" : "#475569";

  // Symbol size proportional to height
  const symbolSize = Math.round(pixelHeight * (withTagline ? 1.05 : 1.0));

  return (
    <div
      className={`inline-flex items-center gap-3 select-none ${className}`}
      style={{ height: pixelHeight }}
      aria-label="ByteHUB — Train. Intern. Launch."
      role="img"
    >
      {/* Network Symbol */}
      <div className="flex-shrink-0 flex items-center justify-center">
        <ByteHubSymbol isDark={isDark} size={symbolSize} />
      </div>

      {/* Wordmark & Optional Tagline */}
      <div className="flex flex-col justify-center leading-none">
        <div
          className="font-heading font-black tracking-tight flex items-baseline"
          style={{ fontSize: `${Math.round(pixelHeight * 0.64)}px`, lineHeight: 1 }}
        >
          <span style={{ color: byteColor }}>Byte</span>
          <span style={{ color: hubColor }}>HUB</span>
        </div>

        {withTagline && (
          <div
            className="font-mono uppercase font-bold tracking-[0.24em] mt-1"
            style={{
              color: taglineColor,
              fontSize: `${Math.max(8, Math.round(pixelHeight * 0.17))}px`,
            }}
          >
            TRAIN. INTERN. LAUNCH.
          </div>
        )}
      </div>
    </div>
  );
};

export default ByteHubLogo;
