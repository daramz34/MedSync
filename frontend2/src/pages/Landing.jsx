import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarCheck,
  Stethoscope,
  FileText,
  Pill,
  Check,
  Flame,
  User,
  ShieldCheck,
  ChevronDown,
  Download,
  Share2,
  Clock,
  ArrowRight,
  TriangleAlert,
} from "lucide-react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

/* ---------- shared helpers ---------- */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

function Section({ id, children, className = "" }) {
  return (
    <section id={id} className={`mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 ${className}`}>
      {children}
    </section>
  );
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      className="mx-auto mb-10 max-w-2xl text-center sm:mb-12"
    >
      <p className="text-sm font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-muted">{subtitle}</p>}
    </motion.div>
  );
}

/* ---------- sample QR (decorative, not scannable) ---------- */

function QrSample({ className = "h-24 w-24" }) {
  const SIZE = 21;
  const modules = [];
  let seed = 7;

  function finder(x, y, ox, oy) {
    const a = x - ox;
    const b = y - oy;
    return (
      a >= 0 && a < 7 && b >= 0 && b < 7 &&
      (a === 0 || a === 6 || b === 0 || b === 6 || (a >= 2 && a <= 4 && b >= 2 && b <= 4))
    );
  }

  function inFinderZone(x, y) {
    return (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
  }

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      let on;
      if (inFinderZone(x, y)) {
        on = finder(x, y, 0, 0) || finder(x, y, 14, 0) || finder(x, y, 0, 14);
      } else {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        on = (seed >> 8) % 2 === 0;
      }
      if (on) modules.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
    }
  }

  return (
    <svg
      viewBox="0 0 21 21"
      shapeRendering="crispEdges"
      role="img"
      aria-label="Sample prescription QR code (not scannable)"
      className={`${className} shrink-0 rounded-[10px] border border-slate-200 bg-white p-1.5 text-navy`}
      fill="currentColor"
    >
      {modules}
    </svg>
  );
}

/* ---------- 2. Hero ---------- */

const initialDoses = [
  { id: 1, name: "Metformin 500 mg", time: "With breakfast, 8:00", taken: true },
  { id: 2, name: "Lisinopril 10 mg", time: "Morning, 8:00", taken: true },
  { id: 3, name: "Metformin 500 mg", time: "With dinner, 19:00", taken: false },
];

const cardIn = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const cardClass =
  "rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg sm:p-5";

function HeroPreview() {
  const [doses, setDoses] = useState(initialDoses);
  const taken = doses.filter((d) => d.taken).length;
  const streak = taken === doses.length ? 13 : 12;

  const toggle = (id) =>
    setDoses((prev) => prev.map((d) => (d.id === id ? { ...d, taken: !d.taken } : d)));

  return (
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      className="w-full"
    >
      <motion.div
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.12 }}
        aria-label="Sample preview of the MedSync patient view"
        className="grid gap-3 rounded-3xl border border-blue-100 bg-blue-50/70 p-3 sm:gap-3.5 sm:p-5"
      >
        {/* Medication card */}
        <motion.div variants={cardIn} className={cardClass}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold">Today&rsquo;s medication</h3>
              <p className="mt-0.5 text-sm text-muted">
                {taken} of {doses.length} doses taken
              </p>
            </div>
            <div className="text-right">
              <motion.p
                key={streak}
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                className="flex items-center justify-end gap-1 text-2xl font-bold leading-none"
              >
                <Flame size={18} className="text-orange-500" />
                {streak}
              </motion.p>
              <p className="mt-1 text-xs text-muted">day streak</p>
            </div>
          </div>

          <div className="mt-4">
            {doses.map((d) => (
              <button
                key={d.id}
                type="button"
                aria-pressed={d.taken}
                onClick={() => toggle(d.id)}
                className="flex w-full items-center gap-3 border-t border-slate-200 py-2.5 text-left first:border-t-0 first:pt-0"
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-[7px] border-2 border-primary transition ${
                    d.taken ? "bg-primary" : "bg-white"
                  }`}
                >
                  {d.taken && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    >
                      <Check size={14} className="text-white" />
                    </motion.span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{d.name}</span>
                  <span className="block text-xs text-muted">{d.time}</span>
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Prescription card */}
        <motion.div variants={cardIn} className={cardClass}>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold">Prescription RX-20418</h3>
              <p className="mt-0.5 text-sm text-muted">Dr. A. Okafor · Issued 28 Sep</p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-danger">
                <TriangleAlert size={14} />
                Allergy: Penicillin
              </span>
            </div>
            <QrSample className="h-20 w-20 sm:h-24 sm:w-24" />
          </div>
        </motion.div>

        {/* Follow-up card */}
        <motion.div variants={cardIn} className={cardClass}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-base font-semibold">Follow-up visit</h3>
              <p className="mt-0.5 text-sm text-muted">Thu 8 Oct, 10:30 · General Medicine</p>
            </div>
            <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
              Confirmed
            </span>
          </div>
        </motion.div>
      </motion.div>
      <p className="mt-3 text-center text-xs text-muted">Sample data · tap a dose to try it</p>
    </motion.div>
  );
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-14 lg:py-24">
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-primary">
          <ShieldCheck size={14} /> Secure. Simple. Connected.
        </span>
        <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          The next step in your care, all in one place
        </h1>
        <p className="mt-5 max-w-lg text-base text-muted sm:text-lg">
          Book appointments, receive digital prescriptions with QR codes, and
          stay on track with your medication — without the paperwork.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/sign-up"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Get started <ArrowRight size={16} />
          </Link>
          <Link
            to="/sign-in"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-6 py-3 font-semibold transition hover:bg-slate-50"
          >
            Sign in
          </Link>
        </div>
      </motion.div>

      <HeroPreview />
    </section>
  );
}

/* ---------- 3. How it works ---------- */

const steps = [
  { icon: CalendarCheck, title: "Book", text: "Pick a doctor and a time that suits you." },
  { icon: Stethoscope, title: "Visit", text: "See your clinician in person or remotely." },
  { icon: FileText, title: "Prescription", text: "Receive a digital prescription with a QR code." },
  { icon: Pill, title: "Track", text: "Log doses daily and build healthy streaks." },
];

function HowItWorks() {
  return (
    <Section id="how">
      <SectionHeading eyebrow="How it works" title="From booking to recovery in four steps" />
      <div className="relative grid gap-8 sm:grid-cols-2 md:grid-cols-4 md:gap-6">
        <div className="absolute left-0 right-0 top-9 hidden h-0.5 bg-slate-200 md:block" />
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="relative text-center"
          >
            <div className="relative mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-surface bg-primary text-white shadow-md">
              <s.icon size={28} />
              <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-navy text-xs font-bold">
                {i + 1}
              </span>
            </div>
            <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
            <p className="mt-1 text-sm text-muted">{s.text}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ---------- 4. Who it's for ---------- */

const audiences = [
  {
    icon: User,
    title: "Patients",
    color: "bg-blue-100 text-primary",
    points: [
      "Book and manage appointments",
      "Keep prescriptions on your phone",
      "Track medication and streaks",
    ],
  },
  {
    icon: Stethoscope,
    title: "Clinicians",
    color: "bg-green-100 text-accent",
    points: [
      "See assigned appointments at a glance",
      "Issue digital prescriptions in seconds",
      "Verify prescriptions by QR scan",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Administrators",
    color: "bg-amber-100 text-warning",
    points: [
      "Manage patients and doctors",
      "Monitor clinic statistics",
      "Keep operations running smoothly",
    ],
  },
];

function Audience() {
  return (
    <Section id="audience">
      <SectionHeading eyebrow="Who it's for" title="Built for everyone in the care journey" />
      <div className="grid gap-6 md:grid-cols-3">
        {audiences.map((a) => (
          <motion.div
            key={a.title}
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:scale-[1.02] hover:shadow-md"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${a.color}`}>
              <a.icon size={24} />
            </div>
            <h3 className="mt-4 text-xl font-semibold">{a.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {a.points.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm text-muted">
                  <Check size={16} className="mt-0.5 shrink-0 text-accent" />
                  {p}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ---------- 5. Medication tracker preview ---------- */

function TrackerPreview() {
  const days = [1, 2, 3, 4, 5];
  const done = 3;

  return (
    <Section id="tracker">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Medication tracker
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">
            Small habits, big recovery
          </h2>
          <p className="mt-3 max-w-md text-muted">
            Log every dose and watch your streak grow. Consistent medication is
            one of the simplest ways to get better, faster.
          </p>
        </motion.div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Amoxicillin 500mg</p>
              <p className="text-xs text-muted">3 times daily · 5 days</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-600">
              <Flame size={14} /> {done}-day streak
            </span>
          </div>

          <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
            {days.map((d) => {
              const recorded = d <= done;
              return (
                <motion.div
                  key={d}
                  initial={{ scale: 0.6, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: d * 0.12, type: "spring", stiffness: 300 }}
                  className="flex min-w-[72px] flex-1 flex-col items-center gap-2"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${
                      recorded
                        ? "border-accent bg-accent text-white"
                        : "border-dashed border-slate-300 text-slate-400"
                    }`}
                  >
                    {recorded ? <Check size={22} /> : <span className="text-xl">·</span>}
                  </div>
                  <p className="text-xs font-semibold">Day {d}</p>
                  <p className="text-[11px] text-muted">{recorded ? "recorded" : "upcoming"}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---------- 6. Prescription + QR ---------- */

function PrescriptionQR() {
  return (
    <Section>
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mx-auto w-full max-w-xs rounded-xl border border-slate-200 bg-white p-6 text-center shadow-lg transition hover:-translate-y-1 lg:order-1"
        >
          <div className="flex justify-center">
            <QrSample className="h-44 w-44" />
          </div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-muted">
            <Clock size={14} /> Expires: Oct 15
          </p>
          <div className="mt-4 flex gap-2">
            <button className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-200 py-2 text-sm font-semibold hover:bg-slate-50">
              <Download size={15} /> Download
            </button>
            <button className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Share2 size={15} /> Share
            </button>
          </div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="lg:order-2"
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Digital prescriptions
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">
            Prescriptions that travel with you
          </h2>
          <p className="mt-3 max-w-md text-muted">
            Every prescription comes with a secure QR code. Show it at any
            pharmacy — no paper to lose, nothing to rewrite.
          </p>
        </motion.div>
      </div>
    </Section>
  );
}

/* ---------- 7. FAQ ---------- */

const faqs = [
  {
    q: "Is MedSync free to use?",
    a: "Creating an account and booking appointments is free for patients. Clinic-specific fees may apply for consultations.",
  },
  {
    q: "How do digital prescriptions work?",
    a: "After your visit, your doctor issues a prescription that appears in your account with a unique QR code a pharmacist can scan to verify.",
  },
  {
    q: "Is my medical data secure?",
    a: "Yes. Data is transmitted over encrypted connections and access is restricted by role, so only the right people can see it.",
  },
  {
    q: "Can I cancel or reschedule an appointment?",
    a: "Yes. Open the appointment from your dashboard and choose cancel or reschedule, subject to your clinic's policy.",
  },
  {
    q: "Is MedSync for emergencies?",
    a: "No. In an emergency, contact your local emergency number or go to the nearest hospital immediately.",
  },
];

function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <Section id="faq" className="max-w-3xl">
      <SectionHeading eyebrow="FAQ" title="Questions, answered" />
      <div className="space-y-3">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold"
              >
                {f.q}
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              <motion.div
                initial={false}
                animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <p className="px-5 pb-4 text-sm text-muted">{f.a}</p>
              </motion.div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ---------- Page ---------- */

export default function Landing() {
  return (
    <>
      <Navbar />
      <main className="overflow-x-hidden">
        <Hero />
        <HowItWorks />
        <Audience />
        <TrackerPreview />
        <PrescriptionQR />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}