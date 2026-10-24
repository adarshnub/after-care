"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Bell,
  Check,
  ClipboardCheck,
  Github,
  Menu,
  MonitorPlay,
  Pause,
  Play,
  ShieldCheck,
  Users,
  X,
  ZoomIn,
} from "lucide-react";
import { Brand, Modal } from "@/components/ui";
import { CareScene } from "./care-scene";
import {
  CareFlower,
  ProductBrowser,
  ProductPhone,
  productScreens,
} from "./product-media";

const roles = [
  {
    id: "patient",
    label: "For patients",
    title: (
      <>
        Your next step,
        <br />
        <em>a little clearer.</em>
      </>
    ),
    points: [
      "A daily plan you can follow",
      "Medication timing and supply",
      "Follow-ups, kept close",
    ],
    screenshot: productScreens.patient,
    alt: "Fictional patient dashboard with a daily recovery schedule",
  },
  {
    id: "caregiver",
    label: "For caregivers",
    title: (
      <>
        In their corner.
        <br />
        <em>In the loop.</em>
      </>
    ),
    points: [
      "Your own sign-in",
      "One shared care plan",
      "Progress you can both see",
    ],
    screenshot: productScreens.caregiver,
    alt: "Caregiver view showing the same patient's recorded progress",
  },
  {
    id: "nurse",
    label: "For nurses",
    title: (
      <>
        Your knowledge.
        <br />
        <em>Carried forward.</em>
      </>
    ),
    points: [
      "Type or dictate instructions",
      "Review and approve the draft",
      "Create patient and caregiver access",
    ],
    screenshot: productScreens.nurse,
    alt: "Nurse workspace with a fictional patient record",
  },
] as const;

const gallery = [
  {
    title: "Medication supply",
    src: productScreens.medications,
    caption:
      "Prescribed timing, recorded refills, and an estimate of what remains.",
  },
  {
    title: "Follow-up appointments",
    src: productScreens.appointments,
    caption:
      "The clinician, the place, and the things to bring. Ready for your calendar.",
  },
  {
    title: "Your care assistant",
    src: productScreens.assistant,
    caption: "A little guidance, grounded in the nurse-reviewed plan.",
  },
];

export function LandingPage() {
  const [activeRole, setActiveRole] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [motion, setMotion] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [preview, setPreview] = useState<(typeof gallery)[number] | null>(null);
  const main = useRef<HTMLElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const role = roles[activeRole];

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotion(!preference.matches);
    update();
    setInteractive(true);
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (
      !main.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const elements = main.current.querySelectorAll<HTMLElement>(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.reveal = "visible";
            observer.unobserve(entry.target);
          }
      },
      { threshold: 0.12 },
    );
    for (const element of elements) {
      if (element.getBoundingClientRect().top > window.innerHeight)
        element.dataset.reveal = "pending";
      observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="marketing" data-motion={motion ? "on" : "off"}>
      <a href="#landing-main" className="skip-link">
        Skip to the After Care story
      </a>
      <header className="landing-header landing-container">
        <Link href="/" className="landing-brand" aria-label="After Care home">
          <Brand />
        </Link>
        <nav
          className={`landing-nav ${navOpen ? "is-open" : ""}`}
          aria-label="Site navigation"
        >
          <a href="#journey" onClick={() => setNavOpen(false)}>
            The journey
          </a>
          <a href="#experience" onClick={() => setNavOpen(false)}>
            Explore the app
          </a>
          <a href="#approach" onClick={() => setNavOpen(false)}>
            Our approach
          </a>
        </nav>
        <div className="landing-header-actions">
          <Link href="/login" className="landing-signin">
            Sign in
          </Link>
          <Link href="/present" className="landing-present">
            <MonitorPlay size={17} />
            <span>Present</span>
          </Link>
          <button
            disabled={!interactive}
            className="landing-icon motion-control"
            onClick={() => setMotion((value) => !value)}
            aria-label={motion ? "Pause animations" : "Play animations"}
            title={motion ? "Pause animations" : "Play animations"}
            aria-pressed={!motion}
          >
            {motion ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            disabled={!interactive}
            className="landing-icon landing-menu-toggle"
            aria-label={
              navOpen ? "Close site navigation" : "Open site navigation"
            }
            aria-expanded={navOpen}
            onClick={() => setNavOpen(!navOpen)}
          >
            {navOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <main ref={main} id="landing-main">
        <section
          className="landing-hero landing-container"
          aria-labelledby="hero-title"
        >
          <div className="hero-copy">
            <h1 id="hero-title">
              A little care.
              <br />
              <em>A better tomorrow.</em>
            </h1>
            <p>
              From hospital to home, turn discharge instructions into a clear
              daily plan. For patients, and the people in their corner.
            </p>
            <div className="hero-actions">
              <a className="landing-button" href="#experience">
                Explore After Care <ArrowRight size={20} />
              </a>
              <Link className="story-link" href="/present">
                <span>
                  <Play size={15} fill="currentColor" />
                </span>
                Watch the story
              </Link>
            </div>
          </div>
          <div className="hero-art">
            <div className="hero-ground" aria-hidden="true" />
            <CareScene animated={motion} />
            <div className="hero-phone-float">
              <ProductPhone className="hero-phone" priority />
            </div>
            <div className="hero-reminder">
              <span className="reminder-symbol">
                <Bell size={23} />
              </span>
              <div>
                <strong>
                  A little reminder.
                  <br />A little reassurance.
                </strong>
                <p>
                  Your care team has reviewed
                  <br />
                  these steps for you.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="promise-band landing-container">
          <div>
            <span>
              <ShieldCheck size={22} />
            </span>
            One reviewed plan.
          </div>
          <div>
            <span>
              <Users size={22} />
            </span>
            Three people connected.
          </div>
          <div>
            <span>
              <ClipboardCheck size={22} />
            </span>
            Everyday steps, made clearer.
          </div>
        </div>

        <section
          className="journey-section landing-container"
          id="journey"
          aria-labelledby="journey-title"
        >
          <div className="section-intro reveal">
            <h2 id="journey-title">
              The discharge is a moment.
              <br />
              <em>Recovery is a journey.</em>
            </h2>
            <p>One thoughtful handoff. A little support at every step.</p>
          </div>
          <div className="journey-steps">
            <svg
              className="journey-connector"
              viewBox="0 0 1000 80"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M40 30C190-55 230 120 360 50S540 0 650 40S840 100 960 20"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="5 7"
              />
              <circle cx="40" cy="30" r="4" fill="currentColor" />
              <circle cx="360" cy="50" r="4" fill="currentColor" />
              <circle cx="960" cy="20" r="4" fill="currentColor" />
            </svg>
            <article className="journey-step reveal">
              <span className="journey-number">01</span>
              <div className="journey-art note-art" aria-hidden="true">
                <div className="note-underlay" />
                <div className="discharge-paper">
                  <span>Discharge instructions</span>
                  <i />
                  <p>
                    <Check size={14} />
                    Prescribed medications
                  </p>
                  <p>
                    <Check size={14} />
                    Movement & recovery
                  </p>
                  <p>
                    <Check size={14} />
                    Care & follow-up
                  </p>
                  <div className="paper-signature">A thoughtful handoff.</div>
                </div>
                <div className="paper-pen" />
              </div>
              <h3>A nurse’s knowledge.</h3>
              <p>
                Type or dictate discharge instructions. Review every medication,
                task, and follow-up before sharing.
              </p>
            </article>
            <article className="journey-step reveal">
              <span className="journey-number">02</span>
              <div className="journey-art flower-art" aria-hidden="true">
                <CareFlower />
                <span className="flower-orbit">
                  <i />
                </span>
                <span className="flower-shadow" />
              </div>
              <h3>A clearer daily plan.</h3>
              <p>
                AI organizes the details.
                <br />
                The nurse reviews and approves.
              </p>
            </article>
            <article className="journey-step reveal">
              <span className="journey-number">03</span>
              <div className="journey-art journey-phone-art">
                <ProductPhone />
                <span className="caregiver-token" aria-hidden="true">
                  <Users size={24} />
                </span>
              </div>
              <h3>A little less to carry.</h3>
              <p>
                Patients and caregivers follow the same plan, with their own
                sign-ins and shared progress.
              </p>
            </article>
          </div>
          <div className="journey-assurance reveal">
            <i />
            <ShieldCheck size={25} />
            <p>The care team stays in control. Always.</p>
            <i />
          </div>
        </section>

        <section
          className="experience-section landing-container"
          id="experience"
          aria-labelledby="experience-title"
        >
          <div className="experience-heading reveal">
            <h2 id="experience-title">
              Made for real life.
              <br />
              <em>And the people in it.</em>
            </h2>
            <p>
              Different roles.
              <br /> One shared recovery.
            </p>
          </div>
          <div
            className="role-tabs"
            role="tablist"
            aria-label="Explore After Care by role"
          >
            {roles.map((item, index) => (
              <button
                disabled={!interactive}
                key={item.id}
                ref={(element) => {
                  tabs.current[index] = element;
                }}
                id={`role-tab-${item.id}`}
                role="tab"
                aria-selected={activeRole === index}
                aria-controls="role-panel"
                tabIndex={activeRole === index ? 0 : -1}
                onClick={() => setActiveRole(index)}
                onKeyDown={(event) => {
                  if (
                    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                      event.key,
                    )
                  )
                    return;
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? roles.length - 1
                        : (activeRole +
                            (event.key === "ArrowRight" ? 1 : -1) +
                            roles.length) %
                          roles.length;
                  setActiveRole(next);
                  tabs.current[next]?.focus();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div
            className="product-stage"
            role="tabpanel"
            id="role-panel"
            aria-labelledby={`role-tab-${role.id}`}
          >
            <div className="product-stage-media" key={role.id}>
              <ProductBrowser src={role.screenshot} alt={role.alt} />
              <ProductPhone className="stage-phone" />
            </div>
            <div className="product-stage-copy">
              <h3>{role.title}</h3>
              <ul>
                {role.points.map((point) => (
                  <li key={point}>
                    <span>
                      <Check size={17} />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
              <Link href="/workspace" className="landing-text-link">
                See the care workspace <ArrowRight size={21} />
              </Link>
            </div>
          </div>
          <div className="screen-gallery">
            {gallery.map((screen) => (
              <button
                disabled={!interactive}
                key={screen.title}
                className="screen-preview reveal"
                onClick={() => setPreview(screen)}
                aria-label={`Preview ${screen.title.toLowerCase()} screenshot`}
              >
                <div>
                  <Image
                    src={screen.src}
                    alt={screen.caption}
                    width={1440}
                    height={1000}
                    sizes="(max-width: 760px) 88vw, 420px"
                  />
                  <span className="preview-zoom">
                    <ZoomIn size={23} />
                  </span>
                </div>
                <span>
                  {screen.title}
                  <ArrowRight size={19} />
                </span>
              </button>
            ))}
          </div>
          <p className="showcase-caption">
            Real screens. Fictional demonstration records. A little glimpse of
            what’s possible.
          </p>
        </section>

        <section
          className="approach-section"
          id="approach"
          aria-labelledby="approach-title"
        >
          <div className="landing-container">
            <div className="approach-heading reveal">
              <h2 id="approach-title">
                A companion.
                <br />
                <em>With care at its core.</em>
              </h2>
              <p>
                Built around the nurse’s instructions.
                <br />
                Designed to support the everyday.
              </p>
            </div>
            <div className="care-principles reveal">
              <article>
                <ShieldCheck size={38} />
                <h3>Reviewed by a human.</h3>
                <p>AI drafts. The nurse decides.</p>
              </article>
              <article>
                <Users size={38} />
                <h3>Shared with your people.</h3>
                <p>Separate accounts. One care plan.</p>
              </article>
              <article>
                <Bell size={38} />
                <h3>A thoughtful nudge.</h3>
                <p>Medication, movement, and follow-up reminders.</p>
              </article>
            </div>
            <p className="reminder-disclosure">
              Background reminders need device permission and a configured
              server schedule. After Care supports the care team’s plan; it does
              not monitor emergencies or replace medical advice.
            </p>
            <div className="closing-cta reveal">
              <div>
                <h2>
                  Care doesn’t end
                  <br />
                  at the hospital door.
                </h2>
                <p>Bring a little clarity to the next chapter.</p>
                <div className="hero-actions">
                  <Link href="/workspace" className="landing-button light">
                    Open After Care <ArrowRight size={23} />
                  </Link>
                  <Link href="/present" className="story-link">
                    <span>
                      <Play size={15} fill="currentColor" />
                    </span>
                    Present the project
                  </Link>
                </div>
              </div>
              <div className="closing-sphere" aria-hidden="true">
                <span />
                <i />
                <b />
              </div>
            </div>
            <footer className="landing-footer">
              <div>
                <Link
                  href="/"
                  className="landing-brand"
                  aria-label="After Care home"
                >
                  <Brand />
                </Link>
                <span>Your recovery, together.</span>
              </div>
              <a
                href="https://github.com/adarshnub/after-care"
                target="_blank"
                rel="noreferrer"
              >
                <Github size={20} /> Project on GitHub <ArrowRight size={16} />
              </a>
            </footer>
          </div>
        </section>
      </main>
      <a
        href="#journey"
        className="landing-scroll-cue"
        aria-label="Scroll to the recovery journey"
      >
        <ArrowDown size={18} />
      </a>
      {preview && (
        <Modal title={preview.title} wide onClose={() => setPreview(null)}>
          <div className="marketing-lightbox">
            <Image
              src={preview.src}
              alt={preview.caption}
              width={1440}
              height={1100}
              sizes="95vw"
            />
            <p>{preview.caption} This is a fictional demonstration record.</p>
            <Link href="/workspace" className="landing-text-link">
              Open the care workspace <ArrowRight size={18} />
            </Link>
          </div>
        </Modal>
      )}
    </div>
  );
}
