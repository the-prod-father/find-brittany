import { CASE_INFO } from "@/lib/types";

function DayCounter() {
  const missing = new Date("2026-03-20T20:14:00-04:00");
  const now = new Date();
  const days = Math.floor(
    (now.getTime() - missing.getTime()) / (1000 * 60 * 60 * 24)
  );
  return days;
}

export default function HomePage() {
  const info = CASE_INFO;
  const daysMissing = DayCounter();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-600/40 rounded-full px-4 py-1.5 mb-6">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-red-400 text-sm font-semibold">
            DAY {daysMissing} — ACTIVE INVESTIGATION
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          Help Find{" "}
          <span className="text-red-400">Brittany Kritis-Garip</span>
        </h1>

        <p className="text-lg text-[#8888a0] max-w-2xl mx-auto mb-8">
          32-year-old Brittany has been missing since the evening of March 20,
          2026 from Oyster Bay, Long Island. If you have any information — no
          matter how small — please submit a tip or contact police immediately.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="/submit"
            className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-lg transition-colors"
          >
            Submit a Tip
          </a>
          <a
            href="/map"
            className="px-6 py-3 bg-[#1c1c2e] hover:bg-[#2a2a40] border border-[#2a2a40] rounded-lg font-semibold text-lg transition-colors"
          >
            View Investigation Map
          </a>
          <a
            href="tel:5165737347"
            className="px-6 py-3 bg-[#1c1c2e] hover:bg-[#2a2a40] border border-[#2a2a40] rounded-lg font-semibold text-lg transition-colors"
          >
            Call Police: 516-573-7347
          </a>
        </div>
      </section>

      {/* Subject Info Card */}
      <section className="grid md:grid-cols-2 gap-6 mb-12">
        <div className="bg-[#1c1c2e] border border-[#2a2a40] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-4 border-b border-[#2a2a40] pb-2">
            Missing Person Details
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-[#8888a0]">Name</span>
              <span className="font-medium">{info.subject.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8888a0]">Age</span>
              <span>{info.subject.age} (DOB: {info.subject.dob})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8888a0]">Height / Weight</span>
              <span>{info.subject.height} / {info.subject.weight}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8888a0]">Hair / Eyes</span>
              <span>{info.subject.hair} / {info.subject.eyes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8888a0]">Last Wearing</span>
              <span className="text-right max-w-[60%]">{info.subject.lastWearing}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1c1c2e] border border-[#2a2a40] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-4 border-b border-[#2a2a40] pb-2">
            Circumstances
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-[#8888a0]">Date</span>
              <span>March 20, 2026</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8888a0]">Last Seen</span>
              <span>8:14 PM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8888a0]">Location</span>
              <span className="text-right max-w-[60%]">
                {info.disappearance.lastSeenLocation}
              </span>
            </div>
            <div>
              <span className="text-[#8888a0] block mb-1">Details</span>
              <p className="text-sm leading-relaxed">
                {info.disappearance.circumstances}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How You Can Help */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-center mb-8">How You Can Help</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: "Check Security Cameras",
              description:
                "Review Ring, Nest, or any security camera footage from March 20th evening onward in the Oyster Bay / East Norwich area.",
              icon: "📹",
            },
            {
              title: "Search Your Property",
              description:
                "Check yards, garages, sheds, and outbuildings. Brittany may have sought shelter while disoriented.",
              icon: "🔍",
            },
            {
              title: "Watch Train Stations",
              description:
                "Keep an eye near LIRR stations, especially the Oyster Bay branch. She may have traveled by rail.",
              icon: "🚂",
            },
            {
              title: "Submit Any Information",
              description:
                "No detail is too small. Even if you're unsure, submit a tip. It could be the piece that connects the puzzle.",
              icon: "💡",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-[#1c1c2e] border border-[#2a2a40] rounded-xl p-5"
            >
              <div className="text-2xl mb-3">{item.icon}</div>
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-[#8888a0] leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section className="bg-red-600/10 border border-red-600/30 rounded-xl p-8 text-center">
        <h2 className="text-xl font-bold mb-4">
          Have Information? Contact Immediately
        </h2>
        <div className="flex flex-wrap justify-center gap-6">
          <div>
            <div className="text-sm text-[#8888a0]">Nassau County PD Missing Persons</div>
            <a
              href="tel:5165737347"
              className="text-xl font-bold text-red-400 hover:text-red-300"
            >
              {info.contacts.police.phone}
            </a>
          </div>
          <div>
            <div className="text-sm text-[#8888a0]">Emergency</div>
            <a
              href="tel:911"
              className="text-xl font-bold text-red-400 hover:text-red-300"
            >
              911
            </a>
          </div>
          <div>
            <a
              href="/submit"
              className="inline-block mt-2 px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
            >
              Submit Tip Online
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
