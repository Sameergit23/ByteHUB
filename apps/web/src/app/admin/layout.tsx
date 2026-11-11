import type { Metadata } from "next";
import { AdminShell } from "../../components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Admin · ByteHUB",
  robots: { index: false, follow: false },
};

/** Every /admin page shares the admin shell (sidebar, top bar); access is enforced by middleware.ts. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
