---
id: epicon-x
title: "Epic Conquest: X"
summary: "Epic Conquest X is an anime-style action RPG set in a lighthearted post-apocalyptic world, designed as a live-service mobile game with ongoing content updates."
tech:
  - Unity
  - C#
  - ScriptableObject
  - MongoDB
  - UniTask
thumbnail: assets/images/ecx-thumb.png
order: 1
links:
  playstore: https://play.google.com/store/apps/details?id=com.gacogames.epiconx&hl=en
---

### Screenshots
![Lobby](/assets/images/ecx/lobby.png "Lobby")
![Loading](/assets/images/ecx/loading.png "Loading screen")
![Battle Pass](/assets/images/ecx/bp.jpg "Battle Pass menu")
![Store](/assets/images/ecx/shop.jpg "Store")
![Hero Info](/assets/images/ecx/hero.png "Hero Info Menu")

## Project Overview

- Live-service **action RPG mobile game** with long-running player sessions and frequent content updates.
- Systems designed to support progression, monetization, and time-based live events.

## Role & Responsibilities

- Implemented and maintained gameplay progression and live-service systems.
- Integrated client systems with backend services and managed player data flow.
- Focused on stability, performance, and scalability in a production environment.

<br>
<details>
<summary><strong>Technical Contributions & Engineering Decisions</strong></summary>

### Gameplay & Progression Systems

- Designed and implemented **core progression systems**, including daily and weekly missions, Battle Pass progression, and time-limited events.
- Built systems around **ScriptableObject-based configurations** to keep progression rules and rewards data-driven.

This approach allowed designers to iterate on balance and rewards without code changes, while keeping runtime logic stable across updates.

### Live-Service Architecture

- Implemented client-side logic for **live-service features** such as rotating events, mission resets, and reward claiming.
- Ensured time-based systems behaved consistently across sessions and reconnects.

Systems were designed to be resilient to partial data availability and backend latency, reflecting real-world mobile network conditions.

### Backend Integration & Data Flow

- Integrated with third-party backend APIs using **JSON-based payloads** for player data synchronization.
- Batched initial data requests during startup to **reduce API calls and improve loading performance**.
- Designed client-side data handling to avoid redundant network requests during long sessions.

Bandwidth efficiency and predictable load behavior were prioritized to reduce friction during login and session transitions.

### Asynchronous Flow & Stability

- Used **UniTask** to manage asynchronous operations without blocking the main thread.
- Applied defensive coding patterns, state validation, and structured logging to handle edge cases in live environments.

This reduced hard crashes and made production issues easier to diagnose during live operation.

### Performance & Memory Management

- Profiled performance-critical code paths using **Unity Profiler**.
- Managed asset lifecycles using **Unity Addressables** to prevent memory leaks and ensure stability during extended play sessions.

Memory safety was treated as a first-class concern due to the long-running nature of live-service gameplay.

### Monetization Systems

- Implemented and maintained **IAP and ads-related systems** as part of the live-service loop.
- Ensured monetization features integrated cleanly with progression and event systems without introducing state inconsistencies.

</details>

## Outcome

- Supported stable operation of a live-service mobile game with ongoing updates.
- Improved load performance and runtime stability under real-world network conditions.
- Enabled scalable progression and event systems suitable for long-term content delivery.
