import { AppNav } from "@/components/app-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1">
      <AppNav />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
