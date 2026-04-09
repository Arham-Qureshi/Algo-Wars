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
