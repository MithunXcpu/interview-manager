"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

// Dynamically load Clerk components only if configured
const ClerkUserButton = dynamic(
  () => import("@clerk/nextjs").then(mod => mod.UserButton),
  { ssr: false, loading: () => <div className="w-8 h-8 rounded-full bg-[var(--secondary)]" /> }
);

type Stage = "WISHLIST" | "APPLIED" | "SCREENING" | "INTERVIEW" | "FINAL" | "OFFER" | "REJECTED";

interface Interviewer {
  name: string;
  role: string;
  linkedin?: string;
  aiSummary?: string;
}

interface Company {
  id: string;
  name: string;
  logo?: string;
  industry?: string;
  size?: string;
  website?: string;
  jobTitle: string;
  jobUrl?: string;
  stage: Stage;
  priority: "HIGH" | "MEDIUM" | "LOW";
  salary?: { min: number; max: number; currency: string };
  totalRounds: number;
  completedRounds: number;
  interviewers: Interviewer[];
  notes?: string;
  nextInterviewDate?: string;
  appliedDate?: string;
}

const STAGES: { key: Stage; label: string; color: string; emoji: string }[] = [
  { key: "WISHLIST", label: "Wishlist", color: "border-l-slate-400", emoji: "⭐" },
  { key: "APPLIED", label: "Applied", color: "border-l-indigo-500", emoji: "📨" },
  { key: "SCREENING", label: "Screening", color: "border-l-purple-500", emoji: "📞" },
  { key: "INTERVIEW", label: "Interviewing", color: "border-l-cyan-500", emoji: "💼" },
  { key: "FINAL", label: "Final Round", color: "border-l-orange-500", emoji: "🎯" },
  { key: "OFFER", label: "Offer", color: "border-l-green-500", emoji: "🎉" },
];

const DEMO_COMPANIES: Company[] = [
  {
    id: "1",
    name: "Google",
    industry: "Tech",
    size: "10,000+",
    jobTitle: "Senior Software Engineer",
    stage: "INTERVIEW",
    priority: "HIGH",
    salary: { min: 180000, max: 250000, currency: "USD" },
    totalRounds: 5,
    completedRounds: 2,
    nextInterviewDate: "2025-01-28",
    interviewers: [
      { name: "Sarah Chen", role: "Technical Recruiter", linkedin: "linkedin.com/in/sarahchen" },
      { name: "Mike Ross", role: "Engineering Manager", aiSummary: "10+ years at Google, leads the Search team. Previously at Microsoft." },
    ],
    appliedDate: "2025-01-15",
  },
  {
    id: "2",
    name: "Stripe",
    industry: "Fintech",
    size: "5,000+",
    jobTitle: "Full Stack Engineer",
    stage: "SCREENING",
    priority: "HIGH",
    salary: { min: 160000, max: 220000, currency: "USD" },
    totalRounds: 4,
    completedRounds: 1,
    interviewers: [
      { name: "David Kim", role: "Recruiter" },
    ],
    appliedDate: "2025-01-18",
  },
  {
    id: "3",
    name: "Airbnb",
    industry: "Tech",
    size: "5,000+",
    jobTitle: "Backend Engineer",
    stage: "APPLIED",
    priority: "MEDIUM",
    totalRounds: 4,
    completedRounds: 0,
    interviewers: [],
    appliedDate: "2025-01-20",
  },
  {
    id: "4",
    name: "Netflix",
    industry: "Entertainment",
    size: "10,000+",
    jobTitle: "Platform Engineer",
    stage: "WISHLIST",
    priority: "MEDIUM",
    salary: { min: 200000, max: 300000, currency: "USD" },
    totalRounds: 4,
    completedRounds: 0,
    interviewers: [],
  },
  {
    id: "5",
    name: "OpenAI",
    industry: "AI",
    size: "1,000+",
    jobTitle: "ML Engineer",
    stage: "OFFER",
    priority: "HIGH",
    salary: { min: 250000, max: 350000, currency: "USD" },
    totalRounds: 5,
    completedRounds: 5,
    interviewers: [
      { name: "Lisa Wang", role: "Hiring Manager", aiSummary: "Research Scientist at OpenAI, PhD from Stanford in ML." },
    ],
    appliedDate: "2025-01-05",
  },
];

export default function Dashboard() {
  const [companies, setCompanies] = useState<Company[]>(DEMO_COMPANIES);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [draggedCompany, setDraggedCompany] = useState<Company | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [searchingAI, setSearchingAI] = useState<string | null>(null);

  const bookingLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/book/me`;

  const handleDragStart = (company: Company) => {
    setDraggedCompany(company);
  };

  const handleDrop = (stage: Stage) => {
    if (draggedCompany) {
      setCompanies(companies.map(c =>
        c.id === draggedCompany.id ? { ...c, stage } : c
      ));
      setDraggedCompany(null);
    }
  };

  const formatSalary = (salary?: { min: number; max: number; currency: string }) => {
    if (!salary) return "Not specified";
    const format = (n: number) => `$${(n / 1000).toFixed(0)}k`;
    return `${format(salary.min)} - ${format(salary.max)}`;
  };

  const searchInterviewerAI = async (interviewer: Interviewer, companyName: string) => {
    setSearchingAI(interviewer.name);
    // Simulate AI search - in production this would call the AI API
    await new Promise(resolve => setTimeout(resolve, 1500));

    const summary = `${interviewer.name} is a ${interviewer.role} at ${companyName}. Based on LinkedIn and public data: 8+ years in tech, previously at major companies. Known for technical interviews focusing on system design.`;

    if (selectedCompany) {
      setSelectedCompany({
        ...selectedCompany,
        interviewers: selectedCompany.interviewers.map(i =>
          i.name === interviewer.name ? { ...i, aiSummary: summary } : i
        ),
      });
    }
    setSearchingAI(null);
  };

  const addInterviewer = () => {
    if (selectedCompany) {
      setSelectedCompany({
        ...selectedCompany,
        interviewers: [...selectedCompany.interviewers, { name: "", role: "" }],
      });
    }
  };

  const updateInterviewer = (index: number, field: keyof Interviewer, value: string) => {
    if (selectedCompany) {
      const updated = [...selectedCompany.interviewers];
      updated[index] = { ...updated[index], [field]: value };
      setSelectedCompany({ ...selectedCompany, interviewers: updated });
    }
  };

  const saveCompany = () => {
    if (selectedCompany) {
      setCompanies(companies.map(c =>
        c.id === selectedCompany.id ? selectedCompany : c
      ));
      setEditMode(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] sticky top-0 bg-[var(--background)] z-40">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span>📋</span>
              </div>
              <span className="font-bold hidden sm:block">Interview Manager</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-sm text-[var(--muted)]">
              <span>Booking link:</span>
              <button
                onClick={() => navigator.clipboard.writeText(bookingLink)}
                className="px-3 py-1 bg-[var(--secondary)] rounded-lg hover:bg-[var(--primary)]/20 transition-colors"
              >
                📋 Copy Link
              </button>
            </div>
            <button
              onClick={() => {
                setSelectedCompany({
                  id: Date.now().toString(),
                  name: "",
                  jobTitle: "",
                  stage: "WISHLIST",
                  priority: "MEDIUM",
                  totalRounds: 4,
                  completedRounds: 0,
                  interviewers: [],
                });
                setEditMode(true);
                setShowCompanyModal(true);
              }}
              className="btn btn-primary text-sm"
            >
              + Add Company
            </button>
            <ClerkUserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <main className="max-w-[1800px] mx-auto p-4">
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageCompanies = companies.filter(c => c.stage === stage.key);
            return (
              <div
                key={stage.key}
                className="min-w-[300px] max-w-[300px] flex-shrink-0"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(stage.key)}
              >
                {/* Column Header */}
                <div className="flex items-center gap-2 mb-3 px-2">
                  <span>{stage.emoji}</span>
                  <h3 className="font-semibold text-sm">{stage.label}</h3>
                  <span className="ml-auto bg-[var(--secondary)] px-2 py-0.5 rounded-full text-xs">
                    {stageCompanies.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="kanban-column min-h-[calc(100vh-180px)]">
                  {stageCompanies.map((company) => (
                    <div
                      key={company.id}
                      draggable
                      onDragStart={() => handleDragStart(company)}
                      onClick={() => {
                        setSelectedCompany(company);
                        setShowCompanyModal(true);
                        setEditMode(false);
                      }}
                      className={`kanban-card ${stage.color} border-l-4 ${
                        draggedCompany?.id === company.id ? "opacity-50" : ""
                      }`}
                    >
                      {/* Company Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{company.name}</h4>
                          <p className="text-sm text-[var(--muted)]">{company.jobTitle}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          company.priority === "HIGH" ? "bg-red-500/20 text-red-400" :
                          company.priority === "MEDIUM" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-slate-500/20 text-slate-400"
                        }`}>
                          {company.priority}
                        </span>
                      </div>

                      {/* Salary */}
                      {company.salary && (
                        <p className="text-sm text-green-400 mb-2">
                          💰 {formatSalary(company.salary)}
                        </p>
                      )}

                      {/* Progress */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs text-[var(--muted)] mb-1">
                          <span>Round {company.completedRounds}/{company.totalRounds}</span>
                          <span>{Math.round((company.completedRounds / company.totalRounds) * 100)}%</span>
                        </div>
                        <div className="h-1.5 bg-[var(--background)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--primary)] rounded-full transition-all"
                            style={{ width: `${(company.completedRounds / company.totalRounds) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Interviewers */}
                      {company.interviewers.length > 0 && (
                        <div className="flex items-center gap-1 mb-2">
                          <span className="text-xs text-[var(--muted)]">👥</span>
                          <div className="flex -space-x-2">
                            {company.interviewers.slice(0, 3).map((interviewer, i) => (
                              <div
                                key={i}
                                className="w-6 h-6 rounded-full bg-[var(--primary)]/30 flex items-center justify-center text-xs border-2 border-[var(--secondary)]"
                                title={interviewer.name}
                              >
                                {interviewer.name.charAt(0)}
                              </div>
                            ))}
                            {company.interviewers.length > 3 && (
                              <div className="w-6 h-6 rounded-full bg-[var(--secondary)] flex items-center justify-center text-xs border-2 border-[var(--secondary)]">
                                +{company.interviewers.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Next Interview */}
                      {company.nextInterviewDate && (
                        <p className="text-xs text-cyan-400">
                          📅 Next: {new Date(company.nextInterviewDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Company Detail Modal */}
      {showCompanyModal && selectedCompany && (
        <div className="modal-overlay" onClick={() => setShowCompanyModal(false)}>
          <div className="modal-content max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                {editMode ? (
                  <input
                    type="text"
                    value={selectedCompany.name}
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, name: e.target.value })}
                    className="input text-xl font-bold mb-1"
                    placeholder="Company name"
                  />
                ) : (
                  <h2 className="text-xl font-bold">{selectedCompany.name}</h2>
                )}
                {editMode ? (
                  <input
                    type="text"
                    value={selectedCompany.jobTitle}
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, jobTitle: e.target.value })}
                    className="input text-sm"
                    placeholder="Job title"
                  />
                ) : (
                  <p className="text-[var(--muted)]">{selectedCompany.jobTitle}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {editMode ? (
                  <button onClick={saveCompany} className="btn btn-primary text-sm">
                    Save
                  </button>
                ) : (
                  <button onClick={() => setEditMode(true)} className="btn btn-secondary text-sm">
                    ✏️ Edit
                  </button>
                )}
                <button onClick={() => setShowCompanyModal(false)} className="text-[var(--muted)] hover:text-white text-xl">
                  ✕
                </button>
              </div>
            </div>

            {/* Company Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs text-[var(--muted)] uppercase tracking-wider">Industry</label>
                {editMode ? (
                  <input
                    type="text"
                    value={selectedCompany.industry || ""}
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, industry: e.target.value })}
                    className="input mt-1"
                    placeholder="e.g., Tech, Fintech"
                  />
                ) : (
                  <p className="font-medium">{selectedCompany.industry || "—"}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] uppercase tracking-wider">Company Size</label>
                {editMode ? (
                  <input
                    type="text"
                    value={selectedCompany.size || ""}
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, size: e.target.value })}
                    className="input mt-1"
                    placeholder="e.g., 1,000+"
                  />
                ) : (
                  <p className="font-medium">{selectedCompany.size || "—"}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] uppercase tracking-wider">Salary Range</label>
                {editMode ? (
                  <div className="flex gap-2 mt-1">
                    <input
                      type="number"
                      value={selectedCompany.salary?.min || ""}
                      onChange={(e) => setSelectedCompany({
                        ...selectedCompany,
                        salary: { ...selectedCompany.salary, min: parseInt(e.target.value), max: selectedCompany.salary?.max || 0, currency: "USD" }
                      })}
                      className="input"
                      placeholder="Min"
                    />
                    <input
                      type="number"
                      value={selectedCompany.salary?.max || ""}
                      onChange={(e) => setSelectedCompany({
                        ...selectedCompany,
                        salary: { ...selectedCompany.salary, max: parseInt(e.target.value), min: selectedCompany.salary?.min || 0, currency: "USD" }
                      })}
                      className="input"
                      placeholder="Max"
                    />
                  </div>
                ) : (
                  <p className="font-medium text-green-400">{formatSalary(selectedCompany.salary)}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] uppercase tracking-wider">Priority</label>
                {editMode ? (
                  <select
                    value={selectedCompany.priority}
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, priority: e.target.value as Company["priority"] })}
                    className="input mt-1"
                  >
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                ) : (
                  <p className={`font-medium ${
                    selectedCompany.priority === "HIGH" ? "text-red-400" :
                    selectedCompany.priority === "MEDIUM" ? "text-yellow-400" : "text-slate-400"
                  }`}>
                    {selectedCompany.priority}
                  </p>
                )}
              </div>
            </div>

            {/* Interview Rounds */}
            <div className="mb-6">
              <label className="text-xs text-[var(--muted)] uppercase tracking-wider">Interview Progress</label>
              <div className="flex items-center gap-4 mt-2">
                {editMode ? (
                  <>
                    <div>
                      <span className="text-xs text-[var(--muted)]">Completed</span>
                      <input
                        type="number"
                        value={selectedCompany.completedRounds}
                        onChange={(e) => setSelectedCompany({ ...selectedCompany, completedRounds: parseInt(e.target.value) })}
                        className="input w-20"
                        min={0}
                      />
                    </div>
                    <span>/</span>
                    <div>
                      <span className="text-xs text-[var(--muted)]">Total Rounds</span>
                      <input
                        type="number"
                        value={selectedCompany.totalRounds}
                        onChange={(e) => setSelectedCompany({ ...selectedCompany, totalRounds: parseInt(e.target.value) })}
                        className="input w-20"
                        min={1}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span>Round {selectedCompany.completedRounds} of {selectedCompany.totalRounds}</span>
                      <span>{Math.round((selectedCompany.completedRounds / selectedCompany.totalRounds) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--primary)] rounded-full"
                        style={{ width: `${(selectedCompany.completedRounds / selectedCompany.totalRounds) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Interviewers Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs text-[var(--muted)] uppercase tracking-wider">Interviewers / Contacts</label>
                {editMode && (
                  <button onClick={addInterviewer} className="text-xs text-[var(--primary)] hover:underline">
                    + Add Person
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {selectedCompany.interviewers.map((interviewer, index) => (
                  <div key={index} className="card bg-[var(--background)]">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--primary)]/30 flex items-center justify-center font-bold">
                        {interviewer.name.charAt(0) || "?"}
                      </div>
                      <div className="flex-1">
                        {editMode ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={interviewer.name}
                              onChange={(e) => updateInterviewer(index, "name", e.target.value)}
                              className="input"
                              placeholder="Name"
                            />
                            <input
                              type="text"
                              value={interviewer.role}
                              onChange={(e) => updateInterviewer(index, "role", e.target.value)}
                              className="input"
                              placeholder="Role (e.g., Hiring Manager)"
                            />
                            <input
                              type="text"
                              value={interviewer.linkedin || ""}
                              onChange={(e) => updateInterviewer(index, "linkedin", e.target.value)}
                              className="input"
                              placeholder="LinkedIn URL"
                            />
                          </div>
                        ) : (
                          <>
                            <p className="font-medium">{interviewer.name}</p>
                            <p className="text-sm text-[var(--muted)]">{interviewer.role}</p>
                            {interviewer.linkedin && (
                              <a href={interviewer.linkedin} target="_blank" className="text-xs text-[var(--primary)] hover:underline">
                                LinkedIn →
                              </a>
                            )}
                          </>
                        )}

                        {/* AI Summary */}
                        {interviewer.aiSummary ? (
                          <div className="mt-2 p-2 bg-[var(--primary)]/10 rounded-lg text-sm">
                            <p className="text-xs text-[var(--primary)] mb-1">🤖 AI Summary:</p>
                            <p className="text-[var(--muted)]">{interviewer.aiSummary}</p>
                          </div>
                        ) : (
                          !editMode && interviewer.name && (
                            <button
                              onClick={() => searchInterviewerAI(interviewer, selectedCompany.name)}
                              disabled={searchingAI === interviewer.name}
                              className="mt-2 text-xs text-[var(--primary)] hover:underline disabled:opacity-50"
                            >
                              {searchingAI === interviewer.name ? "🔍 Searching..." : "🤖 Search with AI"}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {selectedCompany.interviewers.length === 0 && !editMode && (
                  <p className="text-sm text-[var(--muted)] text-center py-4">
                    No contacts added yet. Click Edit to add interviewers.
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="text-xs text-[var(--muted)] uppercase tracking-wider">Notes</label>
              {editMode ? (
                <textarea
                  value={selectedCompany.notes || ""}
                  onChange={(e) => setSelectedCompany({ ...selectedCompany, notes: e.target.value })}
                  className="input mt-1 min-h-[100px]"
                  placeholder="Add notes about this opportunity..."
                />
              ) : (
                <p className="mt-1 text-[var(--muted)]">{selectedCompany.notes || "No notes yet."}</p>
              )}
            </div>

            {/* Quick Actions */}
            {!editMode && (
              <div className="flex flex-wrap gap-2">
                <button className="quick-action">
                  <span>📧</span> Email Contact
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(bookingLink)}
                  className="quick-action"
                >
                  <span>🔗</span> Share Booking Link
                </button>
                <button className="quick-action">
                  <span>📅</span> Schedule Interview
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
