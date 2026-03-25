const COLORS = [
    '#00ff64', '#ff2d95', '#00e5ff', '#ffe600', '#ff8c00',
    '#b64dff', '#ff3333', '#2dd4bf', '#e879f9', '#38bdf8',
    '#facc15', '#4ade80', '#f97316', '#818cf8', '#a855f7',
];

const PROCESS_NAMES = [
    'chrome.exe', 'discord.exe', 'spotify.exe', 'vscode.exe',
    'steam.exe', 'explorer.exe', 'node.js', 'python.exe',
    'firefox.exe', 'slack.exe', 'git.exe', 'docker.exe',
    'minecraft.exe', 'zoom.exe', 'vlc.exe', 'blender.exe',
    'obs.exe', 'unity.exe', 'rust.exe', 'cargo.exe',
    'npm.exe', 'java.exe', 'mysql.exe', 'redis.exe',
];

const ALGO_INFO = {
    fcfs: {
        name: 'FCFS – First Come First Serve',
        desc: 'Processes execute in <b>arrival order</b>. Simple but can cause the convoy effect. Non-preemptive.',
    },
    sjf_non_preemptive: {
        name: 'SJF – Shortest Job First',
        desc: 'Picks the process with the <b>smallest burst time</b>. Optimal avg wait, but can starve long processes.',
    },
    srtf: {
        name: 'SRTF – Shortest Remaining Time',
        desc: 'Preemptive SJF. At each tick, the process with the <b>least remaining burst</b> runs. High context-switch cost.',
    },
    priority_non_preemptive: {
        name: 'Priority (Non-Preemptive)',
        desc: 'Runs the <b>highest priority</b> process (lowest number). Once started, runs to completion.',
    },
    priority_preemptive: {
        name: 'Priority (Preemptive)',
        desc: 'Like priority scheduling but a new arrival with <b>higher priority</b> can interrupt the running process.',
    },
    round_robin: {
        name: 'Round Robin',
        desc: 'Each process gets a fixed <b>time quantum</b>. Fair and responsive — ideal for time-sharing systems.',
    },
};

const ALGO_SHORT = {
    fcfs: 'FCFS',
    sjf_non_preemptive: 'SJF',
    srtf: 'SRTF',
    priority_non_preemptive: 'Priority(NP)',
    priority_preemptive: 'Priority(P)',
    round_robin: 'Round Robin',
};

let processes = [];
let pidCounter = 1;
let currentMode = 'single';
let liveSimTimer = null;
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
const speedSlider = $('speedSlider');
const speedLabel = $('speedLabel');
const cpuDot = $('cpuDot');
const cpuStatus = $('cpuStatus');

const modeSingle = $('modeSingle');
const modeBattle = $('modeBattle');
const singleAlgoWrap = $('singleAlgoWrap');
const battleAlgoWrap = $('battleAlgoWrap');
const battleSection = $('battleSection');
const battleWinner = $('battleWinner');

function isPriority() {
    if (currentMode === 'battle') {
        return $('battleAlgo1').value.includes('priority') ||
            $('battleAlgo2').value.includes('priority');
    }
    return algoSelect.value.includes('priority');
}

function needsQuantum() {
    if (currentMode === 'battle') {
        return $('battleAlgo1').value === 'round_robin' ||
            $('battleAlgo2').value === 'round_robin';
    }
    return algoSelect.value === 'round_robin';
}

function showToast(msg, type = 'success') {
    const toast = $('toast');
    toast.textContent = msg;
    toast.className = 'toast ' + type + ' show';
    setTimeout(() => { toast.className = 'toast hidden'; }, 2600);
}

function getRandomName() {
    return PROCESS_NAMES[Math.floor(Math.random() * PROCESS_NAMES.length)];
}

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function playBlip(freq = 440, duration = 0.06, type = 'square') {
    try {
        if (!audioCtx) audioCtx = new AudioCtx();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = 0.08;
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) { /* silent fail */ }
}

function playAddSound() { playBlip(600, 0.08); }
function playClearSound() { playBlip(200, 0.12, 'sawtooth'); }
function playSimStart() { playBlip(880, 0.1); setTimeout(() => playBlip(1100, 0.1), 120); }
function playWinSound() { playBlip(660, 0.1); setTimeout(() => playBlip(880, 0.1), 120); setTimeout(() => playBlip(1100, 0.15), 240); }

function setMode(mode) {
    currentMode = mode;
    modeSingle.classList.toggle('active', mode === 'single');
    modeBattle.classList.toggle('active', mode === 'battle');
    singleAlgoWrap.classList.toggle('hidden', mode === 'battle');
    battleAlgoWrap.classList.toggle('hidden', mode === 'single');

    if (mode === 'single') {
        battleSection.style.display = 'none';
        battleWinner.style.display = 'none';
        btnSimulate.innerHTML = '<span class="btn-icon">▶</span> START';
    } else {
        ganttSection.style.display = 'none';
        resultsSection.style.display = 'none';
        btnSimulate.innerHTML = '<span class="btn-icon">⚔</span> FIGHT!';
    }

    updateAlgoUI();
}

modeSingle.addEventListener('click', () => setMode('single'));
modeBattle.addEventListener('click', () => setMode('battle'));

function updateAlgoUI() {
    const key = currentMode === 'battle' ? $('battleAlgo1').value : algoSelect.value;
    const info = ALGO_INFO[key];
    if (info) {
        algoTooltip.innerHTML = `<strong>${info.name}</strong><br><br>${info.desc}`;
    }
    quantumWrap.classList.toggle('hidden', !needsQuantum());
    priorityGroup.classList.toggle('hidden', !isPriority());
    priorityNote.classList.toggle('hidden', !isPriority());
}

algoSelect.addEventListener('change', updateAlgoUI);
$('battleAlgo1').addEventListener('change', updateAlgoUI);
$('battleAlgo2').addEventListener('change', updateAlgoUI);
updateAlgoUI();

speedSlider.addEventListener('input', () => {
    speedLabel.textContent = speedSlider.value + 'x';
});
function addProcess(at, bt, priority) {
    const pid = 'P' + pidCounter++;
    const color = COLORS[(processes.length) % COLORS.length];
    const name = getRandomName();
    const proc = { pid, at, bt, color, name };
    if (priority !== undefined) proc.priority = priority;
    processes.push(proc);
    renderChips();
    playAddSound();
    showToast(`${pid} [${name}] LOADED`, 'success');
}

btnAdd.addEventListener('click', () => {
    const at = parseInt(inputAT.value) || 0;
    const bt = parseInt(inputBT.value) || 1;
    if (bt < 1) return showToast('BURST TIME MUST BE ≥ 1', 'error');
    const priority = isPriority() ? (parseInt(inputPriority.value) || 0) : undefined;
    addProcess(at, bt, priority);
    inputBT.value = '';
    inputBT.focus();
});

[inputAT, inputBT, inputPriority].forEach(el => {
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnAdd.click();
    });
});

btnRandom.addEventListener('click', () => {
    processes = [];
    pidCounter = 1;
    const count = Math.floor(Math.random() * 4) + 3;
    for (let i = 0; i < count; i++) {
        const at = Math.floor(Math.random() * 8);
        const bt = Math.floor(Math.random() * 8) + 1;
        const priority = Math.floor(Math.random() * 5) + 1;
        addProcess(at, bt, isPriority() ? priority : undefined);
    }
    showToast(`${count} RANDOM PROCESSES SPAWNED!`, 'success');
});

btnClear.addEventListener('click', () => {
    if (liveSimTimer) { clearInterval(liveSimTimer); liveSimTimer = null; }
    processes = [];
    pidCounter = 1;
    renderChips();
    ganttSection.style.display = 'none';
    resultsSection.style.display = 'none';
    battleSection.style.display = 'none';
    battleWinner.style.display = 'none';
    cpuDot.className = 'cpu-dot idle-dot';
    cpuStatus.textContent = 'IDLE';
    playClearSound();
    showToast('ALL PROCESSES TERMINATED', 'error');
});

function renderChips() {
    procCount.textContent = processes.length;
    processChips.innerHTML = '';
    processes.forEach((p, i) => {
        const chip = document.createElement('div');
        chip.className = 'process-chip';
        chip.style.borderColor = p.color + '66';
        chip.style.animationDelay = `${i * 0.04}s`;

        let label = `${p.pid} &nbsp; AT:${p.at} &nbsp; BT:${p.bt}`;
        if (p.priority !== undefined) label += ` &nbsp; PR:${p.priority}`;

        chip.innerHTML = `
            <span class="chip-color" style="background:${p.color}; color:${p.color};"></span>
            <span>${label}</span>
            <span class="chip-remove" data-idx="${i}">&times;</span>
        `;
        processChips.appendChild(chip);
    });

    processChips.querySelectorAll('.chip-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            processes.splice(idx, 1);
            renderChips();
        });
    });
}

btnSimulate.addEventListener('click', async () => {
    if (processes.length === 0) return showToast('LOAD AT LEAST ONE PROCESS!', 'error');

    playSimStart();

    if (currentMode === 'battle') {
        await runBattle();
    } else {
        await runSingle();
    }
});

async function runSingle() {
    btnSimulate.disabled = true;
    btnSimulate.innerHTML = '<span class="btn-icon">⏳</span> RUNNING…';

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

        await liveRenderGantt(data.timeline);
        renderResults(data.results, data);
        showToast('SIMULATION COMPLETE! ✨', 'success');
    } catch (err) {
        showToast(err.message || 'SIMULATION FAILED', 'error');
    } finally {
        btnSimulate.disabled = false;
        btnSimulate.innerHTML = '<span class="btn-icon">▶</span> START';
        cpuDot.className = 'cpu-dot idle-dot';
        cpuStatus.textContent = 'IDLE';
    }
}

// Live Gantt Rendering
function liveRenderGantt(timeline) {
    return new Promise((resolve) => {
        ganttSection.style.display = 'block';
        ganttContainer.innerHTML = '';
        ganttTimestamps.innerHTML = '';

        if (!timeline.length) { resolve(); return; }

        ganttSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const totalTime = timeline[timeline.length - 1].end;
        const colorMap = {};
        processes.forEach(p => { colorMap[p.pid] = p.color; });

        let segIndex = 0;

        function getDelay() {
            const speed = parseInt(speedSlider.value) || 5;
            return Math.max(50, 600 - (speed * 55));
        }

        cpuDot.className = 'cpu-dot';
        cpuStatus.textContent = 'PROCESSING…';

        if (liveSimTimer) clearInterval(liveSimTimer);

        liveSimTimer = setInterval(() => {
            if (segIndex >= timeline.length) {
                clearInterval(liveSimTimer);
                liveSimTimer = null;
                cpuDot.className = 'cpu-dot idle-dot';
                cpuStatus.textContent = 'DONE';

                renderTimestamps(timeline, totalTime);

                const allBars = ganttContainer.querySelectorAll('.gantt-bar');
                allBars.forEach(b => b.classList.remove('cpu-active'));

                resolve();
                return;
            }

            const seg = timeline[segIndex];

            const allBars = ganttContainer.querySelectorAll('.gantt-bar');
            allBars.forEach(b => b.classList.remove('cpu-active'));

            const bar = document.createElement('div');
            bar.className = 'gantt-bar cpu-active' + (seg.pid === 'Idle' ? ' idle' : '');
            const widthPct = ((seg.end - seg.start) / totalTime) * 100;
            bar.style.width = widthPct + '%';

            if (seg.pid !== 'Idle') {
                bar.style.background = colorMap[seg.pid] || '#00ff64';
                cpuStatus.textContent = seg.pid;
                playBlip(300 + segIndex * 40, 0.04);
            } else {
                cpuStatus.textContent = 'IDLE';
                cpuDot.className = 'cpu-dot idle-dot';
                setTimeout(() => { cpuDot.className = 'cpu-dot'; }, 200);
            }

            bar.textContent = seg.pid;
            bar.title = `${seg.pid}: ${seg.start} → ${seg.end}`;
            ganttContainer.appendChild(bar);

            segIndex++;
        }, getDelay());
    });
}

function renderTimestamps(timeline, totalTime) {
    const ganttTs = ganttTimestamps;
    ganttTs.innerHTML = '';
    const timestamps = new Set();
    timeline.forEach(seg => { timestamps.add(seg.start); timestamps.add(seg.end); });
    const sorted = [...timestamps].sort((a, b) => a - b);

    sorted.forEach((t, i) => {
        const ts = document.createElement('span');
        ts.className = 'gantt-ts';
        ts.textContent = t;
        if (i < sorted.length - 1) {
            const nextT = sorted[i + 1];
            ts.style.width = ((nextT - t) / totalTime) * 100 + '%';
        } else {
            ts.style.width = '0%';
        }
        ganttTs.appendChild(ts);
    });
}

function renderResults(results, data) {
    resultsSection.style.display = 'block';
    resultsBody.innerHTML = '';

    const colorMap = {};
    processes.forEach(p => { colorMap[p.pid] = p.color; });

    results.forEach((r, i) => {
        const tr = document.createElement('tr');
        tr.style.animationDelay = `${i * 0.07}s`;
        const color = colorMap[r.pid] || '#00ff64';
        tr.innerHTML = `
            <td>
                <div class="pid-cell">
                    <span class="pid-dot" style="background:${color}; color:${color};"></span>
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

    $('metricWT').textContent = data.avg_wt;
    $('metricTAT').textContent = data.avg_tat;
    $('metricCT').textContent = data.avg_ct;
    $('metricTP').textContent = data.throughput;
    $('metricCPU').textContent = data.cpu_utilization + '%';

    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


async function runBattle() {
    const algo1 = $('battleAlgo1').value;
    const algo2 = $('battleAlgo2').value;

    if (algo1 === algo2) {
        return showToast('SELECT TWO DIFFERENT ALGORITHMS!', 'error');
    }

    btnSimulate.disabled = true;
    btnSimulate.innerHTML = '<span class="btn-icon">⏳</span> FIGHTING…';

    const quantum = parseInt(quantumInput.value) || 2;
    const procData = processes.map(p => {
        const obj = { pid: p.pid, at: p.at, bt: p.bt };
        if (p.priority !== undefined) obj.priority = p.priority;
        return obj;
    });

    try {
        const res = await fetch('/api/compare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                algorithm1: algo1,
                algorithm2: algo2,
                quantum: quantum,
                processes: procData,
            }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        renderBattle(data, algo1, algo2);
        playWinSound();
        showToast('BATTLE COMPLETE! ⚔', 'success');
    } catch (err) {
        showToast(err.message || 'BATTLE FAILED', 'error');
    } finally {
        btnSimulate.disabled = false;
        btnSimulate.innerHTML = '<span class="btn-icon">⚔</span> FIGHT!';
    }
}

function renderBattle(data, algo1, algo2) {
    const r1 = data.result1;
    const r2 = data.result2;

    $('battleTitle1').textContent = ALGO_SHORT[algo1] || algo1;
    $('battleTitle2').textContent = ALGO_SHORT[algo2] || algo2;

    renderStaticGantt(r1.timeline, $('battleGantt1'), $('battleTs1'));
    renderStaticGantt(r2.timeline, $('battleGantt2'), $('battleTs2'));

    renderBattleMetrics(r1, r2, $('battleMetrics1'), $('battleMetrics2'));

    let p1Score = 0, p2Score = 0;
    if (r1.avg_wt < r2.avg_wt) p1Score++; else if (r2.avg_wt < r1.avg_wt) p2Score++;
    if (r1.avg_tat < r2.avg_tat) p1Score++; else if (r2.avg_tat < r1.avg_tat) p2Score++;
    if (r1.cpu_utilization > r2.cpu_utilization) p1Score++; else if (r2.cpu_utilization > r1.cpu_utilization) p2Score++;
    if (r1.throughput > r2.throughput) p1Score++; else if (r2.throughput > r1.throughput) p2Score++;

    battleWinner.style.display = 'block';
    if (p1Score > p2Score) {
        battleWinner.textContent = `🏆 ${ALGO_SHORT[algo1]} WINS! (${p1Score}-${p2Score})`;
        battleWinner.style.borderColor = 'var(--neon-pink)';
        battleWinner.style.color = 'var(--neon-pink)';
        battleWinner.style.textShadow = '0 0 10px rgba(255,45,149,0.4)';
    } else if (p2Score > p1Score) {
        battleWinner.textContent = `🏆 ${ALGO_SHORT[algo2]} WINS! (${p2Score}-${p1Score})`;
        battleWinner.style.borderColor = 'var(--neon-cyan)';
        battleWinner.style.color = 'var(--neon-cyan)';
        battleWinner.style.textShadow = '0 0 10px rgba(0,229,255,0.4)';
    } else {
        battleWinner.textContent = `🤝 IT\'S A TIE! (${p1Score}-${p2Score})`;
        battleWinner.style.borderColor = 'var(--neon-yellow)';
        battleWinner.style.color = 'var(--neon-yellow)';
        battleWinner.style.textShadow = '0 0 10px rgba(255,230,0,0.4)';
    }

    battleSection.style.display = 'grid';
    battleWinner.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderStaticGantt(timeline, container, tsContainer) {
    container.innerHTML = '';
    tsContainer.innerHTML = '';
    if (!timeline.length) return;

    const totalTime = timeline[timeline.length - 1].end;
    const colorMap = {};
    processes.forEach(p => { colorMap[p.pid] = p.color; });

    timeline.forEach((seg, i) => {
        const bar = document.createElement('div');
        bar.className = 'gantt-bar' + (seg.pid === 'Idle' ? ' idle' : '');
        const widthPct = ((seg.end - seg.start) / totalTime) * 100;
        bar.style.width = widthPct + '%';
        bar.style.animationDelay = `${i * 0.08}s`;
        if (seg.pid !== 'Idle') {
            bar.style.background = colorMap[seg.pid] || '#00ff64';
        }
        bar.textContent = seg.pid;
        bar.title = `${seg.pid}: ${seg.start} → ${seg.end}`;
        container.appendChild(bar);
    });

    renderTimestampsInto(timeline, totalTime, tsContainer);
}

function renderTimestampsInto(timeline, totalTime, container) {
    const timestamps = new Set();
    timeline.forEach(seg => { timestamps.add(seg.start); timestamps.add(seg.end); });
    const sorted = [...timestamps].sort((a, b) => a - b);
    sorted.forEach((t, i) => {
        const ts = document.createElement('span');
        ts.className = 'gantt-ts';
        ts.textContent = t;
        if (i < sorted.length - 1) {
            ts.style.width = ((sorted[i + 1] - t) / totalTime) * 100 + '%';
        } else {
            ts.style.width = '0%';
        }
        container.appendChild(ts);
    });
}

function renderBattleMetrics(r1, r2, container1, container2) {
    const metrics = [
        { label: 'Avg Waiting Time', key: 'avg_wt', lower: true },
        { label: 'Avg Turnaround', key: 'avg_tat', lower: true },
        { label: 'Avg Completion', key: 'avg_ct', lower: true },
        { label: 'Throughput', key: 'throughput', lower: false },
        { label: 'CPU Utilization', key: 'cpu_utilization', lower: false, suffix: '%' },
    ];

    let html1 = '<h2 class="panel-title" style="color: var(--neon-pink); text-shadow: 0 0 8px rgba(255,45,149,0.3);">STATS</h2>';
    let html2 = '<h2 class="panel-title" style="color: var(--neon-cyan); text-shadow: 0 0 8px rgba(0,229,255,0.3);">STATS</h2>';

    metrics.forEach(m => {
        const v1 = r1[m.key];
        const v2 = r2[m.key];
        const suffix = m.suffix || '';
        let w1 = false, w2 = false;
        if (m.lower) {
            if (v1 < v2) w1 = true;
            else if (v2 < v1) w2 = true;
        } else {
            if (v1 > v2) w1 = true;
            else if (v2 > v1) w2 = true;
        }

        html1 += `<div class="battle-metric-row">
            <span class="battle-metric-label">${m.label}</span>
            <span class="battle-metric-val ${w1 ? 'winner' : ''}">${v1}${suffix} ${w1 ? '★' : ''}</span>
        </div>`;
        html2 += `<div class="battle-metric-row">
            <span class="battle-metric-label">${m.label}</span>
            <span class="battle-metric-val ${w2 ? 'winner' : ''}">${v2}${suffix} ${w2 ? '★' : ''}</span>
        </div>`;
    });

    container1.innerHTML = html1;
    container2.innerHTML = html2;
}
