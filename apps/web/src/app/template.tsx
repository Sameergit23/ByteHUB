/**
 * Re-mounts on every navigation, so each page enters with a short rise-and-fade.
 * (The animation ends on `transform: none`, leaving fixed-position dialogs unaffected.)
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
