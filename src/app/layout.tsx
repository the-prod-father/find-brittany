import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Find Brittany Kritis-Garip | Missing from Oyster Bay, NY",
  description:
    "Brittany Kritis-Garip, 32, has been missing since March 20, 2026 from Oyster Bay, Long Island. 5'7\", 140 lbs, brown hair, brown eyes. If you have any information, call Nassau County PD: 516-573-7347.",
  openGraph: {
    title: "MISSING — Brittany Kritis-Garip, 32, Oyster Bay NY",
    description:
      "Last seen March 20, 2026 ~8PM on McCouns Lane. 5'7\", 140 lbs, brown hair, brown eyes. Black pants, black jacket with fur collar. Call 516-573-7347 with any information.",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 1200,
        alt: "Missing person poster for Brittany Kritis-Garip",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MISSING — Brittany Kritis-Garip, 32, Oyster Bay NY",
    description:
      "Last seen March 20, 2026 ~8PM. 5'7\", 140 lbs, brown hair. Call Nassau County PD: 516-573-7347.",
    images: ["/og-image.jpg"],
  },
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {/* Alert Banner — compact on mobile */}
        <div className="bg-red-600 text-white text-center py-2 px-3 text-xs sm:text-sm font-semibold">
          MISSING PERSON —{" "}
          <a href="tel:5165737347" className="underline">
            Call 516-573-7347
          </a>{" "}
          or{" "}
          <a href="tel:911" className="underline">
            911
          </a>
        </div>

        {/* Navigation — mobile-optimized */}
        <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-14 sm:h-16">
              <a href="/" className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-base sm:text-lg font-bold text-red-600">
                  Find Brittany
                </span>
              </a>

              <div className="flex items-center gap-1">
                <a
                  href="/walkthrough"
                  className="px-2 sm:px-3 py-2 text-xs sm:text-sm rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  Investigation Map
                </a>
                <a
                  href="tel:5165737347"
                  className="px-2 sm:px-3 py-2 text-xs sm:text-sm rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 hidden sm:block"
                >
                  Call Police
                </a>
                <a
                  href="/submit"
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-md bg-red-600 text-white hover:bg-red-700"
                >
                  Upload Evidence
                </a>
              </div>
            </div>
          </div>
        </nav>

        <main>{children}</main>

        {/* Footer — mobile-optimized */}
        <footer className="border-t border-gray-200 bg-gray-50 mt-auto py-6 sm:py-8 px-4">
          <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
            <p className="mb-2">
              <strong className="text-gray-900">Brittany Kritis-Garip</strong>{" "}
              — Missing since March 20, 2026
            </p>
            <p className="mb-3 text-xs sm:text-sm">
              5&apos;7&quot; | 140 lbs | Brown hair | Brown eyes
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-6 mb-4">
              <a href="tel:5165737347" className="text-red-600 hover:text-red-700 font-medium text-base py-2 sm:py-0">
                Nassau PD: 516-573-7347
              </a>
              <a href="tel:911" className="text-red-600 hover:text-red-700 font-medium text-base py-2 sm:py-0">
                Emergency: 911
              </a>
            </div>
            <p className="text-xs text-gray-400">
              Built by the Oyster Bay community to help bring Brittany home
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
