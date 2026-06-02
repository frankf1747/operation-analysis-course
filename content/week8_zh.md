# 第八周 — Traveling Salesman Problem 旅行商问题

## 0. 大局观

一位推销员从某个城市出发，必须**恰好访问**$n$个城市各一次，然后回到起点。目标是最小化总距离。

**实际应用：** 仓库订单拣选、配送路径规划、生产排序（例如铝合金生产顺序）、电路板钻孔。

TSP 是 **NP-难** 问题。当 $n=20$ 时 → $6 \times 10^{16}$ 条行程。无法暴力枚举。但现代求解器 + **懒约束生成** 可以在数秒内求解 $n = 61$ 的问题。

## 1. 为什么 TSP 很难

对称情况下，不同行程的数量 = $(n-1)!/2$。当 $n = 60$ 时：$\approx 10^{81}$。宇宙的年龄只有 $10^{10}$ 年。暴力法不可能。

## 2. 朴素表达（为什么会失败）

### 变量
$x_{ij} \in \{0,1\}$：是否从城市 $i$ 直接前往城市 $j$（有向）。

### 度约束 Degree Constraints
$$\sum_{j \ne i} x_{ij} = 1 \quad \forall i \quad \text{(每个城市离开一次)}$$
$$\sum_{j \ne i} x_{ji} = 1 \quad \forall i \quad \text{(每个城市进入一次)}$$

### 目标函数
$$\min \sum_i \sum_{j \ne i} d_{ij} x_{ij}$$

### 为什么失败：子环路
仅有度约束允许出现**不连通的环**。

**示例 (n=4)：** $x_{12}=1, x_{21}=1, x_{34}=1, x_{43}=1$。所有度约束都满足。但这是两个 2-环路，**不是**一条完整行程！

## 3. 子环路消除约束 (SECs) Subtour Elimination Constraints

### 定义
**子环路**是经过城市的真子集 $S \subsetneq V$ 的一个环。

### SEC
对每个真非空子集 $S \subsetneq V$：
$$\sum_{i \in S} \sum_{j \in S, j \ne i} x_{ij} \le |S| - 1$$

**直觉：** $S$ 内的一个环将使用 $|S|$ 条边。最多允许 $|S| - 1$ 条内部边即可禁止 $S$ 内部的环。

### 等价的割形式
$$\sum_{i \in S, j \notin S} x_{ij} \ge 1$$

"至少有一条边必须离开子集 $S$" → 确保连通性。

### 示例
**$S = \{1, 2\}$：** $x_{12} + x_{21} \le 1$。
**$S = \{0, 1, 8\}$ (3 个城市)：** $x_{01}+x_{08}+x_{10}+x_{18}+x_{80}+x_{81} \le 2$（6 个有序对，最多允许 2 = $|S|-1$）。

### 约束数量问题
共有 $2^n - 2$ 个真非空子集。当 $n = 61$ 时：$2 \times 10^{18}$。无法显式列出。需要使用懒约束。

## 4. 懒约束生成 Lazy Constraint Generation

### 算法
1. 只用度约束求解。
2. 求解器找到整数解（可能含子环路）。
3. **回调函数**通过 `getSubtours()` 检测子环路。
4. 对每个检测到的子环路 $S$：动态添加 SEC。
5. 求解器继续。重复直到一条行程覆盖所有 $n$ 个城市。

### Gurobi 语法
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

## 5. getSubtours 函数 — 详细追踪

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

**算法：**
- 选一个未访问的节点，沿出边在 sequence 中前进。
- 遇到已访问的节点（环闭合）时停止。
- 记为一个子环路；用剩余未访问节点重复。

### 追踪示例（练习题 n=9）
sequence = `[(2,5),(1,8),(3,2),(4,6),(0,1),(7,3),(6,4),(8,0),(5,7)]`

从节点 0 开始：
- 0 → 1 → 8 → 0。子环路：[0, 1, 8]。从 unvisited 中移除。

选择下一个未访问节点 (2)：
- 2 → 5 → 7 → 3 → 2。子环路：[2, 5, 7, 3]。

选择下一个 (4)：
- 4 → 6 → 4。子环路：[4, 6]。

**最终输出：** `[[0,1,8], [2,5,7,3], [4,6]]`。

这是**考试高度相关**——很可能会被考到。

## 6. 星巴克 Notebook — 逐单元格讲解

西洛杉矶 61 个星巴克门店。Google Maps 行车时间（不对称）。

```python
starbucks_locations = pd.read_csv("starbucks_address_lat_lon.csv")  # 61 rows
dist_mat = pd.read_csv("starbucks_dist_mat_full_noNAs.csv")
# Use "Time" column (seconds)
```

### 仅使用度约束构建模型
```python
m = Model()
x = m.addVars(od_pairs, vtype=GRB.BINARY)
for i in range(61):
    m.addConstr(sum(x[i,j] for j in range(61) if j!=i) == 1)
    m.addConstr(sum(x[j,i] for j in range(61) if j!=i) == 1)
m.setObjective(sum(time[i,j]*x[i,j] for (i,j) in od_pairs), GRB.MINIMIZE)
```

### 添加懒约束回调（见第 4 节）

### 求解
```python
m.params.LazyConstraints = 1
m.optimize(eliminateSubtours)
# Optimal tour: 16,816 seconds (~4hr 40min)
# ~101 lazy SECs added
# Solve time < 1 second
```

### 行程重建与可视化
```python
sequence = [(i,j) for (i,j) in od_pairs if x[i,j].x > 0.5]
complete_tour = getSubtours(sequence)[0]  # Single tour
# Plot on Folium map
```

## 7. 可手算的 4 城市示例

距离矩阵：
```
    0   1   2   3
0   -  10  15  20
1  10   -   5  12
2  15   5   -   8
3  20  12   8   -
```

**朴素（仅度约束）：** 求解器可能返回 $x_{01}=x_{10}=x_{23}=x_{32}=1$。成本 = 36。但出现**两个**子环路：{0,1} 和 {2,3}。

**添加 SECs：**
- $x_{01} + x_{10} \le 1$
- $x_{23} + x_{32} \le 1$

**重新求解：** 强制 $x_{01}=x_{12}=x_{23}=x_{30}=1$（行程 0→1→2→3→0）。成本 = 10+5+8+20 = 43。一条合法的完整行程。完成。

## 8. 曼哈顿距离公式

仓库问题：$d_{ij} = (1/c)(|u_i - u_j| + |v_i - v_j|)$，其中 $c$ = 速度。

**示例：** 位置 (0,0)、(50,30)、(20,80)，速度 10 m/s。
- $d_{01} = (50+30)/10 = 8$s
- $d_{02} = (20+80)/10 = 10$s
- $d_{12} = (30+50)/10 = 8$s

两个方向相同 → 对称。

## 9. TSP 变体

### A. 在不同地点结束 (n+1)
增加节点 $n+1$，给出从每个位置出发的距离 $t_{i,n+1}$。加入约束 $x_{n+1, 1} = 1$（使"行程"从终点折回起点；真正有意义的路径是 起点 → ... → $n+1$）。

### B. 哈密顿路径（起终点不同）Hamiltonian Path
- 起始城市：出度 = 1，入度 = 0
- 终止城市：出度 = 0，入度 = 1
- 其他城市：入度 = 出度 = 1

### C. 时间窗口 (TSPTW) Time Windows
增加连续变量 $t_i$ = 到达时间。约束：
- $a_i \le t_i \le b_i$（时间窗口）
- $t_j \ge t_i + d_{ij} - M(1 - x_{ij})$（big-M 传播）

### D. 车辆容量 (CVRP)
增加流量变量 $f_{ij}$ 跟踪载荷。$f_{ij} \le Q x_{ij}$。

### E. 多辆车 (mTSP)
$x_{ijk}$ 按车辆下标。每个城市恰好被一辆车访问。

## 10. 练习题 TSP-I（仓库）— 完整讲解

### 设置
- $n-1$ 个物品 + 起点 1
- 每个物品位于 $(u_i, v_i)$
- 速度 $c$
- 距离 $t_{ij} = (1/c)(|u_i - u_j| + |v_i - v_j|)$

### (a) IP 表达
$$\min \sum_i \sum_{j \ne i} t_{ij} x_{ij}$$
约束条件：度约束、对所有真子集的 SEC、二元变量。

### (b) 追踪 getSubtours
sequence = `[(2,5),(1,8),(3,2),(4,6),(0,1),(7,3),(6,4),(8,0),(5,7)]`
输出：`[[0,1,8], [2,5,7,3], [4,6]]`。

### (c) 回调函数添加的 SECs
对 [0,1,8]：$x_{01}+x_{08}+x_{10}+x_{18}+x_{80}+x_{81} \le 2$。
对 [2,5,7,3]：12 项，$\le 3$。
对 [4,6]：$x_{46} + x_{64} \le 1$。

### (d) 变体：在不同地点结束 (n+1)
增加节点 $n+1$，由坐标计算距离，设定 $x_{n+1, 1} = 1$。

## 11. 分步方法

### (a) 从应用题中识别 TSP
单一主体访问多个地点，回到起点，最小化距离。

### (b) 计算距离矩阵
根据题目使用曼哈顿或欧几里得距离。若给出速度，转换为时间。

### (c) 写出度约束
每个城市的入度 = 1，出度 = 1。

### (d) 添加 SECs（当 $n > 10$ 时使用懒约束回调）

### (e) 追踪 getSubtours
选未访问节点，沿边前进，闭环，重复。

### (f) 由子环路列表给出 SECs
对每个子环路 $S$：$\sum_{i \in S} \sum_{j \in S, j \ne i} x_{ij} \le |S| - 1$。

### (g) 改造为在不同地点结束

## 12. 常见错误 ⚠️

1. **完全忘了 SECs。** 朴素表达会产生子环路。
2. **有向 vs 无向混淆。** SEC 中包括 $x_{ij}$ **和** $x_{ji}$ 两个方向。
3. **SEC 右端项写错。** 是 $|S| - 1$，**不是** $|S|$。
4. **遗漏 $j \ne i$ 限定。** 用于排除自环。
5. **追踪 getSubtours 出错** — 仔细维护 unvisited 列表。
6. **回调只在 MIPSOL 触发**，不是每个 LP 节点。
7. **忘了设置 LazyConstraints = 1。**
8. **单节点的"子环路"** 不应生成 SECs（回调检查 $> 1$）。
9. **TSPTW 中 Big-M 太小。**

## 13. 考试相关性

考试幻灯片列出了 4 类 TSP 题目：
1. **形成 IP**（识别 TSP，写出度约束 + SEC + 二元变量）。
2. **追踪 getSubtours** 对于给定的 sequence。
3. **由给定子环路列表识别回调添加的 SECs**。
4. **修改公式**（在不同地点结束等）。

练习题 TSP-I 涵盖了全部 4 类，务必彻底掌握。

## 14. 小练习

**Q1.** 8 家门店 + 中央仓库。形成 TSP。

$\min \sum t_{ij} x_{ij}$，约束：每个城市度 = 1，所有子集的 SECs，二元变量。

**Q2.** 位置 (20,30) 和 (60,50)，速度 5 m/s。曼哈顿时间？

$d = |40| + |20| = 60$。$t = 60/5 = 12$s。

**Q3.** sequence = `[(0,1),(1,3),(3,0),(2,4),(4,2)]`。getSubtours 的输出？

弹出 0：0 → 1 → 3 → 0。[0,1,3]。
弹出 2：2 → 4 → 2。[2,4]。
输出：`[[0,1,3], [2,4]]`。

**Q4.** 检测到的子环路为 [1,2] 和 [3,4,5]，对应的 SECs？

对 {1,2}：$x_{12} + x_{21} \le 1$。
对 {3,4,5}：$x_{34}+x_{35}+x_{43}+x_{45}+x_{53}+x_{54} \le 2$。

**Q5.** 对时间窗口 $[a_i, b_i]$ 修改公式。

增加连续变量 $t_i$，约束 $a_i \le t_i \le b_i$ 和 $t_j \ge t_i + d_{ij} - M(1 - x_{ij})$。

## 15. 速记卡

### TSP 公式
```
VARIABLES: x_ij ∈ {0,1} for i≠j
OBJECTIVE: min Σ_i Σ_{j≠i} d_ij x_ij
CONSTRAINTS:
  Σ_{j≠i} x_ij = 1  ∀i  (out-degree)
  Σ_{j≠i} x_ji = 1  ∀i  (in-degree)
  Σ_{i∈S} Σ_{j∈S,j≠i} x_ij ≤ |S|-1  ∀S⊊V, S≠∅  (SEC)
  x_ij ∈ {0,1}
```

### getSubtours 逻辑
1. 选一个未访问节点。
2. 在 sequence 中沿出边前进。
3. 遇到已访问节点时停止（环闭合）。
4. 记录子环路，从 unvisited 中移除，重复。

### 懒约束回调 (Gurobi)
- `m.params.LazyConstraints = 1`
- 在 `MIPSOL` 处的回调内：
  - `model.cbGetSolution(x)`
  - 找出子环路
  - 对每个子环路调用 `model.cbLazy(...)`

### 关键提醒
- SECs 同时使用 $x_{ij}$ 和 $x_{ji}$（有向）。
- SEC 的右端项是 $|S| - 1$。
- $\sum_{i \in S} \sum_{j \in S, j \ne i}$ → 每个有向对计一次。
- $|S|$ 个节点 → 最多 $|S|(|S|-1)$ 个有序对 → 上限设为 $|S|-1$。

---

## 🎙️ 课堂转录补充 — 幻灯片之外的内容

来自 Misic 教授 5/20 的课（TSP 引入）+ 5/27（TSP 续讲 + 期末复习）。

### 设置回顾

**星巴克问题：** 用一辆车补货西洛杉矶 61 家星巴克门店。来自 Google Maps API 的行车时间是**不对称的**（单行道、交通）。

**朴素表达失败：** 只有度约束 → 求解器产生多个**不连通的环**（子环路）。

### 为什么 getSubtours 讲解题**保证**会考

> ❗ ***教授原话：*** *"If you encounter this question in the exam... I will give you this code. I would expect you to be able to read it. And, if I ask you what's the output... you should be able to do that."*
> **中文翻译：** "如果你在考试中遇到这个问题……我会把这段代码给你。我希望你能读懂它。而且，如果我问你输出是什么……你应该能答出来。"

这是**确认会出现**的考题类型。请练习追踪这个函数。

### 手动消除子环路（4 城市玩具示例）

不加 SECs：求解器返回 (0→3→0) 和 (1→2→1)。两个不连通的环。

手动添加：
- $x_{14} + x_{41} \le 1$ — 禁止 1↔4 环
- $x_{23} + x_{32} \le 1$ — 禁止 2↔3 环

添加后：最优值从 **841 → 938**，得到一条完整行程 (0→3→2→1→0)。

### 复杂度（为什么需要懒约束）

$N$ 个城市的子集数：$2^N$。
- $N=10$：约 1,000 个约束
- $N=20$：约 1,000,000 个约束
- $N=30$：约 1,000,000,000 个约束
- $N=61$：$\approx 2.3 \times 10^{18}$

> *"Impossible to enumerate upfront."*
> **中文翻译：** "事先无法穷举。"

### 懒约束算法

1. **不带**子环路约束求解 TSP。
2. 通过 getSubtours() 检查解中的子环路。
3. 如果发现子环路，**添加**消除它们的约束。
4. 重新求解。
5. 重复直到只剩一条完整行程。

### 星巴克问题求解统计

- 最优值：**16,816 秒** ≈ 4.67 小时车程
- 仅需 **91 条懒约束**（而不是 $2^{61}$！）
- 求解时间 **< 0.2 秒**

> *"Demonstrates the BET that few constraints suffice in practice."*
> **中文翻译：** "证明了'实践中只需少数约束就够了'这一赌注。"

### 当 getSubtours 返回 1 个元素时

`len(subtour_list) == 1` ⇒ **不是**子环路 — 它就是**完整行程**。解是可行的。

### 单次回调中处理多个子环路

如果发现 3 个子环路：在**一次**回调调用中添加 3 条约束。比每次迭代加一条更高效。

---

# 🚨 期末复习课要点 (5/27)

## 考试范围与覆盖 — 已确认

### **考试涵盖**内容

> *Misic 教授 5/27 原话：*
> *"Basically everything through the end of the week, which we just finished, all of that is fair game for the final exam. So any of those topics from LP duality to traveling salesman problem, which we just finished, all of that can show up in the exam."*
> **中文翻译：** "基本上到我们刚刚结束的这一周为止的所有内容，都在期末考试范围内。所以从 LP 对偶到我们刚刚讲完的旅行商问题，所有这些主题都可能出现在考试中。"

**已确认主题（第 1–8 周）：**
1. LP 对偶 (LP Duality)
2. 收益管理 (Revenue Management)
3. 库存 / 报童 (Inventory / Newsvendor)
4. 选址 (Location)
5. 商品组合 (Assortment)
6. 定价 (Pricing)
7. 网络流 / 最短路径 / 最小成本流
8. 旅行商问题 (TSP)

### **不在**考试范围

> *教授 5/27 原话：*
> *"What we're going to start now is column generation, which I will not test you on the exam."*
> **中文翻译：** "我们现在要开始的是列生成 (Column Generation)，我不会在考试中考你这个。"

**排除内容：**
- 列生成 (Column Generation)（第 9 周）
- 匹配问题（第 10 周，器官/肾脏匹配）— 排在列生成之后

### 考试结构

- **约 6 题，每题多个小问**
- **不会全部 8 个主题都考** — 部分可能省略
- 每个主题内可能有多种题型

### 考试事项

- **要求带非图形科学计算器**（亚马逊约 $15，可退）
- 不允许使用图形计算器
- 数值计算需要用到
- 日期/地点/规则：详见邮件 + 教学大纲

## 复习指导 (5/27)

### 教授建议的做法

1. 复习所有你做过的**作业题**。
2. 把所有**练习题**都过一遍。
3. 重点关注期末复习幻灯片中**4 个关键周**的例题。
4. 熟悉各周的 IP/LP 公式建模。

### 直接引用

> *"If you go through the practice problems on your own, you should be fine in the exam."*
> **中文翻译：** "如果你自己把练习题做一遍，考试应该没问题。"

> *"If you did the homework on your own [without copying to ChatGPT at 11pm], you will be fine with the exam."*
> **中文翻译：** "如果你自己独立做了作业（没有在晚上 11 点把题目复制到 ChatGPT），你考试就会没问题。"

> *"If you did none of these... you have two weeks."*
> **中文翻译：** "如果你以上都没做……你还有两周时间。"

### 样题类型（教授直接给出的示例）

**LP 对偶 (LP Duality)：**
- 给定原问题 LP，写出其对偶。
- 用对偶验证解的最优性。
- 解释影子价格。
- 预测资源量增加 100 单位后目标函数的变化。
- 理解影子价格给出**线性近似**。

**其他周：** 见复习幻灯片 (Slides_FinalExam.pdf) 中列出。

## TSP 专项考试预期 (5/27)

### 读代码题 — 已确认

> *"If you encounter this question in the exam, I will give you this code. I would expect you to be able to read it. And if I ask you what's the output, you should be able to do that."*
> **中文翻译：** "如果你在考试中遇到这个问题，我会把这段代码给你。我希望你能读懂它。如果我问你输出是什么，你应该能答出来。"

**会给你：** `getSubtours()` 函数代码 + 一个示例输入（边的 sequence）。
**会问你：** "输出是什么（子环路列表）？"

**练习题里有类似的题** — 用它来准备。

### 你必须掌握的内容

- `getSubtours()` 如何沿解中的边追踪。
- 它如何识别环。
- 输出列表的列表 (list-of-lists) 是如何组织的。
- 边界情况：`len(subtour_list) == 1`（完整有效行程，无需再加 SECs）。

## 核心要点

教授把整个 5/27 课**全部**用在了 TSP 上（除了他明确标注不会考的 W9 引入部分）。这表明 TSP 是**高优先级考试主题** — 虽然期末复习幻灯片上写的是 "if time permits"（"如果时间允许"）。

子环路消除 + 懒约束生成 + getSubtours 追踪是必须掌握的技术创新点。
