import { useState } from "react";
import { MOCK_MISSING, ROLE_LABEL } from "@/data/mockData";
import { Search, ShieldCheck, ShieldOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function UserManagement() {
  const [q, setQ] = useState("");
  const { log } = useAuth();
  const { notify } = useToast();
  const [users, setUsers] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: `USR-${1000 + i}`, name: MOCK_MISSING[i % 24].name, email: `user${i}@example.com`,
      role: ["public", "hospital", "ngo", "police", "admin"][i % 5], status: i % 7 === 0 ? "Suspended" : "Active",
    }))
  );
  const [open, setOpen] = useState(null);

  const toggleStatus = (u) => {
    const next = u.status === "Active" ? "Suspended" : "Active";
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, status: next } : x)));
    log(next === "Suspended" ? "USER_SUSPENDED" : "USER_REACTIVATED", { actor: u.name });
    notify(`${u.name} is now ${next.toLowerCase()}.`, next === "Suspended" ? "error" : "success");
    setOpen(null);
  };

  const filtered = users.filter((u) => !q || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.includes(q));

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">User Management</h1><p className="text-muted text-sm">All accounts. Suspend or reset without deleting audit history.</p></div>
      <div className="card p-4 relative"><Search className="w-4 h-4 absolute top-6 left-6 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="input pl-9" /></div>
      <div className="card overflow-hidden !p-0">
        <table className="w-full text-sm"><thead className="bg-navy-50 dark:bg-navy-800 text-xs uppercase text-muted"><tr><th className="p-3 text-left">User</th><th className="p-3 text-left">Role</th><th className="p-3 text-left">Status</th><th className="p-3"></th></tr></thead>
          <tbody>{filtered.map((u) => (
            <tr key={u.id} className="border-t border-app">
              <td className="p-3"><div className="font-semibold">{u.name}</div><div className="text-xs text-muted">{u.email}</div></td>
              <td className="p-3">{ROLE_LABEL[u.role]}</td>
              <td className="p-3">{u.status === "Active" ? <span className="badge badge-ok">Active</span> : <span className="badge badge-critical">Suspended</span>}</td>
              <td className="p-3 text-right relative">
                <button className="btn btn-outline" onClick={() => setOpen(open === u.id ? null : u.id)}>Manage</button>
                {open === u.id && (
                  <div className="absolute right-3 top-full mt-1 z-20 w-52 card !p-1.5 text-left">
                    <button onClick={() => toggleStatus(u)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-[var(--surface-2)]">
                      {u.status === "Active" ? <ShieldOff className="w-4 h-4 text-danger" /> : <ShieldCheck className="w-4 h-4 text-ok" />}
                      {u.status === "Active" ? "Suspend user" : "Reactivate user"}
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}</tbody></table>
      </div>
    </div>
  );
}
