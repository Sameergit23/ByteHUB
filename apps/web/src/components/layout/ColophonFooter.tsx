import React from "react";

export interface ColophonFooterProps {
  brand?: string;
  location?: string;
  email?: string;
  phone?: string;
  className?: string;
}

export const ColophonFooter: React.FC<ColophonFooterProps> = ({
  brand = "[YOUR BRAND]",
  location = "[CITY, INDIA]",
  email = "[EMAIL]",
  phone = "[PHONE]",
  className = "",
}) => {
  return (
    <footer
      aria-label="Colophon"
      className={`w-full bg-canvas border-t border-editorial-border py-8 text-xs font-mono text-editorial-muted ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span>{brand}</span> · <span>{location}</span>
        </div>
        <div>
          <span>{email}</span> · <span>{phone}</span>
        </div>
      </div>
    </footer>
  );
};

