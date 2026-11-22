// Masthead background: a field of small dark pyramids on a canvas that open up in waves.
// Waves ripple out behind the pointer (or a finger). Each pyramid a wave passes folds its four
// faces open toward its edges, letting out a cyan glow and a spinning gem, then springs shut.
// A click or tap sends a shockwave across the header, the logo sends one as it finishes flying in,
// and while nobody points at the header a gentle ripple starts somewhere now and then.
// Closed, the pyramids are shaded like the header's old background image. Without the canvas,
// the CSS pattern on header.masthead shows instead.
(function () {
    "use strict";

    // Grid
    var CELL = 60;                  // pyramid width in px for a 1920×1080 header; scales like background-size: cover
    var MIN_CELL = 36;              // in px, for small screens
    var MAX_PIXELS = 4e6;           // canvas pixel budget; lowers the resolution on large high-DPI screens

    // Closed pyramids. Each face's grey level is c0 + c1·u + c2·v + c3·u·v, fitted to the old image
    // (assets/img/header-bg.jpg, in git history), where u and v run 0..1 across a 1920×1080 frame
    // that covers the header and is centered on it.
    var SHADES = [
        [29.19, -7.92, 2.82, 0.16],     // top face
        [23.31, -14.04, 2.00, -1.34],   // right face
        [19.44, 1.62, 8.25, -4.92],     // bottom face
        [1.77, -1.08, -0.72, 0.99]      // left face
    ];

    // Opening: each face hinges on its edge of the cell and tilts up from CLOSED_ANGLE to OPEN_ANGLE
    var CLOSED_ANGLE = 45;          // degrees from the floor
    var OPEN_ANGLE = 80;            // below 90 even with overshoot, so open faces stay inside their cell
    var UPRIGHT_SHADE = [0.6, 0.15, -0.45, -0.5]; // change in each face's shade once upright, relative

    // What an open pyramid shows
    var FLOOR = [2, 10, 12];
    var GLOW_GAIN = 2;              // the glow is at full strength by 1/GLOW_GAIN open, so the cracks light up first
    var GEM_SIZE = 0.24;            // half-diagonal of a full-grown gem, in cells
    var GEM_DARK = [10, 70, 78];
    var GEM_LIGHT = [205, 253, 255];
    var LIGHT_ANGLE = -60;          // where the gem's light comes from, degrees on screen (-90 is straight up)
    var BLOOM = 0.16;               // cyan light an open pyramid spills onto its neighbors
    var BLOOM_RADIUS = 1.6;         // in cells

    // Each pyramid springs toward the openness the waves ask of it
    var SPRING_HZ = 4;
    var SPRING_DAMPING = 0.4;       // below 1 lets the faces overshoot and bounce
    var MAX_OPEN = 1.25;            // overshoot limit; see OPEN_ANGLE

    // Waves. Distances are in cells and speeds in cells per second. amp is the openness a wave
    // brings, and it shrinks by a factor of e for every `reach` cells the wave travels. Behind its
    // front come more crests, WAVE_LENGTH apart, fading by a factor of e every `tail` cells.
    var WAVE_FRONT = 0.9;           // width of a wave's rising edge
    var WAVE_LENGTH = 4;
    var WAVE_FADED = 0.02;          // a wave is dropped once its front is weaker than this
    var TRAIL = { amp: 1, reach: 4, speed: 9, tail: 0.8 };          // dropped along the pointer's path
    var TRAIL_SPACING = 2;          // in cells
    var PULSE = { amp: 0.55, reach: 3.5, speed: 7, tail: 1.5 };     // repeats while the pointer rests on the header
    var PULSE_EVERY = 1500;         // ms
    var SHOCK = { amp: 1.3, reach: 40, speed: 12, tail: 3.5 };      // a click or tap
    var INTRO = { amp: 1.1, reach: 30, speed: 11, tail: 3.5 };      // from the logo once it has flown in
    var INTRO_DELAY = 1600;         // ms after the loading screen is gone; matches the fly-in in js/logoTilt.js
    var DRIFT = { amp: 0.6, reach: 5, speed: 7, tail: 2 };          // now and then while nobody points at the header
    var DRIFT_EVERY = [3000, 7000]; // ms, picked at random in this range
    var SWELL = 0.3;                // openness right under a pointer
    var SWELL_RADIUS = 2.5;         // in cells
    var MAX_WAVES = 64;             // the oldest wave is dropped beyond this
    var TAP_SLOP = 10;              // px a finger may move for a touch to still count as a tap
    var SPINNER = ".loading-ring-wrapper";

    var header = document.querySelector("header.masthead");
    var canvas = header && header.querySelector(".masthead-canvas");
    var ctx = canvas && canvas.getContext && canvas.getContext("2d", { alpha: false });
    if (!ctx) {
        return;
    }
    var still = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    var CLOSED = CLOSED_ANGLE * Math.PI / 180;
    var OPEN = OPEN_ANGLE * Math.PI / 180;
    var LIGHT = LIGHT_ANGLE * Math.PI / 180;

    // The closed field, drawn once per size; every frame copies the changed area back from it
    var base = document.createElement("canvas");
    var baseCtx = base.getContext("2d", { alpha: false });
    var glowSprite = makeSprite([
        [0, "rgba(190, 252, 255, 0.95)"],
        [0.2, "rgba(45, 241, 255, 0.8)"],
        [0.55, "rgba(33, 151, 160, 0.25)"],
        [1, "rgba(20, 103, 109, 0)"]
    ]);
    var bloomSprite = makeSprite([
        [0, "rgba(45, 241, 255, 1)"],
        [0.4, "rgba(45, 241, 255, 0.35)"],
        [1, "rgba(45, 241, 255, 0)"]
    ]);

    var width = 0;              // header size in CSS px
    var height = 0;
    var ratio = 1;              // canvas pixels per CSS px
    var cell = CELL;            // pyramid width in CSS px
    var cols = 0;
    var rows = 0;
    var edgesX = [];            // cell edges in CSS px, snapped to canvas pixels
    var edgesY = [];
    var shades = null;          // closed grey level of each face, 4 per cell
    var opens = null;           // openness of each cell: 0 closed, 1 open, a bit more while overshooting
    var speeds = null;          // rate of change of opens, per second

    var waves = [];
    var pointer = null;         // mouse or pen position in viewport coordinates
    var trailFrom = null;       // where the last trail wave started, in header coordinates
    var touch = null;           // the touch in progress, to tell taps from scrolls
    var lastWave = 0;
    var lastInput = -Infinity;
    var visible = true;
    var frame = 0;
    var lastTime = 0;
    var drawn = null;           // the area last frame drew over, in canvas pixels
    var driftTimer = 0;
    var drifting = false;       // drift waves start after the intro wave

    layout();
    watchSize();
    if (still) {
        return;
    }
    listen();
    afterSpinner(function () {
        setTimeout(intro, INTRO_DELAY);
    });

    function makeSprite(stops) {
        var sprite = document.createElement("canvas");
        sprite.width = sprite.height = 128;
        var c = sprite.getContext("2d");
        var gradient = c.createRadialGradient(64, 64, 0, 64, 64, 64);
        stops.forEach(function (stop) {
            gradient.addColorStop(stop[0], stop[1]);
        });
        c.fillStyle = gradient;
        c.fillRect(0, 0, 128, 128);
        return sprite;
    }

    // Sizes the canvas and grid to the header, and draws the closed field
    function layout() {
        var w = header.clientWidth;
        var h = header.clientHeight;
        if (!w || !h) {
            return;
        }
        var dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_PIXELS / (w * h)));
        dpr = Math.max(dpr, 0.5);
        if (w === width && h === height && dpr === ratio) {
            return;
        }
        width = w;
        height = h;
        ratio = dpr;
        canvas.width = base.width = Math.round(w * dpr);
        canvas.height = base.height = Math.round(h * dpr);

        // Like the old image: scaled to cover the header, centered, with a grid line down the
        // middle and a row of apexes across it
        var cover = Math.max(w / 1920, h / 1080);
        cell = Math.max(CELL * cover, MIN_CELL);
        var left = w / 2 - Math.ceil(w / 2 / cell) * cell;
        var top = h / 2 - cell / 2 - Math.ceil((h / 2 - cell / 2) / cell) * cell;
        cols = Math.ceil((w - left) / cell);
        rows = Math.ceil((h - top) / cell);
        edgesX = edges(left, cols);
        edgesY = edges(top, rows);

        shades = new Float32Array(cols * rows * 4);
        opens = new Float32Array(cols * rows);
        speeds = new Float32Array(cols * rows);
        for (var row = 0; row < rows; row++) {
            for (var col = 0; col < cols; col++) {
                var u = clamp(((edgesX[col] + edgesX[col + 1]) / 2 - w / 2) / cover / 1920 + 0.5, 0, 1);
                var v = clamp(((edgesY[row] + edgesY[row + 1]) / 2 - h / 2) / cover / 1080 + 0.5, 0, 1);
                for (var face = 0; face < 4; face++) {
                    var c = SHADES[face];
                    shades[(row * cols + col) * 4 + face] = c[0] + c[1] * u + c[2] * v + c[3] * u * v;
                }
            }
        }

        waves = [];
        trailFrom = null;
        drawn = null;
        baseCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
        for (var i = 0; i < cols * rows; i++) {
            drawCell(baseCtx, i, 0);
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(base, 0, 0);
    }

    function edges(start, count) {
        var list = [];
        for (var i = 0; i <= count; i++) {
            list.push(Math.round((start + i * cell) * ratio) / ratio);
        }
        return list;
    }

    function watchSize() {
        var refit = function () {
            layout();
            request();
        };
        if (window.ResizeObserver) {
            new ResizeObserver(refit).observe(header);
        }
        // Also catches browser zoom, which changes devicePixelRatio
        window.addEventListener("resize", refit);
    }

    function listen() {
        if (window.IntersectionObserver) {
            new IntersectionObserver(function (entries) {
                visible = entries[entries.length - 1].isIntersecting;
                request();
            }).observe(header);
        }

        window.addEventListener("pointermove", function (e) {
            if (e.pointerType === "touch") {
                return;
            }
            pointer = { x: e.clientX, y: e.clientY };
            trail(e.clientX, e.clientY);
        }, { passive: true });
        window.addEventListener("mouseout", function (e) {
            if (!e.relatedTarget) {
                pointer = null;
                trailFrom = null;
            }
        });
        window.addEventListener("pointerdown", function (e) {
            if (e.pointerType !== "touch" && e.button === 0) {
                shock(e.clientX, e.clientY);
            }
        }, { passive: true });

        // Touch events keep coming while the page scrolls, unlike pointer events
        window.addEventListener("touchstart", function (e) {
            var t = e.touches[0];
            touch = { x: t.clientX, y: t.clientY, time: performance.now(), moved: false };
            trail(t.clientX, t.clientY);
        }, { passive: true });
        window.addEventListener("touchmove", function (e) {
            var t = e.touches[0];
            if (touch && Math.abs(t.clientX - touch.x) + Math.abs(t.clientY - touch.y) > TAP_SLOP) {
                touch.moved = true;
            }
            trail(t.clientX, t.clientY);
        }, { passive: true });
        window.addEventListener("touchend", function () {
            if (touch && !touch.moved && performance.now() - touch.time < 500) {
                shock(touch.x, touch.y);
            }
            touch = null;
            trailFrom = null;
        }, { passive: true });
        window.addEventListener("touchcancel", function () {
            touch = null;
            trailFrom = null;
        }, { passive: true });
    }

    // Header coordinates of a viewport point, or null outside the header
    function local(x, y) {
        var box = header.getBoundingClientRect();
        x -= box.left;
        y -= box.top;
        return x >= 0 && y >= 0 && x < box.width && y < box.height ? { x: x, y: y } : null;
    }

    // Drops waves along the path from the last one to here, one every TRAIL_SPACING cells
    function trail(x, y) {
        var now = performance.now();
        var at = local(x, y);
        if (!at) {
            trailFrom = null;
            return;
        }
        lastInput = now;
        if (!trailFrom) {
            trailFrom = at;
            addWave(at.x, at.y, TRAIL, now);
            return;
        }
        var dx = at.x - trailFrom.x;
        var dy = at.y - trailFrom.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        var spacing = TRAIL_SPACING * cell;
        var count = Math.min(Math.floor(distance / spacing), 6);
        for (var i = 1; i <= count; i++) {
            var along = i * spacing / distance;
            addWave(trailFrom.x + dx * along, trailFrom.y + dy * along, TRAIL, now);
        }
        if (distance > spacing * 6) {
            trailFrom = at;     // a jump too long to fill in; carry on from here
        } else if (count) {
            var carried = count * spacing / distance;
            trailFrom = { x: trailFrom.x + dx * carried, y: trailFrom.y + dy * carried };
        }
        request();
    }

    function shock(x, y) {
        var at = local(x, y);
        if (at) {
            lastInput = performance.now();
            addWave(at.x, at.y, SHOCK, lastInput);
        }
    }

    function intro() {
        var logo = header.querySelector(".masthead-logo");
        var box = header.getBoundingClientRect();
        var mark = logo && logo.getBoundingClientRect();
        if (mark && mark.width && box.bottom > 0 && box.top < window.innerHeight) {
            addWave(mark.left + mark.width / 2 - box.left, mark.top + mark.height / 2 - box.top, INTRO, performance.now());
        }
        drifting = true;
        scheduleDrift();
    }

    function scheduleDrift() {
        if (driftTimer || !drifting) {
            return;
        }
        var delay = DRIFT_EVERY[0] + Math.random() * (DRIFT_EVERY[1] - DRIFT_EVERY[0]);
        driftTimer = setTimeout(function () {
            driftTimer = 0;
            var now = performance.now();
            var idle = !touch && !(pointer && local(pointer.x, pointer.y)) && now - lastInput > DRIFT_EVERY[0];
            if (visible && idle && !document.hidden) {
                addWave(Math.random() * width, Math.random() * height, DRIFT, now);
            } else {
                scheduleDrift();
            }
        }, delay);
    }

    function addWave(x, y, kind, time) {
        // The wave is dropped once its front has faded, or passed the farthest corner, and its tail with it
        var farthest = Math.sqrt(Math.pow(Math.max(x, width - x), 2) + Math.pow(Math.max(y, height - y), 2));
        var fades = kind.reach * cell * Math.log(kind.amp / WAVE_FADED);
        waves.push({
            x: x,
            y: y,
            start: time,
            amp: kind.amp,
            reach: kind.reach * cell,
            speed: kind.speed * cell / 1000,
            tail: kind.tail,
            end: Math.min(farthest, fades) + kind.tail * Math.log(1 / WAVE_FADED) * cell
        });
        if (waves.length > MAX_WAVES) {
            waves.shift();
        }
        lastWave = time;
        request();
    }

    function request() {
        if (!frame && visible && !still) {
            frame = requestAnimationFrame(tick);
        }
    }

    function tick(time) {
        frame = 0;
        var elapsed = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 1 / 60;
        lastTime = time;

        var here = pointer && local(pointer.x, pointer.y);
        if (here && time - lastWave > PULSE_EVERY) {
            addWave(here.x, here.y, PULSE, time);
        }
        waves = waves.filter(function (wave) {
            return (time - wave.start) * wave.speed < wave.end;
        });

        var moving = settle(time, elapsed, here);
        paint();

        if ((moving || waves.length || here) && visible) {
            frame = requestAnimationFrame(tick);
        } else {
            lastTime = 0;
            scheduleDrift();
        }
    }

    // Moves every cell's openness toward what the waves and pointer ask of it; true while any cell is open or moving
    function settle(time, elapsed, here) {
        var omega = 2 * Math.PI * SPRING_HZ;
        var stiffness = omega * omega;
        var damping = 2 * SPRING_DAMPING * omega;
        var steps = Math.ceil(elapsed * 120);
        var dt = elapsed / steps;
        var radii = waves.map(function (wave) {
            return Math.max(time - wave.start, 0) * wave.speed;
        });
        var swellRadius = SWELL_RADIUS * cell;
        var moving = false;

        for (var row = 0; row < rows; row++) {
            var y = (edgesY[row] + edgesY[row + 1]) / 2;
            for (var col = 0; col < cols; col++) {
                var x = (edgesX[col] + edgesX[col + 1]) / 2;
                var i = row * cols + col;

                // Where waves overlap, the strongest wins, which keeps each ring distinct
                var strongest = 0;
                for (var k = 0; k < waves.length; k++) {
                    var wave = waves[k];
                    var dx = x - wave.x;
                    var dy = y - wave.y;
                    var distance = Math.sqrt(dx * dx + dy * dy);
                    var behind = (radii[k] - distance) / cell;   // cells behind the front, negative ahead of it
                    if (behind < -3 * WAVE_FRONT || behind > wave.tail * 4) {
                        continue;
                    }
                    var shape;
                    if (behind < 0) {
                        shape = Math.exp(-behind * behind / (WAVE_FRONT * WAVE_FRONT));
                    } else {
                        var crest = Math.cos(Math.PI * behind / WAVE_LENGTH);
                        shape = Math.exp(-behind / wave.tail) * crest * crest;
                    }
                    strongest = Math.max(strongest, wave.amp * Math.exp(-distance / wave.reach) * shape);
                }
                var shut = 1 - Math.min(strongest, 1);
                if (here) {
                    var px = x - here.x;
                    var py = y - here.y;
                    var near = Math.sqrt(px * px + py * py) / swellRadius;
                    if (near < 1) {
                        shut *= 1 - SWELL * (0.5 + 0.5 * Math.cos(Math.PI * near));
                    }
                }
                var target = 1 - shut;
                if (target < 0.002) {
                    target = 0;
                }

                var open = opens[i];
                var speed = speeds[i];
                if (open === 0 && speed === 0 && target === 0) {
                    continue;
                }
                for (var s = 0; s < steps; s++) {
                    speed += (stiffness * (target - open) - damping * speed) * dt;
                    open += speed * dt;
                    if (open < 0) {
                        open = 0;
                        speed = Math.max(speed, 0);
                    } else if (open > MAX_OPEN) {
                        open = MAX_OPEN;
                        speed = Math.min(speed, 0);
                    }
                }
                if (target === 0 && open < 0.002 && Math.abs(speed) < 0.02) {
                    open = 0;
                    speed = 0;
                }
                opens[i] = open;
                speeds[i] = speed;
                moving = moving || open > 0 || speed !== 0;
            }
        }
        return moving;
    }

    // Redraws the open cells over the closed field, restoring whatever was open last frame
    function paint() {
        var spread = BLOOM_RADIUS * cell;
        var left = Infinity;
        var top = Infinity;
        var right = -Infinity;
        var bottom = -Infinity;
        var open = [];
        for (var i = 0; i < opens.length; i++) {
            if (opens[i] > 0) {
                open.push(i);
                var col = i % cols;
                var row = (i - col) / cols;
                left = Math.min(left, edgesX[col]);
                right = Math.max(right, edgesX[col + 1]);
                top = Math.min(top, edgesY[row]);
                bottom = Math.max(bottom, edgesY[row + 1]);
            }
        }
        var area = open.length ? {
            x0: Math.max(Math.floor((left - spread) * ratio), 0),
            y0: Math.max(Math.floor((top - spread) * ratio), 0),
            x1: Math.min(Math.ceil((right + spread) * ratio), canvas.width),
            y1: Math.min(Math.ceil((bottom + spread) * ratio), canvas.height)
        } : null;
        var restore = merge(drawn, area);
        drawn = area;
        if (!restore || restore.x1 <= restore.x0 || restore.y1 <= restore.y0) {
            return;
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(base, restore.x0, restore.y0, restore.x1 - restore.x0, restore.y1 - restore.y0,
            restore.x0, restore.y0, restore.x1 - restore.x0, restore.y1 - restore.y0);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        open.forEach(function (index) {
            drawCell(ctx, index, opens[index]);
        });

        // Light spilling out of the open cells onto their neighbors
        ctx.globalCompositeOperation = "lighter";
        open.forEach(function (index) {
            var col = index % cols;
            var row = (index - col) / cols;
            ctx.globalAlpha = Math.min(opens[index], 1) * BLOOM;
            ctx.drawImage(bloomSprite,
                (edgesX[col] + edgesX[col + 1]) / 2 - spread, (edgesY[row] + edgesY[row + 1]) / 2 - spread,
                spread * 2, spread * 2);
        });
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
    }

    function merge(a, b) {
        if (!a || !b) {
            return a || b;
        }
        return {
            x0: Math.min(a.x0, b.x0),
            y0: Math.min(a.y0, b.y0),
            x1: Math.max(a.x1, b.x1),
            y1: Math.max(a.y1, b.y1)
        };
    }

    // One pyramid at the given openness: its floor, glow and gem, then its four faces on top
    function drawCell(c, i, open) {
        var col = i % cols;
        var row = (i - col) / cols;
        var x0 = edgesX[col];
        var x1 = edgesX[col + 1];
        var y0 = edgesY[row];
        var y1 = edgesY[row + 1];
        var cx = (x0 + x1) / 2;
        var cy = (y0 + y1) / 2;
        var top = shades[i * 4];
        var right = shades[i * 4 + 1];
        var bottom = shades[i * 4 + 2];
        var left = shades[i * 4 + 3];
        var mean = (top + right + bottom + left) / 4;

        // The floor starts out at the faces' average, so hairline cracks don't flash dark
        var dark = Math.min(open / 0.15, 1);
        c.fillStyle = rgb(
            mean + (FLOOR[0] - mean) * dark,
            mean + (FLOOR[1] - mean) * dark,
            mean + (FLOOR[2] - mean) * dark);
        c.fillRect(x0, y0, x1 - x0, y1 - y0);

        if (open > 0) {
            c.globalAlpha = Math.min(open * GLOW_GAIN, 1);
            c.drawImage(glowSprite, x0, y0, x1 - x0, y1 - y0);
            c.globalAlpha = 1;
            var grown = smoothstep(0.2, 1, open);
            if (grown > 0) {
                // Spins a quarter turn as it grows, ending up as a diamond
                drawGem(c, cx, cy, GEM_SIZE * cell * grown, (1 - grown) * Math.PI / 2);
            }
        }

        // Each face's tip pulls back from the center toward its own edge as the face tilts up
        var angle = CLOSED + (OPEN - CLOSED) * open;
        var back = 1 - Math.cos(angle) / Math.cos(CLOSED);
        var upright = Math.min((angle - CLOSED) / (Math.PI / 2 - CLOSED), 1);
        var w = (x1 - x0) / 2 * back;
        var h = (y1 - y0) / 2 * back;
        triangle(c, grey(top * (1 + UPRIGHT_SHADE[0] * upright)), x0, y0, x1, y0, cx, cy - h);
        triangle(c, grey(right * (1 + UPRIGHT_SHADE[1] * upright)), x1, y0, x1, y1, cx + w, cy);
        triangle(c, grey(bottom * (1 + UPRIGHT_SHADE[2] * upright)), x1, y1, x0, y1, cx, cy + h);
        triangle(c, grey(left * (1 + UPRIGHT_SHADE[3] * upright)), x0, y1, x0, y0, cx - w, cy);
    }

    // A four-faceted gem seen from above, lit from LIGHT_ANGLE
    function drawGem(c, x, y, size, turn) {
        for (var k = 0; k < 4; k++) {
            var from = turn - Math.PI / 2 + k * Math.PI / 2;
            var to = from + Math.PI / 2;
            var lit = 0.5 + 0.5 * Math.cos(from + Math.PI / 4 - LIGHT);
            lit *= lit;
            triangle(c,
                rgb(GEM_DARK[0] + (GEM_LIGHT[0] - GEM_DARK[0]) * lit,
                    GEM_DARK[1] + (GEM_LIGHT[1] - GEM_DARK[1]) * lit,
                    GEM_DARK[2] + (GEM_LIGHT[2] - GEM_DARK[2]) * lit),
                x, y,
                x + Math.cos(from) * size, y + Math.sin(from) * size,
                x + Math.cos(to) * size, y + Math.sin(to) * size);
        }
    }

    function triangle(c, color, ax, ay, bx, by, px, py) {
        c.fillStyle = color;
        c.beginPath();
        c.moveTo(ax, ay);
        c.lineTo(bx, by);
        c.lineTo(px, py);
        c.closePath();
        c.fill();
    }

    function grey(level) {
        return rgb(level, level, level);
    }

    function rgb(r, g, b) {
        return "rgb(" + Math.round(clamp(r, 0, 255)) + "," + Math.round(clamp(g, 0, 255)) + "," +
            Math.round(clamp(b, 0, 255)) + ")";
    }

    function clamp(value, min, max) {
        return value < min ? min : value > max ? max : value;
    }

    function smoothstep(from, to, value) {
        var t = clamp((value - from) / (to - from), 0, 1);
        return t * t * (3 - 2 * t);
    }

    function afterSpinner(callback) {
        var spinner = document.querySelector(SPINNER);
        var giveUp = performance.now() + 5000;
        (function check(now) {
            if (!spinner || getComputedStyle(spinner).display === "none" || now > giveUp) {
                callback();
            } else {
                requestAnimationFrame(check);
            }
        })(performance.now());
    }
})();
