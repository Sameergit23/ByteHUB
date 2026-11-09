"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Tabs } from "../../components/ui/Tabs";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Chip } from "../../components/ui/Chip";
import { Button } from "../../components/ui/Button";

interface InternshipRow {
  id: string;
  role: string;
  track: string;
  mode: string;
  duration: string;
  stipend: string;
}

export default function InternshipsPage() {
  const [activeTab, setActiveTab] = useState("internships");
  const [search, setSearch] = useState("");
  const [selectedTrack, setSelectedTrack] = useState("ALL");
  const [selectedMode, setSelectedMode] = useState("ANY");
  const [selectedDuration, setSelectedDuration] = useState("ANY");

  const internships: InternshipRow[] = [
    {
      id: "intern-01",
      role: "Frontend Developer Intern",
      track: "Web Development",
      mode: "[REMOTE / ON-SITE]",
      duration: "[WEEKS]",
      stipend: "[STIPEND]",
    },
    {
      id: "intern-02",
      role: "Mobile App Intern",
      track: "App Development",
      mode: "[REMOTE / ON-SITE]",
      duration: "[WEEKS]",
      stipend: "[STIPEND]",
    },
    {
      id: "intern-03",
      role: "Data Analyst Intern",
      track: "Data & AI",
      mode: "[REMOTE / ON-SITE]",
      duration: "[WEEKS]",
      stipend: "[STIPEND]",
    },
    {
      id: "intern-04",
      role: "UI/UX Design Intern",
      track: "UI/UX Design",
      mode: "[REMOTE / ON-SITE]",
      duration: "[WEEKS]",
      stipend: "[STIPEND]",
    },
    {
      id: "intern-05",
      role: "Backend Developer Intern",
      track: "Web Development",
      mode: "[REMOTE / ON-SITE]",
      duration: "[WEEKS]",
      stipend: "[STIPEND]",
    },
  ];

  const filtered = internships.filter((item) => {
    const matchesSearch =
      search === "" ||
      item.role.toLowerCase().includes(search.toLowerCase()) ||
      item.track.toLowerCase().includes(search.toLowerCase());

    const matchesTrack = selectedTrack === "ALL" || item.track === selectedTrack;

    return matchesSearch && matchesTrack;
  });

  return (
    <div className="w-full bg-canvas min-h-screen py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Page Title & Subtitle Matching Image 2 */}
        <div className="space-y-3">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-ink">
            Open internships
          </h1>
          <p className="font-sans text-sm sm:text-base text-editorial-muted max-w-2xl leading-relaxed">
            Apply to live projects with mentors. Complete training first to improve your chances.
          </p>
        </div>

        {/* Tabs Matching Image 2 */}
        <div>
          <Tabs
            tabs={[
              { id: "internships", label: "Internships" },
              { id: "training", label: "Training" },
            ]}
            activeId={activeTab}
            onChange={(id) => {
              if (id === "training") {
                window.location.href = "/training";
              } else {
                setActiveTab(id);
              }
            }}
          />
        </div>

        {/* Filter Controls Row Matching Image 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-6">
            <Input
              label="Search"
              placeholder="Role or skill"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="lg:col-span-2">
            <Select
              label="Track"
              value={selectedTrack}
              onChange={(e) => setSelectedTrack(e.target.value)}
              options={[
                { label: "All tracks", value: "ALL" },
                { label: "Web Development", value: "Web Development" },
                { label: "App Development", value: "App Development" },
                { label: "Data & AI", value: "Data & AI" },
                { label: "UI/UX Design", value: "UI/UX Design" },
              ]}
            />
          </div>

          <div className="lg:col-span-2">
            <Select
              label="Mode"
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              options={[
                { label: "Any", value: "ANY" },
                { label: "Remote", value: "REMOTE" },
                { label: "On-site", value: "ON_SITE" },
              ]}
            />
          </div>

          <div className="lg:col-span-2">
            <Select
              label="Duration"
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(e.target.value)}
              options={[
                { label: "Any", value: "ANY" },
                { label: "4-8 Weeks", value: "SHORT" },
                { label: "12-24 Weeks", value: "LONG" },
              ]}
            />
          </div>
        </div>

        {/* Open Roles Count */}
        <div className="font-mono text-xs text-editorial-muted pt-2">
          {filtered.length} open roles
        </div>

        {/* List of Internships Matching Image 2 */}
        <div className="border-t border-editorial-border divide-y divide-editorial-border">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="py-5 sm:py-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center hover:bg-white/40 transition-colors"
            >
              {/* Role title and Track chip */}
              <div className="md:col-span-6 space-y-2">
                <h2 className="font-heading text-lg sm:text-xl font-bold text-ink">
                  <Link href={`/internships/${item.id}`} className="hover:text-accent">
                    {item.role}
                  </Link>
                </h2>
                <div>
                  <Chip label={item.track} />
                </div>
              </div>

              {/* Metadata columns */}
              <div className="md:col-span-2 font-mono text-xs text-editorial-muted">
                {item.mode}
              </div>

              <div className="md:col-span-1 font-mono text-xs text-editorial-muted">
                {item.duration}
              </div>

              <div className="md:col-span-1 font-mono text-xs text-editorial-muted">
                {item.stipend}
              </div>

              {/* Apply Button */}
              <div className="md:col-span-2 flex justify-start md:justify-end">
                <Link href={`/apply/${item.id}`}>
                  <Button variant="primary" size="sm" className="w-24">
                    Apply
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
