# Week 5 — Assortment Optimization 品类选择

## 0. Big Picture

You run a retail business, restaurant, or airline. You can't offer every product — limited shelf space, menu capacity, operational constraints. **Question:** which subset to offer to MAXIMIZE revenue when customers substitute?

Difficulty: $2^n$ possible subsets. But adding low-margin products can CANNIBALIZE high-margin ones, so "offer everything" is rarely optimal. Integer programming solves it.

## 1. Choice Models — Foundation

Three ingredients:
1. **Who are the customers?** ($K$ segments, fractions $\lambda_k$)
2. **What are their preferences?** (utility $u_{k,i}$)
3. **How do they decide?** (first-choice / MNL / etc.)

**Choice probability:** $P(i, S)$ = prob customer chooses $i$ when offered $S$.

**Expected per-customer revenue:**
$$R(S) = \sum_{i \in S} r_i \cdot P(i, S)$$

**Optimization:** $\max_{S \subseteq [n]} R(S)$.

## 2. First-Choice (Max-Utility) Model 最大效用模型

### Setup
- $K$ segments with weights $\lambda_k$ ($\sum \lambda_k = 1$)
- Each segment $k$ has utility $u_{k,i}$ for product $i$ and $u_{k,0}$ for no-purchase
- **Segment $k$ chooses** $\arg\max_{i \in S \cup \{0\}} u_{k,i}$

### Choice Probability
$$P(i | S) = \sum_{k: \arg\max u_{k,j} \text{ over } S \cup \{0\} = i} \lambda_k$$

In words: sum the weights of segments for which $i$ is their first choice from $S \cup \{0\}$.

## 3. Wine Boutique Example (from Practice Problem)

| Seg | $\lambda$ | CabS(45) | Mer(20) | PN(17) | Syr(25) | Zin(18) | NP |
|---|---|---|---|---|---|---|---|
| 1 | 0.15 | 3.7 | 3.9 | 4.2 | 2.4 | 2.3 | 2.5 |
| 2 | 0.20 | 2.4 | 3.4 | 2.6 | 4.6 | 5.0 | 2.8 |
| 3 | 0.15 | 4.8 | 1.4 | 1.9 | 1.2 | 3.7 | 3.3 |
| 4 | 0.50 | 2.5 | 3.7 | 4.0 | 3.5 | 2.7 | 3.1 |

(Numbers in parentheses = prices.)

### Compute for $S = \{3, 5\}$ = {Pinot Noir, Zinfandel}

For each segment, find max utility over {3, 5, 0}:
- Seg 1: max(4.2, 2.3, 2.5) = 4.2 → PN(3)
- Seg 2: max(2.6, 5.0, 2.8) = 5.0 → Zin(5)
- Seg 3: max(1.9, 3.7, 3.3) = 3.7 → Zin(5)
- Seg 4: max(4.0, 2.7, 3.1) = 4.0 → PN(3)

$P(3|S) = 0.15 + 0.50 = 0.65$. $P(5|S) = 0.20 + 0.15 = 0.35$. $P(0|S) = 0$.

$R(S) = 17 \times 0.65 + 18 \times 0.35 = 11.05 + 6.30 = 17.35$.

## 4. Why "Offer Everything" Fails

Cannibalization (蚕食): adding a cheap product steals customers from expensive ones.

Example: Offer {CS, PN}. Some segment buys CS at $45. Now add Merlot — that segment might switch to Merlot at $20. Revenue drops!

Timbuk2 case: offering ALL 100 products → $59.73/customer. Optimal 39-product subset → $76.80/customer. Even better with cardinality ≤ 5: $72.82.

## 5. Upper Bounds Without Solving IP

### Bound 1: Customized (per-segment) Bound
$$UB_1 = \sum_k \lambda_k \cdot \max_{i:\, u_{k,i} > u_{k,0}} r_i$$

**Interpretation:** "If we could offer a DIFFERENT assortment to each segment." Optimistic — IP can't beat this.

**Wine example:**
- Seg 1 prefers {CS, Mer, PN} over NP (utility > 2.5). Best revenue = $45 (CS).
- Seg 2 prefers {Syr, Zin} over NP. Best = $25 (Syr).
- Seg 3 prefers {CS, Zin} over NP. Best = $45 (CS).
- Seg 4 prefers {Mer, PN, Syr} over NP. Best = $25 (Syr).

$UB_1 = 0.15(45) + 0.20(25) + 0.15(45) + 0.50(25) = 6.75 + 5 + 6.75 + 12.5 = \$31$.

### Bound 2: LP Relaxation
Drop binary, allow $x_i, y_{k,i} \in [0,1]$. Solve LP. LP value ≥ IP optimum.

In Timbuk2: LP = $81.69, IP = $76.80, gap = 6%. Solution is near-optimal.

## 6. Integer Programming Formulation

### Variables
- $x_i \in \{0,1\}$: offer product $i$
- $y_{k,i} \in \{0,1\}$: segment $k$ chooses $i$ (including $i=0$ for no-purchase)

### Objective
$$\max \sum_{k=1}^{K} \sum_{i=1}^{n} \lambda_k r_i y_{k,i}$$

### Constraints
1. **Each segment chooses exactly one:**
$$\sum_{i=0}^{n} y_{k,i} = 1 \quad \forall k$$

2. **Max-utility constraint** (chosen utility ≥ utility of any available option):
$$\sum_{j=0}^{n} u_{k,j} y_{k,j} \ge u_{k,i} x_i + u_{k,0}(1-x_i) \quad \forall k, i$$

If $x_i = 1$: chosen utility must beat $u_{k,i}$.
If $x_i = 0$: chosen utility must beat $u_{k,0}$ (no-purchase fallback).

3. **Beat no-purchase always:**
$$\sum_{j=0}^{n} u_{k,j} y_{k,j} \ge u_{k,0} \quad \forall k$$

4. **Choose only what's offered:**
$$y_{k,i} \le x_i \quad \forall k, i \in [n]$$

5. **Binary:** $x_i, y_{k,i} \in \{0,1\}$.

## 7. Assortment Notebook — Cell Walkthrough

**Setup:** 330 customers, 100 candidate Timbuk2 bags (conjoint study).

```python
partworths = np.asarray(pd.read_csv("partworths_small_v2.csv"))  # (330, 10)
grand_product_matrix = pd.read_csv(...)  # (10, 100)
utilities_mat = np.dot(partworths, grand_product_matrix)  # (330, 100)
```

**No-purchase utility** = max utility from 3 competitor products:
```python
competitive_utilities = np.dot(partworths, competitive_products.T)  # (330, 3)
nopurchase_utilities = competitive_utilities.max(axis=1)
utilities_mat = np.concatenate((utilities_mat, nopurchase_utilities[:,None]), axis=1)  # (330, 101)
```

**Marginal profit** per product = price − attribute costs.

**Brute-force evaluator:**
```python
def expected_profit(S):
    S2 = np.append(S, nProducts)  # add no-purchase
    prob = {i: 0.0 for i in S2}
    for k in range(330):
        best = np.argmax(utilities_mat[k, S2])
        prob[S2[best]] += 1/330
    return sum(prob[i] * marginal_profit[i] for i in S)
```

**Gurobi IP** with all 4 constraints. Solve → optimal 39 products, $76.80/customer.

**With cardinality ≤ 5:** add `m.addConstr(sum(x[i] for i in range(nProducts)) <= 5)`. Optimal {0, 18, 33, 52, 73}, $72.82.

## 8. Side Constraints Catalog

| Requirement | Constraint |
|---|---|
| Offer $m$–$M$ products | $m \le \sum_i x_i \le M$ |
| $i$ chosen by ≥ 20% (absolute) | $\sum_k \lambda_k y_{k,i} \ge 0.20$ |
| If offered, $i$ chosen by ≥ 20% | $\sum_k \lambda_k y_{k,i} \ge 0.20 x_i$ |
| If $i$ offered, ≥ 1 of {a,b,c} | $x_i \le x_a + x_b + x_c$ |
| If $i$ AND $j$ → also $m, n$ | $x_i + x_j - 1 \le x_m$, $x_i + x_j - 1 \le x_n$ |
| Mutually exclusive | $x_i + x_j \le 1$ |

## 9. MNL Model (if covered)

$$P(i|S) = \frac{e^{u_i}}{e^{u_0} + \sum_{j \in S} e^{u_j}}$$

Probabilistic alternative to first-choice. More realistic but non-concave → harder to optimize.

## 10. Step-by-Step Methods

### (a) Choice probability calculation
1. For each segment, find max of $u_{k,j}$ over $j \in S \cup \{0\}$.
2. Identify which option that max corresponds to.
3. Sum $\lambda_k$ over segments choosing the same option.

### (b) Expected revenue
$R(S) = \sum_{i \in S} r_i P(i|S)$.

### (c) Customized upper bound
For each segment, find best-revenue product with $u_{k,i} > u_{k,0}$. Weight by $\lambda_k$. Sum.

### (d) Formulate IP
Variables ($x_i, y_{k,i}$) + 4 constraints + side constraints.

### (e) LP relaxation
Change `vtype=GRB.BINARY` to `vtype=GRB.CONTINUOUS` with bounds [0,1].

## 11. Common Mistakes ⚠️

1. Forgetting no-purchase option in argmax.
2. Confusing utility $u_{k,i}$ with revenue $r_i$.
3. Not weighting by $\lambda_k$.
4. Forgetting "if offered" qualifier (conditional vs unconditional choice probability).
5. Logic constraint mistakes: "if A and B then C" → $x_A + x_B - 1 \le x_C$, not $x_A + x_B \le x_C$.
6. Treating MNL as first-choice.
7. Believing "offer everything" is optimal.
8. Assuming highest-margin product is always in optimal assortment.

## 12. Exam Relevance

Exam slides list 5 assortment question types. Practice Assortment-I has 10 sub-parts:
- Compute choice probabilities for given $S$
- Compute $R(S)$
- Argue whether $S$ is optimal
- Customized upper bound
- Formulate IP
- Add 5 different side constraints

Plus Assortment-II (4 parts) with TWO different upper-bound methods (no IP).

## 13. Mini Practice

**Q1.** 3 segments with $\lambda = (0.4, 0.4, 0.2)$ and utilities for A, B, NP. Offer {A, B}, compute choice probs.

Seg 1: max(5,3,2) → A. Seg 2: max(2,4,3) → B. Seg 3: max(1,1,4) → NP.
$P(A) = 0.4$. $P(B) = 0.4$. $P(0) = 0.2$.

**Q2.** Revenues $r_A = 20, r_B = 15$. $R(S) = 20(0.4) + 15(0.4) = 8 + 6 = 14$.

**Q3.** Compute $UB_1$ for that data (need $r_A, r_B, r_C$).
Seg 1 prefers products with $u > 2$. Seg 2 prefers $u > 3$. Seg 3 prefers nothing more than NP. UB depends on data.

**Q4.** "If we offer wine 6, then at least one of {8, 12, 15} must be offered." Constraint: $x_6 \le x_8 + x_{12} + x_{15}$.

**Q5.** "If 6 AND 7 are offered, must offer 8 AND 9." Constraints: $x_6 + x_7 - 1 \le x_8$ and $x_6 + x_7 - 1 \le x_9$.

**Q6.** Gurobi output: optimal IP = $82.50, LP relaxation = $87.00. Gap = $4.50 (5.2%). The integer solution is near-optimal (no policy can exceed $87 by LP bound).

## 14. Cheat Card

| Concept | Formula |
|---|---|
| Choice prob (first-choice) | $P(i|S) = \sum_{k:\arg\max = i} \lambda_k$ |
| Expected revenue | $R(S) = \sum r_i P(i|S)$ |
| Customized UB | $\sum_k \lambda_k \max_{i: u_{k,i}>u_{k,0}} r_i$ |
| MNL choice | $P(i|S) = e^{u_i}/(e^{u_0}+\sum_{j\in S} e^{u_j})$ |

**IP Template:**
- max $\sum_k \sum_i \lambda_k r_i y_{k,i}$
- $\sum_i y_{k,i} = 1 \forall k$
- $y_{k,i} \le x_i \forall k, i$
- max-utility constraints
- beat NP constraints

**Key intuition:**
- Substitution → cannibalization → "all" isn't optimal.
- Heterogeneous segments → no single best product.
- No-purchase is always a competitor.
- LP relaxation gives upper bound; tight gap = near-optimal.

---

## 🎙️ Lecture Transcript Insights — Beyond the Slides

From Prof. Misic's 4/29 lecture.

### CORE INSIGHT (Repeated)

**No-purchase option is MANDATORY.** Unlike slides emphasize, transcript repeatedly stresses: customers always have option to walk away. If you offer Timbuk2 bags but customer dislikes all → they buy from competitors (North Face). The OUTSIDE option's utility = max utility of competitor products.

### Why Intuitive Strategies Fail (Central Tension)

**Offering everything ≠ optimal:** Offer all 100 Timbuk2 products → expected profit = $59.73. Optimal subset → $76.80. Why?

**Concrete example (cell phones):** Adding product 4 to {3} INCREASES revenue from $150 to $175. Because:
- If only product 3 available → type 1 customers buy it ($200, λ=0.5 → $100).
- After adding product 4 → type 3 customers buy product 4 (HIGHER profit gain than the slight cannibalization).
- **Firm uses EXCLUSION to force profitable substitution:** remove high-utility/low-margin items so customers trade DOWN to high-margin items.

**Highest-profit products only fail:** Top-10 highest-margin → only $27.26 (vs $59.73 for all). Why? Only tiny fraction of customers have high utility for high-margin products. Most defect to competitors.

### Segment Heterogeneity Is the Hard Part

**Timbuk2 survey (330 MIT MBAs, 16 paired comparisons):**
- Customer 9: LOVES PDA holder (+11.79 utility), DISLIKES Velcro flap (-4.45).
- Customer 19: EXACT OPPOSITE.

> *"How do you design ONE product both like? Answer: you can't. You must offer a curated PORTFOLIO and accept some customers compromise."*

### Cannibalization Logic (Repeated 3×)

**Adding a product:**
- Some non-buyers convert (good).
- Some existing buyers switch to new product (bad).
- Net profit ↑ iff conversion > cannibalization.

**Equation:** If new product X converts 20 non-buyers but steals 5 from Y:
- Net positive iff margin(X) > (5/20) × margin(Y).

### Part-Worth Utilities & Dollar Interpretation

**330 × 10 part-worth matrix from conjoint analysis.**
- Each entry is a coefficient (like regression slope).
- Price part-worth is ALWAYS negative.
- Normalize: price part-worth = −1, then other coefficients = WILLINGNESS TO PAY in dollars.

**Example:** If part-worth(large size) = 21 (normalized), customer pays $21 more for large bag.

### First-Choice vs MNL Contrast

**First-choice (today's focus):**
- Deterministic per type. If utility(3) > utility(2), type always picks 3.
- Heterogeneity = multiple customer types (330 = 330 types, each λ_k = 1/330).
- If utilities very close → still deterministic (one wins).

**MNL (mentioned but contrasted):**
- Stochastic even with fixed utilities (softmax).
- Close utilities → probabilistic split.

**Exam:** If asked to criticize first-choice, mention "deterministic — doesn't model close-utility uncertainty."

### Student Q&A

**Q: Does price sensitivity matter if all customers differ?**
A: Yes. Price part-worth varies across customers. Normalize by price → reveals true WTP heterogeneity.

**Q: Can we penalize competitor market share?**
A: Hard — once customer doesn't buy from us, they pick highest-utility competitor; can't control. But can add secondary objective.

**Q: What if utilities are very close?**
A: First-choice is deterministic — one wins. Limitation vs MNL.

### Optimal Solution Property — No Profitable Swaps

For cell-phone example, {3, 4} is optimal because:
- Type 1: can buy {1, 2, 3} above no-purchase → picks 3 (highest profit among viable).
- Type 2: can buy {1, 4} → picks 4 (highest profit among viable).
- Type 3: can buy {4} → picks 4.

**No swap improves total profit.** This is the optimality check.

**Exam technique:** After solving (or guessing) assortment, verify: for each type, can it pick higher-margin product by removing something else? If no, optimal (locally).

### Timbuk2 Case Operational Setup

- 330 executive MBA students surveyed
- 16 paired comparisons of bags
- Price (70–100, $5 increments = 7 levels) + 9 binary features (size, color, logo, handle, PDA holder, cell holder, mesh/velcro, protective boot)
- Full design space: 7 × 2^9 ≈ 3,600 products (intractable)
- Notebook restricts to 100 candidates
- Three competitor bags (low $70, mid $85, high $100) define no-purchase utility per type

### Warnings (Repeated Verbally)

1. **DON'T FORGET no-purchase option.** Biggest exam mistake.
2. **Substitution ≠ defection.** Excluding A: some buyers switch to B (good), others abandon to competitors (bad).
3. **Cannibalization cuts both ways.** Adding high-profit product can cannibalize lower-margin items; expected profit may DROP.
4. **Profit ≠ utility.** Customers maximize utility; you maximize profit. Misalignment is the entire game.

### Strategy: How to Set Up Exam Problem

1. Load utilities (customer × product matrix).
2. Define no-purchase utility for each customer (given or inferred).
3. For each candidate assortment $S$:
   a. For each customer type: choice = argmax(utilities in $S \cup \{0\}$).
   b. Tally choice probabilities: $P(i) = (\text{# types choosing } i) / N$.
   c. Expected profit $= \sum_i \text{margin}(i) \times P(i)$.
4. Search over assortments (small: brute-force; large: IP).
