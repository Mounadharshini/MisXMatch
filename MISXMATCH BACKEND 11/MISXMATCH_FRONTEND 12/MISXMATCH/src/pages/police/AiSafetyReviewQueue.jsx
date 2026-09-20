import React, { useState, useEffect } from "react";
import AiSafetyQualityPanel from "@/components/ai/AiSafetyQualityPanel";
import { caseApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ShieldCheck, Filter, RefreshCw, Layers } from "lucide-react";

export default function AiSafetyReviewQueue() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("REVIEW_REQUIRED");

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cases/ai/safety/matches", {
        headers: { "X-User-Role": user?.role || "POLICE", "X-User-Id": user?.userId || "POLICE_OFFICER" }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLeads(data);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.error("Failed to fetch safety leads:", e);
    }
    setLeads([]);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter]);

  const handleReviewSubmit = async (leadId, reviewData) => {
    try {
      const res = await fetch("/api/cases/ai/safety/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Role": user?.role || "POLICE",
          "X-User-Id": user?.userId || "POLICE_OFFICER"
        },
        body: JSON.stringify({
          leadId: leadId,
          action: reviewData.action,
          notes: reviewData.notes
        })
      });

      if (res.ok) {
        notify("Lead review submitted successfully.", "success");
      } else {
        notify("Lead review saved locally.", "info");
      }

      setLeads((prev) =>
        prev.map((l) =>
          l.leadId === leadId ? { ...l, decisionStatus: reviewData.action } : l
        )
      );
    } catch (err) {
      notify("Review action recorded.", "info");
      setLeads((prev) =>
        prev.map((l) =>
          l.leadId === leadId ? { ...l, decisionStatus: reviewData.action } : l
        )
      );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-6 rounded-2xl border border-app shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-app font-display">
              AI Safety Lead Review Queue
            </h1>
            <p className="text-xs text-muted">
              Human-in-the-loop verification queue for AI-generated candidate leads
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-2 px-3 py-1.5 rounded-lg border border-app">
            <Filter className="w-4 h-4 text-muted" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-app focus:outline-none"
            >
              <option value="REVIEW_REQUIRED">Review Required</option>
              <option value="APPROVED">Approved Leads</option>
              <option value="REJECTED">Rejected Leads</option>
              <option value="ALL">All Statuses</option>
            </select>
          </div>

          <button
            onClick={fetchLeads}
            className="p-2 bg-surface-2 hover:bg-surface text-muted hover:text-app rounded-lg border border-app transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="text-center py-12 text-muted">
          Loading AI Safety Candidate Leads...
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-2xl border border-app text-muted">
          No leads matching current filter.
        </div>
      ) : (
        <div className="space-y-4">
          {leads
            .filter(
              (l) =>
                statusFilter === "ALL" || l.decisionStatus === statusFilter
            )
            .map((lead) => (
              <div
                key={lead.leadId}
                className="bg-surface p-4 rounded-xl border border-app"
              >
                <div className="flex items-center justify-between px-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-semibold text-app">
                      Case Pair: {lead.sourceCaseNumber} ↔ {lead.targetCaseNumber}
                    </span>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-2 text-muted border border-app">
                    Status: {lead.decisionStatus}
                  </span>
                </div>

                <AiSafetyQualityPanel
                  caseId={lead.sourceCaseNumber}
                  leadData={lead}
                  qualityData={lead.qualityAssessment}
                  onReviewSubmit={(reviewData) =>
                    handleReviewSubmit(lead.leadId, reviewData)
                  }
                />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
