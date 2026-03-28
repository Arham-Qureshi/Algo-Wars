from flask import Flask, render_template, request, jsonify, Response
from whitenoise import WhiteNoise
import scheduler
import advanced_algo

app = Flask(__name__)
# whitenoise only load the static file on deployment!
app.wsgi_app = WhiteNoise(app.wsgi_app, root='static/', prefix='static/')

SITE_URL = 'https://algo-wars.onrender.com'


@app.route('/robots.txt')
def robots():
    txt = f"""User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}/sitemap.xml\n"""
    return Response(txt, mimetype='text/plain')


@app.route('/sitemap.xml')
def sitemap():
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>{SITE_URL}/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>"""
    return Response(xml, mimetype='application/xml')


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
        if 'queue_id' in p:
            proc['queue_id'] = int(p['queue_id'])
        processes.append(proc)

    try:
        if algo in advanced_algo.ALGORITHMS:
            result = advanced_algo.run(algo, processes, quantum)
        else:
            result = scheduler.run(algo, processes, quantum)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# runs 2 algos for side by side comparison
@app.route('/api/compare', methods=['POST'])
def compare():
    data = request.get_json() 
    algo1 = data.get('algorithm1', 'fcfs')
    algo2 = data.get('algorithm2', 'sjf_non_preemptive')
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
        if 'queue_id' in p:
            proc['queue_id'] = int(p['queue_id'])
        processes.append(proc)

    def _run_algo(algo_key):
        if algo_key in advanced_algo.ALGORITHMS:
            return advanced_algo.run(algo_key, processes, quantum)
        return scheduler.run(algo_key, processes, quantum)

    try:
        result1 = _run_algo(algo1)
        result2 = _run_algo(algo2)
        return jsonify({
            'result1': result1,
            'result2': result2,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400


if __name__ == '__main__':
    app.run(debug=True, port=5000)
