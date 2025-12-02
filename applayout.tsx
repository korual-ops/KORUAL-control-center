import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export const metadata = {
  title: "KORUAL CONTROL CENTER",
  description: "KORUAL – High-end Automated Control Center",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
        <div className="flex h-full">
          <Sidebar />

          <div className="flex flex-1 flex-col overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-y-auto p-3 md:p-5">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
