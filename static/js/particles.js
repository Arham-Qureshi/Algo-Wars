(function () {
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

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const mouse = { x: -999, y: -999 };
    window.addEventListener('mousemove', e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    // OS related symbols just for fun
    const SYMBOLS = [
        '👾', '🎮', '🕹', '💀', '⭐', '🚀', '💾', '🔥',
        '♠', '♣', '♥', '♦', '●', '■', '▲', '★',
        'CPU', 'RAM', 'SYS', 'I/O', 'IPS', 'RUN',
        '>>>', '...', '|||',
    ];

    const PALETTE = [
        'rgba(0,255,100,',
        'rgba(255,45,149,',
        'rgba(0,229,255,',
        'rgba(255,230,0,',
        'rgba(255,140,0,',
        'rgba(182,77,255,',
    ];

    class Particle {
        constructor() { this.reset(true); }

        reset(init = false) {
            this.x = Math.random() * canvas.width;
            this.y = init ? Math.random() * canvas.height : canvas.height + 40;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = -(Math.random() * 0.35 + 0.1);
            this.label = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            this.isEmoji = /\p{Emoji}/u.test(this.label);
            this.size = this.isEmoji
                ? Math.random() * 12 + 10
                : Math.random() * 8 + 7;
            this.colorBase = PALETTE[Math.floor(Math.random() * PALETTE.length)];
            this.alpha = Math.random() * 0.25 + 0.1;
            this.targetAlpha = this.alpha;
            this.rot = 0; // no rotation for pixel feel
            this.attracted = false;
        }

        update() {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 140) {
                this.attracted = true;
                if (dist < 40) {
                    this.vx -= (dx / dist) * 0.1;
                    this.vy -= (dy / dist) * 0.1;
                } else {
                    this.vx += (dx / dist) * 0.025;
                    this.vy += (dy / dist) * 0.025;
                }
                this.targetAlpha = 0.6;
            } else {
                this.attracted = false;
                this.targetAlpha = this.alpha;
            }

            this.vx *= 0.96;
            this.vy *= 0.96;
            if (!this.attracted) this.vy -= 0.006;

            this.x += this.vx;
            this.y += this.vy;

            this._alpha = this._alpha === undefined ? this.alpha : this._alpha;
            this._alpha += (this.targetAlpha - this._alpha) * 0.08;

            if (this.x < -40) this.x = canvas.width + 40;
            if (this.x > canvas.width + 40) this.x = -40;
            if (this.y < -60) this.reset();
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.globalAlpha = this._alpha || this.alpha;

            if (this.isEmoji) {
                ctx.font = `${this.size}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(this.label, 0, 0);
            } else {
                const pad = 4;
                ctx.font = `bold ${this.size}px 'Share Tech Mono', monospace`;
                const w = ctx.measureText(this.label).width;
                const h = this.size + pad * 2;

                // Pixel-style box
                ctx.fillStyle = this.colorBase + '0.08)';
                ctx.fillRect(-w / 2 - pad, -h / 2, w + pad * 2, h);
                ctx.strokeStyle = this.colorBase + '0.25)';
                ctx.lineWidth = 1;
                ctx.strokeRect(-w / 2 - pad, -h / 2, w + pad * 2, h);

                ctx.fillStyle = this.colorBase + '0.7)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(this.label, 0, 0);
            }
            ctx.restore();
        }
    }

    // Grid lines
    function drawGrid() {
        ctx.strokeStyle = 'rgba(0,255,100,0.025)';
        ctx.lineWidth = 1;
        const step = 60;
        for (let x = 0; x < canvas.width; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }

    // Connection lines
    function drawConnections(syms) {
        const LINK_DIST = 90;
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
                const alpha = (1 - d / LINK_DIST) * 0.25;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = `rgba(0,255,100,${alpha})`;
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
        }
    }

    const COUNT = 45;
    const particles = Array.from({ length: COUNT }, () => new Particle());

    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        drawConnections(particles);
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(loop);
    }
    loop();
})();
