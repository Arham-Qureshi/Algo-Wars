# Algo-Wars: OS CPU Scheduling Simulator

![Python](https://img.shields.io/badge/Python-3.8%2B-blue?style=flat-square&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-2.x-lightgrey?style=flat-square&logo=flask&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-yellow?style=flat-square&logo=javascript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

Algo-Wars is a professional browser-based interactive CPU scheduling simulator built to demonstrate, analyze, and compare the behavior of classical operating system process scheduling algorithms. The application features a retro arcade visual style, live animated Gantt charts, real-time performance metrics, and an innovative **Algorithm Battle** mode for direct side-by-side comparisons of scheduling strategies.

---

## Table of Contents

- [Features](#features)
- [Supported Algorithms](#supported-algorithms)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Usage](#usage)
  - [Single Mode](#single-mode)
  - [Battle Mode](#battle-mode)
  - [Advanced Mode](#advanced-mode)
  - [Process Input Parameters](#process-input-parameters)
  - [Simulation Speed Control](#simulation-speed-control)
  - [Interpreting Results](#interpreting-results)
- [API Reference](#api-reference)
- [Performance Metrics Explained](#performance-metrics-explained)
- [License](#license)

---

## Features

### Live Step-by-Step Simulation

When running in Single Mode, the Gantt chart is animated in real time, revealing each process execution segment sequentially. The CPU status indicator updates dynamically to display which process is currently executing or whether the CPU is idle. A speed control slider allows users to accelerate or slow the animation from steps as slow as 0.5x to 10x.

### Algorithm Battle Mode

Battle Mode runs two independently selected scheduling algorithms on the same set of processes simultaneously and presents the results in a side-by-side layout. A scoring system evaluates both algorithms across four metrics — average waiting time, average turnaround time, CPU utilization, and throughput — and declares a winner based on the aggregate score.

### Retro Arcade Interface

The application uses a pixel-art inspired visual design with CRT scanline effects, neon color palettes, and 8-bit sound effects generated in real time via the Web Audio API. Each process is assigned a unique neon color that persists across the Gantt chart, results table, and battle panels.

### Real-Time Performance Metrics

After each simulation run, the following aggregate metrics are computed and displayed:

- Average Waiting Time
- Average Turnaround Time
- Average Completion Time
- CPU Throughput (processes per unit time)
- CPU Utilization percentage

### Dynamic Process Generation

Users may define processes manually by specifying individual arrival times, burst times, and (where applicable) priority values. An automated random process generator is also available, which spawns between 3 and 6 processes with randomized attributes, enabling rapid testing of algorithm behaviour.

### Process Chip Management

Each added process is displayed as a removable chip in the process queue panel. Processes can be individually removed before the simulation begins. The chip display includes the process identifier, arrival time, burst time, and priority value where relevant.

---

## Supported Algorithms

The simulator supports the following classical CPU scheduling algorithms. Configuration of required inputs happens dynamically based on the algorithm selected.

| Algorithm | Type | Required Inputs |
| :--- | :--- | :--- |
| **First Come First Serve (FCFS)** | Non-Preemptive | Arrival Time, Burst Time |
| **Shortest Job First (SJF)** | Non-Preemptive | Arrival Time, Burst Time |
| **Shortest Remaining Time First (SRTF)** | Preemptive | Arrival Time, Burst Time |
| **Priority Scheduling** | Non-Preemptive | Arrival Time, Burst Time, Priority |
| **Priority Scheduling** | Preemptive | Arrival Time, Burst Time, Priority |
| **Round Robin (RR)** | Preemptive | Arrival Time, Burst Time, Time Quantum |
| **Multilevel Queue (MLQ)** | Advanced | Arrival Time, Burst Time, Queue Type |

---

## Technology Stack

| Layer             | Technology                             |
| ----------------- | -------------------------------------- |
| Backend Framework | Python 3, Flask                        |
| Scheduling Logic  | Pure Python (scheduler.py)             |
| Frontend          | Vanilla JavaScript (ES6+), HTML5, CSS3 |
| Sound Effects     | Web Audio API (Oscillator-based)       |
| Data Transport    | JSON (REST API via `fetch`)          |
| Server            | Flask development server              |

---

## Project Structure

```
OS/
├── app.py              # Flask application entry point. Defines API routes.
├── scheduler.py        # Core scheduling engine. Contains classical algorithm implementations.
├── advanced_algo.py    # Advanced scheduling engine. Contains MLQ implementation.
├── templates/
│   └── index.html      # Single-page HTML template rendered by Flask.
├── static/
│   ├── css/
│   │   ├── advanced.css # Styles for Advanced mode and MLQ visualization.
│   │   ├── battle.css   # Styles for Battle mode.
│   │   ├── core.css     # Shared variables, resets, and common UI elements.
│   │   └── single.css   # Styles for Single mode (Gantt chart, etc.).
│   └── js/
│       ├── advanced.js  # Advanced mode logic and MLQ animation rendering.
│       ├── battle.js    # Battle mode execution and side-by-side comparisons.
│       ├── core.js      # Global state, shared UI functions, audio, and utility scripts.
│       ├── particles.js # Background particle animation for the retro visual effect.
│       └── single.js    # Single mode simulation and Gantt chart mechanics.
├── LICENSE             # MIT License.
└── README.md           # This file.
```

---

## Prerequisites

- Python 3.8 or higher
- pip (Python package installer)
- A modern web browser with JavaScript enabled (Google Chrome, Mozilla Firefox, Microsoft Edge, or Safari)

---

## Installation

**Step 1: Clone the repository**

```bash
git clone https://github.com/Arham-Qureshi/Algo-Wars.git
cd Algo-Wars
```

**Step 2: (Optional but recommended) Create a virtual environment**

On Windows:

```bash
python -m venv venv
venv\Scripts\activate
```

On macOS / Linux:

```bash
python3 -m venv venv
source venv/bin/activate
```

**Step 3: Install dependencies**

The only external dependency is Flask:

```bash
pip install flask
```

---

## Running the Application

Start the Flask development server:

```bash
python app.py
```

The server will start on port **5000** in debug mode. Open a web browser and navigate to:

```
http://127.0.0.1:5000
```

The application is now ready to use. The server will automatically reload if any source files are modified.

---

## Usage

### Single Mode

Single Mode is the default operating mode. It runs one scheduling algorithm on the defined process set and presents a live animated Gantt chart followed by a full results table and performance summary.

1. Select a scheduling algorithm from the dropdown menu in the Algorithm panel.
2. If Round Robin is selected, configure the Time Quantum field that will appear.
3. If a Priority algorithm is selected, a Priority input field will appear in the process entry form.
4. Add one or more processes to the queue using the process entry form.
5. Click **START** to begin the simulation.
6. The Gantt chart will animate segment by segment. The CPU Status indicator reflects the currently running process at each step.
7. Once the animation completes, the results table and performance metric cards are revealed below the Gantt chart.

### Battle Mode

Battle Mode submits the same process set to two different algorithms simultaneously and compares their performance.

1. Click the **BATTLE** button at the top of the Algorithm panel to switch to Battle Mode. The button label changes to **FIGHT!**
2. Select two different scheduling algorithms using the two dropdown menus that appear.
3. Add processes to the queue as described above.
4. Click **FIGHT!** to run both algorithms.
5. The battle results panel will appear with two Gantt charts, two stats panels, and a winner declaration based on aggregate performance scoring.

> **Note:** If the same algorithm is selected for both slots in Battle Mode, the simulation will reject the input with an error notification.

### Advanced Mode

Advanced Mode features complex OS-level scheduling algorithms, showcasing detailed simulation animations. Currently, this mode supports **Multilevel Queue (MLQ)** scheduling.

1. Click the **Advanced** button in the mode bar (labeled with a brain icon).
2. Select **MLQ — Multilevel Queue** from the algorithm dropdown.
3. Add processes. Notice that in Advanced Mode, you are able to assign each process to a specific queue (**System**, **Interactive**, or **Batch**).
4. Click **SIMULATE** to begin.
5. The detailed Multilevel Queue animation panel will initialize, illustrating process arrivals into distinct queues, context switching, CPU execution, and completions.
6. Once the animation is complete (or you skip to the end), a queue breakdown summary is provided alongside the final performance metrics table.

### Process Input Parameters

| Parameter    | Field | Description                                                                                                     | Minimum Value |
| ------------ | ----- | --------------------------------------------------------------------------------------------------------------- | ------------- |
| Arrival Time | AT    | The time unit at which the process enters the ready queue.                                                      | 0             |
| Burst Time   | BT    | The total CPU time required to complete the process.                                                            | 1             |
| Priority     | PR    | The scheduling priority of the process (lower number = higher priority). Required for Priority algorithms only. | 0             |

Processes can also be added using the **RANDOM** button, which generates 3 to 6 processes with randomized arrival times (0 to 7), burst times (1 to 8), and priority values (1 to 5).

Pressing **Enter** within any input field is equivalent to clicking the **ADD PROCESS** button.

Individual processes can be removed from the queue by clicking the removal control on each process chip before starting the simulation.

Clicking **CLEAR** removes all processes, resets the process identifier counter, and hides all output panels.

### Simulation Speed Control

The **Speed** slider in the control bar adjusts the animation speed of the Gantt chart in Single Mode. The slider ranges from **1x** to **10x**. At higher speeds, each Gantt segment is revealed more quickly. At lower speeds, the animation is deliberately slow, useful for educational step-through demonstrations.

### Interpreting Results

**Results Table**

After simulation, the results table displays one row per process with the following columns:

| Column          | Abbreviation | Description                                                |
| --------------- | ------------ | ---------------------------------------------------------- |
| Process ID      | PID          | Unique identifier assigned to the process.                 |
| Arrival Time    | AT           | The time the process entered the system.                   |
| Burst Time      | BT           | The total CPU time consumed by the process.                |
| Completion Time | CT           | The time at which the process finished execution.          |
| Turnaround Time | TAT          | CT minus AT. Total time from arrival to completion.        |
| Waiting Time    | WT           | TAT minus BT. Total time spent waiting in the ready queue. |

**Performance Metric Cards**

| Metric           | Description                                                                           |
| ---------------- | ------------------------------------------------------------------------------------- |
| Avg Waiting Time | Mean waiting time across all processes. Lower is better.                              |
| Avg Turnaround   | Mean turnaround time across all processes. Lower is better.                           |
| Avg Completion   | Mean completion time across all processes.                                            |
| Throughput       | Number of processes completed per unit of total time. Higher is better.               |
| CPU Utilization  | Percentage of total time the CPU was actively executing (not idle). Higher is better. |

**Battle Mode Scoring**

In Battle Mode, the winner is determined by awarding one point for each metric where an algorithm outperforms the other:

- Lower average waiting time
- Lower average turnaround time
- Higher CPU utilization
- Higher throughput

The algorithm with the higher aggregate score is declared the winner. A tie is declared when both algorithms score equally across all metrics.

---

## API Reference

The backend exposes two REST API endpoints, both accepting `POST` requests with a JSON body.

### POST /api/simulate

Runs a single scheduling algorithm on the provided process set.

**Request Body**

```json
{
  "algorithm": "fcfs",
  "quantum": 2,
  "processes": [
    { "pid": "P1", "at": 0, "bt": 5 },
    { "pid": "P2", "at": 1, "bt": 3, "priority": 2 }
  ]
}
```

| Field                | Type    | Required    | Description                                                                                                                              |
| -------------------- | ------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| algorithm            | string  | Yes         | Algorithm key. One of:`fcfs`, `sjf_non_preemptive`, `srtf`, `priority_non_preemptive`, `priority_preemptive`, `round_robin`. |
| quantum              | integer | No          | Time quantum for Round Robin. Defaults to 2.                                                                                             |
| processes            | array   | Yes         | List of process objects.                                                                                                                 |
| processes[].pid      | string  | Yes         | Process identifier.                                                                                                                      |
| processes[].at       | integer | Yes         | Arrival time.                                                                                                                            |
| processes[].bt       | integer | Yes         | Burst time.                                                                                                                              |
| processes[].priority | integer | Conditional | Required for priority-based algorithms.                                                                                                  |

**Response Body**

```json
{
  "timeline": [
    { "pid": "P1", "start": 0, "end": 5 },
    { "pid": "Idle", "start": 5, "end": 6 }
  ],
  "results": [
    { "pid": "P1", "at": 0, "bt": 5, "ct": 5, "tat": 5, "wt": 0 }
  ],
  "avg_ct": 5.0,
  "avg_tat": 5.0,
  "avg_wt": 0.0,
  "throughput": 0.2,
  "cpu_utilization": 83.3
}
```

A `pid` value of `"Idle"` in the timeline indicates the CPU was idle during that interval.

**Error Response**

```json
{ "error": "Unknown algorithm: invalid_key" }
```

HTTP status code `400` is returned on error.

---

### POST /api/compare

Runs two scheduling algorithms on the same process set and returns both results.

**Request Body**

```json
{
  "algorithm1": "fcfs",
  "algorithm2": "round_robin",
  "quantum": 3,
  "processes": [
    { "pid": "P1", "at": 0, "bt": 6 },
    { "pid": "P2", "at": 2, "bt": 4 }
  ]
}
```

The fields follow the same schema as `/api/simulate`, with `algorithm1` and `algorithm2` replacing the single `algorithm` field.

**Response Body**

```json
{
  "result1": { ... },
  "result2": { ... }
}
```

Each nested result object follows the identical schema as the response from `/api/simulate`.

---

## Performance Metrics Explained

The following formulas are used to compute per-process metrics:

| Metric                | Formula                                                    |
| --------------------- | ---------------------------------------------------------- |
| Completion Time (CT)  | The clock time at which the process finishes execution.    |
| Turnaround Time (TAT) | TAT = CT - Arrival Time                                    |
| Waiting Time (WT)     | WT = TAT - Burst Time                                      |
| Throughput            | n / (max CT - min AT), where n is the number of processes. |
| CPU Utilization       | ((Total Time - Idle Time) / Total Time) x 100              |

**Total Time** is defined as the span from the earliest arrival time to the latest completion time across all processes.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for the full license text.
