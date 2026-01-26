"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { isStageAdvancement, CELEBRATION_STAGES, STAGE_DEFINITIONS } from "@/lib/stages";
import Tour from "@/components/Tour";
import Header from "@/components/Header";

interface Stage {
  id: string;
  stageKey: string;
  name: string;
  emoji: string;
  color: string;
  order: number;
  isEnabled: boolean;
}

interface Interview {
  id: string;
  title: string;
  scheduledAt: string;
  status: string;
}

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
  stageId: string;
  stage: Stage;
  priority: "HIGH" | "MEDIUM" | "LOW";
  salary?: string;
  location?: string;
  remote?: boolean;
  recruiterName?: string;
  recruiterEmail?: string;
  recruiterPhone?: string;
  totalRounds: number;
  completedRounds: number;
  interviews: Interview[];
  interviewers: Interviewer[];
  notes?: string;
  nextInterview?: Interview;
  emailCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Confetti function
const fireConfetti = async (isBigCelebration: boolean = false) => {
  const confetti = (await import("canvas-confetti")).default;

  if (isBigCelebration) {
    // Big celebration for offer/accepted
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: ["#6366f1", "#22d3ee", "#10b981", "#f59e0b", "#ef4444"],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: ["#6366f1", "#22d3ee", "#10b981", "#f59e0b", "#ef4444"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  } else {
    // Standard confetti for forward movement
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#6366f1", "#22d3ee", "#10b981"],
    });
  }
};

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Default stages that always show
  const DEFAULT_STAGES: Stage[] = STAGE_DEFINITIONS
    .filter(s => s.defaultEnabled)
    .map((s, i) => ({
      id: `stage-${s.key}`,
      stageKey: s.key,
      name: s.name,
      emoji: s.emoji,
      color: s.color,
      order: i,
      isEnabled: true,
    }));

  const [stages, setStages] = useState<Stage[]>(DEFAULT_STAGES);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [draggedCompany, setDraggedCompany] = useState<Company | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [searchingAI, setSearchingAI] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bookingSlug, setBookingSlug] = useState<string>("");
  const [showTour, setShowTour] = useState(false);
  const previousStagesRef = useRef<Record<string, string>>({});

  const bookingLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/book/${bookingSlug}`;

  // Check if user just completed onboarding
  const justCompletedOnboarding = searchParams.get("welcome") === "true";

  // Fetch stages and companies
  useEffect(() => {
    const fetchData = async () => {
      try {
        // First fetch user data - this creates the user and default stages if they don't exist
        const userRes = await fetch("/api/user");
        if (!userRes.ok) {
          console.error("Failed to fetch user data");
          setIsLoading(false);
          return;
        }

        const userData = await userRes.json();

        // Check if onboarding is completed
        if (!userData.user.onboardingCompleted) {
          router.push("/onboarding");
          return;
        }

        setBookingSlug(userData.user.bookingLink?.slug || "me");

        // Now fetch stages and companies (user exists at this point)
        const [stagesRes, companiesRes] = await Promise.all([
          fetch("/api/stages"),
          fetch("/api/companies"),
        ]);

        if (stagesRes.ok) {
          const data = await stagesRes.json();
          const enabledStages = (data.stages || []).filter((s: Stage) => s.isEnabled);
          if (enabledStages.length > 0) {
            setStages(enabledStages);
          }
          // If no stages from API, keep the default stages that were set initially
        }
        // If API fails, keep the default stages that were set initially

        if (companiesRes.ok) {
          const data = await companiesRes.json();
          setCompanies(data.companies || []);
          // Store initial stages for tracking advancement
          const stageMap: Record<string, string> = {};
          (data.companies || []).forEach((c: Company) => {
            stageMap[c.id] = c.stage?.stageKey || "";
          });
          previousStagesRef.current = stageMap;
        }

        // Show tour for first-time users or when just completed onboarding
        const hasSeenTour = localStorage.getItem("hasSeenDashboardTour");
        if (!hasSeenTour || justCompletedOnboarding) {
          // Small delay to let the UI render first
          setTimeout(() => setShowTour(true), 800);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router, justCompletedOnboarding]);

  const handleDragStart = (company: Company) => {
    setDraggedCompany(company);
  };

  const handleDrop = useCallback(async (targetStage: Stage) => {
    if (!draggedCompany || draggedCompany.stageId === targetStage.id) {
      setDraggedCompany(null);
      return;
    }

    const oldStageKey = draggedCompany.stage?.stageKey || "";
    const newStageKey = targetStage.stageKey;

    // Optimistic update
    setCompanies(prev => prev.map(c =>
      c.id === draggedCompany.id
        ? { ...c, stageId: targetStage.id, stage: targetStage }
        : c
    ));

    // Check for stage advancement and trigger confetti
    if (isStageAdvancement(oldStageKey, newStageKey)) {
      const isBigCelebration = CELEBRATION_STAGES.includes(newStageKey);
      fireConfetti(isBigCelebration);
    }

    // Persist to backend
    try {
      const response = await fetch(`/api/companies/${draggedCompany.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: targetStage.id }),
      });

      if (!response.ok) {
        // Revert on error
        setCompanies(prev => prev.map(c =>
          c.id === draggedCompany.id
            ? { ...c, stageId: draggedCompany.stageId, stage: draggedCompany.stage }
            : c
        ));
      } else {
        // Update previous stages ref
        previousStagesRef.current[draggedCompany.id] = newStageKey;
      }
    } catch (error) {
      console.error("Error updating company stage:", error);
      // Revert on error
      setCompanies(prev => prev.map(c =>
        c.id === draggedCompany.id
          ? { ...c, stageId: draggedCompany.stageId, stage: draggedCompany.stage }
          : c
      ));
    }

    setDraggedCompany(null);
  }, [draggedCompany]);

  const formatSalary = (salary?: string) => {
    if (!salary) return "Not specified";
    return salary;
  };

  const searchInterviewerAI = async (interviewer: Interviewer, companyName: string) => {
    setSearchingAI(interviewer.name);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "search_interviewer",
          name: interviewer.name,
          role: interviewer.role,
          company: companyName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (selectedCompany) {
          setSelectedCompany({
            ...selectedCompany,
            interviewers: selectedCompany.interviewers.map(i =>
              i.name === interviewer.name ? { ...i, aiSummary: data.summary } : i
            ),
          });
        }
      }
    } catch (error) {
      console.error("Error searching interviewer:", error);
    }
    setSearchingAI(null);
  };

  const addInterviewer = () => {
    if (selectedCompany) {
      setSelectedCompany({
        ...selectedCompany,
        interviewers: [...(selectedCompany.interviewers || []), { name: "", role: "" }],
      });
    }
  };

  const updateInterviewer = (index: number, field: keyof Interviewer, value: string) => {
    if (selectedCompany) {
      const updated = [...(selectedCompany.interviewers || [])];
      updated[index] = { ...updated[index], [field]: value };
      setSelectedCompany({ ...selectedCompany, interviewers: updated });
    }
  };

  const saveCompany = async () => {
    if (!selectedCompany) return;

    try {
      const isNew = !companies.find(c => c.id === selectedCompany.id);
      const url = isNew ? "/api/companies" : `/api/companies/${selectedCompany.id}`;
      const method = isNew ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedCompany.name,
          jobTitle: selectedCompany.jobTitle,
          website: selectedCompany.website,
          salary: selectedCompany.salary,
          location: selectedCompany.location,
          remote: selectedCompany.remote,
          priority: selectedCompany.priority,
          recruiterName: selectedCompany.recruiterName,
          recruiterEmail: selectedCompany.recruiterEmail,
          notes: selectedCompany.notes,
          stageId: selectedCompany.stageId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (isNew) {
          setCompanies(prev => [...prev, data.company]);
        } else {
          setCompanies(prev => prev.map(c =>
            c.id === selectedCompany.id ? { ...c, ...data.company } : c
          ));
        }
        setEditMode(false);
        setShowCompanyModal(false);
      }
    } catch (error) {
      console.error("Error saving company:", error);
    }
  };

  const deleteCompany = async () => {
    if (!selectedCompany) return;

    if (!confirm("Are you sure you want to delete this company?")) return;

    try {
      const response = await fetch(`/api/companies/${selectedCompany.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setCompanies(prev => prev.filter(c => c.id !== selectedCompany.id));
        setShowCompanyModal(false);
        setSelectedCompany(null);
      }
    } catch (error) {
      console.error("Error deleting company:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header showBookingLink bookingLink={bookingLink} />

      {/* Sub-header with actions */}
      <div className="border-b border-[var(--border)] bg-[var(--background)]">
        <div className="max-w-[1800px] mx-auto px-4 py-2 flex items-center justify-end gap-3">
          <button
            data-tour="add-company"
            onClick={() => {
              const defaultStage = stages[0];
              setSelectedCompany({
                id: "",
                name: "",
                jobTitle: "",
                stageId: defaultStage?.id || "",
                stage: defaultStage,
                priority: "MEDIUM",
                totalRounds: 4,
                completedRounds: 0,
                interviews: [],
                interviewers: [],
              });
              setEditMode(true);
              setShowCompanyModal(true);
            }}
            className="btn btn-primary text-sm"
          >
            + Add Company
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <main className="max-w-[1800px] mx-auto p-4" data-tour="pipeline">
        {stages.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[var(--muted)] mb-4">No pipeline stages configured.</p>
            <Link href="/settings?tab=pipeline" className="btn btn-primary">
              Configure Stages
            </Link>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {stages.map((stage) => {
              const stageCompanies = companies.filter(c => c.stageId === stage.id);
              return (
                <div
                  key={stage.id}
                  className="min-w-[300px] max-w-[300px] flex-shrink-0"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(stage)}
                >
                  {/* Column Header */}
                  <div className="flex items-center gap-2 mb-3 px-2">
                    <span>{stage.emoji}</span>
                    <h3 className="font-semibold text-sm">{stage.name}</h3>
                    <span className="ml-auto bg-[var(--secondary)] px-2 py-0.5 rounded-full text-xs">
                      {stageCompanies.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div
                    className="kanban-column min-h-[calc(100vh-180px)] rounded-lg p-2"
                    style={{ borderLeft: `4px solid ${stage.color}` }}
                  >
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
                        className={`kanban-card cursor-pointer ${
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
                        {company.interviewers && company.interviewers.length > 0 && (
                          <div className="flex items-center gap-1 mb-2">
                            <span className="text-xs text-[var(--muted)]">👥</span>
                            <div className="flex -space-x-2">
                              {company.interviewers.slice(0, 3).map((interviewer, i) => (
                                <div
                                  key={i}
                                  className="w-6 h-6 rounded-full bg-[var(--primary)]/30 flex items-center justify-center text-xs border-2 border-[var(--secondary)]"
                                  title={interviewer.name}
                                >
                                  {interviewer.name?.charAt(0) || "?"}
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
                        {company.nextInterview && (
                          <p className="text-xs text-cyan-400">
                            📅 Next: {new Date(company.nextInterview.scheduledAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Company Detail Modal */}
      {showCompanyModal && selectedCompany && (
        <div className="modal-overlay" onClick={() => setShowCompanyModal(false)}>
          <div className="modal-content max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                {editMode ? (
                  <input
                    type="text"
                    value={selectedCompany.name}
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, name: e.target.value })}
                    className="input text-xl font-bold mb-1 w-full"
                    placeholder="Company name"
                  />
                ) : (
                  <h2 className="text-xl font-bold">{selectedCompany.name}</h2>
                )}
                {editMode ? (
                  <input
                    type="text"
                    value={selectedCompany.jobTitle || ""}
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, jobTitle: e.target.value })}
                    className="input text-sm w-full"
                    placeholder="Job title"
                  />
                ) : (
                  <p className="text-[var(--muted)]">{selectedCompany.jobTitle}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {editMode ? (
                  <>
                    <button onClick={saveCompany} className="btn btn-primary text-sm">
                      Save
                    </button>
                    {selectedCompany.id && (
                      <button onClick={deleteCompany} className="btn btn-danger text-sm">
                        Delete
                      </button>
                    )}
                  </>
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

            {/* Stage Selector (Edit Mode) */}
            {editMode && (
              <div className="mb-4">
                <label className="text-xs text-[var(--muted)] uppercase tracking-wider">Stage</label>
                <select
                  value={selectedCompany.stageId}
                  onChange={(e) => {
                    const stage = stages.find(s => s.id === e.target.value);
                    if (stage) {
                      setSelectedCompany({ ...selectedCompany, stageId: stage.id, stage });
                    }
                  }}
                  className="input mt-1 w-full"
                >
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.emoji} {stage.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Company Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs text-[var(--muted)] uppercase tracking-wider">Website</label>
                {editMode ? (
                  <input
                    type="text"
                    value={selectedCompany.website || ""}
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, website: e.target.value })}
                    className="input mt-1"
                    placeholder="https://company.com"
                  />
                ) : (
                  <p className="font-medium">{selectedCompany.website || "—"}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] uppercase tracking-wider">Location</label>
                {editMode ? (
                  <input
                    type="text"
                    value={selectedCompany.location || ""}
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, location: e.target.value })}
                    className="input mt-1"
                    placeholder="San Francisco, CA"
                  />
                ) : (
                  <p className="font-medium">{selectedCompany.location || "—"}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] uppercase tracking-wider">Salary Range</label>
                {editMode ? (
                  <input
                    type="text"
                    value={selectedCompany.salary || ""}
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, salary: e.target.value })}
                    className="input mt-1"
                    placeholder="$150k - $200k"
                  />
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

            {/* Recruiter Info */}
            <div className="mb-6">
              <label className="text-xs text-[var(--muted)] uppercase tracking-wider">Recruiter Contact</label>
              {editMode ? (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <input
                    type="text"
                    value={selectedCompany.recruiterName || ""}
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, recruiterName: e.target.value })}
                    className="input"
                    placeholder="Recruiter name"
                  />
                  <input
                    type="email"
                    value={selectedCompany.recruiterEmail || ""}
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, recruiterEmail: e.target.value })}
                    className="input"
                    placeholder="recruiter@company.com"
                  />
                </div>
              ) : (
                <p className="font-medium mt-1">
                  {selectedCompany.recruiterName || "—"}
                  {selectedCompany.recruiterEmail && ` (${selectedCompany.recruiterEmail})`}
                </p>
              )}
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
                {(selectedCompany.interviewers || []).map((interviewer, index) => (
                  <div key={index} className="card bg-[var(--background)]">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--primary)]/30 flex items-center justify-center font-bold">
                        {interviewer.name?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1">
                        {editMode ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={interviewer.name || ""}
                              onChange={(e) => updateInterviewer(index, "name", e.target.value)}
                              className="input"
                              placeholder="Name"
                            />
                            <input
                              type="text"
                              value={interviewer.role || ""}
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

                {(!selectedCompany.interviewers || selectedCompany.interviewers.length === 0) && !editMode && (
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
                  className="input mt-1 min-h-[100px] w-full"
                  placeholder="Add notes about this opportunity..."
                />
              ) : (
                <p className="mt-1 text-[var(--muted)]">{selectedCompany.notes || "No notes yet."}</p>
              )}
            </div>

            {/* Quick Actions */}
            {!editMode && selectedCompany.id && (
              <div className="flex flex-wrap gap-2">
                {selectedCompany.recruiterEmail && (
                  <a
                    href={`mailto:${selectedCompany.recruiterEmail}`}
                    className="quick-action"
                  >
                    <span>📧</span> Email Contact
                  </a>
                )}
                <button
                  onClick={() => navigator.clipboard.writeText(bookingLink)}
                  className="quick-action"
                >
                  <span>🔗</span> Share Booking Link
                </button>
                <Link href="/emails" className="quick-action">
                  <span>📨</span> View Emails ({selectedCompany.emailCount || 0})
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* First-time user tour */}
      <Tour
        isActive={showTour}
        onComplete={() => {
          setShowTour(false);
          localStorage.setItem("hasSeenDashboardTour", "true");
        }}
      />
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
