# Week 8 — Traveling Salesman Problem 旅行商问题

## 0. Big Picture

A salesman starts in one city, must visit $n$ cities EXACTLY ONCE, and return to start. Minimize total distance.

**Real applications:** warehouse order picking, delivery routing, manufacturing sequencing (e.g., aluminum alloy production order), circuit board drilling.

TSP is **NP-hard**. With $n=20$ → $6 \times 10^{16}$ tours. Can't brute force. But modern solvers + **lazy constraint generation** solve $n = 61$ in seconds.

## 1. Why TSP is Hard

Number of distinct tours = $(n-1)!/2$ for symmetric. For $n = 60$: $\approx 10^{81}$. Universe is $10^{10}$ years old. Brute force impossible.

## 2. Naive Formulation (Why It Fails)

### Variables
$x_{ij} \in \{0,1\}$: travel directly from city $i$ to city $j$ (directed).

### Degree Constraints 度约束
$$\sum_{j \ne i} x_{ij} = 1 \quad \forall i \quad \text{(leave each city once)}$$
$$\sum_{j \ne i} x_{ji} = 1 \quad \forall i \quad \text{(enter each city once)}$$

### Objective
$$\min \sum_i \sum_{j \ne i} d_{ij} x_{ij}$$

### Why It Fails: Subtours
Degree constraints alone allow **disconnected cycles**.

**Example (n=4):** $x_{12}=1, x_{21}=1, x_{34}=1, x_{43}=1$. All degree constraints satisfied. But this is two 2-cycles, NOT a single tour!

## 3. Subtour Elimination Constraints (SECs) 子环路消除约束

### Definition
A **subtour** is a cycle through a proper subset $S \subsetneq V$ of cities.

### SEC
For every proper nonempty subset $S \subsetneq V$:
$$\sum_{i \in S} \sum_{j \in S, j \ne i} x_{ij} \le |S| - 1$$

**Intuition:** A cycle within $S$ would use $|S|$ edges. Allowing at most $|S| - 1$ internal edges forbids cycles within $S$.

### Equivalent Cut Form
$$\sum_{i \in S, j \notin S} x_{ij} \ge 1$$

"At least one edge must leave subset $S$" → ensures connectivity.

### Examples
**$S = \{1, 2\}$:** $x_{12} + x_{21} \le 1$.
**$S = \{0, 1, 8\}$ (3 cities):** $x_{01}+x_{08}+x_{10}+x_{18}+x_{80}+x_{81} \le 2$ (6 ordered pairs, allow at most 2 = $|S|-1$).

### The Constraint Count Problem
$2^n - 2$ proper nonempty subsets. For $n = 61$: $2 \times 10^{18}$. Impossible to list explicitly. Use lazy constraints.

## 4. Lazy Constraint Generation 懒约束回调

### Algorithm
1. Solve with ONLY degree constraints.
2. Solver finds integer solution (may have subtours).
3. **Callback** detects subtours via `getSubtours()`.
4. For each detected subtour $S$: add SEC dynamically.
5. Solver continues. Repeat until ONE tour spans all $n$ cities.

### Gurobi Syntax
```python
m.params.LazyConstraints = 1

def eliminateSubtours(model, where):
    if where == GRB.Callback.MIPSOL:
        x_val = model.cbGetSolution(x)
        sequence = [(i,j) for (i,j) in od_pairs if x_val[i,j] > 0.5]
        subtour_list = getSubtours(sequence)
        if len(subtour_list) > 1:
            for S in subtour_list:
                model.cbLazy(
                    sum(x[i,j] for i in S for j in S if i!=j) <= len(S) - 1
                )

m.optimize(eliminateSubtours)
```

## 5. getSubtours Function — Detailed Trace

```python
def getSubtours(sequence):
    subtour_list = []
    unvisited = list(range(n))
    while len(unvisited) > 0:
        node = unvisited[0]
        unvisited.remove(node)
        subtour = [node]
        next_node = list(filter(lambda t: t[0]==node, sequence))[0][1]
        while next_node in unvisited:
            subtour.append(next_node)
            unvisited.remove(next_node)
            next_node = list(filter(lambda t: t[0]==next_node, sequence))[0][1]
        subtour_list.append(subtour)
    return subtour_list
```

**Algorithm:**
- Pick an unvisited node, follow outgoing edges through sequence.
- Stop when you hit a visited node (cycle closes).
- Record as one subtour; repeat with remaining unvisited.

### Trace Example (Practice Problem n=9)
sequence = `[(2,5),(1,8),(3,2),(4,6),(0,1),(7,3),(6,4),(8,0),(5,7)]`

Start from node 0:
- 0 → 1 → 8 → 0. Subtour: [0, 1, 8]. Remove from unvisited.

Pick next unvisited (2):
- 2 → 5 → 7 → 3 → 2. Subtour: [2, 5, 7, 3].

Pick next (4):
- 4 → 6 → 4. Subtour: [4, 6].

**Final output:** `[[0,1,8], [2,5,7,3], [4,6]]`.

This is HIGH EXAM RELEVANCE — likely to be asked.

## 6. The Starbucks Notebook — Cell Walkthrough

61 Starbucks locations in West LA. Google Maps travel times (asymmetric).

```python
starbucks_locations = pd.read_csv("starbucks_address_lat_lon.csv")  # 61 rows
dist_mat = pd.read_csv("starbucks_dist_mat_full_noNAs.csv")
# Use "Time" column (seconds)
```

### Build model with degree constraints only
```python
m = Model()
x = m.addVars(od_pairs, vtype=GRB.BINARY)
for i in range(61):
    m.addConstr(sum(x[i,j] for j in range(61) if j!=i) == 1)
    m.addConstr(sum(x[j,i] for j in range(61) if j!=i) == 1)
m.setObjective(sum(time[i,j]*x[i,j] for (i,j) in od_pairs), GRB.MINIMIZE)
```

### Add lazy callback (see Section 4)

### Solve
```python
m.params.LazyConstraints = 1
m.optimize(eliminateSubtours)
# Optimal tour: 16,816 seconds (~4hr 40min)
# ~101 lazy SECs added
# Solve time < 1 second
```

### Tour reconstruction & visualization
```python
sequence = [(i,j) for (i,j) in od_pairs if x[i,j].x > 0.5]
complete_tour = getSubtours(sequence)[0]  # Single tour
# Plot on Folium map
```

## 7. Hand-Computable 4-City Example

Distance matrix:
```
    0   1   2   3
0   -  10  15  20
1  10   -   5  12
2  15   5   -   8
3  20  12   8   -
```

**Naive (degree only):** Solver might return $x_{01}=x_{10}=x_{23}=x_{32}=1$. Cost = 36. But TWO subtours: {0,1} and {2,3}.

**Add SECs:**
- $x_{01} + x_{10} \le 1$
- $x_{23} + x_{32} \le 1$

**Re-solve:** Forces $x_{01}=x_{12}=x_{23}=x_{30}=1$ (tour 0→1→2→3→0). Cost = 10+5+8+20 = 43. Valid single tour. Done.

## 8. Manhattan Distance Formula

For warehouse problem: $d_{ij} = (1/c)(|u_i - u_j| + |v_i - v_j|)$, where $c$ = speed.

**Example:** Locations (0,0), (50,30), (20,80), speed 10 m/s.
- $d_{01} = (50+30)/10 = 8$s
- $d_{02} = (20+80)/10 = 10$s
- $d_{12} = (30+50)/10 = 8$s

Both directions identical → symmetric.

## 9. TSP Modifications

### A. End at Different Location (n+1)
Add node $n+1$, distances $t_{i,n+1}$ from each location. Add constraint $x_{n+1, 1} = 1$ (so "tour" wraps from end back to start; meaningful path is start → ... → $n+1$).

### B. Hamiltonian Path (different start, end)
- Start city: out-degree = 1, in-degree = 0
- End city: out-degree = 0, in-degree = 1
- Others: in = out = 1

### C. Time Windows (TSPTW)
Add continuous $t_i$ = arrival time. Constraints:
- $a_i \le t_i \le b_i$ (window)
- $t_j \ge t_i + d_{ij} - M(1 - x_{ij})$ (big-M propagation)

### D. Vehicle Capacity (CVRP)
Add flow $f_{ij}$ variables tracking load. $f_{ij} \le Q x_{ij}$.

### E. Multiple Vehicles (mTSP)
$x_{ijk}$ indexed by vehicle. Each city visited by exactly one vehicle.

## 10. Practice Problem TSP-I (Warehouse) — Full Walkthrough

### Setup
- $n-1$ items + start location 1
- Each item at $(u_i, v_i)$
- Speed $c$
- Distance $t_{ij} = (1/c)(|u_i - u_j| + |v_i - v_j|)$

### (a) IP Formulation
$$\min \sum_i \sum_{j \ne i} t_{ij} x_{ij}$$
s.t. degree constraints, SECs for all proper subsets, binary.

### (b) Trace getSubtours
sequence = `[(2,5),(1,8),(3,2),(4,6),(0,1),(7,3),(6,4),(8,0),(5,7)]`
Output: `[[0,1,8], [2,5,7,3], [4,6]]`.

### (c) SECs Added by Callback
For [0,1,8]: $x_{01}+x_{08}+x_{10}+x_{18}+x_{80}+x_{81} \le 2$.
For [2,5,7,3]: 12 terms, $\le 3$.
For [4,6]: $x_{46} + x_{64} \le 1$.

### (d) Modification: End at Different Location (n+1)
Add node $n+1$, distances from coordinates, set $x_{n+1, 1} = 1$.

## 11. Step-by-Step Methods

### (a) Recognize TSP from word problem
Single entity visits multiple locations, returns to start, minimize distance.

### (b) Compute distance matrix
Manhattan or Euclidean per problem. Convert to time if speed given.

### (c) Write degree constraints
In-degree = 1, out-degree = 1 for each city.

### (d) Add SECs (lazy callback for $n > 10$)

### (e) Trace getSubtours
Pick unvisited, follow edges, close cycle, repeat.

### (f) Identify SECs from subtour list
For each subtour $S$: $\sum_{i \in S} \sum_{j \in S, j \ne i} x_{ij} \le |S| - 1$.

### (g) Modify for end-at-different-location

## 12. Common Mistakes ⚠️

1. **Forgetting SECs entirely.** Naïve formulation produces subtours.
2. **Confused directed vs undirected.** Both $x_{ij}$ AND $x_{ji}$ in SEC.
3. **Wrong RHS in SEC.** It's $|S| - 1$, NOT $|S|$.
4. **Missing $j \ne i$ qualifier.** Excludes self-loops.
5. **Wrong getSubtours trace** — track unvisited carefully.
6. **Callback fires only at MIPSOL,** not every LP node.
7. **Forgetting to set LazyConstraints = 1.**
8. **Single-node "subtours"** shouldn't generate SECs (callback checks $> 1$).
9. **Big-M too small** in TSPTW.

## 13. Exam Relevance

Exam slides list 4 TSP question types:
1. **Formulate IP** (recognize TSP, write degree + SEC + binary).
2. **Trace getSubtours** for given sequence.
3. **Identify SECs added by callback** for given subtour list.
4. **Modify formulation** (end at different location, etc.).

Practice TSP-I covers all 4. Study it thoroughly.

## 14. Mini Practice

**Q1.** 8 stores + central hub. Formulate TSP.

$\min \sum t_{ij} x_{ij}$ s.t. degree=1 each city, SECs for all subsets, binary.

**Q2.** Locations (20,30) and (60,50), speed 5 m/s. Manhattan time?

$d = |40| + |20| = 60$. $t = 60/5 = 12$s.

**Q3.** sequence = `[(0,1),(1,3),(3,0),(2,4),(4,2)]`. getSubtours output?

Pop 0: 0 → 1 → 3 → 0. [0,1,3].
Pop 2: 2 → 4 → 2. [2,4].
Output: `[[0,1,3], [2,4]]`.

**Q4.** SECs for detected subtours [1,2] and [3,4,5]?

For {1,2}: $x_{12} + x_{21} \le 1$.
For {3,4,5}: $x_{34}+x_{35}+x_{43}+x_{45}+x_{53}+x_{54} \le 2$.

**Q5.** Modify formulation for time windows $[a_i, b_i]$.

Add continuous $t_i$, constraints $a_i \le t_i \le b_i$ and $t_j \ge t_i + d_{ij} - M(1 - x_{ij})$.

## 15. Cheat Card

### TSP Formulation
```
VARIABLES: x_ij ∈ {0,1} for i≠j
OBJECTIVE: min Σ_i Σ_{j≠i} d_ij x_ij
CONSTRAINTS:
  Σ_{j≠i} x_ij = 1  ∀i  (out-degree)
  Σ_{j≠i} x_ji = 1  ∀i  (in-degree)
  Σ_{i∈S} Σ_{j∈S,j≠i} x_ij ≤ |S|-1  ∀S⊊V, S≠∅  (SEC)
  x_ij ∈ {0,1}
```

### getSubtours Logic
1. Pick unvisited node.
2. Follow outgoing edges through sequence.
3. Stop at visited node (cycle closes).
4. Record subtour, remove from unvisited, repeat.

### Lazy Callback (Gurobi)
- `m.params.LazyConstraints = 1`
- Inside callback at `MIPSOL`:
  - `model.cbGetSolution(x)`
  - Find subtours
  - `model.cbLazy(...)`for each subtour

### Key Reminders
- SECs use BOTH $x_{ij}$ and $x_{ji}$ (directed).
- RHS of SEC is $|S| - 1$.
- $\sum_{i \in S} \sum_{j \in S, j \ne i}$ → counts each directed pair once.
- $|S|$ nodes → up to $|S|(|S|-1)$ ordered pairs → cap at $|S|-1$.

---

## 🎙️ Lecture Transcript Insights — Beyond the Slides

From Prof. Misic's 5/20 lecture (TSP intro) + 5/27 (TSP continuation + EXAM PREP).

### Setup Reminders

**Starbucks problem:** Replenish 61 West LA Starbucks locations from one vehicle. Travel times from Google Maps API are ASYMMETRIC (one-way streets, traffic).

**Naive formulation fails:** Only degree constraints → solver produces multiple DISCONNECTED CYCLES (subtours).

### Why getSubtours Walkthrough Is GUARANTEED on Exam

> ❗ ***Prof's exact words: "If you encounter this question in the exam... I will give you this code. I would expect you to be able to read it. And, if I ask you what's the output... you should be able to do that."***

This is a CONFIRMED exam question type. Practice tracing the function.

### Subtour Elimination Manually (Toy 4-City)

Without SECs: solver returns (0→3→0) and (1→2→1). Two disconnected cycles.

Manually add:
- $x_{14} + x_{41} \le 1$ — forbid 1↔4 cycle
- $x_{23} + x_{32} \le 1$ — forbid 2↔3 cycle

After adding: optimal jumps from **841 → 938**, single tour (0→3→2→1→0).

### Complexity (Why Lazy Constraints Matter)

Number of subsets for $N$ cities: $2^N$.
- $N=10$: ~1,000 constraints
- $N=20$: ~1,000,000 constraints
- $N=30$: ~1,000,000,000 constraints
- $N=61$: $\approx 2.3 \times 10^{18}$

> *"Impossible to enumerate upfront."*

### Lazy Constraint Algorithm

1. Solve TSP WITHOUT subtour constraints.
2. Check solution for subtours via getSubtours().
3. If subtours found, ADD constraints eliminating them.
4. Re-solve.
5. Repeat until single tour remains.

### Starbucks Solution Stats

- Optimal: **16,816 seconds** ≈ 4.67 hours driving
- Only **91 lazy constraints** needed (not $2^{61}$!)
- Solved in **< 0.2 seconds**

> *"Demonstrates the BET that few constraints suffice in practice."*

### When getSubtours Returns 1 Element

`len(subtour_list) == 1` ⇒ NOT actually a subtour — it's the COMPLETE TOUR. Solution is feasible.

### Multiple Subtours in Single Callback

If 3 subtours found: add 3 constraints in ONE callback invocation. More efficient than one-per-iteration.

---

# 🚨 FINAL REVIEW SESSION INSIGHTS (5/27)

## EXAM SCOPE & COVERAGE — CONFIRMED

### What IS on the Exam

> *Prof. Misic's EXACT quote (5/27):*
> *"Basically everything through the end of the week, which we just finished, all of that is fair game for the final exam. So any of those topics from LP duality to traveling salesman problem, which we just finished, all of that can show up in the exam."*

**Confirmed topics (Weeks 1–8):**
1. LP Duality
2. Revenue Management
3. Inventory / Newsvendor
4. Location
5. Assortment
6. Pricing
7. Network Flow / Shortest Path / Min-Cost
8. TSP

### What is NOT on the Exam

> *Prof's exact words (5/27):*
> *"What we're going to start now is column generation, which I will not test you on the exam."*

**EXCLUDED:**
- Column Generation (Week 9)
- Matching Problem (Week 10, organ/kidney) — comes after column generation

### Exam Structure

- **~6 questions with multiple parts**
- **NOT ALL 8 TOPICS will be covered** — some may be omitted
- Multiple question types within each topic

### Exam Logistics

- **Non-graphing scientific calculator REQUIRED** (~$15 on Amazon, returnable)
- Graphing calculators NOT allowed
- Need it for numerical calculations
- Date/location/rules: see email + syllabus

## EXAM PREPARATION GUIDANCE (5/27)

### What Prof Said To Do

1. Review all **homework problems** you completed.
2. Work through all **practice problems**.
3. Pay attention to the **4 key weeks** of example problems on Final Exam Preparation slides.
4. Be comfortable with formulations from each week.

### Direct Quotes

> *"If you go through the practice problems on your own, you should be fine in the exam."*

> *"If you did the homework on your own [without copying to ChatGPT at 11pm], you will be fine with the exam."*

> *"If you did none of these... you have two weeks."*

### Sample Question Types (Direct Examples Given)

**LP Duality:**
- Given primal LP, formulate the dual.
- Verify solution optimality using dual.
- Interpret shadow prices.
- Predict objective change if resource quantity increases by 100 units.
- Understand shadow prices give LINEAR APPROXIMATION.

**Other weeks:** Listed in preparation slides (Slides_FinalExam.pdf).

## TSP-SPECIFIC EXAM EXPECTATIONS (5/27)

### Code Reading Question — CONFIRMED

> *"If you encounter this question in the exam, I will give you this code. I would expect you to be able to read it. And if I ask you what's the output, you should be able to do that."*

**You will be given:** the `getSubtours()` function code + an example input (sequence of edges).
**You'll be asked:** "What is the output (list of subtours)?"

**Similar question exists in practice problems** — use it to prepare.

### What You Must Master

- How `getSubtours()` traces edges from a solution.
- How it identifies cycles.
- How output list-of-lists is structured.
- Edge case: `len(subtour_list) == 1` (full valid tour, no more SECs needed).

## KEY TAKEAWAY

Prof. invested ENTIRE 5/27 lecture on TSP (except the W9 intro he flagged as not testable). This signals TSP is a **high-priority exam topic** — even though the final exam slide says "if time permits."

Subtour elimination + lazy constraint generation + getSubtours trace are the technical innovations to master.
