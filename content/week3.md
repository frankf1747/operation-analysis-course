# Week 3 — Newsvendor Problem 报童问题

## 0. Big Picture

A newsvendor buys today's newspaper at cost $c$ and sells at price $p$. **Order too few → lost sales. Order too many → unsold (worthless at end of day).** This perishable-inventory tradeoff applies to bakeries, fashion, airlines (overbooking), seasonal items, and any perishable good.

## 1. Mathematical Setup

- Random demand $D$ with distribution $F$
- Order quantity $Q$ (chosen BEFORE $D$ observed)
- Cost $c$, selling price $p$, salvage value $s$ (often 0)

**Profit for one realization:**
$$\pi(Q,D) = p \min(Q,D) + s(Q-D)^+ - cQ$$

When $s = 0$: $\pi = p \min(Q,D) - cQ$.

## 2. Two Equivalent Formulations

### Profit-based
$$\max_Q E[p \min(Q,D) - cQ]$$

### Cost-based (缺货成本 & 过剩成本)
$$\min_Q E[c_u(D-Q)^+ + c_o(Q-D)^+]$$
- $c_u = p - c$ (underage — opportunity cost per unmet unit)
- $c_o = c - s$ (overage — net cost per unsold unit)

Why equivalent: profit $= (p-c) E[D] - E[c_u(D-Q)^+ + c_o(Q-D)^+]$. First term constant in $Q$.

## 3. Critical Fractile — Derivation 临界分位数

### Marginal Analysis
Going from $Q$ to $Q+1$:
- If $D > Q$: gain $c_u$ (probability $P(D > Q)$)
- If $D \le Q$: lose $c_o$ (probability $P(D \le Q)$)

Set marginal benefit = 0:
$$c_u(1 - F(Q^*)) = c_o F(Q^*)$$
$$F(Q^*) = \frac{c_u}{c_u + c_o}$$

**Equivalent profit-based form (when $s = 0$):** $F(Q^*) = (p-c)/p$.

### Calculus Derivation
$G(Q) = pE[\min(Q,D)] - cQ$. Derivative:
$$G'(Q) = p(1 - F(Q)) - c = 0 \Rightarrow F(Q^*) = \frac{p-c}{p}$$

**Intuition:** Want stockout probability = $c/p$. Thin margins (high $c/p$) → stock less.

## 4. Distributions — CDF Inversion

### Uniform $U[a,b]$
$F(x) = (x-a)/(b-a)$, $Q^* = a + \alpha(b-a)$.

**Example:** $U[20,80]$, $p=12, c=4, s=2$ → $c_u=8, c_o=2, \alpha=0.8$. $Q^* = 20 + 0.8(60) = 68$.

### Triangular Tr$[a, b, c]$ (low, mode, high)
**PDF:**
$$f(x) = \begin{cases} \frac{2(x-a)}{(b-a)(c-a)} & a \le x \le b \\ \frac{2(c-x)}{(c-b)(c-a)} & b < x \le c \end{cases}$$

**CDF:**
$$F(x) = \begin{cases} \frac{(x-a)^2}{(b-a)(c-a)} & x \le b \\ 1 - \frac{(c-x)^2}{(c-b)(c-a)} & x > b \end{cases}$$

**Inverse:**
- If $\alpha \le F(b)$: $Q^* = a + \sqrt{\alpha(b-a)(c-a)}$
- If $\alpha > F(b)$: $Q^* = c - \sqrt{(1-\alpha)(c-b)(c-a)}$

**Example:** Tr[100, 150, 300], $p=4, c=1, s=0 \Rightarrow \alpha = 0.75$. $F(150) = 50/200 = 0.25$. Since $0.75 > 0.25$, use upper branch:
$$Q^* = 300 - \sqrt{0.25 \cdot 150 \cdot 200} = 300 - 86.6 = 213$$

### Normal $N(\mu, \sigma^2)$
$Q^* = \mu + z_\alpha \cdot \sigma$. $z_\alpha < 0$ when $\alpha < 0.5$.

Standard $z$ values: $z_{0.5}=0, z_{0.75}=0.674, z_{0.9}=1.282, z_{0.95}=1.645$.

**Example:** $N(500, 100^2), p=100, c=60, \alpha=0.4, z_{0.4}=-0.253$. $Q^* = 500 - 25 = 475$.

### Exponential Exp($\lambda$)
$F(x) = 1 - e^{-\lambda x}$, $Q^* = -\ln(1-\alpha)/\lambda$.

## 5. Basic Newsvendor Notebook

**Cell 1-2:** Simulate 1000 demands from $N(500, 100^2)$.

**Cell 3:** For each $Q = 1, 2, ..., 999$:
```python
profits = [p*min(Q,d) - c*Q for d in demand_data]
expected_profit.append(np.mean(profits))
```

**Cell 6-7:** Plot expected_profit vs Q → concave inverted parabola.

**Cell 8-10:**
```python
optimal_Q = expected_profit.argmax()
empirical_stockout = sum(d > optimal_Q for d in demand_data) / 1000
```

**Cell 11:** Verify against theory: `1 - stats.norm.cdf(optimal_Q, mu, sigma)`.

**Cell 18:** Skip grid search — directly use:
```python
nv_quantile = (p-c)/p
optimal_Q = np.quantile(demand_data, nv_quantile)
```

## 6. Sample-Average (Empirical) Newsvendor

Given historical demands $d_1, \ldots, d_n$:
1. Compute $\alpha = (p-c)/p$
2. Sort demands
3. $Q^* = d_{(\lceil n\alpha \rceil)}$ (the $\lceil n\alpha \rceil$-th smallest)

**Example:** 10 demands [45,52,48,61,55,49,58,51,46,60]. $\alpha=0.8$, $\lceil 8 \rceil = 8$. Sorted: [45,46,48,49,51,52,55,58,60,61]. $Q^* = 58$.

## 7. Contextual Newsvendor — Big Picture 背景变量

Demand depends on features $X$ (weather, day, location). Want $Q^*(X)$ — order quantity as function of context.

Two approaches:
- **Regression tree** (non-parametric, splits feature space into leaves)
- **Linear regression** (parametric, assumes $D|X \sim$ Normal)

## 8. Regression Tree Approach

1. Fit tree on training data $(x_i, d_i)$.
2. For each leaf $\ell$: collect demands of samples in $\ell$, compute $\alpha$-quantile.
3. New $x$ → drop down tree to find leaf → use that leaf's $Q^*$.

## 9. Linear Regression Approach

Assume $D | X \sim N(\beta_0 + \beta_1 X_1 + \ldots + \beta_k X_k, \sigma^2)$.

1. Fit linear regression → get $\hat\beta$'s and $\hat\sigma$.
2. For new $x$: $\hat\mu(x) = \hat\beta_0 + \sum \hat\beta_i x_i$
3. $Q^*(x) = \hat\mu(x) + z_\alpha \cdot \hat\sigma$

**Example:** $\hat\mu = 50 + 2T - 15W$, $\hat\sigma = 20$, $\alpha = 0.4$. Tomorrow $T=85, W=0$ → $\hat\mu = 220$. $z_{0.4} = -0.253$. $Q^* = 220 - 5 = 215$.

## 10. Orange Juice Notebook — Full Walkthrough

**Cell 2-3:** Load OJ data with demographic features (income, education, age, etc.) and demand.

**Cell 5:** Train-test split 50/50.

**Cell 7:** Fit `DecisionTreeRegressor(max_depth=2)` → 3-4 leaves.

**Cell 21-25:**
```python
p, c = 3.00, 2.10
nv_quantile = (p-c)/p  # = 0.30
leaves = [2, 3, 5, 6]
leaf_to_quantile = np.zeros(tree.node_count)
for leaf in leaves:
    demands_in_leaf = y_train[oj_tree.apply(X_train) == leaf]
    leaf_to_quantile[leaf] = np.quantile(demands_in_leaf, nv_quantile)
```

**Cell 29-30:** Out-of-sample evaluation:
```python
test_leaves = oj_tree.apply(X_test)
test_orders = leaf_to_quantile[test_leaves]
test_profit = p * np.minimum(test_orders, y_test) - c * test_orders
# Contextual avg ≈ $4028/week
```

**Cell 31-32:** Non-contextual baseline (single Q for all stores) ≈ $3932/week. Contextual gain ≈ 2.4%.

## 11. Expected Profit Calculation

$$E[\pi(Q^*, D)] = pE[\min(Q^*, D)] - cQ^*$$

Where:
$$E[\min(Q^*, D)] = \int_0^{Q^*} x f(x) dx + Q^* [1 - F(Q^*)]$$

Alternative: $G(Q^*) = (p-c)Q^* - p \int_0^{Q^*} F(x) dx$.

**Worked example (coffee, uniform):** $Q^* = 68$, $E[\pi^*]$ = \$352. Full profit:
$$\pi^* = pE[D] - E[\text{losses}] = 8 \cdot 50 - 48 = 400 - 48 = 352$$

## 12. Step-by-Step Templates

### (a) Known distribution
1. Compute $\alpha = (p-c)/p$ or $c_u/(c_u+c_o)$
2. Invert CDF: $Q^* = F^{-1}(\alpha)$
3. (Optional) Compute expected profit

### (b) Sample data
1. Compute $\alpha$
2. Sort demands
3. $Q^* = $ ⌈$n\alpha$⌉-th smallest

### (c) Regression tree
1. Drop $x$ down tree to find leaf $\ell$
2. $Q^*(x) = $ empirical $\alpha$-quantile of demands in $\ell$

### (d) Linear regression
1. Fit linear model, get $\hat\beta, \hat\sigma$
2. Predicted mean $\hat\mu(x)$
3. $Q^*(x) = \hat\mu(x) + z_\alpha \hat\sigma$

## 13. Common Mistakes ⚠️

1. **Wrong direction of fractile.** $F(Q^*) = \alpha$ (CDF), NOT $P(D > Q^*) = \alpha$.
2. **Forgetting salvage.** If $s > 0$: $c_o = c - s$ (not just $c$).
3. **Wrong root of quadratic.** Triangular: $Q^* = 300 \pm 86.6$ — pick root in $[a, c]$, i.e. 213.
4. **Using $\lfloor n\alpha \rfloor$ instead of ⌈$n\alpha$⌉** in empirical quantile.
5. **Forgetting $z_\alpha < 0$ for $\alpha < 0.5$.** Order BELOW mean when underage is cheap.
6. **Using mean as $Q^*$.** Only correct when $\alpha = 0.5$.
7. **Tree overfitting.** Use max_depth ≤ 4.
8. **Wrong CDF branch for triangular.** Check $\alpha$ vs $F(b)$ first.

## 14. Exam Relevance

Exam slides list 4 newsvendor question types:
1. **Sorted data + (p, c)** → empirical quantile.
2. **Density given** → integrate to CDF, invert.
3. **Regression tree** → leaf quantile.
4. **Linear regression** → $\hat\mu + z_\alpha \hat\sigma$.

Plus practice: Newsvendor-I (uniform/coffee), Newsvendor-II (triangular/donuts).

## 15. Mini Practice

**Q1.** $D \sim U[0,100], p=50, c=30$. $\alpha = 0.4$. $Q^* = 0 + 0.4(100) = 40$.

**Q2.** $D \sim N(100, 15^2), p=80, c=50$. $\alpha = 0.375$, $z_{0.375} \approx -0.319$. $Q^* = 100 - 4.8 \approx 95$.

**Q3.** $D \sim$ Tr[50,100,150], $p=60, c=24$. $\alpha=0.6$. $F(100)=50/100=0.5$. Use upper branch: $Q^* = 150 - \sqrt{0.4 \cdot 50 \cdot 100} = 150 - \sqrt{2000} = 150-44.7=105.3$.

**Q4.** Data [44..62] (20 obs), $p=10, c=4$. $\alpha=0.6$, $\lceil 12 \rceil = 12$. Sorted 12th value = 54.

**Q5.** Contextual: 2 leaves, Leaf A demands [18,22,19,21,20,23,17,19,21,22] (10 obs), $\alpha=0.3 \Rightarrow$ 3rd smallest = 19. Order 19 units for Leaf A customers.

**Q6.** $\hat\mu = 200, \hat\sigma = 30, \alpha = 0.8, z_{0.8}=0.842$. $Q^*= 200 + 25.3 = 225$.

## 16. Cheat Card

| Concept | Formula |
|---|---|
| Fractile | $\alpha = c_u/(c_u+c_o) = (p-c)/p$ |
| Optimal Q | $Q^* = F^{-1}(\alpha)$ |
| Uniform | $Q^* = a + \alpha(b-a)$ |
| Normal | $Q^* = \mu + z_\alpha \sigma$ |
| Empirical | $Q^* = $ ⌈$n\alpha$⌉-th sorted value |
| Tree contextual | $Q^*(x) = $ leaf's $\alpha$-quantile |
| Lin reg contextual | $Q^*(x) = \hat\mu(x) + z_\alpha \hat\sigma$ |
| $c_u, c_o$ | $c_u = p - c$; $c_o = c - s$ |

**Common $z_\alpha$:** $z_{0.1}=-1.28, z_{0.25}=-0.67, z_{0.5}=0, z_{0.75}=0.67, z_{0.9}=1.28, z_{0.95}=1.65$.

---

## 🎙️ Lecture Transcript Insights — Beyond the Slides

From Prof. Misic's 4/15 lecture.

### THE Key Formula (Emphasized Repeatedly)

> *"There's a formula for finding what that optimal Q is. NO MATTER what your distribution is or what your data set is."*

$$Q^* = F^{-1}\left(\frac{p-c}{p}\right) \quad \Leftrightarrow \quad F(Q^*) = \frac{p-c}{p}$$

> *"This is something that's really easy to calculate."*

**Companion relationship:** $P(\text{lost sales}) = c/p$, independent of distribution.

### Critical Clarifications

**Underage vs Overage (exact $ amounts):**
- **Overage ($Q > D$):** Paid for $Q$ units, sold $D$. Loss = $c$ per unit OVER.
- **Underage ($Q < D$):** Demand exceeded supply. Lose $p - c$ per unit UNDER (foregone margin, NOT just price).

> *"It goes up by p right. You sell one more unit but you lose c because you have to stock one more unit. So that's why it's p minus c."*

**Why CDF inversion works (marginal logic):**
At optimum, marginal benefit = marginal cost:
- Upside: $p \cdot P(D > Q)$ (revenue if demand exceeds stock)
- Downside: $c \cdot 1$ (cost of one extra unit)
- Set equal: $p(1 - F(Q^*)) = c \Rightarrow F(Q^*) = (p-c)/p$.

**Continuous vs Discrete demand:**
> *"We'll assume that D is a continuous random variable... it makes it actually very easy to analyze. You'll see we'll be working with some integrals."* With discrete data, use empirical quantile (`np.quantile`).

### Sales vs Demand (CRITICAL)

> *"The key thing is the DIFFERENCE between sales and demand."*

- Demand $D$: what customers want.
- Sales = $\min(Q, D)$: what you can actually sell.
- If $Q = 80, D = 100$: you sell 80, lose 20 in opportunity.

### Student Q&A

**Q: Why normal vs Poisson?**
> *"All roads lead to Rome basically... central limit theorem kicks in... they all won't see qualitatively different behavior."*

Only use extreme-tail distributions if you genuinely believe in extreme outcomes.

**Q: Is this daily or long-run?**
> *"The problem is at a level of a day. But expectations reflect long-run averages. If expected profit is $1,000, your average over many days is very close to $1,000."*

**Q: Can demand autocorrelate?**
> *"Yes. If yesterday's news sold a lot, today I might order more. That leads to contextual newsvendor."*

**Q: Nurse staffing example** (homework type):
- Regular nurse cost: $2,160/day. Agency nurse: $5,400/day.
- Move one nurse closer to demand → save $5,400 (avoid agency) but still pay $2,160 (already-hired regular).
- $c_u = 5{,}400 - 2{,}160$? Think marginally — how does cost change per unit closer to demand?

### Worked Notebook Examples

**$p = 100, c = 90$ (synthetic demand, 1000 samples):**
- Optimal $Q^* = 363$.
- Empirical $P(\text{lost sales}) = 0.898 \approx 0.9 = c/p$. ✓

**$p = 100, c = 70$:**
- $Q^* = 446$ (LARGER — overage costs less, so we stock more).
- $P(\text{lost sales}) \approx 0.7 = c/p$. ✓

**$p = 100, c = 10$:**
- $Q^*$ much larger.
- $P(\text{lost sales}) \approx 0.1 = c/p$.

> *"This property holds, right, NO MATTER WHAT the distribution is."*

**Gamma distribution test:** Formula still works. Small mismatches from interpolation in quantile function.

### Orange Juice Case — Crucial Insight

Domenic's Spider Foods chain, 83 stores, 11 OJ products. Demographics: age 60+, college %, income, etc.

**Stores have DIFFERENT demand distributions** → contextual newsvendor matters.

**Regression tree (max_depth=2):** Splits on education < 0.449 then income < 0.87. Leaf means: 16k, 11.5k, 38k, 26k units.

> ❗ ***BUT THESE LEAF MEANS ARE NOT THE OPTIMAL ORDER QUANTITIES.***

> *"That's not actually what our order quantity should be."*

The regression tree leaf VALUES minimize squared error (predict the mean). The newsvendor needs the $(p-c)/p$ QUANTILE of demand in each leaf, not the mean.

**Step:** Replace tree leaf VALUE with empirical quantile of demands in that leaf.

### Derivation Strategy for Exam (memorize this 6-step)

1. Write profit: $\pi(Q) = p \min(Q, D) - cQ$
2. Take expectation: $E[\pi] = pE[\min(Q,D)] - cQ$
3. Split: $E[\min] = \int_0^Q x f(x)dx + Q \cdot P(D > Q)$
4. Differentiate (fundamental theorem): $\frac{d}{dQ} \int_0^Q xf(x)dx = Q f(Q)$
5. Set derivative = 0: $p(1 - F(Q^*)) = c$
6. Solve: $F(Q^*) = (p-c)/p \Rightarrow Q^* = F^{-1}((p-c)/p)$

### Warnings

- **Sales ≠ Demand.** If $Q < D$: sales = $Q$, NOT $D$.
- **Point prediction ≠ optimal Q.** Regression mean is for MSE; newsvendor needs QUANTILE.
- **Perishability assumption** only holds if unsold = zero salvage. Reusable inventory doesn't fit.

### Contextual Newsvendor — Full Procedure

1. Train predictive model (regression tree / linear regression / k-NN) on training data $(X_i, D_i)$.
2. For each "region" (tree leaf), compute the $(p-c)/p$ EMPIRICAL QUANTILE of demands in that region.
3. For new context $x$: find which region $x$ falls into → use that quantile as $Q^*(x)$.
