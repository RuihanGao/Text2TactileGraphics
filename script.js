import Swiper from "https://cdn.jsdelivr.net/npm/swiper@14/swiper-bundle.min.mjs";
import copy from "https://cdn.jsdelivr.net/npm/copy-to-clipboard@4/+esm";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============================================================
   Results gallery
   ============================================================ */

const DATA_DIR = "data/gallery_ours/";
const results = [
  {
    file: "dolphin",
    prompt: "a dolphin with wings with an avocado skin texture.",
    object: "winged dolphin",
    parts: [["Entire body", "avocado skin texture"]],
  },
  {
    file: "football",
    prompt: "football with highly detailed surface textures.",
    object: "football",
    parts: [["Surface", "highly detailed panelled surface texture"]],
  },
  {
    file: "lamp",
    prompt:
      "lamp, the base of the lamp has a tree bark texture, and the lamp shade has a cloth_bag texture.",
    object: "lamp",
    parts: [
      ["Base", "tree bark texture"],
      ["Lamp shade", "cloth-bag fabric texture"],
    ],
  },
  {
    file: "polar_bear",
    prompt: "polar bear with highly detailed polar bear fur texture.",
    object: "polar bear",
    parts: [["Body surface", "polar bear fur texture"]],
  },
  {
    file: "canoe",
    prompt: "a canoe with an embossed flower texture.",
    object: "canoe",
    parts: [["Hull surface", "embossed flower texture"]],
  },
  {
    file: "coral",
    prompt:
      "an object centric view of a big single coral under the water, the surface shows a close-up detailed texture of coral.",
    object: "coral",
    parts: [["Surface", "close-up coral texture"]],
  },
  {
    file: "mushroom",
    prompt:
      "a plain mushroom, the mushroom cap has a mushroom cap texture, and the mushroom stalk has a Longitudinal Fibers texture.",
    object: "mushroom",
    parts: [
      ["Cap", "mushroom cap texture"],
      ["Stalk", "longitudinal fibers texture"],
    ],
  },
  {
    file: "tire",
    prompt:
      "a smooth front facing surface of car's tire, the surface shows a highly detailed tire's texture.",
    object: "car tire",
    parts: [["Tread surface", "detailed tire tread texture"]],
  },
  {
    file: "ammonite_fossil",
    prompt:
      "an image of large mineral rock surface from above.  In some portion of the surface of large rock contains a few spiral ammonite shell fossil textures.",
    object: "mineral rock slab",
    parts: [
      ["Rock surface", "mineral rock texture"],
      ["Embedded fossils", "spiral ammonite shell texture"],
    ],
  },
  {
    file: "telescope",
    prompt:
      "telescope, the telescope tube and finderscope have a Fine Longitudinal Ribs texture, and the mount of the telescope has a cast metal texture.",
    object: "telescope",
    parts: [
      ["Tube & finderscope", "fine longitudinal ribs texture"],
      ["Mount", "cast metal texture"],
    ],
  },
  {
    file: "iphone",
    prompt:
      "iPhone case and an airpod case, the iPhone case has a Crocodile's detailed skin / leather surface texture, and the airpod case has a star shaped textures.",
    object: "iPhone case and AirPods case",
    parts: [
      ["iPhone case", "crocodile skin / leather texture"],
      ["AirPods case", "star-shaped texture"],
    ],
  },
  {
    file: "sponge",
    prompt: "square sponge with detailed sponge texture.",
    object: "square sponge",
    parts: [["Surface", "detailed sponge texture"]],
  },
  {
    file: "chair",
    prompt:
      "an armchair with thick cushions, the chair frame has a wicker basket texture, and the chair seat and back have a Tufted / Buttoned leather texture. Front facing.",
    object: "armchair",
    parts: [
      ["Frame", "wicker basket texture"],
      ["Seat & back", "tufted / buttoned leather texture"],
    ],
  },
  {
    file: "chair_lollipop",
    prompt:
      "an armchair with thick cushions, the chair frame has a Pretzel twist rods texture, and the chair seat and back have a lollipop texture. Front facing.",
    object: "armchair",
    parts: [
      ["Frame", "pretzel-twist rods texture"],
      ["Seat & back", "lollipop texture"],
    ],
  },
  {
    file: "chair_ocean",
    prompt:
      "an armchair with thick cushions, the chair frame has a barnacle-covered rock texture, and the chair seat and back have a jellyfish tentacles texture. Front facing.",
    object: "armchair",
    parts: [
      ["Frame", "barnacle-covered rock texture"],
      ["Seat & back", "jellyfish tentacles texture"],
    ],
  },
  {
    file: "table",
    prompt:
      "viewed from above, a round table surface with four partitions, the top left corner has a pine wood skin texture, the top right corner has a broken mosaic tile floor texture, the bottom left corner has a stone wall texture, and the bottom right corner has an oyster shell texture.",
    object: "round four-partition table",
    parts: [
      ["Top-left quadrant", "pine wood texture"],
      ["Top-right quadrant", "broken mosaic tile floor texture"],
      ["Bottom-left quadrant", "stone wall texture"],
      ["Bottom-right quadrant", "oyster shell texture"],
    ],
  },
];

const articleFor = (word) => (/^[aeiou]/i.test(word) ? "an" : "a");
const verbFor = (label) => (/&/.test(label) || /(?:^|\s)\w+s$/i.test(label) ? "have" : "has");

/* ---- Accessible description, built from the structured parts ---- */
function buildDescription({ object, parts }) {
  const clauses = parts
    .map(
      ([label, texture]) =>
        `the ${label.toLowerCase()} ${verbFor(label)} ${articleFor(texture)} ${texture}`,
    )
    .join("; ");
  const sentence = clauses.charAt(0).toUpperCase() + clauses.slice(1);
  return `Interactive 3D model of ${articleFor(object)} ${object}. ${sentence}.`;
}

/* Displayed prompt: lowercase, periods -> commas, collapsed whitespace, no
   trailing punctuation. */
const displayPrompt = (prompt) =>
  prompt
    .toLowerCase()
    .replace(/\./g, ",")
    .replace(/\s+/g, " ")
    .replace(/[,\s]+$/, "");

/* ---- Download links ---- */

const SIZE_UNITS = ["B", "KB", "MB", "GB"];

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "size unknown";
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < SIZE_UNITS.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${SIZE_UNITS[unit]}`;
}

/* Point a template download link at its file and announce the download size,
   which a HEAD request resolves without pulling the (large) body. */
function setUpDownload(slide, field, extension, label, { file, object }) {
  const link = slide.querySelector(`[data-field="${field}"]`);
  link.href = `${DATA_DIR}${file}${extension}`;
  link.setAttribute("download", file + extension);

  const describe = (size) => link.setAttribute("aria-label", `${label} for ${object}${size}`);
  fetch(link.href, { method: "HEAD", cache: "force-cache" })
    .then((res) => describe(` (${formatBytes(Number(res.headers.get("Content-Length")))})`))
    .catch(() => describe(""));
}

/* ---- Keyboard navigation for <model-viewer> (a11y) ----
     Arrow keys orbit 10 deg/press; +/- zoom by adjusting orbit radius.
     Lets BLV / keyboard-only users inspect the mesh without a mouse.
     Delegated on the gallery track in the CAPTURE phase so we run before
     model-viewer's own built-in key handling and can suppress it via
     stopPropagation() — otherwise arrow keys would orbit twice. */

const ROT_STEP = (10 * Math.PI) / 180; // 10 degrees in radians
const ZOOM_FACTOR = 0.9; // <1 zooms in; reciprocal zooms out

function handleOrbitKey(e) {
  const mv = e.target.closest?.("model-viewer");
  // The API is only present once the custom element is upgraded.
  if (!mv || typeof mv.getCameraOrbit !== "function") return;

  const orbit = mv.getCameraOrbit(); // {theta, phi, radius} in rad/rad/m
  switch (e.key) {
    case "ArrowLeft":
      orbit.theta -= ROT_STEP;
      break;
    case "ArrowRight":
      orbit.theta += ROT_STEP;
      break;
    case "ArrowUp":
      orbit.phi -= ROT_STEP;
      break;
    case "ArrowDown":
      orbit.phi += ROT_STEP;
      break;
    case "+":
    case "=":
      orbit.radius *= ZOOM_FACTOR;
      break;
    case "-":
    case "_":
      orbit.radius /= ZOOM_FACTOR;
      break;
    default:
      return;
  }

  e.preventDefault();
  e.stopPropagation(); // block model-viewer's built-in key handler
  mv.removeAttribute("auto-rotate"); // so the manual orientation sticks
  // model-viewer clamps theta/phi/radius to its configured bounds.
  mv.cameraOrbit = `${orbit.theta}rad ${orbit.phi}rad ${orbit.radius}m`;
}

/* ---- Build the slides ---- */

const track = document.getElementById("gallery-track");
const counter = document.getElementById("gallery-current");
const counterRegion = document.getElementById("gallery-counter");
const slideTemplate = document.getElementById("gallery-slide-template");

track.addEventListener("keydown", handleOrbitKey, true); // capture phase
document.getElementById("gallery-total").textContent = results.length.toString();

for (const result of results) {
  const slide = slideTemplate.content.firstElementChild.cloneNode(true);

  const mv = slide.querySelector("model-viewer");
  // Defer the .glb load (~18MB each) — see loadNearby().
  mv.dataset.src = `${DATA_DIR}${result.file}.glb`;
  // Rich alt is the accessible name announced on focus — it describes the
  // object and its per-component textures for screen-reader users.
  mv.alt = buildDescription(result);
  if (reduceMotion) mv.removeAttribute("auto-rotate");

  const photo = slide.querySelector('[data-field="photo"]');
  photo.src = `${DATA_DIR}${result.file}.jpeg`;
  photo.alt = `3D-printed result of ${result.object} generated from the prompt: "${result.prompt}"`;

  setUpDownload(slide, "dl-glb", ".glb", "Download interactive 3D model", result);
  setUpDownload(slide, "dl-stl", ".stl", "Download 3D-print-ready mesh", result);

  slide.querySelector('[data-field="prompt"]').textContent = displayPrompt(result.prompt);

  track.appendChild(slide);
}

/* ---- Per-slide state, applied on init and on every slide change ---- */

/* Load the .glb for the active slide and its immediate neighbors only. */
function loadNearby(activeIndex) {
  const viewers = track.querySelectorAll("model-viewer");
  for (const i of [activeIndex - 1, activeIndex, activeIndex + 1]) {
    const mv = viewers[i];
    if (mv && !mv.src) mv.src = mv.dataset.src;
  }
}

function syncGallery(swiper) {
  const current = swiper.activeIndex + 1;
  counter.textContent = current;
  // Spoken label for the live region (overrides the terse "1 / 16" glyphs).
  counterRegion.setAttribute("aria-label", `Showing result ${current} of ${results.length}`);

  // Keep off-screen slides out of the tab order (`inert`) and the
  // accessibility tree (`aria-hidden`).
  swiper.slides.forEach((slide, i) => {
    const hidden = i !== swiper.activeIndex;
    slide.inert = hidden;
    if (hidden) {
      slide.setAttribute("aria-hidden", "true");
    } else {
      slide.removeAttribute("aria-hidden");
    }
  });

  loadNearby(swiper.activeIndex);
}

const swiper = new Swiper("#gallery-wrapper", {
  a11y: {
    enabled: true,
    containerRoleDescriptionMessage: "carousel",
    containerMessage: "Tactile graphics results gallery",
    itemRoleDescriptionMessage: "slide",
    slideLabelMessage: "Result {{index}} of {{slidesLength}}",
    prevSlideMessage: "Previous result",
    nextSlideMessage: "Next result",
    paginationBulletMessage: "Go to result {{index}}",
  },
  slidesPerView: 1,
  spaceBetween: 24,
  grabCursor: true,
  // Don't swipe the slide when the drag starts on a 3D viewer —
  // let model-viewer's own camera-controls handle rotate/zoom.
  noSwiping: true,
  noSwipingSelector: "model-viewer",
  autoHeight: true,
  speed: reduceMotion ? 0 : 300,
  keyboard: { enabled: false }, // enabled below, only while the gallery has focus
  navigation: { nextEl: "#gallery-next", prevEl: "#gallery-prev" },
  pagination: { el: "#gallery-pagination", clickable: true },
  on: { init: syncGallery, slideChange: syncGallery },
});

const gallery = document.getElementById("gallery");
gallery.addEventListener("focusin", () => swiper.keyboard.enable());
gallery.addEventListener("focusout", (e) => {
  if (!gallery.contains(e.relatedTarget)) swiper.keyboard.disable();
});

/* ============================================================
   Method video <-> tab sync (YouTube IFrame Player API).
   The player is embedded inline (YouTube renders its own preview); tab
   clicks seek the video and playback drives the tab highlighting.
   ============================================================ */

const VIDEO_ID = "WJFewO33HCs";
const POLL_INTERVAL_MS = 250;

const tabs = [...document.querySelectorAll("#method-tabs .pipeline-step")];
const tabStarts = tabs.map((el) => Number(el.dataset.start));

let player = null;
let playerReady = false;
let pollId = null;

/* Index of the last tab whose start time has passed; -1 during the intro. */
const tabAt = (time) => tabStarts.findLastIndex((start) => time >= start);

function setActiveTab(index) {
  tabs.forEach((el, i) => {
    const active = i === index;
    el.classList.toggle("active", active);
    if (active) {
      el.setAttribute("aria-current", "true");
    } else {
      el.removeAttribute("aria-current");
    }
  });
}

function followPlayback() {
  if (typeof player?.getCurrentTime === "function") setActiveTab(tabAt(player.getCurrentTime()));
}

/* Tab activation (click, Enter or Space on the <button>) -> seek and play. */
tabs.forEach((el, i) => {
  el.addEventListener("click", () => {
    if (!playerReady) return;
    player.seekTo(tabStarts[i], true);
    player.playVideo();
    setActiveTab(i);
  });
});

window.onYouTubeIframeAPIReady = () => {
  player = new YT.Player("yt-player", {
    videoId: VIDEO_ID,
    playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
    events: {
      onReady: () => {
        playerReady = true;
      },
      onStateChange: (e) => {
        /* Follow playback while playing; otherwise stop, keeping the highlight. */
        if (e.data === YT.PlayerState.PLAYING) {
          followPlayback();
          pollId ??= setInterval(followPlayback, POLL_INTERVAL_MS);
        } else {
          clearInterval(pollId);
          pollId = null;
        }
      },
    },
  });
};

/* Load the IFrame API only after the callback above is defined. */
if (window.YT?.Player) {
  window.onYouTubeIframeAPIReady();
} else {
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
}

/* ============================================================
   BibTeX copy button
   ============================================================ */

const IDLE_LABEL = '<i class="bi bi-clipboard-fill me-1" aria-hidden="true"></i> Copy';
const bibtex = document.getElementById("bibtex-content");
const copyBtn = document.getElementById("copy-btn");

function flash(icon, label) {
  copyBtn.innerHTML = `<i class="bi ${icon} me-1" aria-hidden="true"></i> ${label}`;
  setTimeout(() => {
    copyBtn.innerHTML = IDLE_LABEL;
  }, 2000);
}

/* Select the citation so it can be copied manually, and say so. */
function selectForManualCopy() {
  const range = document.createRange();
  range.selectNodeContents(bibtex);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  flash("bi-exclamation-triangle-fill", "Press Ctrl/\u2318+C");
}

copyBtn.addEventListener("click", async () => {
  if (await copy(bibtex.textContent)) flash("bi-check-lg", "Copied!");
  else selectForManualCopy();
});
