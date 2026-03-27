"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const OPS_PAGES = [
  { href: "/cove-neck-ops-7347", label: "Cove Neck Ops" },
  { href: "/cmd-center-7347", label: "Command Center" },
  { href: "/review/bk-ops-7347", label: "Evidence Review" },
  { href: "/case-files-7347", label: "Case Files" },
  { href: "/intel-ops-7347", label: "Intel Ops" },
];

export default function AdminBar() {
  const [authenticated, setAuthenticated] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/cove-neck")
      .then((res) => setAuthenticated(res.ok))
      .catch(() => setAuthenticated(false));
  }, []);

  if (!authenticated) return null;

  // Don't show on the login/hub page itself
  if (pathname === "/cove-neck") return null;

  const currentPage = OPS_PAGES.find((p) => pathname.startsWith(p.href));

  return (
    <div className="fixed bottom-4 left-4 z-[100]">
      {expanded && (
        <div className="mb-2 bg-gray-900/95 backdrop-blur border border-gray-700 rounded-xl shadow-2xl p-2 space-y-0.5 min-w-[180px]">
          {OPS_PAGES.map((page) => {
            const isActive = pathname.startsWith(page.href);
            return (
              <a
                key={page.href}
                href={page.href}
                className={`block text-xs px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white font-medium"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {page.label}
              </a>
            );
          })}
          <div className="border-t border-gray-700 mt-1 pt-1">
            <a href="/cove-neck" className="block text-xs px-3 py-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800">
              Ops Hub
            </a>
            <a href="/" className="block text-xs px-3 py-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800">
              Public Site
            </a>
          </div>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="bg-gray-900/90 backdrop-blur text-white border border-gray-700 rounded-full shadow-lg hover:bg-gray-800 transition-all flex items-center gap-2 px-3 py-2"
      >
        <div className="w-2 h-2 bg-green-400 rounded-full" />
        <span className="text-[11px] font-medium">
          {expanded ? "Close" : currentPage?.label || "Admin"}
        </span>
      </button>
    </div>
  );
}
