
from flask import Flask, render_template, request, jsonify
import scheduler

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/simulate', methods=['POST'])
def simulate():
    data = request.get_json()
    algo = data.get('algorithm', 'fcfs')
    quantum = int(data.get('quantum', 2))
    raw_procs = data.get('processes', [])

    processes = []
    for p in raw_procs:
        proc = {
            'pid': p['pid'],
            'at': int(p['at']),
            'bt': int(p['bt']),
        }
        if 'priority' in p:
            proc['priority'] = int(p['priority'])
        processes.append(proc)

    try:
        result = scheduler.run(algo, processes, quantum)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 400


if __name__ == '__main__':
    app.run(debug=True, port=5000)
