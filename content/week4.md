# Week 4 — Location Models & Formulation Strength

## 0. Big Picture

**The core problem:** where to place facilities — hospitals, AEDs, bike docks, warehouses — to serve customers. Three different objectives lead to three different models. **Formulation matters dramatically**: the SAME problem with different constraint structures can solve 10-100× faster.

## 1. The Three Core Models

| Model | Goal | Real example | Keyword cue |
|-------|------|--------------|-------------|
| **MCLP** | Max # customers within distance $D$ | AED placement | "within distance D", "coverage" |
| **p-median** | Min total/avg distance | Bike docks, mailboxes | "average travel time", "total distance" |
| **p-center** | Min worst-case (max) distance | Hospital ERs | "worst-case", "no one too far" |

## 2. Maximum Coverage (MCLP — 最大覆盖)

### Setup
- $n$ candidate sites, $m$ demand points, coverage distance $D$
- Open exactly $p$ facilities, maximize covered customers
- $N(j)$ = set of sites within $D$ of customer $j$

### Variables
- $x_i \in \{0,1\}$: open site $i$
- $y_j \in \{0,1\}$: customer $j$ is covered

### Formulation
$$\max \sum_{j=1}^{m} y_j$$
$$\text{s.t. } y_j \le \sum_{i \in N(j)} x_i \quad \forall j$$
$$\sum_{i=1}^{n} x_i = p$$
$$x_i, y_j \in \{0,1\}$$

**Meaning of constraints:**
- $y_j \le \sum_{i \in N(j)} x_i$: customer $j$ can be "covered" only if at least one covering site is open.
- $\sum x_i = p$: open exactly $p$.

### AED Example (Lecture)
Prof. Siddiq's research: place AEDs in public buildings to maximize coverage of historical cardiac arrest locations. Within 2-minute walk (~200m). Solved via MCLP.

### Tiny Example
3 candidate stations, 5 customers, $D = 400$m:

| Covered? | S1 | S2 | S3 |
|---|---|---|---|
| C1 | ✓ | | |
| C2 | | ✓ | |
| C3 | ✓ | ✓ | |
| C4 | | ✓ | ✓ |
| C5 | ✓ | | ✓ |

With $p=2$: open S1+S2 covers C1, C2, C3, C4 (4 customers).

## 3. p-Median Problem (中位选址)

### Setup
- Open $p$ facilities AND assign each customer to one open facility
- Minimize TOTAL (or average) distance

### Variables
- $x_j \in \{0,1\}$: open facility $j$
- $z_{ij} \in \{0,1\}$: customer $i$ assigned to facility $j$

### Formulation
$$\min \sum_i \sum_j d_{ij} z_{ij}$$
$$\text{s.t. } \sum_j z_{ij} = 1 \quad \forall i \quad \text{(each customer assigned)}$$
$$z_{ij} \le x_j \quad \forall i,j \quad \text{(assign only if open — STRONG form)}$$
$$\sum_j x_j = p$$
$$x_j, z_{ij} \in \{0,1\}$$

**Why $z_{ij} \le x_j$?** If facility $j$ is closed ($x_j = 0$), nobody can be assigned to it.

### Insight
At optimality, each customer is assigned to its **nearest open facility** — but the LP doesn't enforce that directly; it falls out from minimization.

### Bike Dock Example (Notebook)
350 customers, 42 candidate sites, $p = 5$. Optimal: stations [0, 6, 24, 34, 41], total distance 159,124m, avg 454.64m/customer, solve time 0.22s.

## 4. p-Center Problem (中心选址)

### Setup
Same as p-median but minimize the MAX distance any customer travels.

### Variables (add)
- $r$ = max distance (continuous auxiliary variable)

### Formulation
$$\min r$$
$$\text{s.t. } r \ge \sum_j d_{ij} z_{ij} \quad \forall i \quad \text{(worst-case constraint)}$$
$$\sum_j z_{ij} = 1 \quad \forall i$$
$$z_{ij} \le x_j$$
$$\sum_j x_j = p$$
$$r \ge 0, \quad x_j, z_{ij} \in \{0,1\}$$

**How min-r works:** $r$ must be ≥ each customer's distance. Solver pushes $r$ down to MAX customer distance.

### p-Median vs p-Center
- p-median: most people short walks, a few far
- p-center: no one too far (fairness)
- Ambulance/ER → p-center; mail → p-median

### Bike Dock p-Center
Max distance ≈ 1,371m. Solution spreads docks more evenly (includes outlier near Beverly Glen/Sunset that p-median skipped).

## 5. The Dock Station Notebook — Cell Walkthrough

### Cells 1-11: Load data
```python
customers_df = pd.read_csv('customers_raw_v2.csv')  # 350
stations_df = pd.read_csv('stations_raw_v2.csv')    # 42
distance_df = pd.read_csv('stations_dist_mat_v2.csv')
m = 350; n = 42
distance_2d = distance_df['Distance'].values.reshape(n, m)
```

### Cell 13: Model 1 (Strong Formulation, p-median)
```python
m1 = Model()
x = m1.addVars(n, vtype=GRB.BINARY)
y = m1.addVars(n, m, vtype=GRB.BINARY)
for j in range(m):
    m1.addConstr(sum(y[i,j] for i in range(n)) == 1)
    for i in range(n):
        m1.addConstr(y[i,j] <= x[i])  # STRONG: per (i,j)
m1.addConstr(sum(x[i] for i in range(n)) == 5)
m1.setObjective((1.0/m) * sum(distance_2d[i,j]*y[i,j] for i in range(n) for j in range(m)), GRB.MINIMIZE)
m1.optimize()
# Optimal: [0,6,24,34,41], 454.64 avg, 0.22s
```

### Cell 16: Model 2 (Weak Formulation, p-median)
```python
# Same except linking:
for i in range(n):
    m2.addConstr(sum(y2[i,j] for j in range(m)) <= m * x2[i])  # WEAK: aggregated
# Same optimal IP solution, but 3.14s (14× slower!)
```

### Cell 21: LP Relaxations
```python
r1 = m1.relax(); r1.optimize()  # 159,124 (= integer optimum!)
r2 = m2.relax(); r2.optimize()  # 232.76 (loose!)
```

### Cells 24-28: Visualization (Folium maps)
### Cells 30-35: MCLP version (D=400m, 197/350 covered with p=5)
### Cells 39-42: p-Center version (max dist = 1,371m)

## 6. Formulation Strength — Why It Matters 强公式

### LP Relaxation (线性松弛)
Drop binary, allow $x \in [0,1]$. The LP is easier to solve. For MIN problem:
$$Z_{LP} \le Z^*_{IP}$$
LP gives a LOWER BOUND on integer optimum.

### Branch-and-Bound Uses LP Bounds
1. Solve LP relaxation at root.
2. If LP optimum is integer, DONE.
3. Otherwise, branch (split on fractional variable), recurse.
4. **Tighter LP bound = better pruning = fewer nodes = faster solve.**

### Strong vs Weak Constraints (CRITICAL)
**Strong (disaggregated):** $z_{ij} \le x_j$ for EACH (i,j) pair.
**Weak (aggregated):** $\sum_j y_{ij} \le m \cdot x_i$.

Both VALID for IP. But the strong form has a TIGHTER LP feasible region:
- Strong LP region ⊆ Weak LP region
- Therefore Strong LP optimum ≥ Weak LP optimum (for min)
- Strong gives BETTER bound

### Dock Station Numbers
| Metric | Strong (Model 1) | Weak (Model 2) |
|---|---|---|
| LP relaxation | 159,124 | 232.76 |
| Integer optimum | 159,124 | 159,124 (same!) |
| Gap at root | 0% | 48.8% |
| Nodes explored | 1 | 198 |
| Solve time | 0.22s | 3.14s |

### Tiny Example
$\max x_1 + x_2$ s.t. $x_1 \le 2, x_2 \le 2$. Strong: LP = 4 (tight). Tighter alternative: $x_1 + x_2 \le 2$. LP = 2 (= IP).

## 7. Common Modifications

| Requirement | Constraint |
|---|---|
| Each facility serves ≤ K customers | $\sum_i z_{ij} \le K \cdot x_j$ |
| Open between $m$ and $M$ | $m \le \sum_j x_j \le M$ |
| Facility $j$ must open | $x_j = 1$ |
| Mutually exclusive | $x_i + x_j \le 1$ |
| If $i$ open then $k$ open | $x_i \le x_k$ |
| Open at least one of $A, B, C$ | $x_A + x_B + x_C \ge 1$ |

## 8. Step-by-Step Method

### (a) Identify model type
- "minimize average/total distance" → p-median
- "minimize worst/max distance" → p-center
- "within distance D" → MCLP

### (b) Define variables
- $x_j$: open facility
- $z_{ij}$: assign customer
- $y_j$: covered (MCLP)
- $r$: max distance (p-center)

### (c) Write objective
- p-median: $\min \sum d_{ij} z_{ij}$
- p-center: $\min r$
- MCLP: $\max \sum y_j$

### (d) Write constraints in order
1. Assignment / coverage
2. Linking (use STRONG form)
3. Worst-case (p-center only)
4. Cardinality
5. Side constraints

### (e) Choose strong formulation if asked

## 9. Common Mistakes ⚠️

1. **Weak instead of strong constraint** when not asked.
2. **Forgetting binary declarations.**
3. **Using $= p$** when "at most $p$" → should be $\le p$.
4. **MCLP backwards:** $y_j \ge \sum$ instead of $y_j \le \sum$.
5. **Forgetting r ≥ ...** in p-center.
6. **Mixing assignment and coverage:** MCLP uses $y_j$ (coverage); p-median uses $z_{ij}$ (assignment).
7. **Adding redundant strong + weak** (wastes solve time).
8. **Hard-coding numbers** when generalization expected.

## 10. Exam Relevance

Exam slides explicitly list 3 location question types:
1. "Formulate as MCLP / p-median / p-center."
2. "Write two formulations of p-median. Which is stronger? Why?"
3. "Modify formulation to add side constraint (e.g., capacity K per facility)."

## 11. Mini Practice

**Q1.** "Place 2 hospitals minimizing average response time." → p-median.

**Q2.** "Place 5 AEDs maximize coverage within 300m." → MCLP:
$$\max \sum_j y_j \text{ s.t. } y_j \le \sum_{i \in N(j)} x_i, \sum x_i = 5, \text{binary}$$

**Q3.** "Each dock serves ≤ 20 customers." Constraint: $\sum_i z_{ij} \le 20 x_j \quad \forall j$.

**Q4.** Strong LP value = 1200, weak LP = 950 (min problem). Which stronger? Strong has 1200 ≥ 950. Wait — for MIN problem, STRONGER means HIGHER LP value (tighter bound from below). So 1200 is stronger.

**Q5.** "If facility 3 opens, then facility 7 must also open." Constraint: $x_3 \le x_7$.

## 12. Cheat Card

| Model | Objective | Variables | Key Constraints |
|-------|-----------|-----------|-----------------|
| MCLP | $\max \sum_j y_j$ | $x_i, y_j$ | $y_j \le \sum_{i\in N(j)} x_i$; $\sum x_i = p$ |
| p-median | $\min \sum_i\sum_j d_{ij} z_{ij}$ | $x_j, z_{ij}$ | $\sum_j z_{ij}=1$; $z_{ij}\le x_j$ (STRONG); $\sum x_j = p$ |
| p-center | $\min r$ | $x_j, z_{ij}, r$ | $r \ge \sum_j d_{ij} z_{ij}$ + p-median constraints |

**Formulation strength rule:** Strong (disaggregated $z_{ij} \le x_j$) beats Weak (aggregated $\sum_j z_{ij} \le m \cdot x_i$) — tighter LP, faster solve.

---

## 🎙️ Lecture Transcript Insights — Beyond the Slides

From Prof. Misic's 4/22 lecture.

### Three Models — When to Pick Which (Repeated for Emphasis)

- **p-Median:** Best when equity in AVERAGE service is the goal. General efficiency.
- **MCLP:** Best when a distance THRESHOLD matters (e.g., hospital within 10 min). Coverage is binary — either served or not.
- **p-Center:** Best when you must protect the FURTHEST customer. Real application: defibrillator (AED) placement — every person needs quick access, not just on average.

Not arbitrary — the problem's wording determines the model. If decision-maker cares about "bad outcomes" → p-center. If only threshold matters → MCLP.

### Formulation Strength — THE Big Idea

**Concrete numbers from dock-location notebook:**

| Formulation | LP relaxation value | Solve time |
|---|---|---|
| Strong: $y_{ij} \le x_i$ per pair | **454.64** (= integer optimum!) | 0.18 s |
| Weak: $\sum_j y_{ij} \le M \cdot x_i$ aggregated | **232** (loose!) | 1.6 s (~9× slower) |

> *"Be explicit with constraints, not aggregate. Tighter formulation = better bounds = faster branch-and-bound = shorter solve times."*

Why the difference? The aggregate constraint allows fractional spreading (e.g., $y_{i1}=0.3, y_{i2}=0.6, y_{i3}=0.4$ sums to 1.3 ≤ 1.5 even though 0.6 > 0.5). The disaggregated form blocks this directly.

### MCLP Formulation Nuances

**Coverage is FLEXIBLE.** $a_{ij}$ can be distance-based (400m threshold) or context-dependent (e.g., "ultra-fast scooter only at Westwood dock" → that dock covers specific customers).

**Key constraint trick:**
> Coverage constraint $z_j \le \sum_i a_{ij} x_i$ uses ≤ (not =) because MAXIMIZATION naturally drives $z_j$ to 1 when covered. If RHS ≥ 1, objective wants $z_j = 1$.

**Student Q&A:** "Why not just sum $a_{ij}$ without $x_i$?" Because that ignores WHICH locations you opened. You need $a_{ij} \cdot x_i$ to count coverage only from selected locations.

### Visual Differences in Optimal Solutions

**p-Median:** Docks in CENTER of dense customer clusters (minimizes average distance). Spreads more evenly.

**MCLP (400m threshold):** More docks in DENSE regions, fewer on periphery. AVOIDS opening docks in sparse areas (don't help coverage). 
- Example: West of campus → 1 dock in p-median, but 2 docks in MCLP (dense area, more coverage gained).

**p-Center:** Spreads docks to ensure WORST customer isn't too far. Different from both above.

### Parameter Sensitivity (Coverage Curve)

Sweep "open exactly $p$ stations" from 0 to 42, plot coverage vs $p$:
- Concave curve, diminishing returns
- "Elbow point" where additional stations add little value
- **Hard ceiling:** Not all 350 customers coverable even with all 42 stations. 40 are too far from all candidate docks → max coverage = **310, not 350**.

> *"Sensitivity via parameter sweep is general — useful for ANY problem with uncertain parameters. Shows which parameter changes matter most."*

### Technical Exam Tips

1. **Binary logic:** $y_{ij} \le x_i$ reads as "IF customer assigned, location MUST open" (implication). Contrapositive: "IF location closed, customer not assigned."
2. **Don't use $=$ in MCLP coverage constraint** — that forces each customer covered EXACTLY once, often infeasible.
3. **LP relaxation = lower bound** (for min). Gap to integer = formulation quality.
4. **Dividing objective by $m$** doesn't change solution, only scales (for reporting "average").

### Formulation Strength Intuition (Exam Key)

Given two valid formulations:
- More EXPLICIT constraints (not aggregated) = stronger lower bound = faster integer solve.
- Fewer degrees of freedom for fractional solutions = harder to move away from integer.

Real-world impact: 10–100× faster solve. **Exam likely asks: compare two formulations, predict which solves faster (stronger one wins).**
