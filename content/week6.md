# Week 6 — Static Multiproduct Pricing 定价

## 0. Big Picture

A retailer sells 11 OJ brands. Each brand's demand depends not just on its own price but on competing brands' prices. What price for each maximizes total revenue? This is multiproduct pricing — a quadratic optimization problem with cross-price effects.

## 1. Single-Product Refresher

**Linear demand:** $d(p) = \alpha - \beta p$.
**Revenue:** $R(p) = \alpha p - \beta p^2$ (concave parabola).
**Optimal:** $p^* = \alpha/(2\beta)$ from $dR/dp = 0$.

## 2. Multi-Product Linear Demand 线性需求模型

$$d_i(\mathbf{p}) = \alpha_i - \beta_i p_i + \sum_{j \ne i} \gamma_{i,j} p_j$$

**Parameters:**
- $\alpha_i$: baseline demand at $\mathbf{p}=0$
- $\beta_i > 0$: own-price sensitivity. $1 price up → $\beta_i$ unit drop.
- $\gamma_{i,j}$: cross-price effect.
  - $\gamma_{i,j} > 0$: substitute (替代品) — raise $p_j$ → demand for $i$ UP.
  - $\gamma_{i,j} < 0$: complement (互补品) — raise $p_j$ → demand for $i$ DOWN.

**Total Revenue:**
$$R(\mathbf{p}) = \sum_i p_i \cdot d_i(\mathbf{p}) = \sum_i \alpha_i p_i - \sum_i \beta_i p_i^2 + \sum_{i \ne j} \gamma_{i,j} p_i p_j$$

QUADRATIC in $\mathbf{p}$.

### Numerical Example (2 products)
$\alpha_1 = 1000, \beta_1 = 50, \gamma_{1,2} = 10$. $\alpha_2 = 800, \beta_2 = 40, \gamma_{2,1} = 5$. Prices $p_1=10, p_2=8$.

$d_1 = 1000 - 50(10) + 10(8) = 1000 - 500 + 80 = 580$.
$d_2 = 800 - 40(8) + 5(10) = 800 - 320 + 50 = 530$.
$R = 10(580) + 8(530) = 5800 + 4240 = 10040$.

## 3. Continuous Optimization (Calculus)

Set $\partial R/\partial p_k = 0$:
$$\alpha_k - 2\beta_k p_k + \sum_{j \ne k} \gamma_{k,j} p_j = 0 \quad \forall k$$

Linear system in $\mathbf{p}$. Concave if $M + M^T$ is PSD.

For 2 products:
$$\alpha_1 - 2\beta_1 p_1 + \gamma_{1,2} p_2 = 0$$
$$\alpha_2 - 2\beta_2 p_2 + \gamma_{2,1} p_1 = 0$$

Solve simultaneously.

## 4. Discrete Prices — The IP Formulation

In practice, prices come from menu: $p_i \in \mathcal{P}_i = \{p_{i,1}, p_{i,2}, \ldots, p_{i,M_i}\}$.

### Decision Variables
$x_{i,t} \in \{0,1\}$: product $i$ at price level $t$.

### Constraint: One Price Per Product
$$\sum_{t \in \mathcal{P}_i} x_{i,t} = 1 \quad \forall i$$

### Challenge: Bilinear $p_i p_j$ Terms
$$p_i p_j = \left( \sum_{t_1} t_1 x_{i,t_1}\right)\left(\sum_{t_2} t_2 x_{j,t_2}\right) = \sum_{t_1, t_2} t_1 t_2 \, x_{i,t_1} x_{j,t_2}$$

Products of binaries → non-linear. Linearize.

### Auxiliary Variables
$y_{i,j,t_1,t_2} \in \{0,1\}$: =1 iff $x_{i,t_1}=1$ AND $x_{j,t_2}=1$.

### Linking Constraints (BOTH directions!)
$$\sum_{t_2} y_{i,j,t_1,t_2} = x_{i,t_1} \quad \forall i,j,t_1 \quad \text{(direction 1)}$$
$$\sum_{t_1} y_{i,j,t_1,t_2} = x_{j,t_2} \quad \forall i,j,t_2 \quad \text{(direction 2)}$$

### Full Objective
$$\max \sum_{i,t} \alpha_i \cdot t \cdot x_{i,t} - \sum_{i,t} \beta_i \cdot t^2 \cdot x_{i,t} + \sum_{i \ne j, t_1, t_2} \gamma_{i,j} \cdot t_1 \cdot t_2 \cdot y_{i,j,t_1,t_2}$$

Three pieces:
1. Baseline contribution: $\alpha_i \cdot \text{chosen price}$
2. Own-price effect (NEGATIVE, with $t^2$)
3. Cross-price effect via $y$

## 5. Orange Juice Notebook — Cell Walkthrough

### Data
- 11 OJ brands, 83 stores, weekly observations
- Features: price/oz, feature dummy, deal dummy

### Estimate Demand (Linear Regression per Brand)
```python
# For each brand i:
d_{s,t,i} = α_i - β_i p_{s,t,i} + Σ γ_{i,j} p_{s,t,j} + b_f f + b_δ δ + ε
```

**Brand 1 (Tropicana 64oz) coefficients:**
- $\alpha_1$ = 13,511 (baseline)
- $\beta_1$ = 19,345 (own-price)
- $\gamma_{1,2}$ = 1,552 (Brand 2 substitute)
- $\gamma_{1,3}$ = 4,363 (Brand 3 substitute)
- Feature effect = +16,228 units

### Generate Discrete Price Sets
For each brand, use 5 quantiles of historical prices (0%, 25%, 50%, 75%, 100%).

### Build Gurobi IP
```python
m = Model()
x = m.addVars(nBrands, nPrices, vtype=GRB.BINARY)
y = m.addVars(nBrands, nBrands, nPrices, nPrices, vtype=GRB.BINARY)

# One price per product
for b in range(nBrands):
    m.addConstr(sum(x[b,s] for s in range(nPrices)) == 1)

# Linking (BOTH directions!)
for b1 in range(nBrands):
    for b2 in range(nBrands):
        if b1 != b2:
            for s1 in range(nPrices):
                m.addConstr(sum(y[b1,b2,s1,s2] for s2 in range(nPrices)) == x[b1,s1])
            for s2 in range(nPrices):
                m.addConstr(sum(y[b1,b2,s1,s2] for s1 in range(nPrices)) == x[b2,s2])

# Objective
m.setObjective(
    sum(alpha[b]*price_set[b][s]*x[b,s] for b,s in product(...))
    - sum(beta[b]*price_set[b][s]**2*x[b,s] for b,s in ...)
    + sum(gamma[b1,b2]*price_set[b1][s1]*price_set[b2][s2]*y[b1,b2,s1,s2] for ...),
    GRB.MAXIMIZE)
```

### Results

| Brand | Name | Optimal Price |
|---|---|---|
| 0 | Tropicana Premium 64oz | $3.87 |
| 1 | Tropicana Premium 96oz | $5.82 |
| 5 | Minute Maid 96oz | $2.76 |
| 10 | Dominicks 128oz | $4.99 |

Premium brands: top of range. Budget brands: bottom. Total revenue $293,378 vs. historical $242,584 (+20.9%).

### Business Constraints (Notebook)
- Tropicana 96oz ≤ 1.5 × 64oz price
- Minute Maid 96oz ≥ 1.30 × 64oz price
- Average 64oz price ≥ $3.00

With constraints: revenue drops to ~$213,000 (tradeoff cost).

## 6. Semi-Log Demand Model (if covered)

$$\log d_i(\mathbf{p}) = \alpha_i - \beta_i p_i + \sum_{j \ne i} \gamma_{i,j} p_j$$

Equivalently: $d_i = e^{\alpha_i - \beta_i p_i + \sum \gamma_{i,j} p_j}$.

**Key difference:** Demand decreases MULTIPLICATIVELY, not additively. A $1 increase → demand × $e^{-\beta}$.

**Why harder:** Objective $\sum p_i e^{\text{linear in } p}$ is NOT concave. Cannot use standard convex optimization.

**Solution:** Biconjugate reformulation with auxiliary $\mu_i$ ≥ 0 ($\sum \mu_i = 1$), entropy term, alternating maximization, or lazy constraint generation.

## 7. Step-by-Step Methods

### (a) Compute demand given prices
For each $i$: $d_i = \alpha_i - \beta_i p_i + \sum_{j \ne i} \gamma_{i,j} p_j$.

### (b) Compute revenue
$R = \sum_i p_i d_i$.

### (c) Set up discrete IP
1. Define $x_{i,t}$, $y_{i,j,t_1,t_2}$ binary.
2. Add $\sum_t x_{i,t} = 1$ for each $i$.
3. Add BOTH directions of linking for each $y_{i,j,t_1,t_2}$.
4. Write objective with three terms (baseline, own-price-squared, cross via $y$).

### (d) Identify missing constraints (EXAM!)
Check: one-price-per-product? both linking directions? binary? correct signs ($-\beta$, $-t^2$ multiplier)?

## 8. "Which Constraints Are Missing?" Diagnostic

**Example:** Partial IP given.

Always check:
1. $\sum_t x_{i,t} = 1$ for each $i$? (Required.)
2. BOTH linking directions for $y$? (Often missing one.)
3. Binary declarations.
4. Correct sign on $\beta$ term (should be negative).
5. Correct exponent on price in own-price term ($t^2$, not $t$).

## 9. Common Mistakes ⚠️

1. **Only one direction of linking.** Both are needed.
2. **Wrong sign on $\beta$.** Term is $-\beta_i p_i^2$ (subtracted).
3. **Forgetting $t^2$.** Own-price uses squared price.
4. **Confusing substitute vs complement** in $\gamma$ sign.
5. **Missing one-price-per-product.**
6. **Non-binary $x$, $y$.**
7. **Naïve calculus on semi-log.** It's NOT concave.
8. **Including $\gamma_{i,i}$ terms.** Cross-price only for $j \ne i$.

## 10. Exam Relevance

Exam slides list 3 pricing question types:
1. **Compute demand and revenue given prices** (plug-and-chug).
2. **Formulate IP** (full objective + linking + one-price).
3. **Identify missing constraints** in partial IP.

## 11. Mini Practice

**Q1.** 2 products. $\alpha_1 = 100, \beta_1 = 10, \gamma_{1,2} = 2$. $p_1 = 5, p_2 = 4$. Compute $d_1$.

$d_1 = 100 - 10(5) + 2(4) = 100 - 50 + 8 = 58$.

**Q2.** Continuous optimal for single product $d(p) = 100 - 20p$. Max $R$?

$R(p) = 100p - 20p^2$. $R'(p) = 100 - 40p = 0$. $p^* = 2.5$. $R(2.5) = 125$.

**Q3.** "Which constraints are missing?" Given $x_{i,t}$ binary defined, $\sum_t x_{i,t} = 1$, $\sum_{t_2} y_{i,j,t_1,t_2} = x_{i,t_1}$. What's missing?

The REVERSE linking: $\sum_{t_1} y_{i,j,t_1,t_2} = x_{j,t_2} \forall i, j, t_2$.

**Q4.** $\gamma_{1,2} < 0$ means? Complement (e.g., burgers and fries).

**Q5.** Semi-log vs linear at $p = 5$. Linear: $d = 100 - 10(5) = 50$. Semi-log: $\log d = 5 - 0.1(5) = 4.5$, $d = e^{4.5} \approx 90$. Semi-log demand drops by PERCENTAGE; linear by absolute amount.

## 12. Cheat Card

**Linear demand:**
$$d_i(\mathbf{p}) = \alpha_i - \beta_i p_i + \sum_{j \ne i} \gamma_{i,j} p_j$$

**Revenue:** $R(\mathbf{p}) = \sum_i p_i d_i(\mathbf{p})$ — quadratic.

**Continuous optimum:** Linear system from $\nabla R = 0$.

**Discrete IP:**
- $x_{i,t} \in \{0,1\}$
- $\sum_t x_{i,t} = 1$
- $y_{i,j,t_1,t_2} \in \{0,1\}$
- Both linking directions
- Objective: baseline (linear) + own-price (quadratic, NEGATIVE) + cross (via $y$)

**Parameter Sign Rules:**
- $\beta_i > 0$ always (own-price sensitivity)
- $\gamma_{i,j} > 0$: substitute
- $\gamma_{i,j} < 0$: complement
- Term $-\beta_i p_i^2$ is SUBTRACTED in revenue.

---

## 🎙️ Lecture Transcript Insights — Beyond the Slides

From Prof. Misic's 5/6 lecture.

### Exam Emphasis

> *"#1 graded criterion: are you able to write formulations?"*

If given real-world description, identify it as PRICING (vs assortment, location) and translate to math program.

**Exam also tests:**
- Simple by-hand calculations (plug demand into revenue formula)
- "What's missing?" — especially the TWO linking directions for $y_{i,j,t_1,t_2}$
- Code reading (TSP precedent, mentioned)

**Coverage:** Through W8 TSP. W9 (column generation) and W10 (matching) EXCLUDED.

### Big M / Constraint Conspiracy

Extended discussion on how multiple constraints CONSPIRE to force correct integer values. Carries over from assortment optimization. In pricing, the OBJECTIVE function plays the same subtle role.

### Multicollinearity in OJ Data (Real Insight)

- **Deal (coupon) NEGATIVELY correlated with demand** in regression — counterintuitive.
- **Root cause:** Prices are ENDOGENOUS. Managers lower prices BEFORE predicted demand drops (e.g., December exodus from Westwood).
- Minute Maid 64oz and 96oz prices have correlation 0.55; both change together, making cross-price effects hard to disentangle.

**Solution approach (mentioned, not taught):** Instrumental variables, propensity scores, causal inference (Prof. Castro's class).

> **Exam lesson:** Unexpected negative $\gamma_{ij}$ in estimated data ≠ complement. It's confounding.

### Linearization of Bilinear Terms

**TWO linking constraints required (both directions!):**

1. $\sum_{t_2} y_{i,j,t_1,t_2} = x_{i,t_1}$ — fix product $i$ at price $t_1$, link to all $j$
2. $\sum_{t_1} y_{i,j,t_1,t_2} = x_{j,t_2}$ — fix product $j$ at price $t_2$, link to all $i$

> *"Missing ONE direction is a common exam mistake."*

### Semi-Log Demand Intuition

**Linear:** $d = \alpha - \beta p$. $1 price up → demand drops by EXACTLY $\beta$ units (arithmetic).

**Semi-log:** $\log d = \alpha - \beta p$ → $d = e^{\alpha-\beta p}$. $1 price up → demand MULTIPLIES by $e^{-\beta}$ (geometric).
- If $\beta = 0.1$: $1 raise cuts demand ~10%.

**Why use which:**
- Linear for cheap consumables (absolute drops matter).
- Semi-log for expensive items (percentage drops matter).

**Why semi-log is hard:** Objective is NOT concave. Requires advanced methods (biconjugate, column generation, alternating maximization) — deferred to W9.

### Worked OJ Example

**11 brands** across 83 stores, weekly data:
- Brand 1 (Tropicana 64oz): $\alpha_1 = 13{,}511$, $\beta_1 = 19{,}345$, $\gamma_{1,2} = 1{,}552$ (Tropicana 96oz substitute).
- Feature (in-store display): +16,228 units.
- Deal (coupon): NEGATIVE (multicollinearity, not real economics).

**Optimal prices (5 levels per brand):**
- Tropicana Premium 64oz: **$3.87** (near top)
- Minute Maid 96oz: **$2.76** (bottom — budget position)
- Dominick's store 128oz: **$4.99**
- Total revenue: **$293,378** vs historical $242,584 = **+20.9%**

**With business constraints:**
- Tropicana 96oz ≤ 1.5 × 64oz (prevent size arbitrage)
- Minute Maid 96oz ≥ 1.30 × 64oz (ensure value pricing)
- Average 64oz price ≥ $3.00

Revenue drops to ~$213,000. **Lesson in tradeoffs.**

### Continuous Optimization (Linear Demand)

With continuous prices:
- Objective is concave quadratic IFF matrix $M + M^T$ is PSD (eigenvalues ≥ 0).
- **First-order condition:** $\alpha_k - 2\beta_k p_k + \sum_{j \ne k} \gamma_{k,j} p_j = 0$ for all $k$ — LINEAR SYSTEM.
- For 2 products: solve 2×2 system by hand (likely exam prep).

### Student Q&A

- **"Is the problem dynamic?"** No, W6 is STATIC (one-shot pricing). Multi-period and bandits later.
- **"Why negative deal coefficient?"** Confounding/endogeneity, not real complement.
- **"Can I remove zero-demand products?"** Math: yes. Gurobi: it stops when integer ≈ LP bound. Preprocessing is separate.

### Warnings & Sign Mistakes

1. **Own-price term is NEGATIVE:** $R = \sum \alpha_i p_i - \sum \beta_i p_i^2 + \ldots$ Subtracted, not added.
2. **Use $p^2$, NOT $p$:** Quadratic from $p_i \cdot (\alpha_i - \beta_i p_i)$.
3. **BOTH linking constraints required.**
4. **Complement (negative $\gamma$):** milk + cereal. Raise cereal price → milk demand FALLS.

### Strategy

1. Identify demand model (linear vs semi-log).
2. Expand revenue $\sum_i p_i d_i(\mathbf{p})$ — recognize quadratic if linear.
3. If discrete prices: linearize cross-terms via $y$ and BOTH linking directions.
4. Verify signs (own-price negative, cross-price could be either).
