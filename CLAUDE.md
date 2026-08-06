# CLAUDE.md — Hatch

<!-- STANDARDS PREAMBLE (added 2026-06-01 — global rules at ~/.claude/CLAUDE.md still apply) -->

## Project Standards

| Field | Value |
|---|---|
| Brain routing | `brain-aditya` — personal-brand product, NEVER use `brain-posimyth` (hard wall) |
| Tech stack | `{{language + framework + DB + package manager — fill in}}` |
| Verification before "done" | `{{lint cmd}}` · `{{typecheck cmd}}` · `{{test cmd}}` (paste exit code before claiming complete) |

**WP.org plugin?** If yes, uncomment the next line to import 14 rules + Free/Pro patterns:
<!-- @~/.claude/rules/wp-org-plugins.md -->

**Hard rules reminder** (full text in `~/.claude/CLAUDE.md` — do not repeat):
- **Tool-first, not memory-first** — verify file paths, APIs, versions before claiming
- **Show evidence, don't assert** — paste test output / curl response / diff before "done"
- **Edge-case interrogation** before completion: what does this miss? What would a senior eng flag?
- **`/adversarial-review`** for non-trivial diffs — dispatches a fresh critic-mode subagent
- **`/clear` after 2 failed corrections** — context is poisoned, fix-forward fails
- **No banned tokens in code:** `// rest unchanged`, `// TODO`, `// implement later`, `...`, ellipsis truncation

<!-- END STANDARDS PREAMBLE -->

---

## Context

Hatch is an Aditya personal-brand product. Located at `~/Claude/products/Hatch/` (1.8 GB working tree). Reachable via `~/Claude Projects/Hatch/` symlink.

Fill in the project-specific sections below as you learn the codebase:
- Stack details (language, framework, DB, package manager)
- Verification commands (lint, typecheck, test)
- Source-of-truth files
- Critical gotchas
- Brand assets / marketing context

Reference: `~/.claude/templates/project-CLAUDE.md.template` has the full project template if you want to expand this file.


<!-- ===== BEGIN Aditya universal block (2026-08-05) ===== -->

## Project Identity — universal (stamp: 2026-08-05 v2 — 3-wing taxonomy)

- **Name:** Hatch
- **Wing (top-level):** `Etica`
- **Sub-wing:** `Hatch`
- **Design taste seed:** `@~/.claude/rules/taste-vercel.md` (never mix seeds)
- **Brain routing:** ALL chat data → **Aditya brain** (single source for cross-session learning)
- **Brain MCP:** mcp__brain-aditya__aditya_brain_search / aditya_brain_add_note (ALL chat data → here)
- **Brain server:** brain.adityaarsharma.com gateway → 95.216.156.89 (SSH: `ssh brain`)
- **Graphiti temporal graph:** port 3016 on brain server, bearer at `~/.claude/state/brain-tokens.env` (temporal "when did X happen" queries)

## Wing taxonomy (3 wings — Aditya brain)

| Wing | Contains | Rule |
|---|---|---|
| **Etica** | All shipping products (plugins, SaaS, MCPs, QA tools, RankReady, HostMyBlog, RunCloud, etc.) | Chat data from any product work — this wing |
| **POSIMYTH** | POSIMYTH company ops chats (marketing/HR/sales team ops discussions) | NOT product code (those are Etica). Separate from Company OS on brain.posimyth.com |
| **Personal** | Aditya's private life — Job Hunts, AdityaBrain, personal decisions | Never leaks to Etica or POSIMYTH wings |

## Local warehouse (this folder)

```
.claude/
├── memory/         ← always-loaded across chats — the brain that always loads
│   ├── SPEC.md         product spec / source of truth
│   ├── DECISIONS.md    ADR log, append-only
│   ├── LEARNINGS.md    corrections + gotchas (feeds auto-learn)
│   └── CURRENT.md      in-flight state
├── tasks/          long-lived task lists
├── references/     screenshots, competitor examples
├── data/           structured outputs (exports/, reports/, snapshots/)
└── scratch/        ephemeral, .gitignored
```

## How to remember work here (smart learning brain — not data dump)

1. **Session start:** read `.claude/memory/` — that's the local always-loaded brain for this project.
2. **Session end:** append durable learnings to `.claude/memory/LEARNINGS.md` AND to Aditya brain `Etica` wing (via `aditya_brain_add_note` with wing=`Etica`, room=`Hatch`).
3. **Cross-project lookup:** query Aditya brain across wings — `aditya_brain_search --query "..." --wing Etica`.
4. **Temporal:** "when did we decide X" → Graphiti MCP.
5. **Never dump raw chat.** Every write is CURATED — one durable learning per entry, tagged with wing+room.
6. **Structured outputs (CSV/JSON/reports) → `.claude/data/`** — never scatter into project root.

## Hard rule (project-brand hygiene)

Do NOT route this project's chat data to POSIMYTH brain (brain.posimyth.com). That server is **Company OS only** — feeds from ClickUp, docs, team knowledge systems, NEVER from Claude chats. If you need to reference Company OS info, query brain-posimyth READ-ONLY; never write.

<!-- ===== END Aditya universal block ===== -->
