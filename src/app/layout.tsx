import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SavedProvider } from "@/components/saved-provider";
import { BottomNav } from "@/components/bottom-nav";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_GH",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
  colorScheme: "light",
};

/**
 * Root layout.
 *
 * Two things live here that every route needs: the saved-places provider (a client
 * context, so it has to wrap the tree) and the bottom nav. Page padding is *not* here —
 * the map routes are full-bleed — so it lives in `<PageShell>`.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-canvas antialiased">
        <SavedProvider>
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          <main id="main">{children}</main>
          <BottomNav />
        </SavedProvider>
      </body>
    </html>
  );
}
