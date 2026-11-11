/** Each admin section's content enters with a short rise-and-fade; the sidebar stays put. */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
