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
