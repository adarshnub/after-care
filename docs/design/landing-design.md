# Landing page design brief

Chosen direction: an editorial recovery story, with a warm-white canvas (#f7f8f2), forest ink (#123f3b), teal (#237a70), sage (#dce6d9), and a restrained peach accent. Instrument Serif is the display face, with an italic companion; DM Sans provides interface and body text. Both are self-hosted with OFL licenses.

## Section references

- [Hero](landing-hero-concept.png): open navigation, oversized two-line serif heading, a real product screen floating with a three-dimensional care flower, orbit, and soft objects. No image tint or text overlay over the product screen.
- [Journey](landing-journey-concept.png): an open three-step narrative, numbered steps, a connecting line, instruction sheet, care flower, and phone. No repeated card grid.
- [Product explorer](landing-product-concept.png): role tabs, elevated desktop screenshot, overlapping mobile screen, checklist, and a three-screen gallery.
- [Closing](landing-closing-concept.png): deep teal band, three human-centered principles, an open CTA and orbital sphere, then minimal footer.

Concept images were generated with the built-in image tool from section-specific prompts. The prompts specified the exact headings, navigation, CTA labels, palette, serif/sans typography, three-dimensional care motif, actual app screenshot roles, and a ban on invented metrics or endorsements. They are design references; the production page uses native text and controls, real app screenshots, and a code-native 3D scene.

## Above-the-fold copy lock

Navigation: The journey / Explore the app / Our approach / Sign in / Present.

Heading: A little care. / A better tomorrow.

Body: From hospital to home, turn discharge instructions into a clear daily plan. For patients, and the people in their corner.

Actions: Explore After Care / Watch the story.

Supporting band: One reviewed plan. / Three people connected. / Everyday steps, made clearer.

## Interaction and accessibility

- A small, dynamically imported Three.js scene renders the flower and orbit; real screenshot framing stays in HTML/CSS. Geometry and materials are disposed on unmount. The render loop stops when offscreen or the document is hidden. Pixel density is capped.
- A visible motion toggle and reduced-motion preference stop ambient motion. The hero has a CSS fallback if WebGL is unavailable.
- Scroll reveals use IntersectionObserver without hiding content when JavaScript is absent. Role tabs and screenshot previews are keyboard accessible. Screenshot lightboxes use native dialogs.
- `/present` is a six-scene presentation, with arrow-key/Space navigation, a progress indicator, fullscreen control, and optional speaker notes. The user explicitly requested a presentation-ready surface; this is an extension of the same design system.
- `/` becomes the public story. `/workspace` retains the care application, `/login` remains the credential entry, and PWA start/recovery/notification links point at `/workspace`.

## Intentional implementation differences

Generated placeholder product screens are replaced by the verified fictional app screenshots. The hero's product is rendered from a true 3D scene and native screenshot frame rather than a flattened bitmap. The unrequested photograph hinted below the hero concept is omitted in favor of the coordinated journey section. No clinical outcome or compliance claim is added.

## Validation ledger

Compare the final page and each reference at native desktop width, and also at 390-pixel phone width: heading/copy, first-viewport balance, serif/italic hierarchy, palette, screenshot framing, open section structure, icon treatment, spacing, role switching, motion control, and presentation navigation. Final results are recorded after rendered validation.

Initial browser validation passed at 360, 390, 768, 1024, 1280, and 1440 pixels without horizontal overflow. The hero was also captured at the generated reference's native 1505 × 1045 size. Compared the hero, journey, product, and closing screenshots directly with their references using `view_image`.

| Comparison | Rendered result and adjustment |
| --- | --- |
| Hero copy and hierarchy | Exact title, body, navigation, CTA labels, and supporting-band wording retained. No hero eyebrow added. |
| First viewport | Split editorial headline / 3D product composition, phone overlap, floating reminder, and fine ruled band retained. |
| Palette and materials | Warm-white and forest/teal tokens locked; lowered scene exposure and adjusted material roughness to remove an overly bright mint highlight. |
| Typography | Self-hosted Instrument Serif (including italic) and DM Sans provide a consistent display and control hierarchy. |
| Section structure | Open numbered journey; real role-switching screenshot stage; thumbnail gallery; deep teal closing band. No repeated feature-card grid. |
| Asset treatment | Actual fictional app screens replace generated placeholder UI. HTML phone/browser frames provide depth without rasterizing controls. |
| Responsive behavior | Stacked editorial layout and scrollable screen gallery, no horizontal page overflow, visible mobile motion control. Fixed a missing space when a desktop line break collapses on phones. |
| Interactions | Role tabs, arrow-key tab selection, native screenshot dialog, motion toggle, menu, and six-scene keyboard deck pass. Controls wait for hydration, avoiding lost early taps. |
| Presentation media loading | The nurse-review image has a stable aspect-ratio frame and eager original-image loading, preventing the slide from collapsing while its image arrives. The browser regression checks image completion. |

Browser/IAB runtime was unavailable; verification used the project's Playwright Chromium runtime. Screenshot evidence is in `docs/screenshots/landing-*.png` and `presentation-*.png`. WebGL was verified with a rendered canvas, with static fallback and reduced-motion paths also checked. No material mismatch remains in the chosen implementation; the true 3D scene, real product screenshots, and omitted unrequested photograph are the intentional differences recorded above.
