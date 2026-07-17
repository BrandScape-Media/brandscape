import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { workflowStages } from '../data/workflow'
import WorkflowIcon from '../components/WorkflowIcon'
import DemoWindow from '../components/landing/DemoWindow'
import ShowcaseGallery from '../components/landing/ShowcaseGallery'
import PartnerMarquee from '../components/landing/PartnerMarquee'
import CountUp from '../components/landing/CountUp'
import useInViewOnce from '../lib/useInViewOnce'

export default function HomePage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // Intersection observer for scroll animations
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id))
          }
        })
      },
      { threshold: 0.1, rootMargin: '-60px' }
    )

    const sections = document.querySelectorAll('[data-animate]')
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  const inView = (id: string) => visibleSections.has(id)

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        {/* Background Grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />

        {/* Gradient Orbs — colored for warmth */}
        <div className="absolute top-[12%] left-1/4 w-[600px] h-[600px] bg-violet-600/[0.08] rounded-full blur-[160px]" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-sky-500/[0.06] rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[400px] bg-rose-500/[0.05] rounded-full blur-[130px]" />

        <div className="relative z-10 w-full pt-36 pb-24">
          <div className="max-w-6xl mx-auto px-6 lg:px-8 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 border border-white/10 rounded-full text-brand-300 text-xs font-heading tracking-wider uppercase mb-10 animate-fade-in backdrop-blur-sm bg-white/[0.02]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400/70 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-gradient-to-br from-violet-400 to-sky-400" />
              </span>
              Now in Early Access — Limited Spots
            </div>

            {/* Heading */}
            <h1 className="font-heading font-black text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight leading-[0.9] mb-8 animate-slide-up">
              Your Entire Creative
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-violet-300 to-rose-300">
                Pipeline, Automated
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="font-body text-brand-400 text-lg md:text-xl max-w-2xl mx-auto mb-14 animate-slide-up leading-relaxed"
              style={{ animationDelay: '0.1s' }}
            >
              Send in a client brief. Brandscape comes back with the research, the
              concepts, the scripts, the shoot plan — and finished creatives like the
              ones below. Your team approves the work instead of producing it.
            </p>

            {/* CTA */}
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up"
              style={{ animationDelay: '0.2s' }}
            >
              <Link
                to="/signup"
                className="group w-full sm:w-auto px-8 py-4 bg-white text-black font-heading font-bold text-sm tracking-wide rounded-lg hover:bg-brand-200 transition-all duration-300 hover:shadow-[0_0_60px_rgba(167,139,250,0.35)] flex items-center justify-center gap-2"
              >
                Start Free Trial
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                to="/pricing"
                className="w-full sm:w-auto px-8 py-4 border border-white/20 text-white font-heading font-semibold text-sm tracking-wide rounded-lg hover:border-white/40 hover:bg-white/[0.03] transition-all duration-300"
              >
                View Pricing
              </Link>
            </div>
          </div>

          {/* Showcase reel — the hero showpiece: what the pipeline produces */}
          <div className="mt-16 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <ShowcaseGallery />
            <p className="text-center text-brand-600 text-xs font-body mt-3">
              Real creatives from the pipeline — <span className="text-brand-400">drag to explore</span>
            </p>
          </div>

          {/* Trust Badges */}
          <div className="mt-16 flex flex-col items-center">
            <p className="text-brand-600 text-xs font-heading tracking-widest uppercase mb-6">
              Built for agencies that ship fast
            </p>
            <div className="grid grid-cols-3 gap-x-12 gap-y-4 max-w-md">
              <TrustStat label="Production speed" accent="from-sky-300 to-cyan-300">
                <CountUp to={10} suffix="x" />
              </TrustStat>
              <TrustStat label="Cost per deliverable" accent="from-emerald-300 to-teal-300">
                <CountUp to={70} prefix="−" suffix="%" />
              </TrustStat>
              <TrustStat label="More profit per project" accent="from-violet-300 to-fuchsia-300">
                <CountUp to={2.3} decimals={1} suffix="×" />
              </TrustStat>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TRUSTED BY / LOGOS ===== */}
      <section className="relative py-20 bg-brand-900/40 border-y border-white/5 overflow-hidden">
        {/* soft glow bleeding in from the top of the band */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-32 bg-white/[0.04] rounded-full blur-[90px] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto">
          <p className="text-center text-brand-600 text-xs font-heading tracking-[0.3em] uppercase mb-10 px-6">
            Trusted by forward-thinking agencies worldwide
          </p>
          <PartnerMarquee />
        </div>
      </section>

      {/* ===== LIVE DEMO — the pipeline running itself ===== */}
      <section id="demo" className="py-28 bg-brand-black relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[500px] bg-sky-500/[0.05] rounded-full blur-[180px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[400px] bg-violet-500/[0.05] rounded-full blur-[160px]" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 font-heading text-xs tracking-[0.3em] uppercase mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-sky-400 to-violet-400" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-violet-300">Live preview</span>
            </span>
            <h2 className="font-heading font-black text-4xl md:text-5xl tracking-tight mb-5">
              Watch the Pipeline Work.
            </h2>
            <p className="font-body text-brand-400 max-w-xl mx-auto text-lg">
              The same dashboard your team uses — every stage thinks, writes, and hands
              off to the next. Click any stage to jump in.
            </p>
          </div>
          <DemoWindow />
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="py-32 bg-brand-950">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className={`text-center mb-24 transition-all duration-700 ${inView('features-grid') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="font-heading text-xs tracking-[0.3em] uppercase text-brand-500 mb-4 block">
              Platform
            </span>
            <h2 className="font-heading font-black text-4xl md:text-5xl lg:text-6xl tracking-tight mb-6">
              Everything You Need.
              <br />
              Nothing You Don&apos;t.
            </h2>
            <p className="font-body text-brand-400 max-w-xl mx-auto text-lg">
              Every module is designed to replace hours of manual work with
              precise, brand-aligned AI outputs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 rounded-2xl overflow-hidden"
            data-animate id="features-grid">
            <FeatureCard
              title="Discovery Forms"
              description="Collect client info, budgets, timelines, and brand guidelines in structured intake forms that feed the entire pipeline."
              icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              delay={0}
            />
            <FeatureCard
              title="AI Research"
              description="Keyword analysis, trend reports, competitor audits, and audience sentiment — automated and structured into actionable insights."
              icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              delay={100}
            />
            <FeatureCard
              title="Ideation Engine"
              description="Creative angles, A/B concepts, and the strategy behind them — brand voice, KPIs, and funnel fit in one pass."
              icon="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              delay={200}
            />
            <FeatureCard
              title="Script Writer"
              description="Short-form and long-form scripts in the client's voice — edit by hand or tell the AI what to change in chat."
              icon="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              delay={300}
            />
            <FeatureCard
              title="Shoot Planning"
              description="Scene-by-scene breakdowns with A-roll, B-roll, and generation prompts derived from the approved scripts."
              icon="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              delay={0}
            />
            <FeatureCard
              title="Content Generation"
              description="Stills and video clips generated on dedicated GPU infrastructure using the client's real product photos as reference."
              icon="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              delay={100}
            />
            <FeatureCard
              title="Client Share Links"
              description="Send clients a private gallery — they comment with video timestamps, you resolve. No accounts, no email chains."
              icon="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              delay={200}
            />
            <FeatureCard
              title="Brand Library"
              description="Every upload and every generated asset organized per client, with storage quotas and clean custom metadata."
              icon="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              delay={300}
            />
          </div>
        </div>
      </section>

      {/* ===== WORKFLOW ===== */}
      <section id="workflow" className="py-32 bg-brand-900/20 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-[700px] h-[500px] bg-white/[0.04] rounded-full blur-[200px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[400px] bg-white/[0.03] rounded-full blur-[160px]" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <div className={`text-center mb-24 transition-all duration-700 ${inView('workflow-grid') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="font-heading text-xs tracking-[0.3em] uppercase text-brand-500 mb-4 block">
              Workflow
            </span>
            <h2 className="font-heading font-black text-4xl md:text-5xl lg:text-6xl tracking-tight mb-6">
              Six Stages.
              <br />
              Zero Friction.
            </h2>
            <p className="font-body text-brand-400 max-w-xl mx-auto text-lg">
              Each module feeds into the next, creating a seamless automation pipeline
              from client intake to final delivery.
            </p>
          </div>

          {/* Pipeline */}
          <div data-animate id="workflow-grid" className="relative">
            {/* Connecting Line — Desktop */}
            <div className="hidden lg:block absolute top-12 left-[5%] right-[5%] h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-3">
              {workflowStages.map((stage, i) => (
                <div
                  key={stage.stage}
                  className="group"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className="relative bg-brand-900/40 border border-white/5 rounded-xl p-5 text-center hover:border-white/20 hover:bg-brand-900/60 transition-all duration-300">
                    {/* Step Number */}
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-6 h-6 bg-brand-900 border border-white/20 rounded-full flex items-center justify-center text-[10px] font-heading font-bold text-brand-400 z-10">
                      {i + 1}
                    </span>

                    <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-center group-hover:bg-white/[0.08] group-hover:border-white/10 transition-all duration-300">
                      <WorkflowIcon name={stage.icon} />
                    </div>
                    <span className="font-heading font-bold text-[11px] tracking-wider uppercase text-brand-300 group-hover:text-white transition-colors">
                      {stage.label}
                    </span>
                    <p className="text-brand-600 text-[11px] mt-2.5 font-body leading-relaxed hidden lg:block">
                      {stage.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback Loop */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3.5 border border-white/10 rounded-full bg-white/[0.02] backdrop-blur-sm">
              <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-brand-400 text-sm font-body">
                Continuous feedback loop — every stage refines the next
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== COMPARISON: Traditional vs Brandscape ===== */}
      <section id="why" className="py-32 bg-brand-950 relative overflow-hidden">
        {/* colored ambience biased to the Brandscape (right) side */}
        <div className="absolute top-1/3 right-[8%] w-[560px] h-[420px] bg-violet-600/[0.10] rounded-full blur-[170px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[420px] h-[360px] bg-sky-500/[0.08] rounded-full blur-[150px]" />
        <div className="absolute top-1/4 left-[6%] w-[360px] h-[320px] bg-rose-600/[0.05] rounded-full blur-[150px]" />
        <div className="max-w-5xl mx-auto px-6 lg:px-8 relative z-10">
          <div className={`text-center mb-20 transition-all duration-700 ${inView('comparison') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="inline-flex items-center gap-2 font-heading text-xs tracking-[0.3em] uppercase mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-sky-400 to-violet-400" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-violet-300">Why Brandscape</span>
            </span>
            <h2 className="font-heading font-black text-4xl md:text-5xl tracking-tight mb-6">
              The Old Way vs.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-violet-300 to-rose-300">The New Way</span>
            </h2>
          </div>

          <div data-animate id="comparison" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* The Old Way */}
            <div className="bg-brand-900/20 border border-red-500/15 rounded-2xl p-8 md:mt-6">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="font-heading font-bold text-lg text-red-400/90">The Old Way</h3>
              </div>
              <ul className="space-y-4">
                {[
                  'Manual client onboarding spreadsheets',
                  'Weeks of research by junior strategists',
                  'Whiteboard brainstorming sessions',
                  'Copy-pasting briefs between tools',
                  'Hand-writing scripts from scratch',
                  'Coordinating shoots across teams',
                  'Waiting days for edits and revisions',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg className="w-4 h-4 text-red-500/50 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-brand-400 text-sm font-body line-through decoration-red-500/30">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* The Brandscape Way — vibrant, animated gradient border */}
            <div className="ai-glow ai-glow-soft rounded-2xl">
              <div className="relative bg-brand-950 rounded-2xl p-8 overflow-hidden">
                <div className="absolute -top-10 -right-10 w-52 h-52 bg-violet-500/20 rounded-full blur-[70px]" />
                <div className="absolute -bottom-10 -left-10 w-52 h-52 bg-sky-500/15 rounded-full blur-[70px]" />
                <div className="relative flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="font-heading font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-sky-200 via-violet-200 to-rose-200">
                    With Brandscape
                  </h3>
                </div>
                <ul className="relative space-y-4">
                  {[
                    'Structured discovery forms, auto-populated',
                    'AI research completed in minutes',
                    '3 creative concepts with A/B angles instantly',
                    'One pipeline — every stage connected',
                    'AI-generated scripts, editable or re-runnable',
                    'Scene-by-scene shoot plans with prompts',
                    'Generated raws, straight to a client gallery',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-4 h-4 mt-0.5 flex-shrink-0 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <span className="text-white text-sm font-body">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-32 bg-brand-black">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className={`text-center mb-24 transition-all duration-700 ${inView('howitworks') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="font-heading text-xs tracking-[0.3em] uppercase text-brand-500 mb-4 block">
              How It Works
            </span>
            <h2 className="font-heading font-black text-4xl md:text-5xl lg:text-6xl tracking-tight mb-6">
              Upload. Automate. Deliver.
            </h2>
            <p className="font-body text-brand-400 max-w-xl mx-auto text-lg">
              Three steps from client intake to final deliverable.
            </p>
          </div>

          <div data-animate id="howitworks" className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <HowItWorksCard
              step="01"
              title="Upload Client Data"
              description="Input your client info, brand guidelines, target audience, and competition. Everything is structured into a client-specific database accessible by every AI module."
              detail="Questionnaires, budgets, timelines, brand assets — all organized."
            />
            <HowItWorksCard
              step="02"
              title="AI Does the Heavy Lifting"
              description="Research, ideation, strategy, scripts, and shoot plans are generated by specialized AI models, each with dedicated prompts and independent workflows."
              detail="Each stage is reviewable, editable, and re-runnable."
            />
            <HowItWorksCard
              step="03"
              title="Review & Deliver"
              description="Review and refine at every stage. Request AI revisions or edit by hand. Final assets land in a client-accessible library with custom metadata."
              detail="Download, share, or send directly to clients."
            />
          </div>
        </div>
      </section>

      {/* ===== TECH STACK ===== */}
      <section className="py-32 bg-brand-950 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-flex items-center gap-2 font-heading text-xs tracking-[0.3em] uppercase mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-emerald-400 to-sky-400" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-sky-300">Infrastructure</span>
              </span>
              <h2 className="font-heading font-black text-4xl md:text-5xl tracking-tight mb-6">
                Enterprise-Grade.
                <br />
                On-Demand GPU Power.
              </h2>
              <p className="font-body text-brand-400 text-lg mb-8 leading-relaxed">
                Every image, video clip, and line of copy is produced by our own generation
                pipeline on dedicated GPU infrastructure that scales on demand. No queues, no
                capacity limits — just finished creative.
              </p>
              <div className="space-y-4">
                {[
                  { label: 'Dedicated GPU Compute', desc: 'Enterprise GPUs spun up on demand for every generation job — no shared queues' },
                  { label: 'Proprietary Generation Pipeline', desc: 'Our own image & video engine, guided by each client’s real product photos and brand kit' },
                  { label: 'Specialized AI Models', desc: 'Every pipeline stage runs a purpose-built model tuned for that job' },
                  { label: 'Clean Metadata', desc: 'Assets are stripped of generation data and tagged with your custom metadata' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-md bg-white/[0.08] border border-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-heading font-semibold text-sm text-white">{item.label}</p>
                      <p className="text-brand-500 text-sm font-body">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual: Architecture Diagram */}
            <div className="relative">
              <div className="bg-brand-900/40 border border-white/5 rounded-2xl p-8 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  <span className="text-brand-600 text-xs font-heading ml-2">brandscape.pipeline</span>
                </div>
                <TypewriterLines />
                <div className="pt-4 border-t border-white/5 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-500/80 text-xs font-heading">Pipeline Active</span>
                </div>
              </div>
              <div className="absolute -inset-4 bg-white/[0.01] rounded-3xl blur-xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* ===== WINS ===== */}
      <section id="wins" className="py-32 bg-brand-black">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="font-heading text-xs tracking-[0.3em] uppercase text-brand-500 mb-4 block">
              Client Wins
            </span>
            <h2 className="font-heading font-black text-4xl md:text-5xl tracking-tight">
              The Numbers Agencies Care About
            </h2>
          </div>

          {/* Result stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
            {[
              { to: 70, prefix: '−', suffix: '%', decimals: 0, label: 'Cost per deliverable', note: 'vs. traditional production' },
              { to: 6, prefix: '', suffix: ' hrs', decimals: 0, label: 'Brief to first raws', note: 'was 5 business days' },
              { to: 3.4, prefix: '', suffix: '×', decimals: 1, label: 'Concepts tested per campaign', note: 'more angles, same budget' },
              { to: 40, prefix: '', suffix: '+', decimals: 0, label: 'Campaigns shipped', note: 'through the pipeline in beta' },
            ].map((s, i) => (
              <div key={i} className="bg-brand-900/30 border border-white/5 rounded-2xl p-7 text-center hover:border-white/10 transition-colors">
                <p className="font-heading font-black text-4xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-br from-white to-brand-400 mb-2">
                  <CountUp to={s.to} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals} />
                </p>
                <p className="font-heading font-semibold text-xs text-brand-300 tracking-wide uppercase">{s.label}</p>
                <p className="text-brand-600 text-[11px] font-body mt-1.5">{s.note}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "We used to spend 2 weeks on research and strategy alone. Brandscape does it in an afternoon and the quality is genuinely impressive.",
                author: 'Sarah Chen',
                role: 'CDO, Voyager Agency',
              },
              {
                quote: "The shoot planning alone is worth the price. Getting scene-by-scene breakdowns with A-roll and B-roll prompts saved us hours of pre-production.",
                author: 'Marcus Rivera',
                role: 'Head of Production, Ember Studio',
              },
              {
                quote: "Finally, an AI tool built specifically for agencies — not a generic wrapper. The pipeline thinking is exactly what the industry needs.",
                author: 'Aisha Patel',
                role: 'Founder, North Peak Creative',
              },
            ].map((t, i) => (
              <div key={i} className="bg-brand-900/30 border border-white/5 rounded-xl p-8 hover:border-white/10 transition-colors flex flex-col">
                <div className="flex-1">
                  <svg className="w-6 h-6 text-brand-700 mb-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                  <p className="text-brand-300 text-sm font-body leading-relaxed">&quot;{t.quote}&quot;</p>
                </div>
                <div className="mt-6 pt-6 border-t border-white/5">
                  <p className="font-heading font-semibold text-sm text-white">{t.author}</p>
                  <p className="text-brand-600 text-xs font-body mt-0.5">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA / CONTACT ===== */}
      <section id="contact" className="py-32 bg-brand-950 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-white/[0.02] rounded-full blur-[200px]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="font-heading font-black text-4xl md:text-5xl lg:text-6xl tracking-tight mb-6">
            Ready to Automate
            <br />
            Your Agency?
          </h2>
          <p className="font-body text-brand-400 text-lg mb-12">
            Join the agencies already shipping content 10x faster with Brandscape.
            Start your 14-day free trial — no credit card required.
          </p>

          {!submitted ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setSubmitted(true)
                setEmail('')
              }}
              className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@agency.com"
                required
                className="flex-1 px-5 py-4 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm placeholder:text-brand-600 focus:outline-none focus:border-white/30 transition-colors"
              />
              <button
                type="submit"
                className="px-8 py-4 bg-white text-black font-heading font-bold text-sm tracking-wide rounded-lg hover:bg-brand-200 transition-colors whitespace-nowrap"
              >
                START FREE TRIAL
              </button>
            </form>
          ) : (
            <div className="inline-flex items-center gap-3 px-6 py-4 border border-green-500/20 rounded-lg bg-green-500/5">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-400 font-body text-sm">You&apos;re on the list. We&apos;ll be in touch soon.</span>
            </div>
          )}

          <p className="text-brand-700 text-xs font-body mt-6">
            Free 14-day trial • No credit card required • Cancel anytime
          </p>
          <p className="text-brand-600 text-xs font-body mt-3">
            Prefer talking to a human?{' '}
            <a href="mailto:hello@brandscape.media" className="text-brand-400 hover:text-white underline underline-offset-2 transition-colors">
              hello@brandscape.media
            </a>
          </p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <FooterSection />
    </>
  )
}

const PIPELINE_LINES = [
  'Client Discovery → Database',
  'Research AI → Report',
  'Ideation AI → Concepts',
  'Script AI → Scripts',
  'Shoot Plan AI → Prompts',
  'Generation Engine → Stills',
  'Generation Engine → Clips',
  'Client Gallery → Delivery',
]

/**
 * The infra window writes itself out like a streaming AI response — starts
 * when scrolled into view, holds when finished, then loops. Interval-driven
 * (not rAF) so it also plays in throttled embedded browsers. Hidden text is
 * rendered transparent so the window never changes height.
 */
function TypewriterLines() {
  const total = PIPELINE_LINES.reduce((n, l) => n + l.length, 0)
  const [shown, setShown] = useState(0)
  const { ref, inView } = useInViewOnce<HTMLDivElement>()
  const started = useRef(false)

  useEffect(() => {
    if (!inView || started.current) return
    started.current = true
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(total)
      return
    }
    let n = 0
    let hold = 0
    const timer = window.setInterval(() => {
      if (n >= total) {
        // fully typed — hold ~4.5s, then start over
        hold += 1
        if (hold > 56) {
          n = 0
          hold = 0
          setShown(0)
        }
        return
      }
      n = Math.min(n + 7, total) // ~85 chars/s — streaming-AI pace
      setShown(n)
    }, 80)
    return () => clearInterval(timer)
  }, [inView, total])

  let offset = 0
  const done = shown >= total
  return (
    <div ref={ref} className="space-y-4">
      {PIPELINE_LINES.map((line, i) => {
        const start = offset
        offset += line.length
        const visible = Math.max(0, Math.min(line.length, shown - start))
        const active = !done && shown >= start && shown < start + line.length
        const caretHere = active || (done && i === PIPELINE_LINES.length - 1)
        return (
          <div key={i} className="flex items-center gap-3 font-mono text-xs">
            <span className="text-brand-700 w-5 text-right">{visible > 0 ? `${i + 1}.` : ''}</span>
            <span className={i >= 5 ? 'text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-violet-300 font-semibold' : 'text-brand-500'}>
              {line.slice(0, visible)}
              {caretHere && <span className="type-caret" aria-hidden />}
              <span className="opacity-0" aria-hidden>{line.slice(visible)}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

function TrustStat({ label, accent, children }: { label: string; accent?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className={`font-heading font-black text-2xl md:text-3xl mb-1 whitespace-nowrap ${
        accent ? `text-transparent bg-clip-text bg-gradient-to-r ${accent}` : 'text-white'
      }`}>
        {children}
      </div>
      <div className="text-brand-600 text-[10px] font-heading tracking-wider uppercase">{label}</div>
    </div>
  )
}

function FeatureCard({ title, description, icon, delay }: { title: string; description: string; icon: string; delay: number }) {
  return (
    <div
      className="ai-hover-card bg-brand-black p-8 group hover:bg-brand-900/40 transition-all duration-500 relative overflow-hidden"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.01] rounded-full blur-[50px] group-hover:bg-white/[0.06] transition-all duration-700" />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent rounded-2xl" />
      </div>
      <div className="w-11 h-11 mb-5 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-center group-hover:bg-white/[0.08] group-hover:border-white/15 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.06)] transition-all duration-500 relative z-10">
        <svg className="w-5 h-5 text-brand-300 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
        </svg>
      </div>
      <h3 className="font-heading font-bold text-base mb-3 group-hover:text-white transition-colors relative z-10">{title}</h3>
      <p className="text-brand-500 group-hover:text-brand-400 text-sm font-body leading-relaxed transition-colors duration-500 relative z-10">{description}</p>
    </div>
  )
}

function HowItWorksCard({ step, title, description, detail }: { step: string; title: string; description: string; detail: string }) {
  return (
    <div className="bg-brand-900/40 border border-white/10 rounded-2xl p-8 group flex flex-col transition-all duration-300 hover:-translate-y-2 hover:border-white/30 hover:bg-brand-900/70 hover:shadow-[0_24px_60px_-20px_rgba(139,123,247,0.35)] cursor-default">
      <span className="font-heading font-black text-6xl text-brand-700 mb-6 leading-none transition-colors duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-br group-hover:from-sky-300 group-hover:to-violet-300">{step}</span>
      <h3 className="font-heading font-bold text-xl mb-4 transition-colors group-hover:text-white">{title}</h3>
      <p className="text-brand-400 text-sm font-body leading-relaxed flex-1 transition-colors group-hover:text-brand-300">{description}</p>
      <div className="mt-6 pt-6 border-t border-white/5 transition-colors group-hover:border-white/10">
        <p className="text-brand-600 text-xs font-body italic transition-colors group-hover:text-brand-400">{detail}</p>
      </div>
    </div>
  )
}

function FooterSection() {
  return (
    <footer className="bg-brand-950 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <img src="/logo-dark.png" alt="Brandscape" className="h-8 mb-4" />
            <p className="text-brand-600 text-xs font-body leading-relaxed">
              End-to-end AI automation for marketing agencies.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-heading font-semibold text-[11px] tracking-wider uppercase text-brand-400 mb-4">
              Product
            </h4>
            <ul className="space-y-2.5">
              <li><Link to="/#features" className="text-brand-600 hover:text-brand-300 text-xs font-body transition-colors">Features</Link></li>
              <li><Link to="/#workflow" className="text-brand-600 hover:text-brand-300 text-xs font-body transition-colors">Workflow</Link></li>
              <li><Link to="/pricing" className="text-brand-600 hover:text-brand-300 text-xs font-body transition-colors">Pricing</Link></li>
              <li><Link to="/signup" className="text-brand-600 hover:text-brand-300 text-xs font-body transition-colors">Free Trial</Link></li>
            </ul>
          </div>

          {/* Modules */}
          <div>
            <h4 className="font-heading font-semibold text-[11px] tracking-wider uppercase text-brand-400 mb-4">
              Modules
            </h4>
            <ul className="space-y-2.5">
              {['Research AI', 'Ideation Engine', 'Script Writer', 'Content Generator', 'Client Share Links'].map((m) => (
                <li key={m}><span className="text-brand-600 text-xs font-body">{m}</span></li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-heading font-semibold text-[11px] tracking-wider uppercase text-brand-400 mb-4">
              Company
            </h4>
            <ul className="space-y-2.5">
              <li><Link to="/#contact" className="text-brand-600 hover:text-brand-300 text-xs font-body transition-colors">Contact</Link></li>
              {/* real static pages in public/ — full page loads, not SPA routes */}
              <li><a href="/privacy/" className="text-brand-600 hover:text-brand-300 text-xs font-body transition-colors">Privacy</a></li>
              <li><a href="/terms/" className="text-brand-600 hover:text-brand-300 text-xs font-body transition-colors">Terms</a></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-heading font-semibold text-[11px] tracking-wider uppercase text-brand-400 mb-4">
              Follow
            </h4>
            <div className="flex items-center gap-4">
              <a href="#" className="text-brand-700 hover:text-brand-400 transition-colors" aria-label="Twitter">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
              <a href="#" className="text-brand-700 hover:text-brand-400 transition-colors" aria-label="LinkedIn">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              </a>
              <a href="#" className="text-brand-700 hover:text-brand-400 transition-colors" aria-label="Instagram">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-brand-700 text-xs font-body">
            &copy; {new Date().getFullYear()} Brandscape. All rights reserved.
          </p>
          <p className="text-brand-800 text-[10px] font-heading tracking-wider">
            BRANDSCAPE.MEDIA
          </p>
        </div>
      </div>
    </footer>
  )
}
