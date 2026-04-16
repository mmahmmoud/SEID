// pages/_app.tsx
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { useRouter } from "next/router";
import Sidebar from "../components/Sidebar";
import "../styles/globals.css";

const NO_SIDEBAR_ROUTES = ["/login", "/"];

export default function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();
  const showSidebar = !NO_SIDEBAR_ROUTES.includes(router.pathname);

  return (
    <SessionProvider session={session}>
      <div className="flex">
        {showSidebar && <Sidebar />}
        <main className={`flex-1 min-h-screen ${showSidebar ? "" : "w-full"}`}>
          <Component {...pageProps} />
        </main>
      </div>
    </SessionProvider>
  );
}
