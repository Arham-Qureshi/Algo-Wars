QUEUE_CONFIG = {
    1: {'name': 'System',      'algorithm': 'rr', 'quantum': 2},
    2: {'name': 'Interactive',  'algorithm': 'rr', 'quantum': 4},
    3: {'name': 'Batch',        'algorithm': 'fcfs'},
}

QUEUE_COLORS = {
    1: '#ff2d95',
    2: '#00e5ff',
    3: '#ffe600',
}


def _sort_by_arrival(procs):
    return sorted(procs, key=lambda p: (p['at'], p['pid']))


def _add_to_timeline(timeline, pid, start, end, queue_id=None):
    entry = {'pid': pid, 'start': start, 'end': end}
    if queue_id is not None:
        entry['queue_id'] = queue_id
    timeline.append(entry)


def _merge_timeline(timeline, pid, start, end, queue_id=None):
    if timeline and timeline[-1]['pid'] == pid and timeline[-1]['end'] == start:
        timeline[-1]['end'] = end
    else:
        _add_to_timeline(timeline, pid, start, end, queue_id)


def mlq(processes):
    n = len(processes)
    procs = [dict(p) for p in processes]

    remaining_bt = {}
    queue_assignment = {}
    for p in procs:
        remaining_bt[p['pid']] = p['bt']
        queue_assignment[p['pid']] = p.get('queue_id', 3)

    queues = {1: [], 2: [], 3: []}
    timeline = []
    results = {}
    completed = 0
    current_time = 0
    entered = set()

    rr_index = {1: 0, 2: 0}

    max_time = sum(p['bt'] for p in procs) + max((p['at'] for p in procs), default=0) + n
    safety = 0

    while completed < n and safety < max_time * 2:
        safety += 1

        for p in _sort_by_arrival(procs):
            if p['pid'] not in entered and p['at'] <= current_time:
                q_id = queue_assignment[p['pid']]
                queues[q_id].append(p)
                entered.add(p['pid'])

        active_queue = None
        for q_id in [1, 2, 3]:
            ready = [p for p in queues[q_id] if remaining_bt[p['pid']] > 0]
            if ready:
                active_queue = q_id
                break

        if active_queue is None:
            future = [p for p in procs if p['pid'] not in entered]
            if not future:
                break
            next_arrival = min(p['at'] for p in future)
            _add_to_timeline(timeline, 'Idle', current_time, next_arrival)
            current_time = next_arrival
            continue

        config = QUEUE_CONFIG[active_queue]
        ready_procs = [p for p in queues[active_queue] if remaining_bt[p['pid']] > 0]

        if config['algorithm'] == 'rr':
            quantum = config['quantum']
            proc = ready_procs[0]
            queues[active_queue] = [p for p in queues[active_queue] if p['pid'] != proc['pid']]

            time_slice = min(quantum, remaining_bt[proc['pid']])

            for tick in range(time_slice):
                _merge_timeline(timeline, proc['pid'], current_time, current_time + 1, active_queue)
                remaining_bt[proc['pid']] -= 1
                current_time += 1

                for p in _sort_by_arrival(procs):
                    if p['pid'] not in entered and p['at'] <= current_time:
                        q_id = queue_assignment[p['pid']]
                        queues[q_id].append(p)
                        entered.add(p['pid'])

                if remaining_bt[proc['pid']] == 0:
                    break

                higher_ready = False
                for hq in range(1, active_queue):
                    if any(remaining_bt[p['pid']] > 0 for p in queues[hq]):
                        higher_ready = True
                        break
                if higher_ready:
                    break

            if remaining_bt[proc['pid']] > 0:
                queues[active_queue].append(proc)
            else:
                ct = current_time
                tat = ct - proc['at']
                wt = tat - proc['bt']
                results[proc['pid']] = {
                    **proc,
                    'ct': ct,
                    'tat': tat,
                    'wt': wt,
                    'queue_id': active_queue,
                    'queue_name': QUEUE_CONFIG[active_queue]['name'],
                }
                completed += 1

        elif config['algorithm'] == 'fcfs':
            proc = min(ready_procs, key=lambda p: (p['at'], p['pid']))
            queues[active_queue] = [p for p in queues[active_queue] if p['pid'] != proc['pid']]

            while remaining_bt[proc['pid']] > 0:
                _merge_timeline(timeline, proc['pid'], current_time, current_time + 1, active_queue)
                remaining_bt[proc['pid']] -= 1
                current_time += 1

                for p in _sort_by_arrival(procs):
                    if p['pid'] not in entered and p['at'] <= current_time:
                        q_id = queue_assignment[p['pid']]
                        queues[q_id].append(p)
                        entered.add(p['pid'])

                if remaining_bt[proc['pid']] == 0:
                    break

                higher_ready = False
                for hq in range(1, active_queue):
                    if any(remaining_bt[p['pid']] > 0 for p in queues[hq]):
                        higher_ready = True
                        break
                if higher_ready:
                    break

            if remaining_bt[proc['pid']] > 0:
                queues[active_queue].append(proc)
            else:
                ct = current_time
                tat = ct - proc['at']
                wt = tat - proc['bt']
                results[proc['pid']] = {
                    **proc,
                    'ct': ct,
                    'tat': tat,
                    'wt': wt,
                    'queue_id': active_queue,
                    'queue_name': QUEUE_CONFIG[active_queue]['name'],
                }
                completed += 1

    result_list = []
    for p in procs:
        if p['pid'] in results:
            result_list.append(results[p['pid']])

    return timeline, result_list


ALGORITHMS = {
    'mlq': mlq,
}


def run(algo_key, processes, quantum=2):
    fn = ALGORITHMS.get(algo_key)
    if fn is None:
        raise ValueError(f"Unknown advanced algorithm: {algo_key}")

    timeline, results = fn(processes)

    n = len(results)
    avg_ct  = round(sum(r['ct']  for r in results) / n, 2) if n else 0
    avg_tat = round(sum(r['tat'] for r in results) / n, 2) if n else 0
    avg_wt  = round(sum(r['wt']  for r in results) / n, 2) if n else 0
    total_time = max(r['ct'] for r in results) - min(r['at'] for r in results) if n else 1
    throughput = round(n / total_time, 2) if total_time else 0
    idle_time = sum(s['end'] - s['start'] for s in timeline if s['pid'] == 'Idle')
    cpu_util = round(((total_time - idle_time) / total_time) * 100, 1) if total_time else 0

    queue_breakdown = {}
    for q_id, cfg in QUEUE_CONFIG.items():
        q_results = [r for r in results if r.get('queue_id') == q_id]
        q_time = sum(
            s['end'] - s['start']
            for s in timeline
            if s.get('queue_id') == q_id and s['pid'] != 'Idle'
        )
        queue_breakdown[str(q_id)] = {
            'name': cfg['name'],
            'algorithm': cfg['algorithm'].upper(),
            'quantum': cfg.get('quantum', None),
            'process_count': len(q_results),
            'cpu_time': q_time,
            'color': QUEUE_COLORS[q_id],
        }

    return {
        'timeline': timeline,
        'results': results,
        'avg_ct': avg_ct,
        'avg_tat': avg_tat,
        'avg_wt': avg_wt,
        'throughput': throughput,
        'cpu_utilization': cpu_util,
        'queue_breakdown': queue_breakdown,
    }
