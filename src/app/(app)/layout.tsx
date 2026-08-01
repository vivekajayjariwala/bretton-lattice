import { AppNav } from "@/components/app-nav";
import { MobileNav } from "@/components/mobile-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Column below md so the mobile bar stacks above the content; row from md
    // up, where the sidebar sits alongside it.
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <MobileNav />
      <AppNav />
      <main
        className="flex min-w-0 flex-1 flex-col"
        // Keeps content off the notch in landscape and clear of the home
        // indicator. All four insets are 0 on desktop, so nothing shifts there.
        style={{
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {children}
      </main>
    </div>
  );
}
