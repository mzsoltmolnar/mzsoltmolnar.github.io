// Masthead logo: on page load its segments fly in and fade in, then the whole logo tilts toward
// the pointer (or a finger on touch screens) with a dark sheen sliding across it.
// The static <img> stays underneath for layout and alt text, and comes back if anything fails.
(function () {
    "use strict";

    // Tilt
    var MAX_TILT = 30;                      // degrees, approached as the pointer gets far from the logo
    var REACH = 1;                          // pointer distance, in logo widths, that gives half of MAX_TILT
    var PERSPECTIVE = 2.5;                  // viewing distance, in logo widths
    var EASING = 0.12;                      // share of the remaining tilt covered per 60 fps frame
    var REST_BELOW = ".masthead-heading";   // the logo rests while the pointer is below this element

    // Dark sheen
    var LIGHT = { x: -0.3, y: -0.45 };      // facing direction (as tilt -1..1) that centers the sheen
    var SHEEN_TRAVEL = 0.75;                // how far the sheen slides per unit of tilt, in half-logos
    var SHEEN_WIDTH = 0.35;                 // half-width of the sheen band, in half-logos
    var SHEEN_COLOR = [13, 13, 13];         // the masthead background's near-black
    var SHEEN_STRENGTH = 0.8;               // how close to SHEEN_COLOR the middle of the band gets
    var SHEEN_PROFILE = [-1, -2 / 3, -1 / 3, 0, 1 / 3, 2 / 3, 1]; // stop positions across the band

    // Fly-in, keyed by the path ids in the logo SVG. Each segment starts INTRO_DISTANCE logo widths
    // away in its "from" direction and fades in from transparent until it arrives.
    var INTRO_DISTANCE = 1;
    var INTRO_DURATION = 1000;              // ms per segment
    var ENTRANCES = {
        "bar-top": { from: [-1, 0], delay: 0 },         // from the left
        "bar-mid": { from: [1, 0], delay: 0 },          // from the right
        "bar-bottom": { from: [-1, 0], delay: 0 },      // from the left
        "diag-upper": { from: [1, -1], delay: 800 },    // along its slant, from the upper right
        "diag-lower": { from: [1, 1], delay: 800 }      // along its slant, from the lower right
    };
    var SPINNER = ".loading-ring-wrapper";  // the fly-in waits for the loading screen to go away

    var SVG_NS = "http://www.w3.org/2000/svg";
    var img = document.querySelector(".masthead .masthead-logo");
    if (!img || !window.fetch || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    var heading = document.querySelector(REST_BELOW);
    var wrapper = null;
    var svg = null;
    var gradient = null;
    var stops = [];
    var color = null;           // the logo's fill as [r, g, b]
    var logo = null;            // the logo's bounding box in SVG units
    var segments = [];
    var pointer = null;         // last pointer or finger position in viewport coordinates
    var tilt = { x: 0, y: 0 };  // eased, -1..1; positive x faces right, positive y faces down
    var presence = 0;           // eased 0..1, fades the sheen in while the logo follows the pointer
    var introStart = null;      // when the fly-in started, while it runs
    var frame = 0;
    var lastTime = 0;
    var failed = false;

    // Hide the static logo until the segments fly in; it comes back if they can't be set up
    img.style.opacity = "0";
    var fallback = setTimeout(restore, 4000);

    fetch(img.getAttribute("src"))
        .then(function (response) {
            return response.text();
        })
        .then(function (text) {
            if (failed) {
                return;
            }
            clearTimeout(fallback);
            build(text);
            listen();
            afterSpinner(startIntro);
        })
        .catch(restore);

    function restore() {
        failed = true;
        if (wrapper && wrapper.parentNode) {
            wrapper.parentNode.replaceChild(img, wrapper);
        }
        img.style.opacity = "";
    }

    function build(text) {
        var source = new DOMParser().parseFromString(text, "image/svg+xml").documentElement;
        if (!source.getElementsByTagNameNS(SVG_NS, "path").length) {
            throw new Error("No paths in the logo SVG");
        }

        svg = document.importNode(source, true);
        svg.removeAttribute("role");
        svg.removeAttribute("aria-label");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        svg.setAttribute("class", "logo-tilt-svg");

        wrapper = document.createElement("div");
        wrapper.className = "logo-tilt";
        img.parentNode.replaceChild(wrapper, img);
        wrapper.appendChild(img);
        wrapper.appendChild(svg);

        // One sheen gradient spanning the whole logo
        gradient = document.createElementNS(SVG_NS, "linearGradient");
        gradient.setAttribute("id", "logo-tilt-sheen");
        gradient.setAttribute("gradientUnits", "userSpaceOnUse");
        for (var i = 0; i < SHEEN_PROFILE.length + 2; i++) {
            stops.push(gradient.appendChild(document.createElementNS(SVG_NS, "stop")));
        }
        var defs = document.createElementNS(SVG_NS, "defs");
        defs.appendChild(gradient);
        svg.insertBefore(defs, svg.firstChild);

        logo = svg.getBBox();
        var shapes = Array.prototype.slice.call(svg.getElementsByTagNameNS(SVG_NS, "path"));
        color = getComputedStyle(shapes[0]).fill.match(/[\d.]+/g).slice(0, 3).map(Number);
        segments = shapes.map(makeSegment);

        // Wait out of sight at the start of the fly-in
        segments.forEach(function (segment) {
            place(segment, 0);
        });
        paint(wrapper.getBoundingClientRect().width);
    }

    // Wraps a path in a group that carries its fly-in offset and fade
    function makeSegment(shape) {
        var entrance = ENTRANCES[shape.id] || { from: [0, 0], delay: 0 };
        var length = Math.sqrt(entrance.from[0] * entrance.from[0] + entrance.from[1] * entrance.from[1]) || 1;
        var distance = INTRO_DISTANCE * logo.width;
        shape.removeAttribute("id");
        shape.style.fill = "url(#logo-tilt-sheen)";

        var group = document.createElementNS(SVG_NS, "g");
        shape.parentNode.insertBefore(group, shape);
        group.appendChild(shape);

        return {
            group: group,
            dx: entrance.from[0] / length * distance,
            dy: entrance.from[1] / length * distance,
            delay: entrance.delay
        };
    }

    // Moves a segment to the given point (0..1) of its fly-in
    function place(segment, progress) {
        if (progress >= 1) {
            segment.group.removeAttribute("transform");
            segment.group.removeAttribute("opacity");
            return;
        }
        var remaining = Math.pow(1 - progress, 3); // eases out, slowing down on arrival
        segment.group.setAttribute("transform",
            "translate(" + segment.dx * remaining + " " + segment.dy * remaining + ")");
        segment.group.setAttribute("opacity", progress);
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

    function startIntro() {
        var box = wrapper.getBoundingClientRect();
        if (box.bottom < 0 || box.top > window.innerHeight) {
            // Out of view, e.g. the page opened at a later section: show the logo assembled
            segments.forEach(function (segment) {
                place(segment, 1);
            });
            return;
        }
        introStart = performance.now();
        request();
    }

    function listen() {
        window.addEventListener("pointermove", function (e) {
            if (e.pointerType !== "touch") {
                follow(e.clientX, e.clientY);
            }
        }, { passive: true });
        window.addEventListener("mouseout", function (e) {
            if (!e.relatedTarget) {
                follow(null);
            }
        });

        // Touch events keep firing while the page scrolls, unlike pointer events
        ["touchstart", "touchmove", "touchend", "touchcancel"].forEach(function (type) {
            window.addEventListener(type, function (e) {
                var touch = e.touches[0];
                follow(touch ? touch.clientX : null, touch ? touch.clientY : null);
            }, { passive: true });
        });

        window.addEventListener("scroll", request, { passive: true });
        window.addEventListener("resize", request);
    }

    function follow(x, y) {
        pointer = x === null ? null : { x: x, y: y };
        request();
    }

    function request() {
        if (!frame) {
            frame = requestAnimationFrame(render);
        }
    }

    function render(time) {
        frame = 0;
        var box = wrapper.getBoundingClientRect();
        if (box.bottom < 0 || box.top > window.innerHeight) {
            // Off screen; the next scroll picks up from here
            lastTime = 0;
            return;
        }
        var busy = false;

        if (introStart !== null) {
            segments.forEach(function (segment) {
                var progress = (time - introStart - segment.delay) / INTRO_DURATION;
                place(segment, Math.min(Math.max(progress, 0), 1));
                busy = busy || progress < 1;
            });
            if (!busy) {
                introStart = null;
            }
        }

        var elapsed = lastTime ? Math.min(time - lastTime, 100) : 1000 / 60;
        var ease = 1 - Math.pow(1 - EASING, elapsed * 60 / 1000);

        // Follow the pointer unless it's gone or below the heading
        var engaged = pointer !== null && (!heading || pointer.y <= heading.getBoundingClientRect().bottom);
        var target = { x: 0, y: 0 };
        if (engaged) {
            var reach = REACH * box.width;
            target.x = soften((pointer.x - box.left - box.width / 2) / reach);
            target.y = soften((pointer.y - box.top - box.height / 2) / reach);
        }
        tilt.x = approach(tilt.x, target.x, ease);
        tilt.y = approach(tilt.y, target.y, ease);
        presence = approach(presence, engaged ? 1 : 0, ease);
        busy = busy || tilt.x !== target.x || tilt.y !== target.y || presence !== (engaged ? 1 : 0);
        paint(box.width);

        if (busy) {
            lastTime = time;
            frame = requestAnimationFrame(render);
        } else {
            lastTime = 0;
        }
    }

    // Eases value toward target, snapping once it's close
    function approach(value, target, ease) {
        value += (target - value) * ease;
        return Math.abs(target - value) < 0.001 ? target : value;
    }

    // Maps any distance onto -1..1, passing ±0.5 at ±1
    function soften(value) {
        return Math.atan(value) * 2 / Math.PI;
    }

    function paint(width) {
        // Positive tilt.x faces right and positive tilt.y faces down, i.e. toward the pointer
        svg.style.transform = "perspective(" + PERSPECTIVE * width + "px)" +
            " rotateX(" + -tilt.y * MAX_TILT + "deg)" +
            " rotateY(" + tilt.x * MAX_TILT + "deg)";

        // The sheen is centered when the logo faces LIGHT and slides the opposite way as it turns
        // from there, like a reflection on a slightly rounded glossy surface
        var dx = tilt.x - LIGHT.x;
        var dy = tilt.y - LIGHT.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        var ux = distance ? dx / distance : 1;
        var uy = distance ? dy / distance : 0;
        var half = Math.abs(ux) * logo.width / 2 + Math.abs(uy) * logo.height / 2;
        var cx = logo.x + logo.width / 2;
        var cy = logo.y + logo.height / 2;

        // The gradient line runs two half-logos each way, so the band can slide off the edges
        gradient.setAttribute("x1", cx - ux * 2 * half);
        gradient.setAttribute("y1", cy - uy * 2 * half);
        gradient.setAttribute("x2", cx + ux * 2 * half);
        gradient.setAttribute("y2", cy + uy * 2 * half);

        // A soft band: base color at its edges, darkest in the middle
        var middle = 0.5 - distance * SHEEN_TRAVEL / 4;
        var points = [{ offset: 0, weight: 0 }];
        SHEEN_PROFILE.forEach(function (position) {
            points.push({
                offset: middle + position * SHEEN_WIDTH / 4,
                weight: Math.pow(Math.cos(position * Math.PI / 2), 2)
            });
        });
        points.push({ offset: 1, weight: 0 });

        points.forEach(function (point, i) {
            var amount = point.weight * SHEEN_STRENGTH * presence;
            var mixed = color.map(function (channel, c) {
                return Math.round(channel + (SHEEN_COLOR[c] - channel) * amount);
            });
            stops[i].setAttribute("offset", Math.min(Math.max(point.offset, 0), 1));
            stops[i].setAttribute("stop-color", "rgb(" + mixed.join(",") + ")");
        });
    }
})();
