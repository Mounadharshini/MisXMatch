import { Section } from "@/components/ui/Primitives";
export default function Privacy() {
  return (
    <>
      <div className="gradient-safety text-white"><div className="container-x py-20"><div className="text-xs uppercase tracking-widest text-gold-400 font-semibold">Legal</div><h1 className="mt-3">Privacy Policy</h1><p className="text-white/70 mt-3">Last updated: {new Date().toDateString()}</p></div></div>
      <Section>
        <div className="max-w-3xl mx-auto prose prose-slate space-y-6 text-muted">
          <p><strong className="text-app">1. Data we collect.</strong> MisXMatch collects the minimum data needed to identify and reunite missing persons — including name, contact information, Aadhaar verification token (never the raw number), photographs, last-seen location and any medical or identifying details you choose to share.</p>
          <p><strong className="text-app">2. Aadhaar handling.</strong> Aadhaar numbers are never stored in plaintext. Only the last four digits are displayed to authorised roles, and identity is confirmed against the UIDAI verification service.</p>
          <p><strong className="text-app">3. Role-based access.</strong> Public users cannot access police investigation details. Hospitals and NGOs cannot view any information beyond what they upload themselves. Access is enforced at both the interface and the API layer.</p>
          <p><strong className="text-app">4. Immutable audit log.</strong> Every action taken on the platform — including administrator actions — is written to an append-only audit log that cannot be modified or deleted by any user.</p>
          <p><strong className="text-app">5. Data retention.</strong> Case data is retained for the duration of the investigation and archived for statistical purposes in an anonymised form after closure and family consent.</p>
          <p><strong className="text-app">6. Security.</strong> All traffic is TLS-encrypted. Photographs and documents are encrypted at rest. Session tokens rotate on privilege changes.</p>
          <p><strong className="text-app">7. Your rights.</strong> You may request access to, or deletion of, your personal data by contacting the Data Protection Officer at dpo@misxmatch.gov.in.</p>
        </div>
      </Section>
    </>
  );
}
