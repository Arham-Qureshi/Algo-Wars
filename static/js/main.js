/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   OS Scheduling Simulator — main.js
   Process management, API integration, rendering
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* ── Process colors palette ─────────────────────── */
const COLORS = [
    '#6c63ff', '#34d399', '#fbbf24', '#f472b6', '#22d3ee',
    '#fb923c', '#a78bfa', '#f87171', '#2dd4bf', '#e879f9',
    '#38bdf8', '#facc15', '#4ade80', '#f97316', '#818cf8',
];

/* ── Algorithm descriptions for info tooltip ────── */
const ALGO_INFO = {
    fcfs: {
        name: 'First Come First Serve (FCFS)',
        desc: 'Executes processes in the order they arrive. Simple and fair, but can cause the <b>convoy effect</b> where short processes wait behind long ones. Non-preemptive only.',
    },
    sjf_non_preemptive: {
        name: 'Shortest Job First (Non-Preemptive)',
        desc: 'Picks the process with the smallest burst time from the ready queue. Minimises average waiting time but may cause <b>starvation</b> for long processes. Once started, a process runs to completion.',
    },
    srtf: {
        name: 'Shortest Remaining Time First (Preemptive)',
        desc: 'Preemptive version of SJF. At every time unit, the process with the <b>least remaining</b> burst time is selected. Provides optimal average waiting time but has higher context-switch overhead.',
    },
    priority_non_preemptive: {
        name: 'Priority Scheduling (Non-Preemptive)',
        desc: 'Selects the process with the <b>highest priority</b> (lowest number). Once started, it runs to completion. Can cause starvation — solved with aging techniques.',
    },
    priority_preemptive: {
        name: 'Priority Scheduling (Preemptive)',
        desc: 'Same as priority scheduling but the running process can be <b>interrupted</b> if a newly arrived process has a higher priority. More responsive but adds context-switch cost.',
    },
    round_robin: {
        name: 'Round Robin (RR)',
        desc: 'Each process gets a fixed <b>time quantum</b>. After the quantum expires, the process is moved to the back of the ready queue. Fair and responsive — ideal for time-sharing systems.',
    },
};

/* ── State ──────────────────────────────────────── */
let processes = [];
let pidCounter = 1;

/* ── DOM refs ───────────────────────────────────── */
const $ = (id) => document.getElementById(id);

const algoSelect = $('algoSelect');
const algoTooltip = $('algoTooltip');
const quantumWrap = $('quantumWrap');
const quantumInput = $('quantumInput');
const priorityNote = $('priorityNote');
const priorityGroup = $('priorityGroup');
const inputAT = $('inputAT');
const inputBT = $('inputBT');
const inputPriority = $('inputPriority');
const processChips = $('processChips');
const procCount = $('procCount');
const btnAdd = $('btnAdd');
const btnClear = $('btnClear');
const btnSimulate = $('btnSimulate');
const btnRandom = $('btnRandom');
const ganttSection = $('ganttSection');
const ganttContainer = $('ganttContainer');
const ganttTimestamps = $('ganttTimestamps');
const resultsSection = $('resultsSection');
const resultsBody = $('resultsBody');

/* ── Init particles ─────────────────────────────── */
(function initParticles() {
    const container = $('particles');
    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.classList.add('particle');
        const size = Math.random() * 4 + 2;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (Math.random() * 15 + 10) + 's';
        p.style.animationDelay = (Math.random() * 10) + 's';
        container.appendChild(p);
    }
})();

/* ── Helpers ─────────────────────────────────────── */
function isPriority() {
    return algoSelect.value.includes('priority');
}

function isRR() {
    return algoSelect.value === 'round_robin';
}

function showToast(msg, type = 'success') {
    const toast = $('toast');
    toast.textContent = msg;
    toast.className = 'toast ' + type + ' show';
    setTimeout(() => { toast.className = 'toast hidden'; }, 2600);
}

/* ── Algorithm selector change ──────────────────── */
function updateAlgoUI() {
    const key = algoSelect.value;
    const info = ALGO_INFO[key];

    // Update tooltip
    algoTooltip.innerHTML = `<strong>${info.name}</strong><br><br>${info.desc}`;

    // Show/hide quantum
    quantumWrap.classList.toggle('hidden', !isRR());

    // Show/hide priority input & note
    priorityGroup.classList.toggle('hidden', !isPriority());
    priorityNote.classList.toggle('hidden', !isPriority());
}

algoSelect.addEventListener('change', updateAlgoUI);
updateAlgoUI();

/* ── Add process ────────────────────────────────── */
function addProcess(at, bt, priority) {
    const pid = 'P' + pidCounter++;
    const color = COLORS[(processes.length) % COLORS.length];
    const proc = { pid, at, bt, color };
    if (priority !== undefined) proc.priority = priority;
    processes.push(proc);
    renderChips();
    showToast(`${pid} added`, 'success');
}

btnAdd.addEventListener('click', () => {
    const at = parseInt(inputAT.value) || 0;
    const bt = parseInt(inputBT.value) || 1;
    if (bt < 1) return showToast('Burst time must be ≥ 1', 'error');
    const priority = isPriority() ? (parseInt(inputPriority.value) || 0) : undefined;
    addProcess(at, bt, priority);
    inputBT.value = '';
    inputBT.focus();
});

/* ── Enter key support ──────────────────────────── */
[inputAT, inputBT, inputPriority].forEach(el => {
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnAdd.click();
    });
});

/* ── Random processes ───────────────────────────── */
btnRandom.addEventListener('click', () => {
    processes = [];
    pidCounter = 1;
    const count = Math.floor(Math.random() * 4) + 3; // 3-6
    for (let i = 0; i < count; i++) {
        const at = Math.floor(Math.random() * 8);
        const bt = Math.floor(Math.random() * 8) + 1;
        const priority = Math.floor(Math.random() * 5) + 1;
        addProcess(at, bt, isPriority() ? priority : undefined);
    }
    showToast(`Generated ${count} random processes!`, 'success');
});

/* ── Clear ──────────────────────────────────────── */
btnClear.addEventListener('click', () => {
    processes = [];
    pidCounter = 1;
    renderChips();
    ganttSection.style.display = 'none';
    resultsSection.style.display = 'none';
    showToast('All processes cleared', 'error');
});

/* ── Render process chips ───────────────────────── */
function renderChips() {
    procCount.textContent = processes.length;
    processChips.innerHTML = '';
    processes.forEach((p, i) => {
        const chip = document.createElement('div');
        chip.className = 'process-chip';
        chip.style.background = `${p.color}22`;
        chip.style.border = `1px solid ${p.color}44`;
        chip.style.animationDelay = `${i * 0.05}s`;

        let label = `${p.pid} &nbsp; AT:${p.at} &nbsp; BT:${p.bt}`;
        if (p.priority !== undefined) label += ` &nbsp; PR:${p.priority}`;

        chip.innerHTML = `
            <span class="chip-color" style="background:${p.color}"></span>
            <span>${label}</span>
            <span class="chip-remove" data-idx="${i}">&times;</span>
        `;
        processChips.appendChild(chip);
    });

    // Remove handler
    processChips.querySelectorAll('.chip-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            processes.splice(idx, 1);
            renderChips();
        });
    });
}

/* ── Simulate ───────────────────────────────────── */
btnSimulate.addEventListener('click', async () => {
    if (processes.length === 0) return showToast('Add at least one process!', 'error');

    btnSimulate.disabled = true;
    btnSimulate.innerHTML = '<span class="btn-icon">⏳</span> Simulating…';

    const payload = {
        algorithm: algoSelect.value,
        quantum: parseInt(quantumInput.value) || 2,
        processes: processes.map(p => {
            const obj = { pid: p.pid, at: p.at, bt: p.bt };
            if (p.priority !== undefined) obj.priority = p.priority;
            return obj;
        }),
    };

    try {
        const res = await fetch('/api/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        renderGantt(data.timeline);
        renderResults(data.results, data);
        showToast('Simulation complete! ✨', 'success');
    } catch (err) {
        showToast(err.message || 'Simulation failed', 'error');
    } finally {
        btnSimulate.disabled = false;
        btnSimulate.innerHTML = '<span class="btn-icon">▶</span> Simulate';
    }
});

/* ── Render Gantt chart ─────────────────────────── */
function renderGantt(timeline) {
    ganttSection.style.display = 'block';
    ganttContainer.innerHTML = '';
    ganttTimestamps.innerHTML = '';

    if (!timeline.length) return;

    const totalTime = timeline[timeline.length - 1].end;
    const colorMap = {};
    processes.forEach(p => { colorMap[p.pid] = p.color; });

    // Render bars with staggered animation
    timeline.forEach((seg, i) => {
        const bar = document.createElement('div');
        bar.className = 'gantt-bar' + (seg.pid === 'Idle' ? ' idle' : '');
        const widthPct = ((seg.end - seg.start) / totalTime) * 100;
        bar.style.width = widthPct + '%';
        bar.style.animationDelay = `${i * 0.12}s`;

        if (seg.pid !== 'Idle') {
            bar.style.background = colorMap[seg.pid] || '#6c63ff';
        }

        bar.textContent = seg.pid;
        bar.title = `${seg.pid}: ${seg.start} → ${seg.end}`;
        ganttContainer.appendChild(bar);
    });

    // Timestamps
    const timestamps = new Set();
    timeline.forEach(seg => { timestamps.add(seg.start); timestamps.add(seg.end); });
    const sorted = [...timestamps].sort((a, b) => a - b);

    sorted.forEach((t, i) => {
        const ts = document.createElement('span');
        ts.className = 'gantt-ts';
        ts.textContent = t;

        if (i < sorted.length - 1) {
            const nextT = sorted[i + 1];
            const widthPct = ((nextT - t) / totalTime) * 100;
            ts.style.width = widthPct + '%';
        } else {
            ts.style.width = '0%';
        }

        ganttTimestamps.appendChild(ts);
    });

    // Smooth scroll into view
    ganttSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ── Render results table + metrics ─────────────── */
function renderResults(results, data) {
    resultsSection.style.display = 'block';
    resultsBody.innerHTML = '';

    const colorMap = {};
    processes.forEach(p => { colorMap[p.pid] = p.color; });

    results.forEach((r, i) => {
        const tr = document.createElement('tr');
        tr.style.animationDelay = `${i * 0.07}s`;
        const color = colorMap[r.pid] || '#6c63ff';
        tr.innerHTML = `
            <td>
                <div class="pid-cell">
                    <span class="pid-dot" style="background:${color}"></span>
                    ${r.pid}
                </div>
            </td>
            <td>${r.at}</td>
            <td>${r.bt}</td>
            <td>${r.ct}</td>
            <td>${r.tat}</td>
            <td>${r.wt}</td>
        `;
        resultsBody.appendChild(tr);
    });

    // Metrics
    $('metricWT').textContent = data.avg_wt;
    $('metricTAT').textContent = data.avg_tat;
    $('metricCT').textContent = data.avg_ct;
    $('metricTP').textContent = data.throughput;
    $('metricCPU').textContent = data.cpu_utilization + '%';
}
