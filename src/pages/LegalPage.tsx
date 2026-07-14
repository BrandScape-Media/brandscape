import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

const EFFECTIVE_DATE = 'July 14, 2026'
const COMPANY = 'Brandscape'
const CONTACT_EMAIL = 'privacy@brandscape.media'

function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-black text-brand-white">
      <header className="border-b border-white/5">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="inline-block">
            <img src="/logo-dark.png" alt="Brandscape" className="h-7 w-auto" />
          </Link>
          <Link to="/" className="text-brand-500 hover:text-white text-sm font-heading transition-colors">
            &larr; Back to site
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <h1 className="font-heading font-black text-3xl mb-2">{title}</h1>
        <p className="text-brand-600 text-sm font-body mb-10">Effective {EFFECTIVE_DATE}</p>
        <div className="legal-body space-y-6">{children}</div>

        <div className="mt-16 pt-8 border-t border-white/5 flex items-center gap-6">
          <Link to="/privacy" className="text-brand-500 hover:text-white text-sm font-heading transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="text-brand-500 hover:text-white text-sm font-heading transition-colors">Terms of Service</Link>
        </div>
      </main>
    </div>
  )
}

function H2({ children }: { children: ReactNode }) {
  return <h2 className="font-heading font-bold text-lg text-white mt-8 mb-3">{children}</h2>
}

function P({ children }: { children: ReactNode }) {
  return <p className="text-brand-300 text-sm font-body leading-relaxed">{children}</p>
}

function UL({ children }: { children: ReactNode }) {
  return <ul className="list-disc pl-5 space-y-1.5 text-brand-300 text-sm font-body leading-relaxed">{children}</ul>
}

export function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <P>
        This Privacy Policy explains how {COMPANY} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses, and protects
        information when you use the {COMPANY} platform at brandscape.media (the &ldquo;Service&rdquo;). By using the
        Service you agree to this policy.
      </P>

      <H2>Information We Collect</H2>
      <UL>
        <li><strong>Account data</strong> — your name, email address, and profile details, provided directly or via Google sign-in (OAuth). When you use Google sign-in we receive your name, email, and profile picture.</li>
        <li><strong>Agency &amp; client content</strong> — information you enter about your agency, clients, campaigns, brand guidelines, and any files (logos, product images, fonts, reference material) you upload.</li>
        <li><strong>Generated content</strong> — media and documents produced by the Service on your behalf.</li>
        <li><strong>Usage data</strong> — technical logs such as IP address, browser type, and actions taken, used to operate and secure the Service.</li>
      </UL>

      <H2>How We Use Information</H2>
      <UL>
        <li>To provide, maintain, and improve the Service and its AI content pipeline.</li>
        <li>To authenticate you and secure your account.</li>
        <li>To generate research, creative, and media outputs you request.</li>
        <li>To communicate with you about your account, billing, and support.</li>
        <li>To meet legal obligations and enforce our Terms of Service.</li>
      </UL>

      <H2>How Information Is Shared</H2>
      <P>
        We do not sell your personal information. We share data only with service providers that help us run the
        Service, under contractual confidentiality obligations, including:
      </P>
      <UL>
        <li><strong>Supabase</strong> — authentication, database, and file storage.</li>
        <li><strong>Cloud GPU and AI providers</strong> — to process research and generate media from the inputs you submit.</li>
        <li><strong>Payment and hosting providers</strong> — to operate the Service.</li>
      </UL>
      <P>
        Content you choose to share with your own clients via a share link is accessible to anyone who has that link.
        We may also disclose information where required by law.
      </P>

      <H2>Data Retention</H2>
      <P>
        We retain your data for as long as your account is active or as needed to provide the Service. You may request
        deletion of your account and associated data by contacting us; some records may be retained where required for
        legal or security reasons.
      </P>

      <H2>Security</H2>
      <P>
        We use industry-standard measures including encryption in transit, row-level access controls, and scoped access
        keys. No method of transmission or storage is completely secure, but we work to protect your information.
      </P>

      <H2>Your Rights</H2>
      <P>
        Depending on your location, you may have rights to access, correct, export, or delete your personal data, and to
        object to certain processing. To exercise these rights, contact{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-white underline hover:text-brand-300">{CONTACT_EMAIL}</a>.
      </P>

      <H2>Google User Data</H2>
      <P>
        When you sign in with Google, our use of information received from Google APIs adheres to the{' '}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer" className="text-white underline hover:text-brand-300">Google API Services User Data Policy</a>,
        including the Limited Use requirements. We use Google profile data solely to create and authenticate your account.
      </P>

      <H2>Changes</H2>
      <P>
        We may update this policy from time to time. Material changes will be reflected by updating the effective date
        above and, where appropriate, notifying you.
      </P>

      <H2>Contact</H2>
      <P>
        Questions? Email{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-white underline hover:text-brand-300">{CONTACT_EMAIL}</a>.
      </P>
    </LegalShell>
  )
}

export function TermsPage() {
  return (
    <LegalShell title="Terms of Service">
      <P>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the {COMPANY} platform at
        brandscape.media (the &ldquo;Service&rdquo;). By creating an account or using the Service, you agree to these Terms.
      </P>

      <H2>The Service</H2>
      <P>
        {COMPANY} provides AI-assisted tools for marketing agencies to research, plan, and produce content. Features,
        limits, and pricing depend on your subscription plan and may change over time.
      </P>

      <H2>Accounts</H2>
      <UL>
        <li>You must provide accurate information and keep your credentials secure.</li>
        <li>You are responsible for all activity under your account and your agency&rsquo;s workspace.</li>
        <li>You must be authorized to act on behalf of the agency and clients whose data you enter.</li>
      </UL>

      <H2>Your Content &amp; Responsibilities</H2>
      <UL>
        <li>You retain ownership of the content and assets you upload.</li>
        <li>You grant us a limited license to process your content solely to operate the Service for you.</li>
        <li>You confirm you have the rights to any brand assets, images, and material you upload, and to use content generated for your clients.</li>
        <li>You will not upload unlawful, infringing, or harmful content, or use the Service to produce it.</li>
      </UL>

      <H2>Acceptable Use</H2>
      <P>You agree not to misuse the Service, including by attempting to breach security, reverse-engineer the platform, resell access without authorization, or overload the infrastructure.</P>

      <H2>Billing</H2>
      <P>
        Paid plans are billed in advance on a recurring basis. Usage limits (such as generations and revisions) apply per
        plan. Fees are non-refundable except where required by law. We may change pricing with notice.
      </P>

      <H2>AI-Generated Output</H2>
      <P>
        Output is generated programmatically and may contain inaccuracies. You are responsible for reviewing content
        before publishing or delivering it to clients. The Service is provided as a tool, not as professional advice.
      </P>

      <H2>Termination</H2>
      <P>
        You may cancel at any time. We may suspend or terminate access for violation of these Terms or to protect the
        Service. Upon termination, your right to use the Service ends and we may delete your data after a reasonable period.
      </P>

      <H2>Disclaimers &amp; Liability</H2>
      <P>
        The Service is provided &ldquo;as is&rdquo; without warranties of any kind. To the maximum extent permitted by law,
        {' '}{COMPANY} is not liable for indirect, incidental, or consequential damages, and our total liability is limited
        to the amount you paid for the Service in the twelve months preceding the claim.
      </P>

      <H2>Changes</H2>
      <P>We may update these Terms; continued use after changes constitutes acceptance. The effective date above reflects the latest version.</P>

      <H2>Contact</H2>
      <P>
        Questions about these Terms? Email{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-white underline hover:text-brand-300">{CONTACT_EMAIL}</a>.
      </P>
    </LegalShell>
  )
}
