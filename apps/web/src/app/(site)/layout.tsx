import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { SiteChrome } from "../../components/layout/SiteChrome";

/**
 * The public website: header, main area and footer. The admin panel lives outside this
 * (route) group, so it never renders inside the public site's chrome.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteChrome header={<Header />} footer={<Footer />}>
      {children}
    </SiteChrome>
  );
}
