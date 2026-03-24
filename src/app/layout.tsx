import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Find Brittany Kritis-Garip | Investigation Tracker",
  description:
    "Help find Brittany Kritis-Garip, missing since March 20, 2026 from Oyster Bay, Long Island. Submit tips, view the investigation map, and follow the timeline.",
  openGraph: {
    title: "Find Brittany Kritis-Garip | Missing from Oyster Bay, NY",
    description:
      "Brittany Kritis-Garip, 32, has been missing since March 20, 2026. Help us bring her home. Submit tips and evidence.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
        />
      </head>
      <body className="min-h-screen bg-[#0f0f1a] text-[#f0f0f5] antialiased">
        {/* Alert Banner */}
        <div className="bg-red-600 text-white text-center py-2 px-4 text-sm font-semibold">
          ACTIVE MISSING PERSON — If you have information, call Nassau County PD:{" "}
          <a href="tel:5165737347" className="underline">
            516-573-7347
          </a>{" "}
          or{" "}
          <a href="tel:911" className="underline">
            911
          </a>
        </div>

        {/* Navigation */}
        <nav className="border-b border-[#2a2a40] bg-[#161625]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <a href="/" className="text-lg font-bold text-red-400">
                  Find Brittany
                </a>
                <span className="text-xs text-[#8888a0] hidden sm:block">
                  Investigation Tracker
                </span>
              </div>

              <div className="flex items-center gap-1 sm:gap-2">
                <a
                  href="/"
                  className="px-3 py-2 text-sm rounded-md hover:bg-[#1c1c2e] transition-colors"
                >
                  Home
                </a>
                <a
                  href="/investigate"
                  className="px-3 py-2 text-sm rounded-md hover:bg-[#1c1c2e] transition-colors"
                >
                  Investigate
                </a>
                <a
                  href="/map"
                  className="px-3 py-2 text-sm rounded-md hover:bg-[#1c1c2e] transition-colors"
                >
                  Map
                </a>
                <a
                  href="/timeline"
                  className="px-3 py-2 text-sm rounded-md hover:bg-[#1c1c2e] transition-colors"
                >
                  Timeline
                </a>
                <a
                  href="/submit"
                  className="px-3 py-2 text-sm font-semibold rounded-md bg-red-600 hover:bg-red-700 transition-colors"
                >
                  Submit Tip
                </a>
              </div>
            </div>
          </div>
        </nav>

        <main>{children}</main>

        {/* Footer */}
        <footer className="border-t border-[#2a2a40] bg-[#161625] mt-auto py-8 px-4">
          <div className="max-w-7xl mx-auto text-center text-sm text-[#8888a0]">
            <p className="mb-2">
              <strong className="text-[#f0f0f5]">Brittany Kritis-Garip</strong>{" "}
              — Missing since March 20, 2026 — Oyster Bay, Long Island, NY
            </p>
            <p className="mb-4">
              5&apos;7&quot; | 140 lbs | Brown hair | Brown eyes | Last wearing:
              black pants, black jacket with fur collar
            </p>
            <div className="flex justify-center gap-6 mb-4">
              <a href="tel:5165737347" className="text-red-400 hover:text-red-300">
                Nassau PD: 516-573-7347
              </a>
              <a href="tel:911" className="text-red-400 hover:text-red-300">
                Emergency: 911
              </a>
            </div>
            <p className="text-xs text-[#555570]">
              Built with urgency by Why Not Us Labs — Helping bring Brittany home
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
