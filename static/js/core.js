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
    mlq: {
        name: 'MLQ – Multilevel Queue',
        desc: 'Processes are assigned to one of <b>3 fixed queues</b> based on type. ' +
            '<b>Q1 System</b> (RR q=2), <b>Q2 Interactive</b> (RR q=4), <b>Q3 Batch</b> (FCFS). ' +
            'Higher queues always preempt lower ones — mimicking modern OS design.',
    },
};

const ALGO_SHORT = {
    fcfs: 'FCFS',
    sjf_non_preemptive: 'SJF',
    srtf: 'SRTF',
    priority_non_preemptive: 'Priority(NP)',
    priority_preemptive: 'Priority(P)',
    round_robin: 'Round Robin',
    mlq: 'MLQ',
};

const QUEUE_NAMES = { 1: 'System', 2: 'Interactive', 3: 'Batch' };
const QUEUE_COLORS = { 1: '#ff2d95', 2: '#00e5ff', 3: '#ffe600' };

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
const queueTypeGroup = $('queueTypeGroup');
const inputAT = $('inputAT');
const inputBT = $('inputBT');
const inputPriority = $('inputPriority');
const inputQueueType = $('inputQueueType');
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
const modeAdvanced = $('modeAdvanced');
const singleAlgoWrap = $('singleAlgoWrap');
const battleAlgoWrap = $('battleAlgoWrap');
const advancedAlgoWrap = $('advancedAlgoWrap');
const battleSection = $('battleSection');
const battleWinner = $('battleWinner');

function isAdvancedMode() {
    return currentMode === 'advanced';
}

function getActiveAlgo() {
    if (currentMode === 'advanced') return $('advancedAlgoSelect').value;
    if (currentMode === 'battle') return $('battleAlgo1').value;
    return algoSelect.value;
}

function isPriority() {
    if (currentMode === 'advanced') return false;
    if (currentMode === 'battle') {
        return $('battleAlgo1').value.includes('priority') ||
            $('battleAlgo2').value.includes('priority');
    }
    return algoSelect.value.includes('priority');
}

function needsQuantum() {
    if (currentMode === 'advanced') return false;
    if (currentMode === 'battle') {
        return $('battleAlgo1').value === 'round_robin' ||
            $('battleAlgo2').value === 'round_robin';
    }
    return algoSelect.value === 'round_robin';
}

function needsQueueType() {
    return currentMode === 'advanced' && $('advancedAlgoSelect').value === 'mlq';
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
    modeAdvanced.classList.toggle('active', mode === 'advanced');
    singleAlgoWrap.classList.toggle('hidden', mode !== 'single');
    battleAlgoWrap.classList.toggle('hidden', mode !== 'battle');
    advancedAlgoWrap.classList.toggle('hidden', mode !== 'advanced');

    if (mode === 'single') {
        battleSection.style.display = 'none';
        battleWinner.style.display = 'none';
        btnSimulate.innerHTML = '<span class="btn-icon">▶</span> START';
    } else if (mode === 'battle') {
        ganttSection.style.display = 'none';
        resultsSection.style.display = 'none';
        btnSimulate.innerHTML = '<span class="btn-icon">⚔</span> FIGHT!';
    } else {
        battleSection.style.display = 'none';
        battleWinner.style.display = 'none';
        btnSimulate.innerHTML = '<span class="btn-icon">🧠</span> SIMULATE';
    }

    updateAlgoUI();
}

modeSingle.addEventListener('click', () => setMode('single'));
modeBattle.addEventListener('click', () => setMode('battle'));
modeAdvanced.addEventListener('click', () => setMode('advanced'));

function updateAlgoUI() {
    const key = getActiveAlgo();
    const info = ALGO_INFO[key];
    if (info) {
        algoTooltip.innerHTML = `<strong>${info.name}</strong><br><br>${info.desc}`;
    }
    quantumWrap.classList.toggle('hidden', !needsQuantum());
    priorityGroup.classList.toggle('hidden', !isPriority());
    priorityNote.classList.toggle('hidden', !isPriority());
    queueTypeGroup.classList.toggle('hidden', !needsQueueType());
}

algoSelect.addEventListener('change', updateAlgoUI);
$('battleAlgo1').addEventListener('change', updateAlgoUI);
$('battleAlgo2').addEventListener('change', updateAlgoUI);
$('advancedAlgoSelect').addEventListener('change', updateAlgoUI);
updateAlgoUI();

speedSlider.addEventListener('input', () => {
    speedLabel.textContent = speedSlider.value + 'x';
});
function addProcess(at, bt, priority, queueId) {
    const pid = 'P' + pidCounter++;
    const color = COLORS[(processes.length) % COLORS.length];
    const name = getRandomName();
    const proc = { pid, at, bt, color, name };
    if (priority !== undefined) proc.priority = priority;
    if (queueId !== undefined) proc.queue_id = queueId;
    processes.push(proc);
    renderChips();
    playAddSound();

    let label = `${pid} [${name}] LOADED`;
    if (queueId !== undefined) label += ` → Q${queueId} ${QUEUE_NAMES[queueId]}`;
    showToast(label, 'success');
}

btnAdd.addEventListener('click', () => {
    const at = parseInt(inputAT.value) || 0;
    const bt = parseInt(inputBT.value) || 1;
    if (bt < 1) return showToast('BURST TIME MUST BE ≥ 1', 'error');
    const priority = isPriority() ? (parseInt(inputPriority.value) || 0) : undefined;
    const queueId = needsQueueType() ? parseInt(inputQueueType.value) : undefined;
    addProcess(at, bt, priority, queueId);
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
        const queueId = needsQueueType() ? (Math.floor(Math.random() * 3) + 1) : undefined;
        addProcess(at, bt, isPriority() ? priority : undefined, queueId);
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
    // Clean up MLQ animation section
    const mlqAnim = $('mlqAnimSection');
    if (mlqAnim) mlqAnim.remove();
    const qbSection = $('queueBreakdownSection');
    if (qbSection) qbSection.remove();
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
        if (p.queue_id !== undefined) label += ` &nbsp; Q${p.queue_id}`;

        let queueBadge = '';
        if (p.queue_id !== undefined) {
            const qColor = QUEUE_COLORS[p.queue_id] || '#fff';
            queueBadge = `<span class="chip-queue-badge" style="background:${qColor}20; color:${qColor}; border: 1px solid ${qColor}40;">${QUEUE_NAMES[p.queue_id]}</span>`;
        }

        chip.innerHTML = `
            <span class="chip-color" style="background:${p.color}; color:${p.color};"></span>
            <span>${label}</span>
            ${queueBadge}
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
    } else if (currentMode === 'advanced') {
        await runAdvanced();
    } else {
        await runSingle();
    }
});
