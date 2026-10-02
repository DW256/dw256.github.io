---
id: reconquest
title: "Reconquest"
summary: "Reconquest is a 'Theseus project' rebuilt from the remnants of Epic Conquest X — a hybrid-play action RPG with a data-driven skill and puzzle framework, a cloud-save backend, and a modernized Unity client."
tech:
  - Unity
  - C#
  - ScriptableObject
  - Addressables
  - Cloudflare Workers
thumbnail: assets/images/reconquest-tb.png
order: 6
links:
  itch: https://rrads-games.itch.io/reconquest
---

## Project Overview

- A **"Theseus project"** rebuilt from the remnants of Epic Conquest X — reusing the asset base while replacing the architecture piece by piece.
- **Hybrid-play action RPG** client supporting both mobile and desktop, with full keyboard + gamepad input.
- Designed around **data-driven systems** and a **cloud-backed save layer** so designers and players can iterate without code changes.

## Role & Responsibilities

- Revamped the boot sequence and subsystem architecture (GameManager hub).
- Rebuilt the menu system with back-stack navigation.
- Designed the passive skill / weapon perk / set bonus framework.
- Built the backend and client flow for cloud save with a hybrid local/cloud seam.
- Implemented meta, NPC service, and asset pipeline systems end-to-end.

<br>
<details>
<summary><strong>Technical Contributions & Engineering Decisions</strong></summary>

### Boot Sequence & GameManager Hub

- Architected a **GameManager singleton hub** — centralized subsystem registration and boot sequence for the entire client.
- Revamped booting to be deterministic, resumable, and resilient to partial data availability.
- Authored `AGENTS.md` as a project reference — coding standards, architecture rules, and onboarding guide for AI collaborators.

### Player Data Persistence & Cloud Save

- Implemented a **player data persistence layer** — a save/load seam bridging local storage and cloud save.
- Built the **Cloudflare Workers backend** — auth, account lifecycle, session takeover, login brute-force mitigation, D1-backed catalog, and save-game routes.
- Created the **hybrid-play flow** so sessions can move between local and cloud-synced state.

### Menu System & Input

- Built core gameplay UI — HUD, main menu, pause menu, hero info UI, and **menu back-stack navigation** (`IClosableMenu.CanClose`).
- Implemented **full keyboard + gamepad input support** via the Unity Input System, with control scheme alignment across menus and gameplay.

### Passive Skill / Weapon Perk / Set Bonus Framework

- Designed the **`ConditionalReward`** framework — a `[Serializable]` pair of one condition + one reward used by passive skills (`ItemSkillSO.passiveEffects`), weapon perks (`EquipmentSO.weaponPerks`), and equipment set bonuses (`EquipmentSetBonus.effects`).
- At runtime, `HeroPassiveSkillManager` spawns a `ConditionalRewardRuntime` per entry to evaluate the condition and apply the reward.
- Reward types: `StatModifierReward` (flat / percentage buffs) and `ApplyStatusEffectReward` (status effects with duration / potency overrides).
- Conditions are **event-driven** (on attack, on HP threshold, on status applied) or **continuous** (checked every frame/tick).

### Puzzle System

- Implemented a **data-driven world-puzzle framework** — `PuzzleManager` runtime evaluator, `PuzzleData` ScriptableObjects, and reusable `IPuzzlePiece` components (toggles, gates, statues, pillars, collectibles, timed relays, proxy, block).
- Supports `RequireAll` / `AmountBased` / `PointBased` completion, strict ordering, time trials with `TimeLimit`, and resetable puzzles.
- Pieces report state via `PuzzleManager.ReportPiece(PieceId, Correct/Incorrect, point)`; completion fires `MainPuzzle.OnComplete`. Progress persists under the `PuzzleSave` key.

### Skill Description Formatter

- Built a **localization-aware tooltip system** — `SkillDescriptionFormatter.Format(skill, template, level, previewLevel)` resolves `{tokens}` from I2 templates into rich-text skill descriptions.
- Token scopes: aggregate `{name}`, per-hit `{name}_hit[i]`, and per-logic `{name}[i]`, with sources like `{atk}`, `{cd}`, `{mp}`, `{heal}`, `{duration}`, and custom tokens registered per `HeroAttackLogic`.
- Color-coded output (damage / heals-buffs / cooldown-MP) and preview-level arrows in the Skill Enhancement UI.
- Editor tooling: **Tools → ECX Dev Tools → Skill Description Author** for browsing tokens, editing templates, previewing levels, and exporting to Google Sheets.

### Meta Systems & NPC Services

- **Inventory system** — equipment, skills, set bonuses, and item inspector flows.
- **Fishing** subsystem for world exploration meta content.
- **NPC service flows** — freebies, smelting, crafting, and `NpcResponse` dialogue-triggered services.

### Asset Pipeline

- Maintained the **Addressables pipeline** — remote bundle configuration, groups, and settings for cloud distribution.

### Live-Ops & Performance

- Built a **live-ops admin dashboard** — Svelte frontend for player management, mail, redeem codes, catalog, and server status.
- **Audited ZString/ZLinq** — evaluated and integrated zero-allocation libraries for string/linq operations.

</details>

## Outcome

- Modernized a legacy mobile codebase into a maintainable, data-driven architecture.
- Established a cloud-save and live-ops backbone supporting ongoing content delivery.
- Enabled hybrid-play input and navigation with a consistent, designer-friendly tooling story.
