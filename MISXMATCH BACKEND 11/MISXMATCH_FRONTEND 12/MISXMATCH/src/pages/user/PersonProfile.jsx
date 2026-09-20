import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, Phone, ShieldCheck, Eye, ArrowLeft, Loader2, Sparkles, AlertTriangle, User, Calendar, Tag } from "lucide-react";
import { caseApi } from "@/lib/api";
import { priorityBadgeClass, CASE_STATUS_CONFIG } from "@/utils/constants";
import { Card } from "@/components/ui/Primitives";
import { relTime } from "@/utils/helpers";
import TopAiMatchesCard from "@/components/ui/TopAiMatchesCard";
import SafeImage from "@/components/ui/SafeImage";

export default function PersonProfile() {
  const { id } = useParams();
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);

  const [sightings, setSightings] = useState([]);

  useEffect(() => {
    async function loadPerson() {
      try {
        setLoading(true);
        let foundPerson = null;
        try {
          const res = await caseApi.getMissing(id);
          if (res?.data && res.data.id) {
            foundPerson = res.data;
          }
        } catch {}

        if (!foundPerson) {
          try {
            const fRes = await caseApi.getFound(id);
            if (fRes?.data && fRes.data.id) {
              foundPerson = fRes.data;
            }
          } catch {}
        }

        if (foundPerson) {
          setPerson(foundPerson);

          // Load Sightings for this person / caseNumber from database
          const targetCase = foundPerson.caseNumber || `MP-${foundPerson.id}`;
          let backendSightings = [];
          try {
            const sRes = await caseApi.listSightings();
            const sList = Array.isArray(sRes?.data) ? sRes.data : (Array.isArray(sRes?.data?.content) ? sRes.data.content : []);
            backendSightings = sList.filter((s) =>
              String(s.caseNumber || s.missingCaseNumber).toLowerCase() === String(targetCase).toLowerCase() ||
              String(s.missingPersonId) === String(foundPerson.id)
            );
          } catch {}
          setSightings(backendSightings);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadPerson();
  }, [id]);

  if (loading) {
    return (
      <Card className="py-20 flex flex-col items-center justify-center text-muted">
        <Loader2 className="w-8 h-8 animate-spin text-navy-600 mb-3" />
        <div className="font-semibold text-app">Loading case dossier from database…</div>
      </Card>
    );
  }

  if (!person) {
    return (
      <Card className="max-w-xl mx-auto text-center py-12 space-y-4">
        <AlertTriangle className="w-12 h-12 text-warning mx-auto" />
        <h2 className="text-2xl font-bold text-app">Case Record Not Found</h2>
        <p className="text-muted text-sm">The requested case profile could not be found or has been archived.</p>
        <Link to="/app/directory" className="btn btn-primary inline-flex">
          Back to Directory
        </Link>
      </Card>
    );
  }

  const statusConfig = CASE_STATUS_CONFIG[person.status] || { label: person.status || "Active Search", badge: "badge-critical" };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link to="/app/directory" className="text-sm font-semibold text-muted hover:text-app flex items-center gap-1.5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Return to Directory
      </Link>

      <Card className="overflow-hidden !p-0 border border-app shadow-xl">
        <div className="grid md:grid-cols-3">
          <div className="relative aspect-[3/4] md:aspect-auto md:h-full bg-navy-100 dark:bg-navy-900">
            {person.photoUrl || person.photo ? (
              <SafeImage
                src={person.photoUrl || person.photo}
                className="w-full h-full object-cover"
                fallbackClassName="w-full h-full min-h-[300px] flex flex-col items-center justify-center text-muted gap-2 bg-surface-2"
                alt={person.fullName || person.name}
              />
            ) : (
              <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center text-muted gap-2 bg-surface-2">
                <User className="w-16 h-16 opacity-30" />
                <span className="text-xs font-mono">No Photograph Filed</span>
              </div>
            )}
            <span className={`badge ${priorityBadgeClass(person.priority || "high")} absolute top-4 left-4 shadow-lg`}>
              {person.priority || "High"} Priority
            </span>
          </div>

          <div className="p-6 md:p-8 md:col-span-2 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip font-mono font-bold text-xs">{person.caseNumber || `MP-${person.id}`}</span>
                <span className={`badge ${statusConfig.badge}`}>{statusConfig.label}</span>
              </div>

              <div>
                <h1 className="text-3xl font-bold font-display text-app">{person.fullName || person.name}</h1>
                <p className="text-muted text-sm mt-1">
                  Age {person.age || "Unknown"} · {person.gender || "—"} · Disappeared on {person.dateMissing || "Recorded Date"}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <Info label="Last Known Location">
                  <span className="flex items-center gap-1 text-app font-medium">
                    <MapPin className="w-3.5 h-3.5 text-navy-500 shrink-0" /> {person.lastSeenLocation || "Not recorded"}
                  </span>
                </Info>
                <Info label="Investigative Contact">
                  <span className="flex items-center gap-1 text-app font-medium font-mono">
                    <Phone className="w-3.5 h-3.5 text-ok shrink-0" /> {person.contactNumber || "+91 112"}
                  </span>
                </Info>
                <Info label="Physical Complexion">{person.complexion || "Standard"}</Info>
                <Info label="Blood Group">{person.bloodGroup || "Not recorded"}</Info>
                <Info label="Clothing Description" className="sm:col-span-2">
                  {person.clothingDescription || person.clothing || "No specific clothing details recorded."}
                </Info>
                <Info label="Distinguishing Marks / Scars" className="sm:col-span-2">
                  {person.physicalMarks || person.marks || "No distinct marks reported."}
                </Info>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-app">
              <Link to={`/app/sighting/${person.caseNumber || person.id}`} className="btn btn-primary shadow-md">
                <Eye className="w-4 h-4" /> Submit Citizen Sighting
              </Link>
              <a href="tel:112" className="btn btn-outline">
                <Phone className="w-4 h-4" /> Dial 112 Police Emergency
              </a>
            </div>
          </div>
        </div>
      </Card>

      {/* Real AI-Powered Multi-Vector Person Matches */}
      <TopAiMatchesCard caseNumber={person.caseNumber || `MP-${person.id}`} />

      {/* Case narrative card */}
      <Card className="p-6 space-y-3 border border-app">
        <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
          Case Summary &amp; Context
        </div>
        <p className="text-muted text-sm leading-relaxed">
          {person.description || "Active national search investigation. Any citizen with information is urged to submit a sighting or notify local law enforcement."}
        </p>
      </Card>

      {/* Citizen Sightings & Investigation Leads Section */}
      <Card className="p-6 space-y-4 border border-app shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
              Community Intelligence
            </div>
            <h2 className="text-lg font-bold font-display text-app mt-0.5">
              Citizen Sighting Reports &amp; Leads ({sightings.length})
            </h2>
          </div>
          <Link
            to={`/app/sighting/${person.caseNumber || person.id}`}
            className="btn btn-primary text-xs !py-2 shadow-sm"
          >
            <Eye className="w-3.5 h-3.5" /> Submit Sighting
          </Link>
        </div>

        {sightings.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-surface border border-app space-y-2">
            <Eye className="w-8 h-8 text-muted mx-auto opacity-50" />
            <div className="text-sm font-semibold text-app">No citizen sightings recorded yet for this person</div>
            <p className="text-xs text-muted max-w-md mx-auto">
              If you have spotted someone matching this individual&apos;s description, please submit an anonymous sighting lead to alert investigating officers.
            </p>
            <Link
              to={`/app/sighting/${person.caseNumber || person.id}`}
              className="btn btn-outline text-xs mt-2 inline-flex"
            >
              Report Sighting Lead Now
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {sightings.map((s, idx) => (
              <div
                key={s.id || idx}
                className="p-4 rounded-2xl border border-app bg-surface shadow-xs space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`badge ${s.verified ? "badge-ok" : "badge-medium"} text-[10px]`}>
                      {s.verified ? "Verified by Police" : "Citizen Sighting Lead"}
                    </span>
                    <span className="text-[10px] text-muted font-mono">
                      {relTime(s.sightingDate || s.createdAt || new Date().toISOString())}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-app flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-danger shrink-0" />
                    <span>{s.sightingLocation || "Location recorded"}</span>
                  </div>

                  {s.description && (
                    <p className="text-xs text-muted leading-relaxed">
                      {s.description}
                    </p>
                  )}
                </div>

                {s.photoUrl && (
                  <div className="pt-2 border-t border-app flex items-center gap-3">
                    <SafeImage
                      src={s.photoUrl}
                      className="w-12 h-12 rounded-xl object-cover border border-app"
                      alt="Sighting capture"
                    />
                    <span className="text-[11px] text-muted font-mono">Attached photo frame lead</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Info({ label, children, className = "" }) {
  return (
    <div className={`rounded-xl bg-surface border border-app p-3 shadow-xs ${className}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted font-bold">{label}</div>
      <div className="mt-1 text-app font-medium">{children}</div>
    </div>
  );
}
