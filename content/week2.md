# Week 2 — Revenue Management

## 0. Big Picture: The Airline Industry Story

Revenue management (收益管理) grew from a crisis in the airline industry. In 1978, the Airline Deregulation Act allowed airlines to set prices freely. Low-cost carriers like PEOPLExpress undercut major airlines' fares by 50-70%, capturing leisure passengers. American Airlines' VP Robert Crandall realized: *filling a seat costs almost nothing once the plane is flying.* American could offer "Ultimate Super Saver" deeply-discounted fares for leisure travelers while still charging business travelers premium prices.

**The Crisis:** Between 1978-2002, over 100 airlines went bankrupt. **The Solution:** capacity control (容量控制) — selling only a limited number of discount seats per flight, decided dynamically as departure approaches. American credits RM with $1.4 billion in incremental revenue (1988-1991). This was the birth of modern yield management.

## 1. The Setting — Why Capacity Allocation is Hard

Flight: 160 seats, sold over 200 days.
- Customer A (period 10): wants $80 economy seat
- Customer B (period 195): would pay $500 business class

**Tradeoff (核心权衡):**
- Accept A now: get $80, lose ability to sell to B
- Wait for B: preserve capacity, but B might never arrive

**Opportunity cost (机会成本):** The value of a seat = expected revenue you'd miss if you used it now.

## 2. Single-Leg RM Walkthrough

### Setup
- Capacity $C = 160$ seats
- $K = 10$ fare classes with revenues $r_j$ ($100 to $500)
- Time horizon $T = 200$ periods
- Each period at most one arrival, class $j$ with probability $p_j$
- Expected demand: $E[D_j] = T \cdot p_j$

### Myopic Policy (Accept-Everything)
```
If b > 0: ACCEPT
Else: REJECT
```
Why it fails: fills 160 seats with $80 fares, leaves no room for $500 fares later. Mean revenue ≈ $27,788.

### Deterministic LP
**Decision:** $x_j$ = number of class-$j$ to accept.

**Formulation:**
$$\max \sum_{j=1}^{K} r_j x_j$$
$$\text{s.t. } \sum_{j=1}^{K} x_j \le C \quad \text{(capacity)}$$
$$x_j \le E[D_j] = T p_j \quad \text{(demand cap)}$$
$$x_j \ge 0$$

**Numerical example:** $K=10$, revenues $[100,115,120,140,150,210,220,400,450,500]$, probabilities $[0.16,0.16,0.14,0.1,0.1,0.08,0.06,0.05,0.04,0.02]$, $T=200$, $C=160$.

Forecast = $T \cdot p$ = $[32,32,28,20,20,16,12,10,8,4]$. Total = 182 > 160 capacity.

**Optimal allocation:** $[10, 32, 28, 20, 20, 16, 12, 10, 8, 4]$. LP value = $29,440. Class 1 ($100) gets throttled to 10; higher classes get full forecast.

## 3. Bid-Price Control 投标价格控制

**Bid price** $\pi_\ell$ = shadow price of the capacity constraint = marginal value of one more seat.

### Decision Rule
At time $t$ with $b$ seats remaining:
1. Solve LP$(t, b)$ with remaining demand $(T-t+1) p_j$
2. Get shadow price $\pi_t(b)$ of capacity constraint
3. **Accept request $j$ if $r_j \ge \pi_t(b)$** AND seats available

### Intuition
- $\pi$ = opportunity cost of using a seat now (vs. saving for higher fare later)
- Accept only if fare exceeds opportunity cost
- $\pi$ INCREASES as $t$ approaches departure (less time for high fares to arrive)
- $\pi$ INCREASES as $b$ decreases (scarcity)

### Numerical Example
At $t = 100$, $b = 50$ seats, $\pi = 200$:
- Class A ($150): $150 < 200$ → REJECT
- Class B ($200): $200 \ge 200$ → ACCEPT
- Class C ($180): $180 < 200$ → REJECT

## 4. Single-Leg Notebook — Cell Walkthrough

**Cell 1: Data setup**
```python
revenue = [100,115,120,140,150,210,220,400,450,500]
probability = [0.16,0.16,0.14,0.1,0.1,0.08,0.06,0.05,0.04,0.02]
B = 160; T = 200
forecast = T * probability  # = [32,32,28,...,4]
```

**Cell 3: Solve static LP**
```python
m = Model()
x = m.addVars(nFares, lb=0, ub=forecast)
seat_constr = m.addConstr(quicksum(x[i] for i in range(nFares)) <= B)
m.setObjective(quicksum(revenue[i]*x[i] for i in range(nFares)), GRB.MAXIMIZE)
m.optimize()
# LP_obj = 29440
```

**Cell 6: bpc() function**
```python
def bpc(b, t):
    seat_constr.rhs = b
    for i in range(nFares):
        x[i].ub = (T-t)*probability[i]
    m.optimize()
    return seat_constr.pi
```
- `bpc(160, 0)` → π = 100
- `bpc(20, 99)` → π = 210 (scarcity)

**Cell 13: Simulate bid-price policy**
```python
for s in range(100):
    revenue_s, b = 0, 160
    for t in range(T):
        fare = arrival_sequence[t]
        if fare < nFares:  # not "no arrival"
            dual = bpc(b, t)
            if revenue[fare] >= dual:
                b -= 1
                revenue_s += revenue[fare]
# Mean revenue ≈ 29,329 (99.6% of LP bound)
```

**Cell 19: Myopic baseline** → Mean revenue 27,788. Gap with bid-price = 5.5%. With fixed cost of $26,000, **profit improvement = 86%**.

## 5. Multi-Leg / Network RM

### Setup
Multiple flight legs sharing capacity:
- $M$ legs, capacity $b_\ell$ each
- $n$ itineraries (some single-leg, some multi-leg using 2+ legs)
- Itinerary $i$ uses leg $\ell$ if $a_{\ell i} = 1$

### LP
$$\max \sum_i r_i x_i$$
$$\text{s.t. } \sum_{i: a_{\ell i}=1} x_i \le b_\ell \quad \forall \ell$$
$$x_i \le E[D_i] = T p_i$$
$$x_i \ge 0$$

### Bid-Price Rule for Multi-Leg
Itinerary $i$ uses legs in set $S_i$. Accept iff:
$$r_i \ge \sum_{\ell \in S_i} \pi_\ell$$

**Example:** Itinerary BOS→SLC→LAX uses legs 0 and 3. If $\pi_0 = 50, \pi_3 = 40$, total bid price = 90. Accept if fare ≥ 90.

## 6. Multi-Leg Notebook Walkthrough

Network: 4 legs (BOS→SLC, JFK→SLC, SLC→SFO, SLC→LAX), 8 itineraries (4 direct + 4 connecting).

```python
itineraries_to_legs = [[0],[1],[2],[3],[0,2],[0,3],[1,2],[1,3]]
```

Solve LP → optimal revenue 132,400. Dynamic bid-price policy mean = 130,298 (1.59% gap). Myopic = 124,422 (4.7% lower).

## 7. Expected Arrivals — Math

### Bernoulli (Discrete Time)
- Per period, class $j$ arrives with probability $p_j$
- Expected arrivals over $[t, T]$: $E[D_j(t,T)] = (T-t+1) p_j$

### Poisson (Continuous Time)
- Rate $\lambda_j$ per unit time
- Expected arrivals over $[t, T]$: $E[N_{t,T,j}] = \lambda_j (T-t)$

## 8. Algorithm Pseudocode

```
b ← C
revenue ← 0
FOR t = 1 to T:
    Solve LP(t, b):
        max Σ r_i x_i
        s.t. Σ a_{ℓi} x_i ≤ b_ℓ  ∀ℓ
             x_i ≤ (T-t) p_i  ∀i
    π ← shadow prices of capacity constraints
    Observe request type i
    IF i is real AND r_i ≥ Σ_{ℓ in legs(i)} π_ℓ AND b[ℓ] > 0 for all ℓ:
        ACCEPT: revenue += r_i; b[ℓ] -= 1 for each ℓ in legs(i)
RETURN revenue
```

## 9. Common Mistakes ⚠️

1. **Confusing demand with allocation.** Forecast = max demand; allocation = optimal accept count.
2. **Ignoring opportunity cost.** Don't accept just because seat is empty — compare to bid price.
3. **Static vs dynamic confusion.** LP gives static allocation; bid-price re-solves dynamically.
4. **Wrong leg accounting.** Multi-leg requests use SUM of bid prices over legs they use.
5. **Treating bid price as fixed.** $\pi_t(b)$ varies with time and capacity.
6. **Forgetting demand cap.** Without $x_j \le E[D_j]$, LP allocates everything to highest fare.
7. **Claiming impossible revenue.** LP value is UPPER BOUND on achievable expected revenue.

## 10. Exam Relevance

Practice exam slide explicitly lists 5 RM question types:
1. "Formulate the capacity control LP for this scenario."
2. "Design an algorithm using the LP for dynamic accept/reject."
3. "At time t with X seats remaining, shadow price = Y. Which request types accept?"
4. "Given arrival probabilities, expected arrivals of type 5 over horizon?"
5. "Someone claims policy achieves $X. LP value is $Y. Believable?"

## 11. Mini Practice

**Q1.** Hotel: 100 rooms, 10 nights. Class A($80, p=0.05/night), B($120, 0.06), C($200, 0.02). Write LP.

**Answer:** $\max 80x_A + 120x_B + 200x_C$ s.t. $x_A + x_B + x_C \le 100$, $x_A \le 0.5, x_B \le 0.6, x_C \le 0.2$, $x \ge 0$.

**Q2.** $\pi = 180$. Accept fare $r_j = 200$? **Yes** (200 ≥ 180).

**Q3.** Multi-leg fare $85, uses 2 legs with $\pi_1 = 50, \pi_2 = 40$. **REJECT** ($85 < 90$).

**Q4.** LP optimum = $30k. Policy claims $35k revenue. **Not possible** — LP is upper bound.

**Q5.** $T = 200, p_J = 0.05$. Expected J arrivals from $t = 150$? $(200-150+1)(0.05) = 51 \times 0.05 = 2.55$.

## 12. Cheat Card

| Concept | Formula |
|---|---|
| Capacity LP | $\max \sum r_j x_j$ s.t. $\sum x_j \le C$, $x_j \le E[D_j]$ |
| Bid price = | shadow price of capacity constraint |
| Single-leg rule | Accept iff $r_j \ge \pi_t(b)$ |
| Multi-leg rule | Accept itin $i$ iff $r_i \ge \sum_{\ell \in S_i} \pi_\ell$ |
| Bernoulli arrivals | $E[D_j] = (T-t+1) p_j$ |
| Poisson arrivals | $E[N] = \lambda_j (T-t)$ |
| LP value = | upper bound on expected revenue |

**Key intuition:** Bid price = opportunity cost. Accept iff fare ≥ opportunity cost. Re-solve at each request.

---

## 🎙️ Lecture Transcript Insights — Beyond the Slides

From Prof. Misic's 4/8 lecture — what he said but the slides don't capture.

### Exam-Focused Verbal Cues

- **"On an exam this would be one point out of ten"** — Identifying max vs min (trivial but easy to bungle under pressure).
- **"Expected arrivals come from BINOMIAL distribution"** — $D_j$ ~ Binomial$(T, p_j)$. Large $T$ → approximately normal by CLT. But the underlying is binomial. Students treat forecasts as deterministic — wrong.
- **"Dual variables as sensitivity — this is going to be important today."** Foundation for bid-price.
- **Policy specification is intractable:** For $T$ periods × $(B+1)$ capacity levels × $(n+1)$ decisions, there are $2^{T(B+1)(n+1)}$ possible policies. The LP approximation matters because direct DP is infeasible.

### Concepts Emphasized by Repetition

**OPPORTUNITY COST** (repeated 8+ times across the lecture):
- "What is the value of this one seat at this point in time?"
- "If you use a seat now, you lose the opportunity to sell it later."
- "It's the MARGINAL value of one more seat."

This is the GLUE that holds the entire bid-price framework together.

**Myopic policy as benchmark:** Always sells out but leaves money on the table ($27,788 vs $29,329). Don't confuse "selling all capacity" with "maximizing revenue."

**Bid price varies with BOTH time AND capacity** — multiple worked examples:
- `bpc(160, 0)` → $\pi = 100$ (early, full plane → low opportunity cost)
- `bpc(160, 100)` → $\pi = 0$ (late, full plane → almost no time for high fares)
- `bpc(20, 99)` → $\pi = 210$ (late, almost empty → high scarcity premium)

Many students treat $\pi$ as a fixed number — wrong.

### Real-World Stories (Set Context)

**The People Express bankruptcy:** $1 billion revenue but only $60 million profit (way less than $350M expected). Why? Undercutting on price WITHOUT capacity control — filling planes with $80 fares when $500 fares were available. This is why RM matters.

**The travel office anecdote:** A student's flight from Shanghai to LA was booked via SHG → HKG → TPE → LAX. COVID-era transit visa rules meant the student couldn't enter Taiwan. This illustrates why we model "10 fare classes" — there are 10+ hidden fare sources (corporate offices, Expedia, airline.com, etc.), each with different rules.

### Verbal Clarifications

**Why fractional allocations are OK** (conceptually): "It's not implementable but useful." If $x_1 = 3.5$, it means "on average, accept 3.5 class-1 requests per flight" across many repetitions. Resolves the confusion about fractional seats.

**Python indexing GOTCHA:** Slides use $T - t + 1$ (math convention, periods left including current). Notebook code uses `T - t` (zero-indexing). Don't copy mechanically.

**Bernoulli vs Binomial vs Poisson clarity:**
- Per period: class $j$ arrives with probability $p_j$, independent across periods → Bernoulli per period.
- Over $T$ periods: # arrivals of class $j$ ~ Binomial$(T, p_j)$, mean $Tp_j$.
- Continuous-time analog: Poisson process with rate $\lambda_j$, mean $\lambda_j T$.

### Student Q&A

- **"Why not accept business class all the time?"** Because you don't KNOW if business travelers will arrive. If you hold capacity and only economy arrives, you waste the flight. Solve on AVERAGE.
- **"How do airlines actually optimize?"** Simulation: 20,000 LP solves (100 sims × 200 days). Real airlines: once at sale opening, then nightly updates. Notebook uses `m.params.OutputFlag = 0` to suppress logs.
- **"Is bid price time-dependent?"** "Very much so. Very much capacity-dependent too." BOTH dimensions matter.
- **"How do we know we're close to optimal?"** LP value is an upper bound. Hitting 29,329 vs 29,440 LP is 0.37% gap. Asymptotically optimal — gap shrinks with problem size.
- **"What about overbooking?"** Modify seat constraint: $0.8 x_i \le$ seats (for 80% show-up). But might break linearity.

### Key Profit Insight

Revenue improves 5.5% (29,329 vs 27,788). But with $26,000 fixed cost: profit improves **86%** ($3,329 vs $1,788). 

> *"Small percentage improvements in revenue lead to LARGE percentage improvements in profit"* because airline fixed costs are huge. This is why RM matters in practice.

### Warnings Flagged Verbally

1. **Don't confuse forecast with allocation.** Forecast = $Tp$. Allocation = $x_j$ you choose to accept.
2. **LP is an upper bound, NOT a guarantee.** If a company claims they achieve LP value, that's NOT believable.
3. **Bid price is NOT constant** — varies with $t$ and $b$.
4. **For multi-leg, SUM bid prices over legs used.** Common mistake: comparing fare to a single leg's bid price.
5. **Shadow price CAN be zero.** If demand forecast < capacity, $\pi = 0$.
6. **At horizon end, you become DESPERATE.** As $t \to T$ with $b > 0$, $\pi \to 0$.

### Strategy

1. Build static LP (capacity + demand cap).
2. Solve, extract dual variables (bid prices).
3. Dynamic: at each request, compare fare to sum of relevant bid prices.
4. Accept iff fare ≥ bid price.
5. RE-SOLVE the LP at each request with updated remaining capacity and time.

**Key insight:** You're NOT solving for the optimal policy directly. You solve the LP and USE its dual values to guide a greedy accept/reject rule. That rule turns out to be asymptotically optimal.
