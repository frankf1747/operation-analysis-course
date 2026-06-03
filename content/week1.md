# Week 1 — LP Duality

## 0. Big Picture

Imagine you own a bakery and want to maximize profit by deciding what to bake. You know your ingredient limits: 26kg butter, 80kg flour, 5kg sugar. But here's a harder question: **what is each resource actually worth to your business?** If someone offered to sell you more flour at a certain price, should you buy it? Duality answers this by flipping your problem on its head. Instead of asking "how much should I produce to maximize revenue?", the dual problem asks "what prices should I charge for my raw ingredients if I'm competing in a resource market?" The primal problem tells you the optimal production plan; the dual problem tells you the implicit value—the **shadow price (影子价格)**—of each constrained resource. This is not just theoretical: these shadow prices let you make real business decisions about whether to buy more inputs, and they're free from solving the primal LP (the algorithm gives you both). Strong duality (强对偶) guarantees that the primal's optimal profit equals the dual's optimal resource valuation cost—they're two sides of the same coin. This week teaches you the mechanics of duality, how to derive the dual problem, and most importantly, how to interpret shadow prices to answer sensitivity questions (灵敏度分析) about your operations.

## 1. Quick LP Refresher (for the unprepared)

A **linear program** is an optimization problem where you maximize (or minimize) a linear objective function subject to linear constraints.

**Standard form (for a maximization problem):**
$$\text{maximize } \mathbf{c}^T \mathbf{x}$$
$$\text{subject to } A\mathbf{x} \le \mathbf{b}$$
$$\mathbf{x} \ge \mathbf{0}$$

**Key terms:**
- **Decision variables** ($\mathbf{x}$): what you're deciding (how much to produce, allocate, etc.)
- **Objective function** ($\mathbf{c}^T \mathbf{x}$): the profit, cost, or revenue you optimize
- **Constraints** ($A\mathbf{x} \le \mathbf{b}$): resource limits, requirements, etc.
- **Feasible region**: the set of all $\mathbf{x}$ satisfying all constraints
- **Optimal solution**: the feasible point with the best objective value

**Tiny 2-variable example:**
$$\text{maximize } 3x_1 + 2x_2 \quad \text{s.t.} \quad x_1 + x_2 \le 4,\; x_1, x_2 \ge 0$$

Geometrically, the feasible region is a triangle with corners at $(0,0)$, $(4,0)$, and $(0,4)$. The objective function $3x_1 + 2x_2$ defines a family of parallel lines. You slide these lines outward until they touch the feasible region at exactly one corner—here, $(4,0)$ with objective value $12$. That corner is the optimal solution.

## 2. Slide-by-Slide Walkthrough

### Introduction & Context
LP review from MGMTMSA 403, advancing to: (1) what is a dual problem, (2) what is a shadow price, (3) sensitivity analysis. Tools: Python + Gurobi + Jupyter.

### The Bakery Production Problem

A bakery produces three items weekly: buns, croissants, and muffins.

| Product | Unit Price | Butter (g/unit) | Flour (g/unit) | Sugar (g/unit) |
|---------|------------|-----------------|----------------|----------------|
| Bun     | $3.00      | 20              | 100            | 0              |
| Croissant | $4.00    | 100             | 50             | 50             |
| Muffin  | $4.50      | 10              | 0              | 150            |

Available: 26,000g butter, 80,000g flour, 5,000g sugar.

**Primal LP:**
$$\max 3x_B + 4x_C + 4.5x_M$$
$$\text{s.t.}\; 20x_B + 100x_C + 10x_M \le 26000 \text{ (butter)}$$
$$100x_B + 50x_C + 0x_M \le 80000 \text{ (flour)}$$
$$0x_B + 50x_C + 150x_M \le 5000 \text{ (sugar)}$$
$$x_B, x_C, x_M \ge 0$$

This is a recipe-balancing problem. Each product needs certain amounts of three ingredients. We have limited stock and want to maximize the total selling value.

### Bounding Our LP (Motivation for Duality)

"Can you obtain an upper bound on the best possible revenue without solving the LP?"

Combine the three constraints with weights $p_B$, $p_F$, $p_S \ge 0$:
$$p_B \cdot (\text{butter constraint}) + p_F \cdot (\text{flour constraint}) + p_S \cdot (\text{sugar constraint})$$

If we choose weights such that the left coefficients dominate the objective:
- $20p_B + 100p_F + 0p_S \ge 3$
- $100p_B + 50p_F + 50p_S \ge 4$
- $10p_B + 0p_F + 150p_S \ge 4.5$

Then for any feasible $x$: $3x_B + 4x_C + 4.5x_M \le 26000 p_B + 80000 p_F + 5000 p_S$.

**Why these weights?** They represent implicit prices for the resources.

### Weak Duality (弱对偶)

**Weak Duality Theorem:** For any feasible primal solution and any feasible dual solution:
$$\text{primal objective} \le \text{dual objective}$$

If we produce ($x_B = 100, x_C = 50, x_M = 0$) with revenue $700$, and guess prices $(p_B, p_F, p_S) = (0.02, 0.01, 0.05)$, the dual objective is:
$$0.02 \cdot 26000 + 0.01 \cdot 80000 + 0.05 \cdot 5000 = 1570$$
Weak duality: $700 \le 1570$ ✓.

This gives us a way to verify optimality: if primal = dual, both are optimal.

### Formulating the Dual Mechanically

For our **maximization primal** (3 ≤ constraints, 3 ≥0 variables), the **dual is minimization**:

**Dual:**
$$\min 26000p_B + 80000p_F + 5000p_S$$
$$\text{s.t.}\; 20p_B + 100p_F + 0p_S \ge 3 \text{ (bun's coef)}$$
$$100p_B + 50p_F + 50p_S \ge 4 \text{ (croissant's coef)}$$
$$10p_B + 0p_F + 150p_S \ge 4.5 \text{ (muffin's coef)}$$
$$p_B, p_F, p_S \ge 0$$

The dual has one variable per primal constraint and one constraint per primal variable. Dual objective sums RHS × prices; dual constraints ensure prices are "high enough" to cover product profitability.

### Strong Duality (强对偶)

**Strong Duality Theorem:** If the primal LP has an optimal solution, the dual LP also has an optimal solution, and the optimal objective values are EQUAL.

**Bakery example:**
- Primal optimal: $x_B = 750, x_C = 100, x_M = 0$ → Revenue = $3(750) + 4(100) = 2650$
- Dual optimal: $p_F = 0.03, p_S = 0.05, p_B = 0$ (from notebook) → Cost matches 2650 by strong duality

### Shadow Prices (影子价格)

The optimal dual variable $p_i$ for constraint $i$ is the **shadow price**. It answers:

> "How much would the optimal objective increase if I relax constraint $i$ by one unit?"

**Bakery interpretation:**
- Flour: $p_F = 0.03$/g → 1 extra gram of flour adds $0.03 revenue
- Sugar: $p_S = 0.05$/g → 1 extra gram of sugar adds $0.05 revenue
- Butter: $p_B = 0$/g → butter is not a bottleneck (we have 1000g unused)

**Decision rule:** Buy resource if market price < shadow price. If flour costs $0.02/g and shadow price is $0.03/g, buy it (net gain $0.01/g).

### Complementary Slackness (互补松弛)

At optimality:
- If primal variable $x_j > 0$ → corresponding dual constraint is **tight** (equality)
- If primal constraint $i$ has slack (LHS < RHS) → dual variable $p_i = 0$
- Equivalently: if $p_i > 0$, then primal constraint $i$ is binding

**Bakery check:**
- $x_B = 750 > 0$ → dual constraint for buns is tight: $20(0) + 100(0.03) + 0(0.05) = 3$ ✓
- $x_M = 0$ → dual constraint for muffins may have slack
- Butter slack = 1000 → $p_B = 0$ ✓
- Flour slack = 0 → $p_F > 0$ allowed ✓

## 3. Bakery Example — Full Numerical Walkthrough

Already covered above. Key facts:
- Primal optimum = 2650 with $(x_B, x_C, x_M) = (750, 100, 0)$
- Dual optimum = 2650 with $(p_B, p_F, p_S) = (0, 0.03, 0.05)$ [approximate]
- Slack: butter 1000g, flour 0, sugar 0

**Sensitivity:** Buy flour at $0.005/g? Yes — net gain 0.025 per gram.

## 4. Bakery LP Notebook — Cell Walkthrough

**Cell 1: Import**
```python
from gurobipy import *
```

**Cell 3: Create model, variables, constraints, objective**
```python
m = Model()
x_B = m.addVar()
x_C = m.addVar()
x_M = m.addVar()
butter_constr = m.addConstr(20*x_B + 100*x_C + 10*x_M <= 26000)
flour_constr  = m.addConstr(100*x_B + 50*x_C + 0*x_M <= 80000)
sugar_constr  = m.addConstr(0*x_B + 50*x_C + 150*x_M <= 5000)
m.setObjective(3*x_B + 4*x_C + 4.5*x_M, GRB.MAXIMIZE)
```
- `addVar()` creates a variable, default lower bound 0.
- `addConstr()` adds a constraint, returns a reference for later `.pi` access.

**Cell 5: Solve**
```python
m.update()
m.optimize()
```

**Cell 10: Extract Solution**
```python
print(x_B.X, x_C.X, x_M.X)  # 750, 100, 0
print(m.objval)              # 2650
```
- `.X` = optimal variable value, `.objval` = optimal objective.

**Cell 13: Explicitly Solve the Dual**
```python
m_dual = Model()
p_B = m_dual.addVar()
p_F = m_dual.addVar()
p_S = m_dual.addVar()
m_dual.addConstr(20*p_B + 100*p_F + 0*p_S >= 3)
m_dual.addConstr(100*p_B + 50*p_F + 50*p_S >= 4)
m_dual.addConstr(10*p_B + 0*p_F + 150*p_S >= 4.5)
m_dual.setObjective(26000*p_B + 80000*p_F + 5000*p_S, GRB.MINIMIZE)
m_dual.optimize()
```

**Cell 17: Access Shadow Prices Directly**
```python
dual_values = [butter_constr.pi, flour_constr.pi, sugar_constr.pi]
```
`.pi` of a constraint = its shadow price.

**Cell 21: Constraint Slacks**
```python
slack_values = [butter_constr.slack, flour_constr.slack, sugar_constr.slack]
```
`.slack` = RHS − LHS at optimality.

## 5. Primal/Dual Conversion Rules

| Primal (min) | Dual | (variable sign) |
|--------|--------|--------|
| Constraint ≥ $b_i$ | $p_i \ge 0$ | |
| Constraint ≤ $b_i$ | $p_i \le 0$ | |
| Constraint = $b_i$ | $p_i$ free | |
| Variable $x_j \ge 0$ | Dual constraint $p^T A_j \le c_j$ | |
| Variable $x_j \le 0$ | Dual constraint $p^T A_j \ge c_j$ | |
| Variable $x_j$ free | Dual constraint $p^T A_j = c_j$ | |

**For max primal:** Read the table right-to-left (signs flip).

### Why each rule exists (intuition)

- **≤ in min primal → $p_i \le 0$:** Relaxing ≤ (increasing RHS) makes feasible region larger, can only decrease min objective. So shadow price is non-positive.
- **≥ in min primal → $p_i \ge 0$:** Relaxing ≥ makes region smaller, can only increase min. Shadow price non-negative.
- **= → free:** Both upper and lower bound; can't assume sign.

### Worked conversion (max primal)
$$\max 4x_1 + 5x_2 \;\text{s.t.}\; x_1 + 2x_2 \le 10,\; -x_1 + x_2 \ge 2,\; x_1 \ge 0,\; x_2 \text{ free}$$

Apply max rules (flip every sign from the min-primal table):
- Constraint 1 (≤): dual var $p_1 \ge 0$
- Constraint 2 (≥): dual var $p_2 \le 0$
- Variable 1 (≥0): dual constraint $p_1 - p_2 \ge 4$
- Variable 2 (free): dual constraint $2p_1 + p_2 = 5$

**Dual:**
$$\min 10p_1 + 2p_2 \;\text{s.t.}\; p_1 - p_2 \ge 4,\; 2p_1 + p_2 = 5,\; p_1 \ge 0, p_2 \le 0$$

**Sign check:** $p_1 \ge 0$ because constraint 1 is ≤, and relaxing a ≤ constraint (raising its RHS) **enlarges** the feasible region of a max — so the shadow price is non-negative. $p_2 \le 0$ because constraint 2 is ≥, and relaxing a ≥ constraint **shrinks** the feasible region of a max — shadow price is non-positive. Variable $x_2$ free → dual constraint is an equality.

**Strong-duality check:** Primal optimum at $(x_1, x_2) = (2, 4)$ (both constraints tight), objective $= 4(2)+5(4) = 28$. Solving the dual's tight equations $2p_1 + p_2 = 5$ and $p_1 - p_2 = 4$ gives $p_1 = 3, p_2 = -1$, which satisfy $p_1 \ge 0, p_2 \le 0$. Dual objective $= 10(3) + 2(-1) = 28$ ✓ — strong duality holds, both optimal.

## 6. Step-by-Step Methods

### (a) Formulate an LP from a word problem
1. Identify decision variables (descriptive names).
2. Write objective: max/min Σ c·x.
3. List constraints (resource, market, blending, non-negativity).
4. Express each as linear inequality/equality.
5. Verify units.

### (b) Write the dual mechanically
1. Identify primal form: min/max, constraint types, variable signs.
2. Create one dual variable per primal constraint.
3. Flip objective direction.
4. Transpose: primal constraint RHS → dual objective coefficient; primal variable coefficient → dual constraint RHS.
5. Apply conversion table (read direction by primal type).

### (c) Use weak duality to verify optimality
1. Find feasible primal $x$, compute $c^T x$.
2. Find feasible dual $p$, compute $b^T p$.
3. If $c^T x = b^T p$: both optimal.
4. If $c^T x < b^T p$ (max primal): $x$ may not be optimal.

### (d) Use complementary slackness
1. For each primal constraint $i$: if $p_i^* > 0$, constraint $i$ is tight.
2. For each dual constraint $j$: if $x_j^* > 0$, constraint $j$ is tight.
3. Use tight constraints to solve for unknowns.

### (e) "Buy more resource" decision
1. Find shadow price $p_i^*$.
2. Compare to per-unit cost $q$.
3. If $q < p_i^*$ → BUY. Per-unit profit gain = $p_i^* - q$.
4. Validity: small changes only (sensitivity range).

## 7. Common Mistakes & Traps

1. **Forgetting weak duality requires BOTH feasible.** If your dual guess isn't feasible, you cannot apply weak duality.
2. **Forgetting to check primal direction.** Min and max have flipped sign rules in conversion table.
3. **Using shadow prices on non-binding constraints.** Slack > 0 means $p_i = 0$.
4. **Applying shadow price beyond sensitivity range.** Big changes invalidate the linear approximation; re-solve.
5. **Forgetting nonnegativity of dual variables.** Inherits from primal constraint type.
6. **Mixing up slack vs surplus.** Slack = RHS − LHS for ≤ constraint.
7. **Confusing shadow price with market price.** Shadow price is the *implicit* marginal value, not market price.
8. **Reading conversion table wrong way for max primal.** Always state "primal is max" first.
9. **Forgetting unit conversions.** $0.03/g ≠ $30/kg... double-check.
10. **Ignoring strong duality verification.** Strong duality is the easiest optimality test you have.

## 8. Exam Relevance

**Pattern A — Dual Formulation:** "Write the dual of the following LP." 5 min. Use conversion table.

**Pattern B — Shadow Price Decision:** "Shadow price of X is \$Y. Buy more at \$Z?" 2 min. Compare Z vs Y. Watch units!

**Pattern C — Complementary Slackness Deduction:** "Given $x^*$, which dual constraints are tight?" 3 min. Mechanical application.

**Pattern D — Optimality Verification:** "Verify $x$ and $p$ are both optimal." 3 min. Check feasibility + objectives equal.

**Practice problems to study:** LP Duality-I (toys), LP Duality-II (fabric).

## 9. Mini Practice

### Q1. Formulate Dual from Max Primal
$$\max 5x + 3y \;\text{s.t.}\; 2x + y \le 8,\; x + 2y \le 6,\; x, y \ge 0$$

**Answer (Dual):**
$$\min 8p_1 + 6p_2 \;\text{s.t.}\; 2p_1 + p_2 \ge 5,\; p_1 + 2p_2 \ge 3,\; p_1, p_2 \ge 0$$

### Q2. Shadow Price Interpretation
Given optimal $p_1 = 2.2, p_2 = 0.6$. Interpret $p_1$; effect of relaxing constraint 1?

**Answer:** $p_1 = 2.2$ = shadow price of resource 1. Increasing RHS from 8 to 9 increases optimal by ≈ $2.2.

### Q3. Complementary Slackness Check
Primal $x = 4, y = 0$; dual $p_1 = 2.2, p_2 = 0.6$. Verify with CS.

**Answer:** $x = 4 > 0$ → dual constraint 1 tight: $2(2.2) + 0.6 = 5$ ✓. $y = 0$ → dual constraint 2 can have slack ($2.2 + 1.2 = 3.4 > 3$ ✓). $p_1 > 0$ → primal constraint 1 tight ($2(4) + 0 = 8$ ✓). $p_2 > 0$ → primal constraint 2 should be tight ($4 + 0 = 4 ≠ 6$, slack=2) ❌ INCONSISTENT. So these are not jointly optimal.

### Q4. Buy-More-Resource
Flour shadow price = \$0.03/g. Offered at (a) \$0.02/g, (b) \$0.04/g, (c) \$0.03/g.

**(a)** Buy: net +\$0.01/g.
**(b)** Don't buy: net −\$0.01/g.
**(c)** Indifferent (boundary).

### Q5. Economic Dual Derivation
Product A (\$10 profit, 2 labor, 1 machine), Product B (\$15 profit, 1 labor, 3 machine), 100 labor, 80 machine. Write primal and dual.

**Primal:** $\max 10x_A + 15x_B$ s.t. $2x_A + x_B \le 100$, $x_A + 3x_B \le 80$, $x_A, x_B \ge 0$.

**Dual:** $\min 100p_L + 80p_M$ s.t. $2p_L + p_M \ge 10$, $p_L + 3p_M \ge 15$, $p_L, p_M \ge 0$.

Interpretation: A competitor buys all resources at prices $(p_L, p_M)$; they need each product's "purchase price" to exceed the profit we'd make producing it.

## 10. Cheat Card

- **Weak duality (always):** max primal ≤ min dual.
- **Strong duality (at optimum):** they're equal.
- **Complementary slackness:** $x_j > 0$ ↔ dual constraint $j$ tight; $p_i > 0$ ↔ primal constraint $i$ tight.
- **Shadow price decision:** buy resource if cost < shadow price.
- **Conversion table:** read LEFT→RIGHT for min primal, RIGHT→LEFT for max primal.
- **Gurobi:** `constraint.pi` = shadow price, `.X` = variable value, `.slack` = RHS−LHS.

---

## 🎙️ Lecture Transcript Insights — Beyond the Slides

These notes capture what Prof. Misic said in class on 4/1 that is NOT in the slides — exam hints, verbal explanations, student Q&A, and warnings.

### Exam-Focused Verbal Cues

- **"Strong duality is THE easiest optimality check."** If you compute primal value = dual value and both are feasible → DONE. Faster than complementary slackness.
- **"Sensitivity ranges matter."** Shadow prices only hold within a range. If exam says "increase flour by 50%", that's outside the range — you'd need to re-solve, NOT just multiply by shadow price.
- **Bakery LP is solved as LP not IP** because for thousands of units, rounding 113,478.248 → 113,478 loses at most $3. Integer relaxation is the default unless yes/no decisions (assortment, location, TSP).
- **Duality is prerequisite for column generation** (NOT on exam, but explains why duality is foundational).

### Concepts Emphasized by Repetition

- **The "recipe" for bounding** via positive linear combinations of constraints (he walked through it 3 times with student attempts giving WRONG bounds before correcting to the dual).
- **Complementary slackness is a TWO-WAY street:**
  - Slack > 0 ⇒ dual variable = 0
  - Dual variable > 0 ⇒ constraint is tight
  - Many students forget the reverse direction.
- **Shadow price = derivative of objective w.r.t. constraint RHS.** Taylor expansion: $f(x+h) \approx f(x) + f'(x) h$.

### Verbal Explanations That Clarify

- **Why we don't add non-negativity in Gurobi:** `addVar()` defaults to lower bound 0 and upper bound ∞. You CAN comment out non-negativity lines.
- **Why IP ruins duality:** With integer constraints, strong duality breaks (you get Lagrangian duality — bound, not exact). Mentioned in PDF notes but beyond W1 scope. Don't try to apply shadow prices to integer programs.
- **Economic dual interpretation (the "Yash selling ingredients" story):** Primal = "decide what to produce." Dual = "competitor buys all ingredients; price must cover what you'd make by baking each product." This explains why dual constraints have $\ge$ (not $\le$) and why $p_i \ge 0$.

### Student Q&A Highlights

- **"Do we have to solve the dual explicitly?"** No — simplex/interior-point algorithms maintain dual internally. `m.optimize()` gives both. Use `.pi` on the constraint reference.
- **"Why is butter shadow price = 0 when butter is good?"** Because we have 1000g UNUSED. Slack > 0 ⇒ price = 0.
- **"Does the shadow price formula always work for any $\Delta b$?"** Only within sensitivity range. Gurobi reports it via `.SARHSLow` and `.SARHSHigh`. Outside the range, other constraints become binding.

### Numerical Walkthrough — Bounds → Dual

Walking through bound construction:
- Just butter constraint: bound = 26,000 (10× too loose)
- Butter × 0.5: bound = 13,000 (5× too loose)
- Student attempt with multiplier 0.1: gave INVALID bound 2,600 (coefficients didn't satisfy ≥)
- Student correction: flour × 0.1 + sugar × 0.1: bound = 8,500 (valid, tighter)
- Optimal bound from solving DUAL: 2,650 (matches primal!)

This is the Socratic motivation: students discover dual by trying weights, then the dual problem emerges naturally.

### Sensitivity Validation (notebook ran live)

| ΔFlour (g) | Predicted (shadow price) | Actual | Match? |
|---|---|---|---|
| 0 | 2,650 | 2,650 | ✓ |
| +100 | 2,650 + 100(0.03) = 2,653 | 2,653 | ✓ (exact) |
| +1,000 | 2,680 | 2,680 | ✓ (exact, at boundary) |
| +10,000 | 2,950 | < 2,950 | ❌ (approximation breaks) |

### Warnings Flagged Verbally

1. **Never multiply a constraint by a NEGATIVE multiplier** — inequality flips, bound destroyed. Always $p_i \ge 0$.
2. **Don't apply shadow prices when constraint has slack.** Slack > 0 ⇒ price = 0.
3. **Big resource changes invalidate the approximation.** State "assuming small changes" when using shadow prices.
4. **Watch units!** Shadow price $0.03/g vs market price $5/kg = $0.005/g. Convert before comparing.
5. **Negative dual prices make no sense** in standard formulation.

### Exam Strategy from Prof's Style

For "is this $(x^*, p^*)$ optimal?":
1. Check $x^*$ feasible in primal AND $p^*$ feasible in dual.
2. Compute both objectives.
3. If equal → BOTH optimal (strong duality). Stop.
4. Only use complementary slackness if you need to know WHICH constraints are tight.
