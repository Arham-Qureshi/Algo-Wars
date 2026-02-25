/**
 * particles.js — OS-themed interactive background
 * Floating CPU / process / memory symbols that chase the cursor.
 * Completely self-contained, no dependencies.
 */
(function () {
    /* ── Canvas setup ─────────────────────────────── */
    const canvas = document.createElement('canvas');
    canvas.id = 'bg-canvas';
    Object.assign(canvas.style, {
        position: 'fixed',
        top: '0', left: '0',
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: '0',
    });
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');

    /* ── Resize ───────────────────────────────────── */
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    /* ── Cursor tracking ──────────────────────────── */
    const mouse = { x: -999, y: -999 };
    window.addEventListener('mousemove', e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    /* ── OS symbol set ────────────────────────────── */
    const OS_SYMBOLS = [
        '⚙', '💾', '🖥', '📊', '🔄', '⚡', '📦', '🔒', '🖧', '💡',
        'CPU', 'I/O', 'PCB', 'RAM', 'OS', 'SYS', 'IRQ',
        '▶▶', '⏸', '↺', '⟳',
    ];

    /* ── Colour palette (no dark-blue — panels own that) ── */
    const PALETTE = [
        'rgba(108,99,255,', // purple accent
        'rgba(52,211,153,', // green
        'rgba(34,211,238,', // cyan
        'rgba(251,191,36,', // yellow
        'rgba(244,114,182,', // pink
        'rgba(251,146,60,', // orange
        'rgba(167,139,250,', // violet
    ];

    /* ── Particle class ───────────────────────────── */
    class Sym {
        constructor() { this.reset(true); }

        reset(init = false) {
            this.x = Math.random() * canvas.width;
            this.y = init ? Math.random() * canvas.height : canvas.height + 40;
            this.vx = (Math.random() - 0.5) * 0.6;
            this.vy = -(Math.random() * 0.4 + 0.15);
            this.label = OS_SYMBOLS[Math.floor(Math.random() * OS_SYMBOLS.length)];
            this.isEmoji = /\p{Emoji}/u.test(this.label);
            this.size = this.isEmoji
                ? Math.random() * 14 + 12          // 12-26 px emoji
                : Math.random() * 9 + 8;          // 8-17 px text
            this.colorBase = PALETTE[Math.floor(Math.random() * PALETTE.length)];
            this.alpha = Math.random() * 0.35 + 0.2;
            this.targetAlpha = this.alpha;
            this.rotSpeed = (Math.random() - 0.5) * 0.012;
            this.rot = Math.random() * Math.PI * 2;
            this.attracted = false;
        }

        update() {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const ATTRACT_RADIUS = 160;
            const ATTRACT_FORCE = 0.028;
            const REPEL_RADIUS = 48;

            if (dist < ATTRACT_RADIUS) {
                this.attracted = true;
                if (dist < REPEL_RADIUS) {
                    // Gentle repel when very close
                    this.vx -= (dx / dist) * 0.12;
                    this.vy -= (dy / dist) * 0.12;
                } else {
                    // Attract
                    this.vx += (dx / dist) * ATTRACT_FORCE;
                    this.vy += (dy / dist) * ATTRACT_FORCE;
                }
                this.targetAlpha = 0.75;
            } else {
                this.attracted = false;
                this.targetAlpha = this.alpha;
            }

            // Friction
            this.vx *= 0.96;
            this.vy *= 0.96;

            // Drift upward when not attracted
            if (!this.attracted) this.vy -= 0.008;

            this.x += this.vx;
            this.y += this.vy;
            this.rot += this.rotSpeed;

            // Alpha lerp
            this._alpha = this._alpha === undefined ? this.alpha : this._alpha;
            this._alpha += (this.targetAlpha - this._alpha) * 0.08;

            // Wrap horizontally
            if (this.x < -40) this.x = canvas.width + 40;
            if (this.x > canvas.width + 40) this.x = -40;

            // Reset when floats off top
            if (this.y < -60) this.reset();
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rot);
            ctx.globalAlpha = this._alpha || this.alpha;

            if (this.isEmoji) {
                /* Emoji symbol — draw normally */
                ctx.font = `${this.size}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(this.label, 0, 0);
            } else {
                /* Text label in a pill */
                const pad = 5;
                ctx.font = `600 ${this.size}px 'JetBrains Mono', monospace`;
                const w = ctx.measureText(this.label).width;
                const h = this.size + pad * 2;
                const rx = w / 2 + pad;
                const ry = h / 2;

                // Pill background
                ctx.beginPath();
                ctx.ellipse(0, 0, rx + pad, ry, 0, 0, Math.PI * 2);
                ctx.fillStyle = this.colorBase + '0.12)';
                ctx.fill();
                ctx.strokeStyle = this.colorBase + '0.35)';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Text
                ctx.fillStyle = this.colorBase + '0.9)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(this.label, 0, 0);
            }

            ctx.restore();
        }
    }

    /* ── Connection lines around cursor ──────────── */
    function drawConnections(syms) {
        const LINK_DIST = 100;
        for (let i = 0; i < syms.length; i++) {
            const a = syms[i];
            if (!a.attracted) continue;
            for (let j = i + 1; j < syms.length; j++) {
                const b = syms[j];
                if (!b.attracted) continue;
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d > LINK_DIST) continue;
                const alpha = (1 - d / LINK_DIST) * 0.3;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = `rgba(108,99,255,${alpha})`;
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
        }
    }

    /* ── Build pool ───────────────────────────────── */
    const COUNT = 55;
    const syms = Array.from({ length: COUNT }, () => new Sym());

    /* ── Animation loop ───────────────────────────── */
    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawConnections(syms);
        syms.forEach(s => { s.update(); s.draw(); });
        requestAnimationFrame(loop);
    }
    loop();
})();
