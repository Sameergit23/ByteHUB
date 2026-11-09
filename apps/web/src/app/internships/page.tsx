"use client";

import { useState } from "react";
import Link from "next/link";
import { MOCK_INTERNSHIPS } from "../../lib/mockData";

export default function InternshipsPage() {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [minStipend, setMinStipend] = useState<number>(0);

  const filtered = MOCK_INTERNSHIPS.filter((item) => {
    const matchesSearch =
      search === "" ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.companyName.toLowerCase().includes(search.toLowerCase()) ||
      item.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()));

    const matchesType =
      selectedType === "ALL" || item.type === selectedType;

    const matchesStipend = item.stipend >= minStipend;

    return matchesSearch && matchesType && matchesStipend;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Title & Masthead */}
      <div className="border border-editorial-border p-6 sm:p-10 bg-white space-y-4">
        <div className="flex flex-wrap items-center justify-between text-xs font-mono uppercase tracking-widest text-editorial-muted border-b border-editorial-border pb-3">
          <span>// DIRECTORY SECTION 01</span>
          <span>{filtered.length} ACTIVE POSITIONS LISTED</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-ink">
          VERIFIED ENGINEERING INTERNSHIPS
        </h1>
        <p className="font-sans text-xs sm:text-sm text-editorial-muted max-w-2xl">
          Every role on ByteHUB has confirmed compensation, active engineering mentorship, and clearly articulated technical expectations.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="border border-editorial-border p-6 bg-editorial-surface space-y-4">
        <div className="text-xs font-mono font-bold uppercase tracking-wider text-editorial-muted">
          [ FILTER & QUERY CRITERIA ]
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-6">
            <label htmlFor="search-input" className="block text-[11px] font-mono text-editorial-muted mb-1">
              SEARCH BY ROLE, COMPANY OR TECH STACK:
            </label>
            <input
              id="search-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. Rust, Next.js, Distributed Systems..."
              className="w-full border border-editorial-border bg-white px-3 py-2 text-xs font-mono text-ink focus:border-ink focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="type-select" className="block text-[11px] font-mono text-editorial-muted mb-1">
              WORK ARRANGEMENT:
            </label>
            <select
              id="type-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full border border-editorial-border bg-white px-3 py-2 text-xs font-mono text-ink focus:border-ink focus:outline-none"
            >
              <option value="ALL">ALL FORMATS</option>
              <option value="REMOTE">REMOTE ONLY</option>
              <option value="HYBRID">HYBRID</option>
              <option value="ON_SITE">ON-SITE</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="stipend-select" className="block text-[11px] font-mono text-editorial-muted mb-1">
              MINIMUM MONTHLY STIPEND:
            </label>
            <select
              id="stipend-select"
              value={minStipend}
              onChange={(e) => setMinStipend(Number(e.target.value))}
              className="w-full border border-editorial-border bg-white px-3 py-2 text-xs font-mono text-ink focus:border-ink focus:outline-none"
            >
              <option value="0">ALL STIPENDS</option>
              <option value="35000">₹35,000 / mo +</option>
              <option value="45000">₹45,000 / mo +</option>
              <option value="50000">₹50,000 / mo +</option>
            </select>
          </div>
        </div>
      </div>

      {/* Internships Feed */}
      <div className="border border-editorial-border divide-y divide-editorial-border bg-white">
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3 font-mono text-xs text-editorial-muted">
            <p>[ NO MATCHING INTERNSHIPS FOUND ]</p>
            <p>Try resetting filters or expanding search keywords.</p>
            <button
              onClick={() => {
                setSearch("");
                setSelectedType("ALL");
                setMinStipend(0);
              }}
              className="border border-ink px-4 py-2 text-ink hover:bg-ink hover:text-canvas"
            >
              RESET FILTERS
            </button>
          </div>
        ) : (
          filtered.map((item, idx) => (
            <article
              key={item.id}
              className="p-6 sm:p-8 hover:bg-canvas transition-colors grid grid-cols-1 md:grid-cols-12 gap-6 items-start"
            >
              <div className="md:col-span-1 font-mono text-xs text-editorial-muted">
                [ 0{idx + 1} ]
              </div>

              <div className="md:col-span-7 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-editorial-muted">
                  <span className="font-bold text-ink uppercase tracking-wide">
                    {item.companyName}
                  </span>
                  <span>•</span>
                  <span>{item.location}</span>
                  <span>•</span>
                  <span className="border border-editorial-border px-1.5 py-0.5 text-[10px] text-accent font-semibold">
                    {item.type}
                  </span>
                </div>

                <h2 className="font-heading text-xl sm:text-2xl font-bold text-ink tracking-tight">
                  <Link href={`/internships/${item.id}`} className="hover:text-accent transition-colors">
                    {item.title}
                  </Link>
                </h2>

                <p className="text-xs font-sans text-editorial-muted line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {item.skills.map((skill) => (
                    <span
                      key={skill}
                      className="border border-editorial-border bg-white px-2 py-0.5 text-[11px] font-mono text-editorial-muted"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="md:col-span-4 flex flex-col justify-between items-start md:items-end space-y-4 h-full">
                <div className="text-left md:text-right font-mono text-xs space-y-1">
                  <div className="text-[10px] text-editorial-muted">STIPEND RATE:</div>
                  <div className="text-base font-bold text-ink">
                    ₹{item.stipend.toLocaleString("en-IN")} / mo
                  </div>
                  <div className="text-[11px] text-editorial-muted">
                    {item.durationMonths} MONTHS // {item.openings} OPENING(S)
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Link
                    href={`/internships/${item.id}`}
                    className="border border-editorial-border px-3 py-2 text-xs font-mono font-medium hover:border-ink transition-colors"
                  >
                    DETAILS
                  </Link>
                  <Link
                    href={`/apply/${item.id}`}
                    className="border border-ink bg-ink text-canvas hover:bg-accent hover:border-accent hover:text-white px-4 py-2 text-xs font-mono font-bold tracking-wider transition-colors"
                  >
                    APPLY NOW →
                  </Link>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
