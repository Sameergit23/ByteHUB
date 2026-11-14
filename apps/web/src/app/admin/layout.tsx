import type { Metadata } from "next";
import { headers } from "next/headers";
import { AdminShell } from "../../components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Admin · ByteHUB",
  robots: { index: false, follow: false },
};

/**
 * Every admin page shares the admin shell (sidebar, top bar). middleware.ts serves these pages
 * at the panel's secret address (ADMIN_PATH) and passes that address in x-admin-base, so links
 * inside the panel point there instead of /admin. The API checks permissions on every request.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const basePath = (await headers()).get("x-admin-base") || "/admin";
  return <AdminShell basePath={basePath}>{children}</AdminShell>;
}
