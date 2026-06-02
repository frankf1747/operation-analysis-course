# Week 7 — Network Flow Problems

## 0. Big Picture

Shipping packages, electricity grids, blood supply chains — all are networks of nodes connected by edges. **Network flow problems** optimize what and how much flows where. The MAGIC: their LP relaxations always have integer optimal solutions (TOTAL UNIMODULARITY). So we solve them as LPs but get integer answers for free.

This week unifies: **shortest path** (最短路径), **min-cost network flow** (最小成本网络流), and **transportation**, plus variants with reliability and side constraints.

## 1. Graph Theory Basics

- **Nodes** (vertices, 节点): cities, warehouses, junctions
- **Edges** (arcs, 边): directed connections (A → B means flow can go A to B, but not reverse unless separate edge)
- **Source** (源): node with supply (产生流量)
- **Sink** (汇): node with demand (消耗流量)
- **Transshipment** (转运点): no supply or demand; flow passes through
- **Capacity** $u_{ij}$: max flow on edge
- **Cost** $c_{ij}$: per-unit shipping cost

## 2. Minimum-Cost Network Flow (MCNF)

### Setup
- Directed graph $(N, E)$
- Edge $(i,j)$: cost $c_{ij}$, capacity $u_{ij}$
- Node $i$: supply $b_i$ ($> 0$ = supply, $< 0$ = demand, $= 0$ = transshipment)
- **Balanced if $\sum_i b_i = 0$**

### Decision Variable
$x_{ij}$ = flow on edge $(i,j)$.

### Flow Conservation 流守恒 (THE KEY CONSTRAINT)
At every node $i$:
$$\sum_{j: (j,i) \in E} x_{ji} + b_i = \sum_{j: (i,j) \in E} x_{ij}$$
**inflow + supply = outflow + demand**

Equivalently: **net outflow = supply**.

### Full LP
$$\min \sum_{(i,j) \in E} c_{ij} x_{ij}$$
$$\text{s.t. flow conservation at each node}$$
$$0 \le x_{ij} \le u_{ij}$$

## 3. Total Unimodularity 完全幺模性

**Theorem:** If constraint matrix is TU and all RHS integers, every basic feasible solution is integer.

**Implication:** Pure network flow LP → optimal $x_{ij}$ are integers AUTOMATICALLY. No branch-and-bound needed.

**Breaks if:** you add a non-flow-conservation constraint (e.g., $x_{B,F} + x_{J,K} \le 1$). Then need IP.

## 4. Transportation Problem (Special MCNF)

- Bipartite: sources → sinks directly (no transshipment)
- $m$ supply nodes, $n$ demand nodes
- $m \times n$ edges
- Special case solvable by specialized algorithms (NW corner, Vogel)

## 5. Shortest Path as MCNF

Find min-cost path $s \to t$:
- $b_s = +1$, $b_t = -1$, others $= 0$
- $u_{ij} = 1$ (or $\infty$ — LP picks binary)
- Min $\sum c_{ij} x_{ij}$

Edges with $x_{ij} = 1$ form the shortest path.

## 6. Shortest Path Notebook — Cell Walkthrough

11 nodes, 17 edges. Source A, sink K.

```python
edge_data = [("A","B",3), ("A","C",5), ...]
m = Model()
x = m.addVars(edges, lb=0, ub=1)
# A: must leave
m.addConstr(sum(x["A",j] for j in outgoing(A)) == 1)
# K: must arrive
m.addConstr(sum(x[i,"K"] for i in incoming(K)) == 1)
# Others: balance
for i in middle_nodes:
    m.addConstr(sum(x[i,j] for j) == sum(x[j,i] for j))
m.setObjective(sum(time[i,j]*x[i,j] for (i,j) in edges), GRB.MINIMIZE)
m.optimize()
# Optimal: A → B → F → J → K, cost 9
```

**Adding a non-network constraint:** $x_{B,F} + x_{J,K} \le 1$. LP now gives fractional $x_{B,F} = 0.5$ (TU broken).

## 7. MCNF Notebook — Walkthrough

2 plants, 5 warehouses, 2 retailers, 14 nodes total. Load CSVs, build flow conservation per node. Solve → cost $8,860.

**Extending with production decisions:**
- $y_n$ = production at plant $n$ (variable)
- $z_n$ = shortfall (allowed unmet demand) at retailer $n$
- Increased retail demand by 50% (unbalanced)
- Optimal: $y_{P1} = 320, y_{P2} = 240, z_{R1} = 100$. Cost $18,360.

**Shadow prices** on capacity constraints reveal bottlenecks. Edge (P1, A1): $\pi = -10$. Expanding capacity by 50 saves ~$500. Use binary $w_e$ to choose which edge to expand.

## 8. Production + Transportation Practice Problem (Network Flows-I) — THE CENTRAL EXAMPLE

### Problem: Psyche Shoe Company
- **Production plants:** Dallas ($10/unit), Albuquerque ($12/unit)
- **Distribution centers:** Phoenix (100 inventory), Las Vegas (0)
- **Retail stores:** LA (260 demand), SF (450 demand)
- **Third-party orders:** 200 units fulfilled from Dallas directly
- **Online demand from out of LA/SF:** 510 units, fulfilled from Las Vegas

**Shipping costs ($/unit):**
- D→LV: 5, D→P: 7, A→LV: 4, A→P: 9
- P→LA: 3, LV→LA: 3, LV→SF: 5

### Full LP (no Σ notation — exam format)

**Variables:** $y_D, y_A$ (production); $x_{ij}$ (flows on each edge).

**Objective:**
$$\min 10y_D + 12y_A + 5x_{D,LV} + 7x_{D,P} + 4x_{A,LV} + 9x_{A,P} + 3x_{P,LA} + 3x_{LV,LA} + 5x_{LV,SF}$$

**Constraints:**
- Dallas: $y_D = 200 + x_{D,LV} + x_{D,P}$
- Albuquerque: $y_A = x_{A,LV} + x_{A,P}$
- Las Vegas: $x_{D,LV} + x_{A,LV} = 510 + x_{LV,LA} + x_{LV,SF}$
- Phoenix: $x_{D,P} + x_{A,P} + 100 = x_{P,LA}$
- LA: $x_{P,LA} + x_{LV,LA} = 260$
- SF: $x_{LV,SF} = 450$
- All $\ge 0$

**Where numbers come from:**
- 200 at Dallas = third-party demand
- 510 at LV = total out-of-LA/SF online orders (150+200+90+70)
- 100 at Phoenix = initial inventory
- 260 at LA = retail (200) + online (60)
- 450 at SF = retail (100) + online (350)

## 9. Piecewise Linear Costs

"First 100 units P→LA at $3, beyond at $6."

**Modification:**
1. Add new var $\tilde x_{P,LA}$ (excess flow at $6).
2. Cap $x_{P,LA} \le 100$.
3. Modify Phoenix: $x_{D,P} + x_{A,P} + 100 = x_{P,LA} + \tilde x_{P,LA}$.
4. Modify LA: $x_{P,LA} + \tilde x_{P,LA} + x_{LV,LA} = 260$.
5. Add $+6 \tilde x_{P,LA}$ to objective.

**Why it works:** Minimizing cost, LP fills cheap $x_{P,LA}$ to its 100 cap before using $\tilde x$.

## 10. Max Reliability Path — Practice Problem Network Flows-II

### Problem
Pipeline A → L. Each edge has reliability $r_{ij} \in (0, 1)$. Path reliability = product of edge reliabilities.

### KEY INSIGHT: Log Transform
$$\max \prod r_{ij} = \max \log \prod r_{ij} = \max \sum \log r_{ij}$$

Since $\log r_{ij} < 0$ for $r_{ij} < 1$, sum is NEGATIVE. Maximizing sum = least negative path.

**Equivalent:** $\min \sum (-\log r_{ij})$ where $-\log r_{ij} > 0$ → SHORTEST PATH.

### Formulation
Shortest path IP with edge costs $c_{ij} = -\log r_{ij}$.

### Dynamic Programming (Backward Recursion)
$v_i$ = max log-reliability from $i$ to $L$.
$v_L = 0$.
$v_i = \max_{j \in O(i)} \{\log r_{ij} + v_j\}$.

**Practice problem result:** $v_A = -2.3$. Max reliability = $e^{-2.3} = 0.100$. Path: A → C → D → H → J → L.

### Side Constraints on Paths
- "If C→E then NOT G→J": $x_{C,E} + x_{G,J} \le 1$
- "If A→C AND C→E then J→L": $x_{A,C} + x_{C,E} - 1 \le x_{J,L}$
- "If through E (uses E→G), ≥ 4 edges": $4 x_{E,G} \le \sum_{(i,j)} x_{ij}$

### Top-K Paths (Iterative)
1. Solve, get path 1 with edge set $E^{*,1}$, length $L_1$.
2. Add: $\sum_{(i,j) \in E^{*,1}} x_{ij} \le L_1 - 1$.
3. Re-solve → path 2.
4. Repeat $k$ times.

## 11. Step-by-Step Methods

### (a) Translate word problem → network
1. Each entity = node.
2. Each shipment route = directed edge.
3. Supply (+), demand (−), transshipment (0).
4. Costs and capacities per edge.

### (b) Write flow conservation explicitly
For each node $i$: $\sum_j x_{ji} + b_i = \sum_j x_{ij}$. Enumerate all variables.

### (c) Piecewise cost
Split edge into tier vars; cap each; sum in conservation.

### (d) Shortest path
$b_s = 1, b_t = -1$, others 0; min $\sum c_{ij} x_{ij}$.

### (e) Max reliability
Same as shortest path with $c_{ij} = -\log r_{ij}$.

### (f) Path side constraints
Linear constraints on $x_{ij}$ (break TU; may need IP).

## 12. Common Mistakes ⚠️

1. **Wrong flow conservation sign.** Net outflow = supply.
2. **Forgetting initial inventory.** Phoenix has 100 on hand; include it.
3. **Mixing balanced and unbalanced.** $\sum b_i$ must equal 0 (or have shortfall/excess vars).
4. **Wrong direction of edges.** A → B is directed.
5. **Forgetting non-negativity.**
6. **Log-reliability sign confusion.** Logs are negative; minimize negatives.
7. **Adding non-network constraints without binary.** Breaks TU.
8. **Not understanding why piecewise works.** LP greedily uses cheaper option.

## 13. Exam Relevance

Exam slides list 2 question types:
1. **Supply chain LP:** Word problem → flow conservation → full LP with EXPLICIT numbers (no Σ).
2. **Path problem:** Shortest/longest/reliability with side constraints, top-K.

Practice: Network Flows-I (production + transport), Network Flows-II (max reliability + sides + top-K).

## 14. Mini Practice

**Q1.** Nodes {A,B,C,D}. Edges: A→B(2), A→C(5), B→D(3), C→D(1). Shortest A→D path?

$b_A = 1, b_D = -1, b_B = b_C = 0$. Optimal: $x_{AB} = 1, x_{BD} = 1$. Cost = 5.

**Q2.** Reliabilities 0.9, 0.95, 0.8 on a path. Log-costs?

$c = -\log r$: 0.105, 0.051, 0.223. Sum = 0.379. Reliability = $e^{-0.379} = 0.685$.

**Q3.** "If path uses A→C AND C→E, must use J→L." Constraint?

$x_{A,C} + x_{C,E} - 1 \le x_{J,L}$.

**Q4.** P→LA piecewise: first 50 at $2, 51-100 at $4, beyond $5. Formulate.

Add vars $x_1$ (≤50, $2), $x_2$ (≤50, $4), $x_3$ (unlimited, $5). Conservation uses $x_1 + x_2 + x_3$. Objective adds $2x_1 + 4x_2 + 5x_3$.

**Q5.** Capacity on edge (P1,A1) ≤ 160 has shadow price −8. Meaning?

Each unit of additional capacity saves $8 cost. Edge is a bottleneck.

**Q6.** "Cannot use both edges B→F and J→K." Constraint?

$x_{B,F} + x_{J,K} \le 1$.

## 15. Cheat Card

| Concept | Formula |
|---|---|
| Flow conservation | $\sum_j x_{ji} + b_i = \sum_j x_{ij}$ |
| MCNF objective | $\min \sum c_{ij} x_{ij}$ |
| Supply/demand | $b_i > 0$ supply; $< 0$ demand; $= 0$ transshipment |
| Balanced | $\sum b_i = 0$ |
| Shortest path setup | $b_s = +1, b_t = -1$ |
| Max reliability | $c_{ij} = -\log r_{ij}$, minimize |
| Top-K paths | Iterative: $\sum_{(i,j)\in E^*_k} x_{ij} \le L_k - 1$ |
| TU breaks | Non-flow constraints → need IP |

**Critical reminder:** When problem says "no Σ notation," enumerate every variable explicitly.

**Piecewise template:** Cheap-tier var (capped), expensive-tier var (unlimited), both summed in conservation, separate cost terms in objective.

**Max reliability remember:** logs of reliabilities < 1 are NEGATIVE. Max = least negative.

---

## 🎙️ Lecture Transcript Insights — Beyond the Slides

From Prof. Misic's 5/13 lecture.

### Exam Emphasis (Direct Quotes)

- Network flows and shortest path are **heavily tested**. Expect multiple questions.
- **3-hour exam.** Pace yourself.
- Focus on understanding FORMULATIONS, not memorizing code. Write constraints from scratch OR identify missing constraints in partial formulations.
- Practice problems include 5 from last year + 4 new ones. Some intentionally harder for learning.
- **Exam often asks: "How would you MODIFY this formulation to account for [X]?"** rather than from scratch.

### Verbal Clarifications

**Flow Conservation — Two Interpretations:**
1. LOGICAL: Decision variable = whether edge is in the path (binary).
2. PHYSICAL: Variable = units of FLOW (fluid/product) flowing through node.

> *"This dual perspective clarifies why removing the binary constraint still yields integer solutions."*

**Total Unimodularity Fragility:**

> *"Network flow constraint matrix has total unimodularity: every square submatrix has determinant ∈ {−1, 0, +1}. This means: if you relax binary, LP automatically gives integer solution."*

**BUT this property is FRAGILE.** Add ONE non-flow-conservation constraint (e.g., "edge A or edge B but not both") → LP returns fractional (e.g., 0.5).

### Setup Strategy (Verbal Step-by-Step)

1. **Identify network:** nodes (cities), edges (roads), weights (times).
2. **Define decision variables:** binary $x_{ij}$ = 1 if edge in path.
3. **Flow at origin:** exactly one outgoing edge.
4. **Flow at destination:** exactly one incoming edge.
5. **Flow at intermediate nodes:** # in = # out.
6. **Objective:** min $\sum$ weight $\times x$.

### Common Mistakes (Flagged Verbally)

**MISSING flow balance** — a frequent error:
- WRONG: $x_{BD} + x_{BF} = 1$ for intermediate node B (forces an outgoing edge whether or not you enter B).
- RIGHT: $x_{AB} = x_{BD} + x_{BF}$ (only if you enter B from A do you exit B).

**Conditional vs unconditional:**
- $x_{BD} + x_{BF} = x_{AB}$ is conditional: "IF I enter B (i.e., $x_{AB}=1$), THEN I exit via exactly one edge."
- $x_{AB} \cdot (x_{BD} + x_{BF}) = x_{AB}$ is NONLINEAR → can't solve in Gurobi.

**Ambiguous summation indices:** When nesting sums, use different symbols ($t$ vs $t'$).

### Worked Example — Shortest Path A→K

Network: 11 nodes (A–K), weighted edges. Students manually found:
- Naive guess: A→B→E→H→I→K = 12 hours
- **Optimal (LP solved):** A→B→F→J→K = **9 hours**

> *"It's NOT obvious by inspection. You need the LP to guarantee optimality."*

**Demo:** Notebook solves as LP (no binary). Solution comes back binary automatically (proof of TU magic).

**Then added non-network constraint** "$x_{BF} + x_{JK} \le 1$" → LP returned $x_{BF} = 0.5$. TU broken. Need binary explicitly now.

### Key Exam Focus Areas (Direct Verbal Ranking)

1. **Facility Location & Pricing formulations** — be super comfortable.
2. **Network Flows & Shortest Path** — MAIN exam focus.
3. **TSP** — next week, will be tested IF time permits (less weight if time-constrained).
4. **Constraint tweaks** — practice MODIFYING formulations.

### Student Q&A

- **"Gamma sign in pricing?"** Positive = substitute; negative = complement. Affects how products interact.
- **"Semi-log demand?"** Mentioned but skipped — results in extreme pricing (always min/max of price range).
- **"Extrapolation risk?"** If recommendations deviate far from observed price combos → demand model unreliable. Sanity-check vs historical averages.

### Logistics Mentioned

- HW3 due 5/13 night
- HW1-2 solutions posted
- Final exam preparation guide on class site with topics by week
- Professor has 2TB Dropbox; academic email won't deactivate

### Bottom Line for Exam

> *"Master shortest path + min-cost network flow LP formulations (with flow conservation), understand WHY integer relaxation yields integer solutions, and practice constraint modifications. Pricing (linear demand IP) is secondary; semi-log and log-log are reference material only."*
