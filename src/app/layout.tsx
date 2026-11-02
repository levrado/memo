import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import "./globals.css";

// Fonts are bundled from npm (@fontsource-variable) so the app builds and runs
// without internet access.
const jetbrainsMono = localFont({
  src: "../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
  variable: "--font-jetbrains-mono",
  weight: "100 800",
});

const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
});

const SITE_URL = "https://software-factory.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: "%s — Memo",
    default: "Memo",
  },
  description: "A Notion-style workspace, built with zero human code.",
  openGraph: {
    title: "Memo",
    description: "A Notion-style workspace, built with zero human code.",
    url: SITE_URL,
    siteName: "Memo",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Memo",
    description: "A Notion-style workspace, built with zero human code.",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

/**
 * Inline script that runs before first paint to prevent flash of wrong theme.
 * Reads the stored preference from localStorage and applies the correct
 * data-theme attribute and .dark class before React hydrates.
 */
const themeScript = `(function(){try{var p=localStorage.getItem("memo-theme")||"dark";var d=p==="system"?window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light":p;document.documentElement.setAttribute("data-theme",d);if(d==="dark")document.documentElement.classList.add("dark");else document.documentElement.classList.remove("dark")}catch(e){document.documentElement.setAttribute("data-theme","dark");document.documentElement.classList.add("dark")}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} ${inter.variable} antialiased`}
      data-theme="dark"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
