def fcfs(processes):
    procs = sorted(processes, key=lambda p: (p['at'], p['pid']))
    timeline = []
    current_time = 0
    results = []
    for p in procs:
        if current_time < p['at']:
            timeline.append({'pid': 'Idle', 'start': current_time, 'end': p['at']})
            current_time = p['at']
        start = current_time
        end = current_time + p['bt']
        timeline.append({'pid': p['pid'], 'start': start, 'end': end})
        ct = end
        tat = ct - p['at']
        wt = tat - p['bt']
        results.append({**p, 'ct': ct, 'tat': tat, 'wt': wt})
        current_time = end
    return timeline, results

def sjf_non_preemptive(processes):
    remaining = [dict(p) for p in processes]
    timeline = []
    results = []
    current_time = 0
    completed = 0
    n = len(remaining)
    done = [False] * n
    while completed < n:
        available = [i for i in range(n)
                     if not done[i] and remaining[i]['at'] <= current_time]
        if not available:
            next_arrival = min(remaining[i]['at'] for i in range(n) if not done[i])
            timeline.append({'pid': 'Idle', 'start': current_time, 'end': next_arrival})
            current_time = next_arrival
            continue
        idx = min(available, key=lambda i: (remaining[i]['bt'], remaining[i]['at']))
        p = remaining[idx]
        start = current_time
        end = current_time + p['bt']
        timeline.append({'pid': p['pid'], 'start': start, 'end': end})
        ct = end
        tat = ct - p['at']
        wt = tat - p['bt']
        results.append({**p, 'ct': ct, 'tat': tat, 'wt': wt})
        current_time = end
        done[idx] = True
        completed += 1
    return timeline, results

def srtf(processes):
    n = len(processes)
    rem = [dict(p) for p in processes]
    remaining_bt = [p['bt'] for p in rem]
    done = [False] * n
    results = [{} for _ in range(n)]
    timeline = []
    completed = 0
    current_time = 0
    prev_pid = None
    while completed < n:
        available = [i for i in range(n)
                     if not done[i] and rem[i]['at'] <= current_time]
        if not available:
            next_arrival = min(rem[i]['at'] for i in range(n) if not done[i])
            if prev_pid != 'Idle':
                timeline.append({'pid': 'Idle', 'start': current_time, 'end': next_arrival})
            else:
                timeline[-1]['end'] = next_arrival
            current_time = next_arrival
            prev_pid = 'Idle'
            continue
        idx = min(available, key=lambda i: (remaining_bt[i], rem[i]['at']))
        pid = rem[idx]['pid']
        if pid == prev_pid and timeline:
            timeline[-1]['end'] = current_time + 1
        else:
            timeline.append({'pid': pid, 'start': current_time, 'end': current_time + 1})
        remaining_bt[idx] -= 1
        current_time += 1
        prev_pid = pid
        if remaining_bt[idx] == 0:
            done[idx] = True
            completed += 1
            ct = current_time
            tat = ct - rem[idx]['at']
            wt = tat - rem[idx]['bt']
            results[idx] = {**rem[idx], 'ct': ct, 'tat': tat, 'wt': wt}

    return timeline, results


def priority_non_preemptive(processes):
    remaining = [dict(p) for p in processes]
    timeline = []
    results = []
    current_time = 0
    completed = 0
    n = len(remaining)
    done = [False] * n

    while completed < n:
        available = [i for i in range(n)
                     if not done[i] and remaining[i]['at'] <= current_time]
        if not available:
            next_arrival = min(remaining[i]['at'] for i in range(n) if not done[i])
            timeline.append({'pid': 'Idle', 'start': current_time, 'end': next_arrival})
            current_time = next_arrival
            continue

        idx = min(available, key=lambda i: (remaining[i]['priority'], remaining[i]['at']))
        p = remaining[idx]
        start = current_time
        end = current_time + p['bt']
        timeline.append({'pid': p['pid'], 'start': start, 'end': end})
        ct = end
        tat = ct - p['at']
        wt = tat - p['bt']
        results.append({**p, 'ct': ct, 'tat': tat, 'wt': wt})
        current_time = end
        done[idx] = True
        completed += 1

    return timeline, results


def priority_preemptive(processes):
    n = len(processes)
    rem = [dict(p) for p in processes]
    remaining_bt = [p['bt'] for p in rem]
    done = [False] * n
    results = [{} for _ in range(n)]
    timeline = []
    completed = 0
    current_time = 0
    prev_pid = None

    while completed < n:
        available = [i for i in range(n)
                     if not done[i] and rem[i]['at'] <= current_time]
        if not available:
            next_arrival = min(rem[i]['at'] for i in range(n) if not done[i])
            if prev_pid != 'Idle':
                timeline.append({'pid': 'Idle', 'start': current_time, 'end': next_arrival})
            else:
                timeline[-1]['end'] = next_arrival
            current_time = next_arrival
            prev_pid = 'Idle'
            continue

        idx = min(available, key=lambda i: (rem[i]['priority'], rem[i]['at']))
        pid = rem[idx]['pid']

        if pid == prev_pid and timeline:
            timeline[-1]['end'] = current_time + 1
        else:
            timeline.append({'pid': pid, 'start': current_time, 'end': current_time + 1})

        remaining_bt[idx] -= 1
        current_time += 1
        prev_pid = pid

        if remaining_bt[idx] == 0:
            done[idx] = True
            completed += 1
            ct = current_time
            tat = ct - rem[idx]['at']
            wt = tat - rem[idx]['bt']
            results[idx] = {**rem[idx], 'ct': ct, 'tat': tat, 'wt': wt}

    return timeline, results


def round_robin(processes, quantum=2):
    n = len(processes)
    rem = sorted([dict(p) for p in processes], key=lambda p: p['at'])
    remaining_bt = {p['pid']: p['bt'] for p in rem}
    timeline = []
    results_map = {}
    current_time = 0
    queue = []
    entered = [False] * n
    idx = 0

    # first arrivals
    for i, p in enumerate(rem):
        if p['at'] <= current_time and not entered[i]:
            queue.append(p)
            entered[i] = True

    while queue or idx < n:
        if not queue:
            # CPU idle until next proc
            next_p = None
            for i, p in enumerate(rem):
                if not entered[i]:
                    next_p = p
                    next_idx = i
                    break
            if next_p is None:
                break
            timeline.append({'pid': 'Idle', 'start': current_time, 'end': next_p['at']})
            current_time = next_p['at']
            queue.append(next_p)
            entered[next_idx] = True
            continue

        proc = queue.pop(0)
        exec_time = min(quantum, remaining_bt[proc['pid']])
        start = current_time
        end = current_time + exec_time
        timeline.append({'pid': proc['pid'], 'start': start, 'end': end})
        remaining_bt[proc['pid']] -= exec_time
        current_time = end

# adding the new arrived proc first then the remaining proc
        for i, p in enumerate(rem):
            if not entered[i] and p['at'] <= current_time:
                queue.append(p)
                entered[i] = True

        if remaining_bt[proc['pid']] > 0:
            queue.append(proc)
        else:
            ct = current_time
            tat = ct - proc['at']
            wt = tat - proc['bt']
            results_map[proc['pid']] = {**proc, 'ct': ct, 'tat': tat, 'wt': wt}

    results = [results_map[p['pid']] for p in rem if p['pid'] in results_map]
    return timeline, results

# parsing the datas for dynamic redering
ALGORITHMS = {
    'fcfs':                   fcfs,
    'sjf_non_preemptive':     sjf_non_preemptive,
    'srtf':                   srtf,
    'priority_non_preemptive': priority_non_preemptive,
    'priority_preemptive':    priority_preemptive,
    'round_robin':            round_robin,
}

def run(algo_key, processes, quantum=2):
    fn = ALGORITHMS.get(algo_key)
    if fn is None:
        raise ValueError(f"Unknown algorithm: {algo_key}")
    if algo_key == 'round_robin':
        timeline, results = fn(processes, quantum)
    else:
        timeline, results = fn(processes)

    n = len(results)
    avg_ct  = round(sum(r['ct']  for r in results) / n, 2) if n else 0
    avg_tat = round(sum(r['tat'] for r in results) / n, 2) if n else 0
    avg_wt  = round(sum(r['wt']  for r in results) / n, 2) if n else 0
    total_time = max(r['ct'] for r in results) - min(r['at'] for r in results) if n else 1
    throughput = round(n / total_time, 2) if total_time else 0
    idle_time = sum(s['end'] - s['start'] for s in timeline if s['pid'] == 'Idle')
    cpu_util = round(((total_time - idle_time) / total_time) * 100, 1) if total_time else 0

    return {
        'timeline': timeline,
        'results': results,
        'avg_ct': avg_ct,
        'avg_tat': avg_tat,
        'avg_wt': avg_wt,
        'throughput': throughput,
        'cpu_utilization': cpu_util,
    }
