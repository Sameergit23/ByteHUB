import React from "react";
import Link from "next/link";
import { ByteHubLogo } from "../brand/ByteHubLogo";
import { siteConfig } from "../../lib/siteConfig";

export interface ColophonFooterProps {
  brand?: string;
  location?: string;
  email?: string;
  phone?: string;
  className?: string;
}

export const ColophonFooter: React.FC<ColophonFooterProps> = ({
  brand = siteConfig.brandName,
  location = siteConfig.contact.city,
  email = siteConfig.contact.generalEmail,
  phone = siteConfig.contact.phone,
  className = "",
}) => {
  return (
    <footer
      aria-label="Colophon"
      className={`w-full bg-canvas border-t border-editorial-border py-8 text-xs font-mono text-editorial-muted ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ByteHubLogo variant="mark" height={18} />
          <span>{brand}</span> · <span>{location}</span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center">
          <span>
            <span>{email}</span> · <span>{phone}</span>
          </span>
          <span className="flex items-center gap-3">
            <Link
              href="/terms"
              className="hover:text-ink underline-offset-2 hover:underline"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="hover:text-ink underline-offset-2 hover:underline"
            >
              Privacy
            </Link>
            <Link
              href="/refund-policy"
              className="hover:text-ink underline-offset-2 hover:underline"
            >
              Refunds
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
};
