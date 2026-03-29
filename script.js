/* ============================================================
   Gallery + BibTeX copy functionality
   ============================================================ */
(function () {
    /* ---- Gallery data ---- */
    const results = [
        {prompt: 'A coral under the water. The surface shows a close-up detailed texture of coral.'},
        {prompt: 'A football with highly detailed surface textures.'},
        {prompt: 'An iPhone case and an AirPod case with crocodile leather and star-shaped textures.'},
        {prompt: 'A telescope with fine longitudinal ribs texture and cast metal mount.'},
        {prompt: 'An armchair with thick cushions. Pretzel twist rods frame and lollipop texture seat.'},
        {prompt: 'An ammonite with spiraling ridged shell texture.'},
        {prompt: 'A sponge with porous, open-cell surface texture.'},
        {prompt: 'A dolphin with smooth rubbery skin texture.'},
        {prompt: 'A mushroom with fine gill textures underneath the cap.'},
        {prompt: 'A polar bear walking, with dense fur texture.'},
        {prompt: 'An avocado with bumpy alligator-skin texture.'},
        {prompt: 'A ship anchor with rough cast iron surface texture.'},
        {prompt: 'A telescope on a stand with ribbed metal texture.'},
        {prompt: 'A robot holding a flower with brushed metal surface texture.'},
        {prompt: 'A cantaloupe with netted rind surface texture.'},
        {prompt: 'A strawberry with seed-dotted skin texture.'},
    ];

    const track = document.getElementById('gallery-track');
    const counter = document.getElementById('gallery-current');
    const total = document.getElementById('gallery-total');

    total.textContent = results.length.toString();

    /* Build slides from <template> */
    const slideTemplate = document.getElementById('gallery-slide-template');

    results.forEach(function (r, i) {
        const slide = slideTemplate.content.firstElementChild.cloneNode(true);
        const num = i + 1;

        slide.querySelector('model-viewer').alt = '3D tactile mesh for: ' + r.prompt;
        slide.querySelector('[data-field="mesh-label"]').textContent = 'Mesh placeholder #' + num;
        slide.querySelector('[data-field="photo-label"]').textContent = 'Photo placeholder #' + num;
        slide.querySelector('[data-field="prompt"]').textContent = r.prompt;

        track.appendChild(slide);
    });

    function updateCounter(swiper) {
        counter.textContent = swiper.activeIndex + 1;
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

