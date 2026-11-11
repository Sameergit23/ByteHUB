/**
 * Countries offered on the application form: phone country codes and the address country.
 * India comes first because almost every applicant is in India.
 */
export interface CountryOption {
  /** ISO 3166-1 alpha-2 code. */
  iso: string;
  name: string;
  /** International dialling code, e.g. "+91". */
  dial: string;
  /** Exact number of digits in a mobile number, when it's fixed. */
  digits?: number;
}

export const COUNTRIES: CountryOption[] = [
  { iso: "IN", name: "India", dial: "+91", digits: 10 },
  { iso: "AE", name: "United Arab Emirates", dial: "+971" },
  { iso: "AU", name: "Australia", dial: "+61" },
  { iso: "BD", name: "Bangladesh", dial: "+880" },
  { iso: "BH", name: "Bahrain", dial: "+973" },
  { iso: "BT", name: "Bhutan", dial: "+975" },
  { iso: "CA", name: "Canada", dial: "+1", digits: 10 },
  { iso: "DE", name: "Germany", dial: "+49" },
  { iso: "FR", name: "France", dial: "+33" },
  { iso: "GB", name: "United Kingdom", dial: "+44" },
  { iso: "IE", name: "Ireland", dial: "+353" },
  { iso: "JP", name: "Japan", dial: "+81" },
  { iso: "KE", name: "Kenya", dial: "+254" },
  { iso: "KW", name: "Kuwait", dial: "+965" },
  { iso: "LK", name: "Sri Lanka", dial: "+94" },
  { iso: "MU", name: "Mauritius", dial: "+230" },
  { iso: "MV", name: "Maldives", dial: "+960" },
  { iso: "MY", name: "Malaysia", dial: "+60" },
  { iso: "NG", name: "Nigeria", dial: "+234" },
  { iso: "NL", name: "Netherlands", dial: "+31" },
  { iso: "NP", name: "Nepal", dial: "+977" },
  { iso: "NZ", name: "New Zealand", dial: "+64" },
  { iso: "OM", name: "Oman", dial: "+968" },
  { iso: "QA", name: "Qatar", dial: "+974" },
  { iso: "SA", name: "Saudi Arabia", dial: "+966" },
  { iso: "SG", name: "Singapore", dial: "+65", digits: 8 },
  { iso: "US", name: "United States", dial: "+1", digits: 10 },
  { iso: "ZA", name: "South Africa", dial: "+27" },
];

export function findCountry(iso: string): CountryOption {
  return COUNTRIES.find((c) => c.iso === iso) ?? COUNTRIES[0]!;
}

/**
 * Checks the local part of a phone number for the chosen country.
 * Returns a message for the student, or null when it looks right.
 */
export function phoneProblem(iso: string, localNumber: string): string | null {
  const country = findCountry(iso);
  const digits = localNumber.replace(/[\s-]/g, "");
  if (!digits) return "Enter your phone number.";
  if (!/^[0-9]+$/.test(digits)) return "Use digits only (no letters or symbols).";
  if (iso === "IN") {
    if (digits.length !== 10 || !/^[6-9]/.test(digits)) {
      return "Enter a 10-digit Indian mobile number (starting with 6, 7, 8 or 9).";
    }
    return null;
  }
  if (country.digits && digits.length !== country.digits) {
    return `Enter a ${country.digits}-digit number for ${country.name}.`;
  }
  if (digits.length < 6 || digits.length > 14) return "Enter a valid phone number.";
  return null;
}

/** "+91 9876543210" from the chosen country and the local number. */
export function fullPhone(iso: string, localNumber: string): string {
  return `${findCountry(iso).dial} ${localNumber.replace(/[\s-]/g, "")}`;
}

/** Splits a stored "+91 98765 43210" back into country and number (for saved drafts). */
export function splitPhone(phone: string): { iso: string; number: string } {
  const trimmed = phone.trim();
  const byLength = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  const match = byLength.find((c) => trimmed.startsWith(c.dial));
  if (!match) return { iso: "IN", number: trimmed.replace(/[^0-9]/g, "") };
  return {
    iso: match.iso === "CA" ? "US" : match.iso,
    number: trimmed.slice(match.dial.length).replace(/[^0-9]/g, ""),
  };
}
