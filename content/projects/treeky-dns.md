---
id: treeky-dns
title: "Treeky: Dine & Serve"
summary: "Treeky: Dine & Serve is a UI-driven Match-3 game with engaging mechanics and charming visuals."
tech:
  - Unity
  - C#
  - ScriptableObject
  - PlayFab
thumbnail: assets/images/treeky-thumb.png
order: 2
links:
  playstore: https://play.google.com/store/apps/details?id=com.SkypillarStudio.Match3&hl=id
---

### Screenshots
![Overview](/assets/images/tdns/overview.jpg "Overview")

## Project Overview

- Live, post-launch **Match-3 mobile game** with ongoing content updates.
- Focused on feature expansion, live events, and production stability.

## Role & Responsibilities

- Joined the project post-launch to extend gameplay systems and support live updates.
- Implemented new features, in-game events, and store improvements.
- Maintained and optimized existing gameplay code under live-product constraints.

<br>
<details>
<summary><strong>Technical Contributions & Engineering Decisions</strong></summary>

### Extending Match-3 Gameplay

- Extended existing **Match-3 core logic** to support new character abilities.
- Implemented a new **bomb-type tile behavior** that reacts to adjacent matches and triggers additional effects.
- Integrated the new behavior without rewriting the core matching flow.

The approach focused on minimal disruption to an already-shipped system. Rather than refactoring the entire grid logic, the extension was designed to hook into existing match resolution points, reducing regression risk in a live environment.

### Grid Stability & Bug Fixes

- Fixed edge cases where certain match patterns did not trigger expected effects.
- Tidied up grid-related code paths to improve reliability and maintainability.

Changes were intentionally conservative, prioritizing correctness and stability over aggressive refactors due to the live status of the game.

### Event Systems & Data-Driven Design

- Implemented and shipped multiple **in-game events** during live operations.
- Used **ScriptableObject-based configurations** where possible to keep event logic data-driven and reusable.
- Introduced base abstractions for abilities and event logic, allowing new behaviors to be added via extension rather than duplication.

When new behavior could not reasonably fit existing abstractions, new implementations were added explicitly to avoid over-generalization.

### Backend Integration (PlayFab)

- Integrated **PlayFab player data** for features and events developed during my tenure.
- Designed player data schemas to **minimize bandwidth usage**, reusing existing backend structures when possible.
- Relied on existing backend systems rather than introducing new service dependencies.

This kept feature additions lightweight and compatible with established backend workflows.

### Monetization & Ads Migration

- Migrated existing Unity Ads integration to **Unity LevelPlay** to support multiple ad networks.
- Preserved existing ad logic while improving monetization flexibility and fill rate potential.

### Store Improvements

- Added **batch purchase support** to the in-game store.
- Integrated the feature into existing purchase flows without breaking current UX patterns.

</details>

## Outcome

- Successfully shipped new gameplay features and live events post-launch.
- Improved gameplay stability and extensibility without disrupting existing systems.
- Expanded monetization and store capabilities within a live production environment.
