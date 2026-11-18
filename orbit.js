const canvas = document.getElementById("orbit-canvas");

if (canvas) {
    const ctx = canvas.getContext("2d");
    const hero = canvas.closest(".hero");
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
    let lastFrame = start;
    let reducedHoldTimer = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const craft = {
        mode: "orbit",
        orbitAngle: 0.75,
        x: 0,
        y: 0,
        heading: 0,
        route: null,
        destination: null,
        holdUntil: 0,
        trail: []
    };

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    function createFlightPath(from, startHeading, to, arrivalHeading, now) {
        const distance = Math.hypot(to.x - from.x, to.y - from.y);
        const outwardHandle = clamp(distance * 0.42, 64, 230);
        const arrivalHandle = clamp(distance * 0.28, 42, 170);

        return {
            p0: { x: from.x, y: from.y },
            p1: {
                x: from.x + Math.cos(startHeading) * outwardHandle,
                y: from.y + Math.sin(startHeading) * outwardHandle
            },
            p2: {
                x: to.x - Math.cos(arrivalHeading) * arrivalHandle,
                y: to.y - Math.sin(arrivalHeading) * arrivalHandle
            },
            p3: { x: to.x, y: to.y },
            arrivalHeading,
            startTime: now,
            duration: clamp(1050 + distance * 3.8, 1250, 3900)
        };
    }

    function sampleFlightPath(route, progress) {
        const inverse = 1 - progress;
        const x = inverse ** 3 * route.p0.x
            + 3 * inverse ** 2 * progress * route.p1.x
            + 3 * inverse * progress ** 2 * route.p2.x
            + progress ** 3 * route.p3.x;
        const y = inverse ** 3 * route.p0.y
            + 3 * inverse ** 2 * progress * route.p1.y
            + 3 * inverse * progress ** 2 * route.p2.y
            + progress ** 3 * route.p3.y;
        const dx = 3 * inverse ** 2 * (route.p1.x - route.p0.x)
            + 6 * inverse * progress * (route.p2.x - route.p1.x)
            + 3 * progress ** 2 * (route.p3.x - route.p2.x);
        const dy = 3 * inverse ** 2 * (route.p1.y - route.p0.y)
            + 6 * inverse * progress * (route.p2.y - route.p1.y)
            + 3 * progress ** 2 * (route.p3.y - route.p2.y);

        return { x, y, heading: Math.atan2(dy, dx) };
    }

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

    function drawWaypoint(x, y, elapsed) {
        const size = 10 + Math.sin(elapsed * 4) * 1.5;
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = "rgba(112, 231, 255, 0.72)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-size, -size * 0.45);
        ctx.lineTo(-size, -size);
        ctx.lineTo(-size * 0.45, -size);
        ctx.moveTo(size * 0.45, -size);
        ctx.lineTo(size, -size);
        ctx.lineTo(size, -size * 0.45);
        ctx.moveTo(size, size * 0.45);
        ctx.lineTo(size, size);
        ctx.lineTo(size * 0.45, size);
        ctx.moveTo(-size * 0.45, size);
        ctx.lineTo(-size, size);
        ctx.lineTo(-size, size * 0.45);
        ctx.stroke();
        ctx.restore();
    }

    function drawTrail(scale) {
        for (let index = 1; index < craft.trail.length; index += 1) {
            const previous = craft.trail[index - 1];
            const current = craft.trail[index];
            const alpha = (index / craft.trail.length) * 0.18;
            ctx.strokeStyle = `rgba(112, 231, 255, ${alpha})`;
            ctx.lineWidth = Math.max(0.6, scale * 1.2);
            ctx.beginPath();
            ctx.moveTo(previous.x, previous.y);
            ctx.lineTo(current.x, current.y);
            ctx.stroke();
        }
    }

    function rememberCraftPosition() {
        const previous = craft.trail[craft.trail.length - 1];
        if (!previous || Math.hypot(craft.x - previous.x, craft.y - previous.y) > 1.5) {
            craft.trail.push({ x: craft.x, y: craft.y });
            if (craft.trail.length > 42) {
                craft.trail.shift();
            }
        }
    }

    function draw(now) {
        const elapsed = reducedMotion.matches ? 12 : (now - start) / 1000;
        const delta = Math.min((now - lastFrame) / 1000, 0.05);
        lastFrame = now;
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

        const craftRadiusX = Math.min(width * 0.29, 360 * scale);
        const craftRadiusY = Math.min(height * 0.34, 260 * scale);

        function orbitPosition(angle) {
            return {
                x: cx + Math.cos(angle) * craftRadiusX,
                y: cy + Math.sin(angle) * craftRadiusY,
                heading: Math.atan2(
                    Math.cos(angle) * craftRadiusY,
                    -Math.sin(angle) * craftRadiusX
                )
            };
        }

        if (craft.mode === "hold" && now >= craft.holdUntil) {
            const nearestAngle = Math.atan2(
                (craft.y - cy) / Math.max(craftRadiusY, 1),
                (craft.x - cx) / Math.max(craftRadiusX, 1)
            );
            const rejoinAngle = nearestAngle + 0.5;
            const rejoinPoint = orbitPosition(rejoinAngle);
            craft.route = createFlightPath(
                craft,
                craft.heading,
                rejoinPoint,
                rejoinPoint.heading,
                now
            );
            craft.route.rejoinAngle = rejoinAngle;
            craft.mode = "return";
        }

        if (craft.mode === "divert" || craft.mode === "return") {
            const progress = clamp((now - craft.route.startTime) / craft.route.duration, 0, 1);
            const position = sampleFlightPath(craft.route, progress);
            craft.x = position.x;
            craft.y = position.y;
            craft.heading = position.heading;

            if (progress >= 1) {
                if (craft.mode === "divert") {
                    craft.x = craft.route.p3.x;
                    craft.y = craft.route.p3.y;
                    craft.heading = craft.route.arrivalHeading;
                    craft.route = null;
                    craft.mode = "hold";
                    craft.holdUntil = now + 1000;
                } else {
                    craft.orbitAngle = craft.route.rejoinAngle;
                    craft.route = null;
                    craft.destination = null;
                    craft.mode = "orbit";
                    const orbit = orbitPosition(craft.orbitAngle);
                    craft.x = orbit.x;
                    craft.y = orbit.y;
                    craft.heading = orbit.heading;
                }
            }
        } else if (craft.mode === "orbit") {
            if (!reducedMotion.matches) {
                craft.orbitAngle += delta * 0.16;
            }
            const orbit = orbitPosition(craft.orbitAngle);
            craft.x = orbit.x;
            craft.y = orbit.y;
            craft.heading = orbit.heading;
        }

        rememberCraftPosition();
        drawTrail(scale);

        if (craft.destination && (craft.mode === "divert" || craft.mode === "hold")) {
            drawWaypoint(craft.destination.x, craft.destination.y, elapsed);
        }

        drawSpacecraft(craft.x, craft.y, craft.heading, scale, elapsed);

        if (!reducedMotion.matches) {
            requestAnimationFrame(draw);
        }
    }

    resize();
    window.addEventListener("resize", () => {
        resize();
        craft.mode = "orbit";
        craft.route = null;
        craft.destination = null;
        craft.trail = [];
        if (reducedMotion.matches) {
            requestAnimationFrame(draw);
        }
    });
    reducedMotion.addEventListener("change", () => {
        start = performance.now();
        lastFrame = start;
        craft.mode = "orbit";
        craft.route = null;
        craft.destination = null;
        craft.trail = [];
        requestAnimationFrame(draw);
    });

    let heroPointerStart = null;

    function isHeroControl(target) {
        return Boolean(target.closest?.("a, button"));
    }

    function redirectCraft(event) {
        const bounds = canvas.getBoundingClientRect();
        const destination = {
            x: clamp(event.clientX - bounds.left, 22, width - 22),
            y: clamp(event.clientY - bounds.top, 22, height - 22)
        };
        const arrivalHeading = Math.atan2(destination.y - craft.y, destination.x - craft.x);

        if (reducedMotion.matches) {
            window.clearTimeout(reducedHoldTimer);
            craft.x = destination.x;
            craft.y = destination.y;
            craft.heading = arrivalHeading;
            craft.destination = destination;
            craft.mode = "hold";
            craft.holdUntil = performance.now() + 1000;
            craft.trail = [];
            requestAnimationFrame(draw);
            reducedHoldTimer = window.setTimeout(() => {
                craft.mode = "orbit";
                craft.destination = null;
                requestAnimationFrame(draw);
            }, 1000);
            return;
        }

        craft.destination = destination;
        craft.route = createFlightPath(craft, craft.heading, destination, arrivalHeading, performance.now());
        craft.mode = "divert";
    }

    if (hero) {
        hero.addEventListener("pointerdown", (event) => {
            if (isHeroControl(event.target)) {
                heroPointerStart = null;
                return;
            }

            heroPointerStart = {
                id: event.pointerId,
                x: event.clientX,
                y: event.clientY
            };
        });

        hero.addEventListener("pointerup", (event) => {
            const pointerStart = heroPointerStart;
            heroPointerStart = null;

            if (!pointerStart || pointerStart.id !== event.pointerId || isHeroControl(event.target)) {
                return;
            }

            const pointerTravel = Math.hypot(
                event.clientX - pointerStart.x,
                event.clientY - pointerStart.y
            );

            if (pointerTravel <= 12) {
                redirectCraft(event);
            }
        });

        hero.addEventListener("pointercancel", () => {
            heroPointerStart = null;
        });
    }
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
