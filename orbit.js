const canvas = document.getElementById("orbit-canvas");

if (canvas) {
    const ctx = canvas.getContext("2d");
    const planets = [
        { radius: 58, size: 2.5, speed: 0.95, color: "#b9b1a3" },
        { radius: 94, size: 4, speed: 0.62, color: "#e4c36a" },
        { radius: 136, size: 4.5, speed: 0.42, color: "#70e7ff" },
        { radius: 188, size: 4, speed: 0.32, color: "#ff7d7d" },
        { radius: 268, size: 9, speed: 0.18, color: "#ffcf66" },
        { radius: 356, size: 8, speed: 0.13, color: "#d8b56a" }
    ];
    let stars = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let start = performance.now();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = canvas.clientWidth;
        height = canvas.clientHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        stars = Array.from({ length: Math.floor(Math.max(width, height) * 0.18) }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 1.2 + 0.2,
            a: Math.random() * 0.5 + 0.2
        }));
    }

    function drawSpacecraft(x, y, heading, scale, elapsed) {
        const craftScale = Math.max(0.72, Math.min(1.2, scale * 1.08));
        const enginePulse = 0.78 + Math.sin(elapsed * 7.2) * 0.16;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(heading);
        ctx.scale(craftScale, craftScale);

        const engineGlow = ctx.createRadialGradient(-13, 0, 0, -13, 0, 13);
        engineGlow.addColorStop(0, `rgba(255, 174, 46, ${0.72 * enginePulse})`);
        engineGlow.addColorStop(0.35, `rgba(255, 174, 46, ${0.28 * enginePulse})`);
        engineGlow.addColorStop(1, "rgba(255, 174, 46, 0)");
        ctx.fillStyle = engineGlow;
        ctx.beginPath();
        ctx.arc(-13, 0, 13, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(31, 163, 255, 0.92)";
        ctx.beginPath();
        ctx.moveTo(-5, -2.5);
        ctx.lineTo(-13, -9.5);
        ctx.lineTo(-10, -1.2);
        ctx.lineTo(-5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-5, 2.5);
        ctx.lineTo(-13, 9.5);
        ctx.lineTo(-10, 1.2);
        ctx.lineTo(-5, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "rgba(71, 250, 255, 0.98)";
        ctx.strokeStyle = "rgba(214, 255, 255, 0.72)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-10, -2.7);
        ctx.lineTo(5, -2.7);
        ctx.quadraticCurveTo(12, -2.2, 15, 0);
        ctx.quadraticCurveTo(12, 2.2, 5, 2.7);
        ctx.lineTo(-10, 2.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 174, 46, 0.96)";
        ctx.beginPath();
        ctx.ellipse(-11, 0, 3.2, 2.1, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function draw(now) {
        const elapsed = reducedMotion.matches ? 12 : (now - start) / 1000;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#050609";
        ctx.fillRect(0, 0, width, height);

        for (const star of stars) {
            ctx.globalAlpha = star.a;
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        const cx = width * 0.68;
        const cy = height * 0.48;
        const scale = Math.min(width, height) / 740;

        const sunGradient = ctx.createRadialGradient(cx, cy, 2, cx, cy, 70 * scale);
        sunGradient.addColorStop(0, "rgba(255, 238, 181, 1)");
        sunGradient.addColorStop(0.34, "rgba(255, 207, 102, 0.7)");
        sunGradient.addColorStop(1, "rgba(255, 207, 102, 0)");
        ctx.fillStyle = sunGradient;
        ctx.beginPath();
        ctx.arc(cx, cy, 70 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffcf66";
        ctx.beginPath();
        ctx.arc(cx, cy, 17 * scale, 0, Math.PI * 2);
        ctx.fill();

        for (const planet of planets) {
            const orbitRadius = planet.radius * scale;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, cy, orbitRadius, 0, Math.PI * 2);
            ctx.stroke();

            const angle = elapsed * planet.speed * 0.25 + planet.radius * 0.015;
            const x = cx + Math.cos(angle) * orbitRadius;
            const y = cy + Math.sin(angle) * orbitRadius * 0.82;

            ctx.fillStyle = planet.color;
            ctx.beginPath();
            ctx.arc(x, y, planet.size * scale + 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        const craftAngle = elapsed * 0.16 + 0.75;
        const craftRadiusX = Math.min(width * 0.29, 360 * scale);
        const craftRadiusY = Math.min(height * 0.34, 260 * scale);
        const craftX = cx + Math.cos(craftAngle) * craftRadiusX;
        const craftY = cy + Math.sin(craftAngle) * craftRadiusY;
        const craftDx = -Math.sin(craftAngle) * craftRadiusX;
        const craftDy = Math.cos(craftAngle) * craftRadiusY;
        const craftHeading = Math.atan2(craftDy, craftDx);

        for (let step = 18; step > 0; step -= 1) {
            const previousAngle = craftAngle - step * 0.018;
            const nextAngle = craftAngle - (step - 1) * 0.018;
            const alpha = (19 - step) / 19 * 0.16;
            ctx.strokeStyle = `rgba(112, 231, 255, ${alpha})`;
            ctx.lineWidth = Math.max(0.6, scale * 1.2);
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(previousAngle) * craftRadiusX,
                       cy + Math.sin(previousAngle) * craftRadiusY);
            ctx.lineTo(cx + Math.cos(nextAngle) * craftRadiusX,
                       cy + Math.sin(nextAngle) * craftRadiusY);
            ctx.stroke();
        }

        drawSpacecraft(craftX, craftY, craftHeading, scale, elapsed);

        if (!reducedMotion.matches) {
            requestAnimationFrame(draw);
        }
    }

    resize();
    window.addEventListener("resize", () => {
        resize();
        if (reducedMotion.matches) {
            requestAnimationFrame(draw);
        }
    });
    reducedMotion.addEventListener("change", () => {
        start = performance.now();
        requestAnimationFrame(draw);
    });
    requestAnimationFrame(draw);
}

const missionDisplay = document.querySelector(".mission-display");

if (missionDisplay) {
    const missionImage = document.getElementById("mission-display-image");
    const missionCode = document.getElementById("mission-display-code");
    const missionTitle = document.getElementById("mission-display-title");
    const missionButtons = Array.from(document.querySelectorAll(".mission-card"));
    const supportsHover = window.matchMedia("(hover: hover)").matches;
    let missionTimer = null;

    function selectMission(button, animate = true) {
        const image = button.dataset.image;
        const alt = button.dataset.alt || "";
        const code = button.dataset.code || "Mission data";
        const title = button.dataset.title || "Solar Explorer 2.1";

        if (!image || !missionImage || !missionCode || !missionTitle) {
            return;
        }

        for (const candidate of missionButtons) {
            const isActive = candidate === button;
            candidate.classList.toggle("is-active", isActive);
            candidate.setAttribute("aria-pressed", String(isActive));
        }

        window.clearTimeout(missionTimer);
        if (animate) {
            missionDisplay.classList.add("is-changing");
        }

        missionTimer = window.setTimeout(() => {
            missionImage.src = image;
            missionImage.alt = alt;
            missionCode.textContent = code;
            missionTitle.textContent = title;
            missionDisplay.classList.remove("is-changing");
        }, animate ? 90 : 0);
    }

    for (const button of missionButtons) {
        button.addEventListener("click", () => selectMission(button));
        button.addEventListener("focus", () => selectMission(button));
        if (supportsHover) {
            button.addEventListener("pointerenter", () => selectMission(button));
        }
    }
}

const lightbox = document.getElementById("screenshot-lightbox");

if (lightbox) {
    const lightboxImage = document.getElementById("lightbox-image");
    const lightboxCaption = document.getElementById("lightbox-caption");
    const lightboxCount = document.getElementById("lightbox-count");
    const lightboxContent = lightbox.querySelector(".lightbox-content");
    const closeButtons = lightbox.querySelectorAll(".lightbox-close, .lightbox-backdrop");
    const screenshotButtons = Array.from(document.querySelectorAll(".screenshot-open"));
    const previousButton = lightbox.querySelector(".lightbox-nav.previous");
    const nextButton = lightbox.querySelector(".lightbox-nav.next");
    let activeTrigger = null;
    let currentIndex = 0;

    function closeLightbox() {
        lightbox.classList.remove("is-open");
        lightbox.setAttribute("aria-hidden", "true");
        document.body.classList.remove("lightbox-open");
        if (lightboxImage) {
            lightboxImage.removeAttribute("src");
            lightboxImage.removeAttribute("alt");
        }
        if (lightboxCaption) {
            lightboxCaption.textContent = "";
        }
        if (lightboxCount) {
            lightboxCount.textContent = "";
        }
        if (activeTrigger) {
            activeTrigger.focus();
            activeTrigger = null;
        }
    }

    function showScreenshot(index, animate = true) {
        const total = screenshotButtons.length;
        currentIndex = (index + total) % total;
        const button = screenshotButtons[currentIndex];
        const image = button.querySelector("img");
        const src = button.dataset.fullSrc || image?.getAttribute("src");
        const caption = button.dataset.caption || "";

        if (!src || !lightboxImage || !lightboxCaption || !lightboxCount) {
            return;
        }

        if (animate) {
            lightboxContent?.classList.add("is-changing");
        }

        window.setTimeout(() => {
            lightboxImage.src = src;
            lightboxImage.alt = image?.getAttribute("alt") || caption;
            lightboxCaption.textContent = caption;
            lightboxCount.textContent = `${currentIndex + 1} / ${total}`;
            lightboxContent?.classList.remove("is-changing");
        }, animate ? 90 : 0);
    }

    function openLightbox(button) {
        activeTrigger = button;
        showScreenshot(screenshotButtons.indexOf(button), false);
        lightbox.classList.add("is-open");
        lightbox.setAttribute("aria-hidden", "false");
        document.body.classList.add("lightbox-open");
        lightbox.querySelector(".lightbox-close")?.focus();
    }

    function showPrevious() {
        showScreenshot(currentIndex - 1);
    }

    function showNext() {
        showScreenshot(currentIndex + 1);
    }

    for (const button of screenshotButtons) {
        button.addEventListener("click", () => openLightbox(button));
    }

    previousButton?.addEventListener("click", showPrevious);
    nextButton?.addEventListener("click", showNext);

    for (const button of closeButtons) {
        button.addEventListener("click", closeLightbox);
    }

    document.addEventListener("keydown", (event) => {
        if (!lightbox.classList.contains("is-open")) {
            return;
        }

        if (event.key === "Escape") {
            closeLightbox();
        } else if (event.key === "ArrowLeft") {
            showPrevious();
        } else if (event.key === "ArrowRight") {
            showNext();
        }
    });
}
