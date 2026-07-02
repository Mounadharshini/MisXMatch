import { Section } from "@/components/ui/Primitives";
export default function Terms() {
  return (
    <>
      <div className="gradient-safety text-white"><div className="container-x py-20"><div className="text-xs uppercase tracking-widest text-gold-400 font-semibold">Legal</div><h1 className="mt-3">Terms of Use</h1></div></div>
      <Section>
        <div className="max-w-3xl mx-auto space-y-5 text-muted">
          <p><strong className="text-app">Acceptable Use.</strong> The platform is for the purpose of reporting, investigating and resolving missing person cases only. Any misuse — including filing false reports, impersonating authorities, or attempting to gain unauthorised access — is a criminal offence.</p>
          <p><strong className="text-app">Aadhaar Verification.</strong> All accounts (Public, Hospital, NGO, Police, Admin) must complete Aadhaar verification before accessing any dashboard.</p>
          <p><strong className="text-app">Content.</strong> By uploading a photograph, description or document, you confirm that you have the right to share it and that it is accurate to the best of your knowledge.</p>
          <p><strong className="text-app">Case Closure.</strong> A case may only be closed after administrator review. Police officers may request closure but cannot close cases unilaterally.</p>
          <p><strong className="text-app">Audit Log.</strong> By using the platform, you consent to your actions being recorded in the immutable audit log for the purposes of accountability and forensic review.</p>
        </div>
      </Section>
    </>
  );
}
