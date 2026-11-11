import React from "react";

/** Small line icons for the admin console (24×24 grid, drawn with the current text colour). */
export type IconComponent = (props: { className?: string }) => React.ReactElement;

function icon(paths: React.ReactNode): IconComponent {
  const Icon: IconComponent = ({ className = "h-4 w-4" }) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {paths}
    </svg>
  );
  return Icon;
}

export const IconOverview = icon(
  <>
    <rect x="3" y="3" width="7.5" height="7.5" />
    <rect x="13.5" y="3" width="7.5" height="7.5" />
    <rect x="3" y="13.5" width="7.5" height="7.5" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" />
  </>
);

export const IconBriefcase = icon(
  <>
    <rect x="3" y="7" width="18" height="13" />
    <path d="M8.5 7V4h7v3" />
    <path d="M3 12.5h18" />
  </>
);

export const IconUsers = icon(
  <>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
    <circle cx="17.5" cy="9" r="2.5" />
    <path d="M18 14.2c2.1.4 3.5 2.4 3.5 4.8" />
  </>
);

export const IconGraduation = icon(
  <>
    <path d="M2 9.5 12 4.5l10 5-10 5z" />
    <path d="M6 11.5v4.5c0 1.6 2.7 3 6 3s6-1.4 6-3v-4.5" />
    <path d="M22 9.5v5.5" />
  </>
);

export const IconClipboard = icon(
  <>
    <rect x="5" y="4" width="14" height="17" />
    <path d="M9 4V2.5h6V4" />
    <path d="m8.5 13 2.5 2.5 4.5-5" />
  </>
);

export const IconCard = icon(
  <>
    <rect x="2.5" y="5" width="19" height="14" />
    <path d="M2.5 10h19" />
    <path d="M6 15h4" />
  </>
);

export const IconInbox = icon(
  <>
    <path d="M3 13.5 6 5h12l3 8.5V19H3z" />
    <path d="M3 13.5h5l1.5 2.5h5l1.5-2.5h5" />
  </>
);

export const IconAudit = icon(
  <>
    <rect x="5" y="3" width="14" height="18" />
    <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
  </>
);

export const IconServer = icon(
  <>
    <rect x="3" y="4" width="18" height="7" />
    <rect x="3" y="13" width="18" height="7" />
    <path d="M7 7.5h.01M7 16.5h.01" strokeWidth={2.5} />
  </>
);

export const IconExternal = icon(
  <>
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M18 14v6H4V6h6" />
  </>
);

export const IconSignOut = icon(
  <>
    <path d="M9 4H5v16h4" />
    <path d="m14 8 4 4-4 4" />
    <path d="M18 12H9" />
  </>
);

export const IconMenu = icon(<path d="M4 6.5h16M4 12h16M4 17.5h16" />);

export const IconClose = icon(<path d="M6 6l12 12M18 6 6 18" />);

export const IconRefresh = icon(
  <>
    <path d="M20 12a8 8 0 1 1-2.34-5.66" />
    <path d="M20 4v5h-5" />
  </>
);

export const IconDownload = icon(
  <>
    <path d="M12 4v11" />
    <path d="m7 10 5 5 5-5" />
    <path d="M4 20h16" />
  </>
);

export const IconSearch = icon(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </>
);

export const IconChevronLeft = icon(<path d="m15 6-6 6 6 6" />);

export const IconChevronRight = icon(<path d="m9 6 6 6-6 6" />);

export const IconCheck = icon(<path d="m5 12.5 4.5 4.5L19 7.5" />);

export const IconAlert = icon(
  <>
    <path d="M12 3.5 21.5 20h-19z" />
    <path d="M12 10v4.5M12 17.5h.01" />
  </>
);

export const IconArrowRight = icon(<path d="M5 12h14M13 6l6 6-6 6" />);

export const IconMail = icon(
  <>
    <rect x="3" y="5" width="18" height="14" />
    <path d="m3 6.5 9 6.5 9-6.5" />
  </>
);

export const IconApplicant = icon(
  <>
    <rect x="4" y="3" width="16" height="18" />
    <circle cx="12" cy="9.5" r="2.5" />
    <path d="M8 17c.6-2.1 2.1-3.2 4-3.2s3.4 1.1 4 3.2" />
  </>
);

export const IconPlus = icon(<path d="M12 5v14M5 12h14" />);

export const IconPencil = icon(
  <>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="m13.5 6.5 4 4" />
  </>
);
