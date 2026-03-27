"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const OPS_PAGES = [
  { href: "/cove-neck-ops-7347", label: "Cove Neck Ops", desc: "Property search & canvass tracker" },
  { href: "/cmd-center-7347", label: "Command Center", desc: "Map, canvass, evidence overview" },
  { href: "/review/bk-ops-7347", label: "Evidence Review", desc: "Review submitted evidence & tips" },
  { href: "/case-files-7347", label: "Case Files", desc: "Evidence filing system" },
  { href: "/intel-ops-7347", label: "Intel Ops", desc: "Investigation operations center" },
];

export default function CoveNeckLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    }>
      <CoveNeckLogin />
    </Suspense>
  );
}

function CoveNeckLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");

  // Check if already logged in
  useEffect(() => {
    fetch("/api/auth/cove-neck")
      .then((res) => setAuthenticated(res.ok))
      .catch(() => setAuthenticated(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/cove-neck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        setAuthenticated(true);
        if (nextPath) {
          router.push(nextPath);
        }
      } else {
        setError("Invalid credentials");
      }
    } catch {
      setError("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // Authenticated — show ops hub
  if (authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-2xl">
            <div className="text-center mb-5">
              <div className="text-xs text-green-400 uppercase tracking-[0.2em] mb-1">Authenticated</div>
              <h1 className="text-lg font-bold text-white">Operations Hub</h1>
            </div>

            <div className="space-y-2">
              {OPS_PAGES.map((page) => (
                <a
                  key={page.href}
                  href={page.href}
                  className="block bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 hover:bg-gray-700 hover:border-gray-500 transition-colors group"
                >
                  <div className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                    {page.label}
                  </div>
                  <div className="text-[11px] text-gray-400">{page.desc}</div>
                </a>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-700 flex justify-between items-center">
              <a href="/" className="text-[11px] text-gray-500 hover:text-gray-300">Public site</a>
              <button
                onClick={async () => {
                  // Clear cookie by setting expired
                  document.cookie = "cn-auth=; path=/; max-age=0";
                  setAuthenticated(false);
                }}
                className="text-[11px] text-gray-500 hover:text-red-400 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated — show login
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-xs text-gray-500 uppercase tracking-[0.2em] mb-1">Restricted Access</div>
            <h1 className="text-lg font-bold text-white">Operations Login</h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
                className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                placeholder="Enter password"
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 text-center py-1">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Authenticating..." : "Access Operations"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
