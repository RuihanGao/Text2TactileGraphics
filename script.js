/* ============================================================
   Gallery + BibTeX copy functionality
   ============================================================ */
(function () {
    /* ---- Gallery data (file -> baseline prompt, from data/gallery_ours/prompts.xlsx) ---- */
    const DATA_DIR = 'data/gallery_ours/';
    const results = [
        { file: 'dolphin', prompt: 'a dolphin with wings with an avocado skin texture.',
          object: 'winged dolphin', parts: [['Entire body', 'avocado skin texture']] },
        { file: 'football', prompt: 'football with highly detailed surface textures.',
          object: 'football', parts: [['Surface', 'highly detailed panelled surface texture']] },
        {file: 'lamp', prompt: 'lamp, the base of the lamp has a tree bark texture, and the lamp shade has a cloth_bag texture.',
          object: 'lamp', parts: [['Base', 'tree bark texture'], ['Lamp shade', 'cloth-bag fabric texture']]},
        {file: 'polar_bear', prompt: 'polar bear with highly detailed polar bear fur texture.',
          object: 'polar bear', parts: [['Body surface', 'polar bear fur texture']]},
        { file: 'canoe', prompt: 'a canoe with an embossed flower texture.',
          object: 'canoe', parts: [['Hull surface', 'embossed flower texture']] },
        {file: 'coral', prompt: 'an object centric view of a big single coral under the water, the surface shows a close-up detailed texture of coral.',
          object: 'coral', parts: [['Surface', 'close-up coral texture']]},
        {file: 'mushroom', prompt: 'a plain mushroom, the mushroom cap has a mushroom cap texture, and the mushroom stalk has a Longitudinal Fibers texture.',
          object: 'mushroom', parts: [['Cap', 'mushroom cap texture'], ['Stalk', 'longitudinal fibers texture']]},
        {file: 'tire', prompt: 'a smooth front facing surface of car\'s tire, the surface shows a highly detailed tire\'s texture.',
          object: 'car tire', parts: [['Tread surface', 'detailed tire tread texture']]},
        {file: 'ammonite_fossil', prompt: 'an image of large mineral rock surface from above.  In some portion of the surface of large rock contains a few spiral ammonite shell fossil textures.',
          object: 'mineral rock slab', parts: [['Rock surface', 'mineral rock texture'], ['Embedded fossils', 'spiral ammonite shell texture']]},
        {file: 'telescope', prompt: 'telescope, the telescope tube and finderscope have a Fine Longitudinal Ribs texture, and the mount of the telescope has a cast metal texture.',
          object: 'telescope', parts: [['Tube & finderscope', 'fine longitudinal ribs texture'], ['Mount', 'cast metal texture']]},
        {file: 'iphone', prompt: 'iPhone case and an airpod case, the iPhone case has a Crocodile\'s detailed skin / leather surface texture, and the airpod case has a star shaped textures.',
          object: 'iPhone case and AirPods case', parts: [['iPhone case', 'crocodile skin / leather texture'], ['AirPods case', 'star-shaped texture']]},
        {file: 'sponge', prompt: 'square sponge with detailed sponge texture.',
          object: 'square sponge', parts: [['Surface', 'detailed sponge texture']]},
        {file: 'chair', prompt: 'an armchair with thick cushions, the chair frame has a wicker basket texture, and the chair seat and back have a Tufted / Buttoned leather texture. Front facing.',
          object: 'armchair', parts: [['Frame', 'wicker basket texture'], ['Seat & back', 'tufted / buttoned leather texture']]},
        {file: 'chair_lollipop', prompt: 'an armchair with thick cushions, the chair frame has a Pretzel twist rods texture, and the chair seat and back have a lollipop texture. Front facing.',
          object: 'armchair', parts: [['Frame', 'pretzel-twist rods texture'], ['Seat & back', 'lollipop texture']]},
        { file: 'chair_ocean', prompt: 'an armchair with thick cushions, the chair frame has a barnacle-covered rock texture, and the chair seat and back have a jellyfish tenacles texture. Front facing.',
          object: 'armchair', parts: [['Frame', 'barnacle-covered rock texture'], ['Seat & back', 'jellyfish tentacles texture']] },
        {file: 'table', prompt: 'viewed from above, a round table surface with four partitions, the top left corner has a pine wood skin texture, the top right corner has a broken mosaic tile floor texture, the bottom left corner has a stone wall texture, and the bottom right corner has an oyster shell texture.',
          object: 'round four-partition table', parts: [['Top-left quadrant', 'pine wood texture'], ['Top-right quadrant', 'broken mosaic tile floor texture'], ['Bottom-left quadrant', 'stone wall texture'], ['Bottom-right quadrant', 'oyster shell texture']]},
    ];

    /* ---- Build an accessible text description from structured parts ---- */
    function articleFor(word) {
        return /^[aeiou]/i.test(word) ? 'an' : 'a';
    }
    function buildDescription(r) {
        const clauses = r.parts.map(function (p) {
            return 'the ' + p[0].toLowerCase() + ' has a ' + p[1];
        }).join('; ');
        const sentence = clauses.charAt(0).toUpperCase() + clauses.slice(1);
        return 'Interactive 3D model of ' + articleFor(r.object) + ' ' + r.object + '. ' + sentence + '.';
    }

    /* ---- Keyboard navigation for <model-viewer> (a11y) ----
       Arrow keys orbit 10 deg/press; +/- zoom by adjusting orbit radius.
       Lets BLV / keyboard-only users inspect the mesh without a mouse.
       Delegated on the gallery track in the CAPTURE phase so we run before
       model-viewer's own built-in key handling and can suppress it via
       stopPropagation() — otherwise arrow keys would orbit twice. */
    const ROT_STEP = 10 * Math.PI / 180; // 10 degrees in radians
    const ZOOM_FACTOR = 0.9;             // <1 zooms in; reciprocal zooms out
    function installKeyboardControls(container) {
        container.addEventListener('keydown', function (e) {
            const mv = e.target.closest && e.target.closest('model-viewer');
            // API is only present once the custom element is upgraded.
            if (!mv || typeof mv.getCameraOrbit !== 'function') {
                return;
            }
            const orbit = mv.getCameraOrbit(); // {theta, phi, radius} in rad/rad/m
            let handled = true;
            switch (e.key) {
                case 'ArrowLeft':  orbit.theta -= ROT_STEP; break;
                case 'ArrowRight': orbit.theta += ROT_STEP; break;
                case 'ArrowUp':    orbit.phi   -= ROT_STEP; break;
                case 'ArrowDown':  orbit.phi   += ROT_STEP; break;
                case '+':
                case '=':          orbit.radius *= ZOOM_FACTOR; break;
                case '-':
                case '_':          orbit.radius /= ZOOM_FACTOR; break;
                default:           handled = false;
            }
            if (!handled) {
                return;
            }
            e.preventDefault();
            e.stopPropagation(); // block model-viewer's built-in key handler
            // Stop auto-rotation so manual orientation sticks.
            mv.removeAttribute('auto-rotate');
            // model-viewer clamps theta/phi/radius to its configured bounds.
            mv.cameraOrbit = orbit.theta + 'rad ' + orbit.phi + 'rad ' + orbit.radius + 'm';
        }, true); // capture phase
    }

    const track = document.getElementById('gallery-track');
    installKeyboardControls(track);
    const counter = document.getElementById('gallery-current');
    const total = document.getElementById('gallery-total');

    total.textContent = results.length.toString();

    /* Build slides from <template> */
    const slideTemplate = document.getElementById('gallery-slide-template');

    results.forEach(function (r, idx) {
        const slide = slideTemplate.content.firstElementChild.cloneNode(true);
        // Display prompt: all lowercase, periods -> commas, collapse double
        // spaces, strip trailing comma/space.
        const prompt = r.prompt
            .toLowerCase()
            .replace(/\./g, ',')
            .replace(/\s+/g, ' ')
            .replace(/[,\s]+$/, '');

        const description = buildDescription(r);

        const mv = slide.querySelector('model-viewer');
        // Defer .glb load (~18MB each) — set on demand for active slide + neighbors.
        mv.dataset.src = DATA_DIR + r.file + '.glb';
        // Rich alt is the accessible name announced on focus — describes the
        // object and its per-component textures for screen-reader users.
        mv.alt = description;

        const photo = slide.querySelector('[data-field="photo"]');
        photo.src = DATA_DIR + r.file + '.jpeg';
        photo.alt = '3D-printed result for: ' + prompt;

        // Download links: left -> .glb (interactive model), right -> .stl (print-ready).
        const dlGlb = slide.querySelector('[data-field="dl-glb"]');
        dlGlb.href = DATA_DIR + r.file + '.glb';
        dlGlb.setAttribute('download', r.file + '.glb');

        const dlStl = slide.querySelector('[data-field="dl-stl"]');
        dlStl.href = DATA_DIR + r.file + '.stl';
        dlStl.setAttribute('download', r.file + '.stl');

        slide.querySelector('[data-field="prompt"]').textContent = prompt;

        track.appendChild(slide);
    });

    /* Lazy-load .glb for active slide + immediate neighbors only */
    function loadNearby(swiper) {
        const viewers = track.querySelectorAll('model-viewer');
        const a = swiper.activeIndex;
        [a - 1, a, a + 1].forEach(function (i) {
            const mv = viewers[i];
            if (mv && mv.dataset.src && !mv.src) {
                mv.src = mv.dataset.src;
            }
        });
    }

    const counterRegion = document.getElementById('gallery-counter');

    function updateCounter(swiper) {
        const current = swiper.activeIndex + 1;
        counter.textContent = current;
        // Spoken label for the live region (overrides the terse "1 / 16" glyphs).
        if (counterRegion) {
            counterRegion.setAttribute(
                'aria-label', 'Showing result ' + current + ' of ' + results.length);
        }
        loadNearby(swiper);
    }

    /* Keep off-screen slides out of the tab order (`inert`) and accessibility tree (`aria-hidden`). */
    function updateSlideVisibility(swiper) {
        swiper.slides.forEach(function (slide, i) {
            const hidden = (i !== swiper.activeIndex);
            slide.inert = hidden;
            if (hidden) {
                slide.setAttribute('aria-hidden', 'true');
            } else {
                slide.removeAttribute('aria-hidden');
            }
        });
    }

    /* Initialize Swiper */
    new Swiper('#gallery-wrapper', {
        a11y: {
            enabled: true,
            containerRoleDescriptionMessage: 'carousel',
            containerMessage: 'Tactile graphics results gallery',
            itemRoleDescriptionMessage: 'slide',
            slideLabelMessage: 'Result {{index}} of {{slidesLength}}',
            prevSlideMessage: 'Previous result',
            nextSlideMessage: 'Next result',
            paginationBulletMessage: 'Go to result {{index}}',
        },
        slidesPerView: 1,
        spaceBetween: 24,
        grabCursor: true,
        // Don't swipe the slide when the drag starts on a 3D viewer —
        // let model-viewer's own camera-controls handle rotate/zoom.
        noSwiping: true,
        noSwipingSelector: 'model-viewer',
        keyboard: {enabled: true},
        navigation: {
            nextEl: '#gallery-next',
            prevEl: '#gallery-prev',
        },
        pagination: {
            el: '#gallery-pagination',
            clickable: true,
        },
        on: {
            init: function (swiper) {
                updateCounter(swiper);
                updateSlideVisibility(swiper);
            },
            slideChange: function (swiper) {
                updateCounter(swiper);
                updateSlideVisibility(swiper);
            },
        },
    });
})();

/* ============================================================
   Method video <-> tab sync (YouTube IFrame Player API).
   The player is embedded inline (YouTube renders its own preview); tab
   clicks seek the video and playback drives the tab highlighting.
   ============================================================ */
(function () {
    const VIDEO_ID = 'WJFewO33HCs';
    /* Tab start times (s). Intro 0-11 => no tab highlighted. */
    const STARTS = [11, 27, 52, 87];

    const tabs = Array.prototype.slice.call(
        document.querySelectorAll('#method-tabs .pipeline-step'));
    if (!tabs.length) return;

    let player = null;
    let ready = false;
    let pollId = null;

    /* Which tab range contains time t? -1 = intro/none. */
    function tabAt(t) {
        let idx = -1;
        for (let i = 0; i < STARTS.length; i++) {
            if (t >= STARTS[i]) idx = i;
        }
        return idx;
    }

    function setActive(idx) {
        tabs.forEach(function (el, i) {
            el.classList.toggle('active', i === idx);
        });
    }

    function poll() {
        if (!player || typeof player.getCurrentTime !== 'function') return;
        setActive(tabAt(player.getCurrentTime()));
    }

    function startPolling() {
        if (pollId === null) pollId = setInterval(poll, 250);
    }

    function stopPolling() {
        if (pollId !== null) {
            clearInterval(pollId);
            pollId = null;
        }
    }

    /* Tab click/keyboard -> seek + play from that tab's start. */
    tabs.forEach(function (el, i) {
        function jump() {
            if (!ready) return;
            player.seekTo(STARTS[i], true);
            player.playVideo();
            setActive(i);
        }

        el.addEventListener('click', jump);
        el.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                jump();
            }
        });
    });

    window.onYouTubeIframeAPIReady = function () {
        player = new YT.Player('yt-player', {
            videoId: VIDEO_ID,
            playerVars: {rel: 0, modestbranding: 1, playsinline: 1},
            events: {
                onReady: function () {
                    ready = true;
                },
                onStateChange: function (e) {
                    /* 1 = playing -> follow playback; else stop (keep highlight). */
                    if (e.data === YT.PlayerState.PLAYING) {
                        poll();
                        startPolling();
                    } else {
                        stopPolling();
                    }
                },
            },
        });
    };

    /* Load the IFrame API after the callback is defined. */
    if (window.YT && window.YT.Player) {
        window.onYouTubeIframeAPIReady();
    } else {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
    }
})();

/* ---- BibTeX copy ---- */
function copyBibtex() {
    const text = document.getElementById('bibtex-content').textContent;
    navigator.clipboard.writeText(text).then(function () {
        const btn = document.getElementById('copy-btn');
        btn.innerHTML = '<i class="bi bi-check-lg me-1" aria-hidden="true"></i> Copied!';
        setTimeout(function () {
            btn.innerHTML = '<i class="bi bi-clipboard-fill me-1" aria-hidden="true"></i> Copy';
        }, 2000);
    });
}

