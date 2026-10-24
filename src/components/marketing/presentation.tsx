"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Expand,
  FileText,
  Github,
  Minimize,
  X,
} from "lucide-react";
import { Brand } from "@/components/ui";
import {
  CareFlower,
  ProductBrowser,
  ProductPhone,
  productScreens,
} from "./product-media";

const slides = [
  {
    chapter: "The opportunity",
    title: (
      <>
        Care doesn’t end
        <br />
        at the <em>hospital door.</em>
      </>
    ),
    body: "Discharge is a moment. Recovery is a journey of medications, movement, wound care, and follow-ups.",
    points: [
      "A lot to remember",
      "Different people helping",
      "One need for clarity",
    ],
    notes:
      "Start with the patient’s transition home. The problem is following a plan day to day, especially when a caregiver is helping. Do not claim clinical outcomes or reduced readmissions: those have not been measured.",
  },
  {
    chapter: "The handoff",
    title: (
      <>
        A nurse’s knowledge.
        <br />
        <em>Carried forward.</em>
      </>
    ),
    body: "Type or dictate the discharge instructions. AI organizes an editable draft. The nurse reviews every detail before sharing.",
    points: [
      "Exact times, doses, and dates",
      "Missing details surfaced",
      "Mandatory nurse approval",
    ],
    notes:
      "Explain that AI organizes rather than prescribes. The example note produced two fictional medications, seven tasks, and a follow-up. Missing hospital contact information was flagged. Editing the draft resets approval.",
  },
  {
    chapter: "The everyday",
    title: (
      <>
        Small steps.
        <br />
        <em>A clearer day.</em>
      </>
    ),
    body: "A daily plan that brings prescribed medications, recovery tasks, supply estimates, and upcoming visits together.",
    points: [
      "Confirm a recorded dose",
      "Track medication received",
      "Keep the next visit close",
    ],
    notes:
      "Show the patient dashboard and medication inventory. Estimates use initial quantities, completed doses, and recorded refills. Inventory is an estimate; it does not change the prescription or order a refill.",
  },
  {
    chapter: "The people",
    title: (
      <>
        In their corner.
        <br />
        <em>In the loop.</em>
      </>
    ),
    body: "Patients and caregivers have separate sign-ins and follow the same nurse-reviewed plan. One recorded check-off is shared with both.",
    points: [
      "Separate hospital-issued credentials",
      "Shared progress and refills",
      "Record-level access checks",
    ],
    notes:
      "Use separate browser profiles for a live patient/caregiver demo. Views refresh every 30 seconds while visible and when reactivated. Duplicate submissions cannot count the same task twice.",
  },
  {
    chapter: "The approach",
    title: (
      <>
        A companion.
        <br />
        <em>With clear boundaries.</em>
      </>
    ),
    body: "Guidance grounded in the reviewed plan, with current recorded supply estimates. The care team stays in control.",
    points: [
      "The nurse approves the plan",
      "The assistant cannot change treatment",
      "Urgent guidance before a model call",
    ],
    notes:
      "The assistant can explain recorded instructions and visits. It cannot diagnose, prescribe, contact a clinician, or monitor emergencies. Web Push also needs device permission and a configured scheduler; actual device delivery remains a separate verification step.",
  },
  {
    chapter: "The next chapter",
    title: (
      <>
        A little care.
        <br />
        <em>A better tomorrow.</em>
      </>
    ),
    body: "A working Next.js PWA, with Supabase, OpenAI, and a shared recovery experience. Ready to explore.",
    points: [
      "Nurse, patient, and caregiver workflows",
      "Installable on supported devices",
      "Live on Vercel",
    ],
    notes:
      "Open the care workspace to demonstrate the live product. Credentials are shared privately. All public screenshots and demo data are fictional. This is a competition prototype; clinical and operational rollout require further validation.",
  },
] as const;

export function Presentation() {
  const [index, setIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const change = useCallback(
    (delta: number) =>
      setIndex((value) =>
        Math.max(0, Math.min(slides.length - 1, value + delta)),
      ),
    [],
  );

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        target?.closest("input,textarea,select,[contenteditable=true]")
      )
        return;
      if (
        event.key === "ArrowRight" ||
        (event.key === " " && !target?.closest("button,a"))
      ) {
        event.preventDefault();
        change(1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        change(-1);
      }
      if (event.key === "Home") {
        event.preventDefault();
        setIndex(0);
      }
      if (event.key === "End") {
        event.preventDefault();
        setIndex(slides.length - 1);
      }
    };
    const syncFullscreen = () =>
      setFullscreen(Boolean(document.fullscreenElement));
    window.addEventListener("keydown", keyboard);
    document.addEventListener("fullscreenchange", syncFullscreen);
    setReady(true);
    return () => {
      window.removeEventListener("keydown", keyboard);
      document.removeEventListener("fullscreenchange", syncFullscreen);
    };
  }, [change]);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (stage.current?.requestFullscreen)
        await stage.current.requestFullscreen();
      else
        setNotice(
          "Fullscreen is unavailable in this browser. The presentation works in the current window.",
        );
    } catch {
      setNotice(
        "Fullscreen is unavailable in this browser. The presentation works in the current window.",
      );
    }
  }
  const slide = slides[index];

  return (
    <div
      className={`marketing presentation ${index === slides.length - 1 ? "deck-finale" : ""}`}
      ref={stage}
    >
      <header className="deck-header">
        <Link href="/" className="landing-brand" aria-label="After Care home">
          <Brand />
        </Link>
        <div className="deck-tools">
          <button
            disabled={!ready}
            onClick={() => setShowNotes(!showNotes)}
            aria-pressed={showNotes}
            aria-label={showNotes ? "Hide speaker notes" : "Show speaker notes"}
          >
            <FileText size={17} />
            <span>Speaker notes</span>
          </button>
          <button
            disabled={!ready}
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {fullscreen ? <Minimize size={19} /> : <Expand size={19} />}
          </button>
          <Link href="/" aria-label="Close presentation">
            <X size={21} />
          </Link>
        </div>
      </header>
      <main className="deck-main" aria-label="After Care project presentation">
        <div
          className="deck-slide"
          key={index}
          role="group"
          aria-roledescription="slide"
          aria-label={`Slide ${index + 1} of ${slides.length}`}
        >
          <div className="deck-copy">
            <div className="deck-chapter">
              <span>{String(index + 1).padStart(2, "0")}</span>
              {slide.chapter}
            </div>
            <h1>{slide.title}</h1>
            <p>{slide.body}</p>
            <ul>
              {slide.points.map((point) => (
                <li key={point}>
                  <Check size={16} />
                  {point}
                </li>
              ))}
            </ul>
            {index === slides.length - 1 && (
              <div className="hero-actions">
                <Link href="/workspace" className="landing-button light">
                  Open After Care <ArrowRight size={20} />
                </Link>
                <a
                  className="story-link"
                  href="https://github.com/adarshnub/after-care"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Github size={20} />
                  Explore the code
                </a>
              </div>
            )}
          </div>
          <div className={`deck-visual deck-visual-${index}`}>
            {(index === 0 || index === 5) && (
              <>
                <CareFlower />
                <div className="deck-orbit" />
                <ProductPhone priority />
              </>
            )}
            {index === 1 && (
              <div className="deck-review">
                <Image
                  src={productScreens.review}
                unoptimized
                loading="eager"
                  alt="Nurse review screen with an AI-organized draft and a clarification"
                  width={800}
                  height={952}
                  sizes="(max-width: 760px) 85vw, 470px"
                />
              </div>
            )}
            {index === 2 && (
              <>
                <ProductBrowser
                  src={productScreens.patient}
                  alt="Fictional patient daily recovery dashboard"
                />
                <ProductPhone className="deck-overlap-phone" />
              </>
            )}
            {index === 3 && (
              <ProductBrowser
                src={productScreens.caregiver}
                alt="Caregiver view sharing the patient's recorded dose and progress"
              />
            )}
            {index === 4 && (
              <ProductBrowser
                src={productScreens.assistant}
                alt="Care assistant accurately using the refill-adjusted medication estimate"
              />
            )}
          </div>
        </div>
      </main>
      {showNotes && (
        <aside className="speaker-notes" aria-label="Speaker notes">
          <strong>Presenter notes · {slide.chapter}</strong>
          <p>{slide.notes}</p>
        </aside>
      )}
      {notice && (
        <p className="deck-notice" role="status">
          {notice}
        </p>
      )}
      <footer className="deck-controls">
        <span className="deck-key-tip">
          Use ← → or Space to follow the story
        </span>
        <div className="deck-dots" aria-label="Choose a presentation slide">
          {slides.map((item, i) => (
            <button
              key={item.chapter}
              disabled={!ready}
              className={i === index ? "is-active" : ""}
              aria-label={`Go to slide ${i + 1}: ${item.chapter}`}
              aria-current={i === index ? "step" : undefined}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
        <div className="deck-pagination">
          <span aria-live="polite">
            {String(index + 1).padStart(2, "0")}{" "}
            <i>/ {String(slides.length).padStart(2, "0")}</i>
          </span>
          <button
            aria-label="Previous slide"
            disabled={!ready || index === 0}
            onClick={() => change(-1)}
          >
            <ArrowLeft size={20} />
          </button>
          <button
            aria-label="Next slide"
            disabled={!ready || index === slides.length - 1}
            onClick={() => change(1)}
          >
            <ArrowRight size={20} />
          </button>
        </div>
      </footer>
    </div>
  );
}
