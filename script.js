/* ============================================================
   Gallery + BibTeX copy functionality
   ============================================================ */
(function () {
    /* ---- Gallery data (16 placeholder results) ---- */
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
    const prevBtn = document.getElementById('gallery-prev');
    const nextBtn = document.getElementById('gallery-next');

    total.textContent = results.length;

    /* Build slides */
    results.forEach(function (r, i) {
        const slide = document.createElement('div');
        slide.className = 'gallery-slide';
        slide.innerHTML =
            '<div class="gallery-pane">' +
            '<span class="gallery-pane-label">3D Mesh</span>' +
            '<model-viewer ' +
            'alt="3D tactile mesh for: ' + r.prompt + '" ' +
            'shadow-intensity="0.6" ' +
            'camera-controls ' +
            'touch-action="pan-y" ' +
            'auto-rotate ' +
            'style="width:100%;height:280px;border-radius:.5rem;background:var(--stone-100);">' +
            '<div slot="poster" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:var(--stone-400);font-family:Inter,sans-serif;font-size:.85rem;">' +
            '<i class="bi bi-box me-2"></i>Mesh placeholder #' + (i + 1) +
            '</div>' +
            '</model-viewer>' +
            '</div>' +
            '<div class="gallery-pane">' +
            '<span class="gallery-pane-label">3D Print Photo</span>' +
            '<div class="photo-placeholder">' +
            '<span><i class="bi bi-camera me-2"></i>Photo placeholder #' + (i + 1) + '</span>' +
            '</div>' +
            '</div>' +
            '<div class="gallery-caption">' +
            '<span class="prompt">' + r.prompt + '</span>' +
            '</div>';
        track.appendChild(slide);
    });

    /* Navigation */
    let idx = 0;

    function go(n) {
        idx = Math.max(0, Math.min(results.length - 1, n));
        track.style.transform = 'translateX(calc(-' + idx + ' * (100% + 1.5rem)))';
        counter.textContent = idx + 1;
        prevBtn.disabled = idx === 0;
        nextBtn.disabled = idx === results.length - 1;
    }

    prevBtn.addEventListener('click', function () {
        go(idx - 1);
    });
    nextBtn.addEventListener('click', function () {
        go(idx + 1);
    });

    /* Keyboard navigation */
    document.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') go(idx - 1);
        if (e.key === 'ArrowRight') go(idx + 1);
    });

    /* Touch swipe */
    let startX = 0;
    const wrapper = document.getElementById('gallery-wrapper');
    wrapper.addEventListener('touchstart', function (e) {
        startX = e.touches[0].clientX;
    }, {passive: true});
    wrapper.addEventListener('touchend', function (e) {
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 40) {
            go(idx + (dx < 0 ? 1 : -1));
        }
    }, {passive: true});
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

