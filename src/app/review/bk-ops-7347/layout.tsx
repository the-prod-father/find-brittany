import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Case Review — Nassau County Investigation",
  description: "Active investigation case review portal. Authorized personnel only.",
  openGraph: {
    title: "Case Review — Nassau County Investigation",
    description: "Active investigation case review portal. Authorized personnel only.",
    images: [
      {
        url: "/og-admin.jpg",
        width: 600,
        height: 600,
        alt: "Nassau County Police Department",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Case Review — Nassau County Investigation",
    description: "Active investigation case review portal.",
    images: ["/og-admin.jpg"],
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
