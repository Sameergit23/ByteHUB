import { PageLoader } from "../../../components/ui/Loader";

/** Shown at once while this page's data loads (e.g. while the free API wakes up). */
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4">
      <PageLoader label="Loading…" />
    </div>
  );
}
