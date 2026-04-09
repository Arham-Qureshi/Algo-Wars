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
