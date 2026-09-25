import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

const sans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://winkpay.xyz"),
  title: "Wink — anyone, anywhere, paid with a wink",
  description:
    "The name layer for payments. Pay @usernames — tips, checkout, payroll, and AI agents. All settling as pathUSD on Tempo in under a second.",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "Wink — anyone, anywhere, paid with a wink",
    description:
      "The name layer for payments. Pay @usernames — tips, checkout, payroll, and AI agents. Settled as pathUSD on Tempo in under a second. 0% platform fee.",
    url: "https://winkpay.xyz",
    siteName: "Wink",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Wink — anyone, anywhere, paid with a wink",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wink — anyone, anywhere, paid with a wink",
    description:
      "Pay @usernames — tips, checkout, payroll, and AI agents. Settled as pathUSD on Tempo. 0% platform fee.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-ink)] antialiased">
        {children}
      </body>
    </html>
  );
}
