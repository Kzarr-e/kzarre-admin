import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";
import NotificationProvider from "@/components/NotificationProvider";
import { Toaster } from "react-hot-toast";
import SilentRefresh from "@/components/SilentRefresh";
const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito-sans",
});

export const metadata: Metadata = {
  title: "KZARRĒ Admin",
  description: "Admin Dashboard Platform",
  icons: {
    icon: "/logo.png",
  },
  keywords: ["Admin Dashboard", "KZARRĒ", "Management", "Analytics", "User Management"],
  authors: [{ name: "Kzarre", url: "https://www.kzarre.com" }],
  openGraph: {
    title: "KZARRĒ Admin",
    description: "Admin Dashboard Platform",
    url: "https://www.adminkzarre.com",
    siteName: "KZARRĒ",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KZARRĒ Admin",
    description: "Admin Dashboard Platform",
    images: ["/og-image.png"],
    site: "@creonox",
    creator: "@creonox",
  },
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    
    <html lang="en" className={`${nunitoSans.variable} font-nunito-sans`}>
      <body className="antialiased bg-gray-50 font-nunito-sans">
        <Toaster position="bottom-center" toastOptions={{
    duration: 4000,
    style: {
      borderRadius: "10px",
      background: "#111",
      color: "#fff",
      padding: "12px 16px",
    },
    success: {
      iconTheme: {
        primary: "#22c55e",
        secondary: "#fff",
      },
    },
    error: {
      iconTheme: {
        primary: "#ef4444",
        secondary: "#fff",
      },
    },
  }}/>
        <SilentRefresh />
        <NotificationProvider onClose={undefined} />
        {children}

      </body>
    </html>
  );
}
