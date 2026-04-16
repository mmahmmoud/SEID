import type { AppProps } from "next/app";
import { SessionProvider, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Sidebar from "../components/Sidebar";
import "../styles/globals.css";

const NO_SIDEBAR_ROUTES = ["/login", "/"];
const SALES_ALLOWED = ["/attendance", "/attendance/my-history"];

function RouteGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === "loading") return;
    if (!session) return;
    if (role === "salesperson") {
      const allowed = SALES_ALLOWED.some(
        (path) => router.pathname === path || router.pathname.startsWith(path + "/")
      );
      if (!allowed) router.replace("/attendance");
    }
  }, [status, role, router.pathname]);

  return <>{children}</>;
}

export default function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();
  const showSidebar = !NO_SIDEBAR_ROUTES.includes(router.pathname);

  return (
    <SessionProvider session={session}>
      <RouteGuard>
        <div className="flex min-h-screen bg-gray-50">
          {showSidebar && <Sidebar />}
          <main className={`flex-1 min-w-0 ${showSidebar ? "pt-14 lg:pt-0" : ""}`}>
            <Component {...pageProps} />
          </main>
        </div>
      </RouteGuard>
    </SessionProvider>
  );
}
