/* ============================================================
   Gallery + BibTeX copy functionality
   ============================================================ */
(function () {
    /* ---- Gallery data (file -> baseline prompt, from data/gallery_ours/prompts.xlsx) ---- */
    const DATA_DIR = 'data/gallery_ours/';
    const results = [
        {file: 'chair', prompt: 'an armchair with thick cushions, the chair frame has a wicker basket texture, and the chair seat and back have a Tufted / Buttoned leather texture. Front facing.'},
        {file: 'chair_lollipop', prompt: 'an armchair with thick cushions, the chair frame has a Pretzel twist rods texture, and the chair seat and back have a lollipop texture. Front facing.'},
        {file: 'chair_ocean', prompt: 'an armchair with thick cushions, the chair frame has a barnacle-coverd rock texture, and the chair seat and back have a jellyfish tenacles texture. Front facing.'},
        {file: 'mushroom', prompt: 'a plain mushroom, the mushroom cap has a mushroom cap texture, and the mushroom stalk has a Longitudinal Fibers texture.'},
        {file: 'tire', prompt: 'a smooth front facing surface of car\'s tire, the surface shows a highly detailed tire\'s texture.'},
        {file: 'coral', prompt: 'an object centric view of a big single coral under the water, the surface shows a close-up detailed texture of coral.'},
        {file: 'ammonite_fossil', prompt: 'an image of large mineral rock surface from above.  In some portion of the surface of large rock contains a few spiral ammonite shell fossil textures.'},
        {file: 'telescope', prompt: 'telescope, the telescope tube and finderscope have a Fine Longitudinal Ribs texture, and the mount of the telescope has a cast metal texture.'},
        {file: 'table', prompt: 'viewed from above, a round table surface with four partitions, the top left corner has a pine wood skin texture, the top right corner has a broken mosaic tile floor texture, the bottom left corner has a stone wall texture, and the bottom right corner has an oyster shell texture.'},
        {file: 'iphone', prompt: 'iPhone case and an airpod case, the iPhone case has a Crocodile\'s detailed skin / leather surface texture, and the airpod case has a star shaped textures.'},
        {file: 'football', prompt: 'football with highly detailed surface textures.'},
        {file: 'polar_bear', prompt: 'polar bear with highly detailed polar bear fur texture.'},
        {file: 'canoe', prompt: 'a canoe with an embossed flower texture.'},
        {file: 'sponge', prompt: 'square sponge with detailed sponge texture.'},
        {file: 'lamp', prompt: 'lamp, the base of the lamp has a tree bark texture, and the lamp shade has a cloth_bag texture.'},
        {file: 'dolphin', prompt: 'a dolphin with wings with an avocado skin texture.'},
    ];

    const track = document.getElementById('gallery-track');
    const counter = document.getElementById('gallery-current');
    const total = document.getElementById('gallery-total');

    total.textContent = results.length.toString();

    /* Build slides from <template> */
    const slideTemplate = document.getElementById('gallery-slide-template');

    results.forEach(function (r) {
        const slide = slideTemplate.content.firstElementChild.cloneNode(true);
        // Display prompt: all lowercase, periods -> commas, collapse double
        // spaces, strip trailing comma/space.
        const prompt = r.prompt
            .toLowerCase()
            .replace(/\./g, ',')
            .replace(/\s+/g, ' ')
            .replace(/[,\s]+$/, '');

        const mv = slide.querySelector('model-viewer');
        // Defer .glb load (~18MB each) — set on demand for active slide + neighbors.
        mv.dataset.src = DATA_DIR + r.file + '.glb';
        mv.alt = '3D tactile mesh for: ' + prompt;

        const photo = slide.querySelector('[data-field="photo"]');
        photo.src = DATA_DIR + r.file + '.jpeg';
        photo.alt = '3D-printed result for: ' + prompt;

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

    function updateCounter(swiper) {
        counter.textContent = swiper.activeIndex + 1;
        loadNearby(swiper);
    }

    /* Initialize Swiper */
    new Swiper('#gallery-wrapper', {
        a11y: true,
        slidesPerView: 1,
        spaceBetween: 24,
        grabCursor: true,
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
            init: updateCounter,
            slideChange: updateCounter,
        },
    });
})();

/* ---- BibTeX copy ---- */
function copyBibtex() {
    const text = document.getElementById('bibtex-content').textContent;
    navigator.clipboard.writeText(text).then(function () {
        const btn = document.getElementById('copy-btn');
        btn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Copied!';
        setTimeout(function () {
            btn.innerHTML = '<i class="bi bi-clipboard-fill me-1"></i> Copy';
        }, 2000);
    });
}

