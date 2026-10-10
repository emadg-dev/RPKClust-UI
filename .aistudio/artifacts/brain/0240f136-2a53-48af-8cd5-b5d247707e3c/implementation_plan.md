# Pairwise Message Pipeline Inspector & Sequence Aligner

An interactive visual reverse-engineering workspace enabling researchers to select two arbitrary protocol messages, align their raw byte streams via sequence alignment, and step through each algorithmic phase of the RPKClust pipeline to see byte-by-byte pass/fail gates and clustering decisions.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed via interactive clarification:
> - **Workspace Location**: Dedicated interactive tab in the top navigation bar (`Pairwise Inspector`), providing full 1440px viewport presence with a split hex comparator and dedicated analysis controls.
> - **Pipeline Progression Display**: Interactive 5-step horizontal stepper with live byte highlights, status badges, and pass/fail evaluation gates.
> - **Visual Byte Alignment**: Needleman-Wunsch sequence alignment with distinct color coding for matches (green), mismatches (amber/rose), and gaps (slate dashes).

- **Confirmed Decision 1 (Tab Architecture)**: Add a first-class `Pairwise Inspector` tab directly beside `Pipeline`, `Benchmark`, `Scaling`, and `Paper Reproductions`.
- **Confirmed Decision 2 (Sequence Alignment Algorithm)**: Client-side Needleman-Wunsch dynamic programming algorithm ($O(N \cdot M)$ where $N, M \le 256$ bytes, executing in $<1\text{ms}$) with configurable score weights (Match: $+2$, Mismatch: $-1$, Gap: $-2$).
- **Confirmed Decision 3 (Pass/Fail Evaluation Gates)**: At each step, evaluate both messages individually and pairwise against RPKClust mathematical criteria (FOR boundary inclusion, candidate value congruence, pairwise similarity threshold $\theta_{\text{EER}}$, remote coupling, and final cluster assignment).
- **Recommended Default (Quick Pair Presets)**: Provide single-click presets (`Paired Request/Response`, `Same Type Pair`, `Cross Type / Differentiating Pair`, `Random Pair`) to immediately demonstrate pipeline contrast.

---

## 1. Overview & Core Concept

### What It Does
The **Pairwise Message Inspector** lets security researchers and protocol analysts pick any two messages from the active dataset (or enter custom raw hex packets) and inspect how the pipeline processes them side by side. Instead of viewing pipeline outputs only as global aggregate metrics (Homogeneity/Completeness), users can observe the exact byte-level mechanics:
1. How bytes align globally across variable lengths and optional fields.
2. Which bytes lie in the Fixed-Offset Region (FOR) vs Non-Fixed-Offset Region (NFOR).
3. Which detector rules (Constants, Length, Sequence, Address, Checksum) fired on each byte.
4. Why the two messages passed or failed pairwise similarity and clustering constraints.
5. Whether they converged into the same protocol message type or were correctly separated into distinct clusters.

### Target Audience
Protocol reverse engineers, ICS/SCADA security researchers, and students analyzing proprietary or undocumented binary protocol traces.

### Key Value
Demystifies the black-box clustering process by providing visual, explainable evidence for why two messages are classified together or apart.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Message Selection**:
   - In the `Pairwise Inspector` tab, users pick **Message A** and **Message B** using clean dropdown selectors showing message ID, direction (`C2S`/`S2C`), length, and ground-truth label.
   - Quick-preset buttons (`Req ↔ Resp Pair`, `Intra-cluster Pair`, `Inter-cluster Pair`) auto-populate intriguing pairs from the active dataset.
2. **Global Sequence Alignment Inspection**:
   - The top inspection stage renders the aligned byte sequences in synchronized monospace columns:
     - **Match (`=`)**: Emerald background tint with vertical connection bar.
     - **Mismatch (`≠`)**: Amber/rose background tint highlighting divergent field values.
     - **Gap (`–`)**: Dashed slate placeholder illustrating packet length discrepancies or inserted TLV attributes.
   - Live alignment statistics display: Total Length, Aligned Positions, Match %, Identity Score, and Gap Count.
3. **Interactive 5-Stage Pipeline Stepper**:
   - Users navigate between 5 pipeline gates via an interactive stepper:
     - **Stage 1: Session & Direction Gate** (Evaluates temporal $\Delta t$, session flow, and direction pairing).
     - **Stage 2: FOR/NFOR Boundary Gate** (Shows boundary $B$; evaluates whether both messages adhere to fixed-offset semantics).
     - **Stage 3: Candidate & TLV Extraction Gate** (Highlights candidate keyword fields extracted from each message and identifies value matches).
     - **Stage 4: Clustering Constraints & EER Gate** (Calculates pairwise similarity $S(A, B)$, compares against the Equal Error Rate threshold $\theta_{\text{EER}}$, and evaluates remote coupling).
     - **Stage 5: Final Cluster Decision Gate** (Displays predicted cluster assignment for Message A and Message B, reporting `MATCH (Same Cluster)` or `DIVERGED (Distinct Clusters)`).
4. **Synchronized Byte Highlighting & Detail Tooltip**:
   - Hovering any byte in Message A or B highlights its aligned counterpart, its offset position within the frame, whether it falls in FOR or NFOR, and which detector rules matched that offset.

### Visual Identity & Theme
- **Canvas & Theme**: Deep slate obsidian canvas (`#020617` / `slate-950`) consistent with RPKClust's dark aesthetic.
- **Structural Surfaces**: Subtle slate panels (`bg-slate-900/90 border border-slate-800`), avoiding heavy blur cards or nested border clutter.
- **Accents & Telemetry Colors**:
  - Green / Emerald (`#10b981`): Exact matches, passing evaluation gates, intra-cluster coherence.
  - Cyan (`#06b6d4`): Boundary markers ($B$), active stepper selection, candidate offsets.
  - Amber (`#f59e0b`): Mismatched bytes, warning states, cross-direction pairs.
  - Rose (`#f43f5e`): Failing evaluation gates, inter-cluster separation.
- **Typography & Precision Notation**:
  - Interface labels: Clean Sans (`Plus Jakarta Sans` / `Inter` / system-ui).
  - Byte dumps, offsets, and hex values: Monospace tabular numerals (`font-mono tabular-nums`).
- **Zero-Pill Discipline**: Metadata displayed as clean unboxed text with `·` dividers; interactive controls styled as functional segmented buttons.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Pure Client-Side Alignment vs Server-Side Dynamic Programming
- **Chosen Approach**: Implement the Needleman-Wunsch sequence alignment in TypeScript directly on the client.
- **Why**: Binary protocol messages in network traces typically range from 6 to 256 bytes. Client-side $O(N \cdot M)$ alignment runs in $<1\text{ms}$ with zero network latency, giving instantaneous real-time feedback when scrubbing messages or toggling gap penalties without extra backend round-trips.
- **Alternatives Considered**: Spawning a Python subprocess for pairwise diffs was rejected due to unnecessary ~50ms process invocation overhead.

### Decision 2: 5-Stage RPKClust Pass/Fail Gate Model
- **Chosen Approach**: Deconstruct the end-to-end pipeline into 5 logical stages that mirror the paper's theoretical framework:
  1. Direction & Session
  2. Boundary $B$
  3. Candidates & TLVs
  4. Constraints (Similarity & Coupling)
  5. Cluster Inference
- **Why**: Directly maps to Equations 1–15 in *The Computer Journal* (2025) paper, providing pedagogical and diagnostic clarity.
- **Alternatives Considered**: A single pass/fail summary box was rejected because it would fail to explain *which* specific algorithmic rule caused the differentiation.

### Decision 3: Preset Pair Discoverer
- **Chosen Approach**: Build an automatic pair finder that scans the current dataset's ground truth and session graph to present 4 curated pair types immediately upon dataset selection.
- **Why**: Allows users to instantly explore meaningful comparisons without having to manually sift through hundreds of message IDs.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RPKClust Frontend (App.tsx)                      │
│                                                                        │
│   Top Navigation Tabs:                                                 │
│   [ Pipeline ] [ Pairwise Inspector ] [ Benchmark ] [ Scaling ] [ Repro ] │
└───────────────────────────────┬────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Pairwise Inspector Workspace Component                │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 1. Pair Selector & Presets                                        │  │
│  │    [ Message A Picker ]  [ Quick Presets Strip ]  [ Message B ]   │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│                                     ▼                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 2. TypeScript Needleman-Wunsch Alignment Engine                   │  │
│  │    • Matrix Computation: match=+2, mismatch=-1, gap=-2           │  │
│  │    • Traceback: generates AlignedPair[] (hex, ascii, status)     │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│                                     ▼                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 3. Dual-Row Aligned Hex Comparator Stage                          │  │
│  │    Offset: 00 01 02 03 04 05 ...                                 │  │
│  │    Msg A:  00 01 00 00 00 06 ... (Req)                           │  │
│  │    Match:   |  |  |  |  |  |                                     │  │
│  │    Msg B:  00 01 00 00 00 03 ... (Resp)                          │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│                                     ▼                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 4. 5-Stage Interactive Pipeline Stepper & Pass/Fail Gates        │  │
│  │    [1. Session] ──> [2. Boundary] ──> [3. Candidates]            │  │
│  │                     ──> [4. Constraints] ──> [5. Final Cluster]   │  │
│  │                                                                  │  │
│  │    • Gate Evaluation Card: Mathematical reason + pass/fail badge │  │
│  │    • Byte Heatmap Overlay: Highlighting active candidate/boundary│  │
│  │    • Metrics HUD: S(A, B), EER threshold, Length delta, Cluster  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Data Models (TypeScript)

```typescript
// Alignment representation
export interface AlignedByte {
  byteA: number | null; // null represents gap
  byteB: number | null; // null represents gap
  hexA: string;
  hexB: string;
  asciiA: string;
  asciiB: string;
  type: 'match' | 'mismatch' | 'gapA' | 'gapB';
  offsetA: number | null;
  offsetB: number | null;
  isForA: boolean;
  isForB: boolean;
  hitA?: string;
  hitB?: string;
}

export interface AlignmentSummary {
  alignedLength: number;
  matches: number;
  mismatches: number;
  gaps: number;
  identityPercent: number;
  score: number;
}

// Pipeline evaluation gate for pairwise step inspection
export interface StepEvaluationGate {
  stepIndex: number;
  title: string;
  description: string;
  status: 'pass' | 'fail' | 'diverged' | 'neutral';
  badgeText: string;
  badgeTone: 'emerald' | 'amber' | 'rose' | 'cyan';
  metricLabel: string;
  metricValue: string;
  thresholdLabel?: string;
  thresholdValue?: string;
  explanation: string;
  highlightOffsetsA: number[];
  highlightOffsetsB: number[];
}
```

### Pipeline Stage Gate Logic

1. **Gate 1: Session & Flow Pairing**:
   - Check if Message A and Message B share an IP/Port 4-tuple and session ID.
   - Evaluates whether they form a symmetric Request/Response pair ($c2s \leftrightarrow s2c$) or concurrent unilateral requests.
   - Gate status: `PASS (Paired Transaction)` vs `NEUTRAL (Unilateral/Separate Flows)`.
2. **Gate 2: FOR/NFOR Boundary Compliance**:
   - Checks if message length $\ge B$ for both messages.
   - Compares bytes in $[0, B)$ for positional exact-match consistency vs NFOR variable-length drift.
   - Gate status: `PASS (Fixed Prefix Intact)` if positional matches $\ge 80\%$, else `FAIL (High Prefix Drift)`.
3. **Gate 3: Candidate Keyword Extraction**:
   - Evaluates whether Message A and Message B have matching candidate byte windows at candidate offsets (e.g., function code, opcode, message ID).
   - Reports shared keyword candidates vs differentiating values.
   - Gate status: `MATCH (Identical Candidate Value)` vs `DIVERGED (Different Candidate Value)`.
4. **Gate 4: Pairwise Similarity & Clustering Constraints**:
   - Computes $S(A, B) = \frac{2 \cdot (\text{FOR matches} + \text{NFOR matches})}{\text{denom}}$.
   - Compares $S(A, B)$ to the optimal EER threshold $\theta_{\text{EER}}$.
   - Gate status: `PASS (High Similarity $\ge \theta$)` if likely intra-cluster, `FAIL (Low Similarity $< \theta$)` if inter-cluster.
5. **Gate 5: Final Cluster Decision**:
   - Evaluates predicted cluster labels: $C(A)$ and $C(B)$.
   - Gate status: `UNIFIED (Cluster: X)` if $C(A) == C(B)$, `SEPARATED (Cluster X vs Cluster Y)` if $C(A) \ne C(B)$.
   - Compares with Ground Truth labels if available in dataset.
