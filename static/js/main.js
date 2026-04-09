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

async function runAdvanced() {
    btnSimulate.disabled = true;
    btnSimulate.innerHTML = '<span class="btn-icon">⏳</span> RUNNING…';

    const algo = $('advancedAlgoSelect').value;
    const payload = {
        algorithm: algo,
        quantum: 2,
        processes: processes.map(p => {
            const obj = { pid: p.pid, at: p.at, bt: p.bt };
            if (p.queue_id !== undefined) obj.queue_id = p.queue_id;
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

        // Hide the standard gantt section, use the MLQ animation instead
        ganttSection.style.display = 'none';

        await renderMLQAnimation(data.timeline, data, processes);
        renderResults(data.results, data, true);

        if (data.queue_breakdown) {
            renderQueueBreakdown(data.queue_breakdown);
        }

        showToast('MLQ SIMULATION COMPLETE! 🧠', 'success');
    } catch (err) {
        showToast(err.message || 'SIMULATION FAILED', 'error');
    } finally {
        btnSimulate.disabled = false;
        btnSimulate.innerHTML = '<span class="btn-icon">🧠</span> SIMULATE';
        cpuDot.className = 'cpu-dot idle-dot';
        cpuStatus.textContent = 'IDLE';
    }
}
function renderMLQAnimation(timeline, data, procs) {
    return new Promise((resolve) => {
        const section = $('mlqAnimSection');
        if (!section) { resolve(); return; }

        section.style.display = 'block';
        section.scrollIntoView({ behavior: 'smooth', block: 'center' });

        $('mlqPoolProcesses').innerHTML = '';
        $('mlqSlots1').innerHTML = '';
        $('mlqSlots2').innerHTML = '';
        $('mlqSlots3').innerHTML = '';
        $('mlqCompletedList').innerHTML = '';
        $('mlqEventLog').innerHTML = '';
        $('mlqTimeValue').textContent = '0';
        $('mlqTimeFill').style.width = '0%';
        $('mlqCpuCore').innerHTML = '<span class="mlq-cpu-idle-text">IDLE</span>';
        $('mlqCpuCore').className = 'mlq-cpu-core';
        $('mlqCpuTimer').textContent = '';
        [1, 2, 3].forEach(q => $('mlqQueueRow' + q).classList.remove('mlq-queue-active'));

        const mlqSpeedSlider = $('mlqSpeedSlider');
        const mlqSpeedLabel = $('mlqSpeedLabel');

        mlqSpeedSlider.oninput = () => {
            mlqSpeedLabel.textContent = mlqSpeedSlider.value + 'x';
        };
        const colorMap = {};
        procs.forEach(p => { colorMap[p.pid] = p.color; });

        const totalTime = timeline.length > 0 ? timeline[timeline.length - 1].end : 0;
        const events = buildMLQEvents(timeline, procs, data.results);
        let eventIdx = 0;
        const mlqCpuDot = $('mlqCpuDot');
        const mlqCpuStatus = $('mlqCpuStatus');
        const poolProcesses = $('mlqPoolProcesses');
        const completedList = $('mlqCompletedList');
        const cpuCore = $('mlqCpuCore');
        const cpuTimer = $('mlqCpuTimer');
        const timeValue = $('mlqTimeValue');
        const timeFill = $('mlqTimeFill');
        const eventLog = $('mlqEventLog');
        const allPids = new Set(procs.map(p => p.pid));
        const arrivedSet = new Set();
        const inQueueSet = new Set();
        const completedSet = new Set();
        const queueContents = { 1: [], 2: [], 3: [] };
        let currentCpuPid = null;
        let lastCpuPid = null;

        procs.forEach(p => {
            const chip = document.createElement('div');
            chip.className = 'mlq-pool-chip';
            chip.id = 'mlq-pool-' + p.pid;
            const qId = p.queue_id || 3;
            const qColor = QUEUE_COLORS[qId] || '#fff';
            chip.style.borderColor = qColor + '60';
            chip.style.color = qColor;
            chip.innerHTML = `<span class="mlq-pool-dot" style="background:${colorMap[p.pid] || '#00ff64'};"></span>
                              <span>${p.pid}</span>
                              <span class="mlq-pool-at">AT:${p.at}</span>`;
            poolProcesses.appendChild(chip);
        });

        mlqCpuDot.className = 'cpu-dot';
        mlqCpuStatus.textContent = 'PROCESSING…';

        function getDelay() {
            const speed = parseInt(mlqSpeedSlider.value) || 4;
            return Math.max(80, 900 - (speed * 85));
        }

        const animTimer = setInterval(() => {
            if (eventIdx >= events.length) {
                clearInterval(animTimer);
                mlqCpuDot.className = 'cpu-dot idle-dot';
                mlqCpuStatus.textContent = 'DONE';
                cpuCore.innerHTML = '<span class="mlq-cpu-idle-text">DONE ✓</span>';
                cpuCore.className = 'mlq-cpu-core mlq-cpu-done';
                cpuTimer.textContent = '';
                addEventLogEntry(eventLog, '🏁 All processes completed!', '#00ff64');
                resolve();
                return;
            }

            const evt = events[eventIdx];

            timeValue.textContent = evt.time;
            const pct = totalTime > 0 ? (evt.time / totalTime) * 100 : 0;
            timeFill.style.width = pct + '%';

            if (evt.arrivals && evt.arrivals.length) {
                evt.arrivals.forEach(pid => {
                    const proc = procs.find(p => p.pid === pid);
                    if (!proc) return;
                    const qId = proc.queue_id || 3;
                    const poolChip = $('mlq-pool-' + pid);
                    if (poolChip) {
                        poolChip.classList.add('mlq-pool-chip-arrived');
                    }

                    addToQueueVisual(pid, qId, colorMap[pid]);
                    queueContents[qId].push(pid);
                    arrivedSet.add(pid);
                    inQueueSet.add(pid);

                    addEventLogEntry(eventLog, `📥 ${pid} → Q${qId} ${QUEUE_NAMES[qId]}`, QUEUE_COLORS[qId]);
                    playBlip(500, 0.04);
                });
            }
            if (evt.cpuPid !== currentCpuPid) {
                lastCpuPid = currentCpuPid;

                if (lastCpuPid && lastCpuPid !== 'Idle' && !evt.completed?.includes(lastCpuPid)) {
                    addEventLogEntry(eventLog, `🔄 Context Switch: ${lastCpuPid} → ${evt.cpuPid || 'Idle'}`, '#b64dff');
                    cpuCore.classList.add('mlq-cpu-switch');
                    setTimeout(() => cpuCore.classList.remove('mlq-cpu-switch'), 300);
                    playBlip(250, 0.06, 'sawtooth');
                }

                currentCpuPid = evt.cpuPid;

                if (currentCpuPid && currentCpuPid !== 'Idle') {
                    const proc = procs.find(p => p.pid === currentCpuPid);
                    const qId = proc ? (proc.queue_id || 3) : 3;
                    const qColor = QUEUE_COLORS[qId] || '#fff';
                    cpuCore.innerHTML = `<div class="mlq-cpu-proc" style="background:${qColor}; color:#0a0a0c;">
                        <span class="mlq-cpu-proc-pid">${currentCpuPid}</span>
                        <span class="mlq-cpu-proc-q">Q${qId}</span>
                    </div>`;
                    cpuCore.className = 'mlq-cpu-core mlq-cpu-active';
                    cpuCore.style.borderColor = qColor;
                    cpuCore.style.boxShadow = `0 0 20px ${qColor}40, inset 0 0 15px ${qColor}15`;
                    [1, 2, 3].forEach(q => {
                        const row = $('mlqQueueRow' + q);
                        row.classList.toggle('mlq-queue-active', q === qId);
                    });
                    removeFromQueueVisual(currentCpuPid, qId);

                    mlqCpuDot.className = 'cpu-dot';
                    mlqCpuStatus.textContent = currentCpuPid + ` [Q${qId}]`;
                } else {
                    cpuCore.innerHTML = '<span class="mlq-cpu-idle-text">IDLE</span>';
                    cpuCore.className = 'mlq-cpu-core';
                    cpuCore.style.borderColor = '';
                    cpuCore.style.boxShadow = '';
                    [1, 2, 3].forEach(q => $('mlqQueueRow' + q).classList.remove('mlq-queue-active'));
                    mlqCpuDot.className = 'cpu-dot idle-dot';
                    mlqCpuStatus.textContent = 'IDLE';
                }
            }
            if (currentCpuPid && currentCpuPid !== 'Idle') {
                cpuTimer.textContent = `T=${evt.time}`;
            } else {
                cpuTimer.textContent = '';
            }
            if (evt.completed && evt.completed.length) {
                evt.completed.forEach(pid => {
                    completedSet.add(pid);
                    inQueueSet.delete(pid);
                    const proc = procs.find(p => p.pid === pid);
                    const qId = proc ? (proc.queue_id || 3) : 3;
                    const qColor = QUEUE_COLORS[qId] || '#fff';

                    removeFromQueueVisual(pid, qId);

                    const chip = document.createElement('div');
                    chip.className = 'mlq-completed-chip';
                    chip.style.borderColor = qColor + '60';
                    chip.innerHTML = `<span class="mlq-pool-dot" style="background:${colorMap[pid]};"></span>
                                      <span style="color:${qColor};">${pid}</span>
                                      <span class="mlq-completed-badge" style="background:${qColor}20; color:${qColor};">Q${qId}</span>`;
                    completedList.appendChild(chip);

                    addToQueueVisual(pid, qId, colorMap[pid], true);

                    const ctTime = evt.completionTimes ? evt.completionTimes[pid] : evt.time;
                    addEventLogEntry(eventLog, `✅ ${pid} completed at T=${ctTime}`, '#00ff64');
                    playBlip(880, 0.06);
                });
            }
            if (evt.requeued && evt.requeued.length) {
                evt.requeued.forEach(item => {
                    addToQueueVisual(item.pid, item.qId, colorMap[item.pid], false);
                    addEventLogEntry(eventLog, `↩ ${item.pid} back to Q${item.qId}`, QUEUE_COLORS[item.qId]);
                });
            }

            eventIdx++;
        }, getDelay());
    });
}

function addToQueueVisual(pid, qId, color, isCompleted = false) {
    const slots = $('mlqSlots' + qId);
    if (!slots) return;
    // Don't add duplicate
    if (slots.querySelector(`[data-pid="${pid}"]`)) return;
    const qColor = QUEUE_COLORS[qId] || '#fff';
    const chip = document.createElement('div');
    let classes = 'mlq-queue-chip';
    if (isCompleted) {
        classes += ' mlq-queue-chip-completed';
    }
    chip.className = classes;
    chip.setAttribute('data-pid', pid);
    chip.style.background = qColor + '18';
    chip.style.borderColor = qColor + '50';
    chip.style.color = qColor;
    chip.innerHTML = `<span class="mlq-pool-dot" style="background:${color || qColor};"></span>${pid}`;
    slots.appendChild(chip);
}

function removeFromQueueVisual(pid, qId) {
    const slots = $('mlqSlots' + qId);
    if (!slots) return;
    const chip = slots.querySelector(`[data-pid="${pid}"]`);
    if (chip) {
        chip.removeAttribute('data-pid');
        chip.classList.add('mlq-queue-chip-exit');
        setTimeout(() => { if (chip.parentNode) chip.remove(); }, 300);
    }
}

function addEventLogEntry(logEl, text, color) {
    const entry = document.createElement('div');
    entry.className = 'mlq-log-entry';
    entry.style.color = color || '#c8ffc8';
    entry.textContent = text;
    logEl.insertBefore(entry, logEl.firstChild);
    while (logEl.children.length > 12) {
        logEl.removeChild(logEl.lastChild);
    }
}

function buildMLQEvents(timeline, procs, results) {
    if (!timeline.length) return [];

    const totalTime = timeline[timeline.length - 1].end;
    const events = [];

    const timepoints = new Set();
    timeline.forEach(seg => {
        timepoints.add(seg.start);
        timepoints.add(seg.end);
    });
    procs.forEach(p => timepoints.add(p.at));
    const sortedTimes = [...timepoints].sort((a, b) => a - b);
    function getCpuAt(t) {
        for (const seg of timeline) {
            if (t >= seg.start && t < seg.end) {
                return { pid: seg.pid, qId: seg.queue_id || null };
            }
        }
        return { pid: null, qId: null };
    }

    const completionTimes = {};
    if (results) {
        results.forEach(r => {
            completionTimes[r.pid] = r.ct;
        });
    }
    const arrivedPids = new Set();
    let prevCpuPid = null;
    const activePids = new Set();
    const completedPids = new Set();
    let lastExecuting = null;

    for (let i = 0; i < timeline.length; i++) {
        const seg = timeline[i];
        const nextSeg = timeline[i + 1] || null;

        const evt = {
            time: seg.start,
            cpuPid: seg.pid,
            cpuQueueId: seg.queue_id || null,
            arrivals: [],
            completed: [],
            requeued: [],
            completionTimes: {}
        };

        procs.forEach(p => {
            if (!arrivedPids.has(p.pid) && p.at <= seg.start) {
                arrivedPids.add(p.pid);
                activePids.add(p.pid);
                evt.arrivals.push(p.pid);
            }
        });

        if (lastExecuting && lastExecuting !== seg.pid && lastExecuting !== 'Idle' && !completedPids.has(lastExecuting)) {
            const proc = procs.find(p => p.pid === lastExecuting);
            if (proc) {
                evt.requeued.push({ pid: lastExecuting, qId: proc.queue_id || 3 });
            }
        }

        if (seg.pid !== 'Idle' && completionTimes[seg.pid] === seg.end) {
            evt.completed.push(seg.pid);
            evt.completionTimes[seg.pid] = seg.end;
            completedPids.add(seg.pid);
            activePids.delete(seg.pid);
        }

        procs.forEach(p => {
            if (!arrivedPids.has(p.pid) && p.at > seg.start && p.at <= seg.end) {
                arrivedPids.add(p.pid);
                activePids.add(p.pid);
                evt.arrivals.push(p.pid);
            }
        });

        lastExecuting = seg.pid;
        events.push(evt);
    }

    return events;
}

function liveRenderGantt(timeline, isMLQ = false) {
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
                if (isMLQ && seg.queue_id) {
                    bar.style.background = QUEUE_COLORS[seg.queue_id] || colorMap[seg.pid] || '#00ff64';
                } else {
                    bar.style.background = colorMap[seg.pid] || '#00ff64';
                }
                cpuStatus.textContent = seg.pid + (isMLQ && seg.queue_id ? ` [Q${seg.queue_id}]` : '');
                playBlip(300 + segIndex * 40, 0.04);
            } else {
                cpuStatus.textContent = 'IDLE';
                cpuDot.className = 'cpu-dot idle-dot';
                setTimeout(() => { cpuDot.className = 'cpu-dot'; }, 200);
            }

            bar.textContent = seg.pid;
            bar.title = `${seg.pid}: ${seg.start} → ${seg.end}` + (isMLQ && seg.queue_id ? ` [Q${seg.queue_id} ${QUEUE_NAMES[seg.queue_id]}]` : '');
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

function renderResults(results, data, isMLQ = false) {
    resultsSection.style.display = 'block';
    resultsBody.innerHTML = '';

    const colorMap = {};
    processes.forEach(p => { colorMap[p.pid] = p.color; });

    const thead = resultsSection.querySelector('thead tr');
    if (isMLQ) {
        if (!thead.querySelector('.th-queue')) {
            const th = document.createElement('th');
            th.textContent = 'QUEUE';
            th.className = 'th-queue';
            thead.insertBefore(th, thead.children[1]);
        }
    } else {
        const existingTh = thead.querySelector('.th-queue');
        if (existingTh) existingTh.remove();
    }

    results.forEach((r, i) => {
        const tr = document.createElement('tr');
        tr.style.animationDelay = `${i * 0.07}s`;
        const color = colorMap[r.pid] || '#00ff64';

        let queueCell = '';
        if (isMLQ) {
            const qId = r.queue_id || 3;
            const qColor = QUEUE_COLORS[qId] || '#fff';
            queueCell = `<td><span class="queue-tag" style="background:${qColor}20; color:${qColor}; border:1px solid ${qColor}40;">Q${qId} ${QUEUE_NAMES[qId]}</span></td>`;
        }

        tr.innerHTML = `
            <td>
                <div class="pid-cell">
                    <span class="pid-dot" style="background:${color}; color:${color};"></span>
                    ${r.pid}
                </div>
            </td>
            ${queueCell}
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

function renderQueueBreakdown(breakdown) {
    let existing = $('queueBreakdownSection');
    if (existing) existing.remove();

    const section = document.createElement('section');
    section.className = 'panel panel-queue-breakdown pixel-card';
    section.id = 'queueBreakdownSection';
    section.style.maxWidth = '1200px';
    section.style.margin = '0 auto 20px';
    section.style.padding = '24px';
    section.style.position = 'relative';
    section.style.zIndex = '1';

    let html = '<h2 class="panel-title">📊 Queue Breakdown</h2>';
    html += '<div class="queue-breakdown-grid">';

    for (const [qId, info] of Object.entries(breakdown)) {
        const algoLabel = info.quantum ? `${info.algorithm} (q=${info.quantum})` : info.algorithm;
        html += `
            <div class="queue-breakdown-card pixel-card" style="border-color: ${info.color}40;">
                <div class="queue-breakdown-header" style="color: ${info.color}; text-shadow: 0 0 8px ${info.color}40;">
                    <span class="queue-dot" style="background: ${info.color};"></span>
                    Q${qId} — ${info.name}
                </div>
                <div class="queue-breakdown-details">
                    <div class="queue-breakdown-row">
                        <span class="queue-breakdown-label">Algorithm</span>
                        <span class="queue-breakdown-value">${algoLabel}</span>
                    </div>
                    <div class="queue-breakdown-row">
                        <span class="queue-breakdown-label">Processes</span>
                        <span class="queue-breakdown-value">${info.process_count}</span>
                    </div>
                    <div class="queue-breakdown-row">
                        <span class="queue-breakdown-label">CPU Time</span>
                        <span class="queue-breakdown-value">${info.cpu_time} units</span>
                    </div>
                </div>
            </div>
        `;
    }

    html += '</div>';
    section.innerHTML = html;
    resultsSection.after(section);
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
