## Scheduling excercise

Algorithms:
- First Come First Served (FCFS).
- Shortest Job First (SJF).
- Shortest Remaining Time First (SRTF).
- Priority.
- Round Robin.

The corp of the excercise is something like:
- Algorithm description (FCFS, SJF, SRTF, Priority, RR) with:
    - Lower priority number higher priority value.
    - Quantum of time for RR.
- The process table.
- The gantt diagram.
- The calculus of Average Waiting Time and Completion Time.


## Process table


|    | Durata | Arrivo | Priorità |
|----|--------|--------|----------|
| P1 | 3      | 0      | 0        |
| P2 | 2      | 5      | 1        |
| P3 | 4      | 7      | 2        |


## Gant Diagram

An empty diagram to be fulfilled, where the atomic square is one "instant" of time.

```
┌ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┐
                                                                                                 
│       │       │       │       │       │       │       │       │       │       │       │       │
                                                                                                 
└ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┘
```

Become:

```
┌ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬
                                                                                        |
│  P1   │  P1   │   P1  │       │       │  P2   │  P2   │  P3   │  P3   │  P3   │  P3   |
                                                                                        |
└ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴
0                       3               5               7                               11
```

And finally the space for completion and waiting times calculation.

## Layout



```
|    | Durata | Arrivo | Priorità |
|----|--------|--------|----------|
| P1 | 3      | 0      | 0        |
| P2 | 2      | 5      | 1        |
| P3 | 4      | 7      | 2        |


## FCFS:

┌ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┬ ─ ─ ─ ┐
                                                                                                 
│       │       │       │       │       │       │       │       │       │       │       │       │
                                                                                                 
└ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┴ ─ ─ ─ ┘


  Waiting time formula            Completion time formula
                            |                              |
                            |                              |
                            |                              |
                            |                              |
                            |                              |


## SJF:

[repeat]

## SRTF

[repeat]

## Priority

[repeat]

## Round Robin

[repeat]


```

All within the same width. Gantt length minimum 25 (nowrap, no scroll).

Max two A4 pages.