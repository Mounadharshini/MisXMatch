import { FolderCheck, FileText, Image, Video } from "lucide-react";
export default function Evidence() {
  const items = Array.from({ length: 9 }, (_, i) => ({ id: i, name: `evidence_${i+1}.jpg`, type: i%3===0?"video":i%3===1?"pdf":"image", case: `MP-2025${i+1}` }));
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><FolderCheck className="w-6 h-6" /> Evidence</h1><p className="text-muted text-sm">All uploaded evidence across your open cases.</p></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((e) => (
          <div key={e.id} className="card p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-navy-100 dark:bg-navy-800 flex items-center justify-center">{e.type==="video"?<Video className="w-5 h-5 text-navy-600"/>:e.type==="pdf"?<FileText className="w-5 h-5 text-navy-600"/>:<Image className="w-5 h-5 text-navy-600"/>}</div>
            <div><div className="font-semibold text-sm">{e.name}</div><div className="text-xs text-muted">Case {e.case}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}
