---
id: scriptableobject-manager
title: "ScriptableObject Manager for Unity"
summary: "Unity Editor tooling for managing and batch-editing ScriptableObject data."
tech:
  - Unity
  - C#
  - ScriptableObject
thumbnail: assets/images/som-tb.png
order: 3
links:
  repo: https://github.com/DW256/ScriptableObject-Manager
---

### Screenshots
![Overview](/assets/images/so-manager/som.png "Overview")

## Project Overview

- Unity Editor–only tooling to inspect, validate, and batch-edit ScriptableObject assets.
- Built to reduce manual editing risk in content-heavy projects.

## Role & Responsibilities

- Designed and implemented the tool end-to-end.
- Defined batch operation architecture, safety rules, and editor UI flow.
- Packaged and distributed the tool as a UPM-compatible utility.

<br>
<details>
<summary><strong>Technical Contributions & Engineering Decisions</strong></summary>

### Problem Framing

Large ScriptableObject-driven projects often rely on manual Inspector edits for data fixes and refactors. This approach scales poorly and introduces risk: silent data corruption, missed fields, and inconsistent changes across assets.

The goal of this tool was to replace ad-hoc edits with **explicit, repeatable editor workflows** that make bulk changes safer and more observable.

### Batch Operation Architecture

- Designed an **extensible batch operation model** with clear separation between:
  - Operation logic
  - Editor UI
  - Validation and preconditions
- Each operation is treated as an explicit action rather than a passive Inspector change.

This separation allows new batch operations to be added without modifying existing ones, while keeping validation enforceable and localized. It also avoids coupling editor UI concerns directly to mutation logic.

### Safety & Validation Strategy

- Implemented **pre-execution validation** to surface invalid field selections or incompatible asset states before mutation.
- Required explicit user confirmation before executing destructive operations.

The system intentionally favors friction over convenience. Slower, explicit workflows were chosen to reduce irreversible mistakes when modifying large numbers of assets.

### Serialized Field Handling

- Operates directly on **serialized fields** rather than runtime representations.
- Ensures compatibility with Unity’s serialization system and avoids undefined editor state.

This choice limits certain dynamic use cases but guarantees predictable behavior across asset reloads and version control operations.

### Editor-Only Scope

- Scoped the tool strictly to **Editor-only usage**, with no runtime dependencies.
- Avoided leaking editor utilities into production builds or gameplay code.

Keeping a hard boundary between editor tooling and runtime systems simplified integration and reduced long-term maintenance cost.

### Packaging & Distribution

- Packaged as a **UPM-compatible Unity package** for clean installation and versioning.
- Structured repository and assembly definitions to support reuse across multiple projects.

This enabled the tool to function as a standalone utility rather than a project-specific script dump.

</details>

## Outcome

- Reduced manual ScriptableObject editing during development.
- Enabled safer bulk refactors with explicit validation and execution steps.
- Established a reusable editor tooling foundation for data-heavy Unity projects.
