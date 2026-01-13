---
id: blacksmith2024
title: "Elric Mini Blacksmith Shop"
summary: "Elric Mini Blacksmith Shop is a casual simulation management game centered on crafting, where players manage time, resources, and production flow to fulfill NPC orders in a small blacksmith shop."
tech:
  - Unity
  - C#
thumbnail: assets/images/blacksmith2024-tb.png
order: 4
links:
  itch: https://bodybody.itch.io/elric-mini-blacksmith-shop
  video: https://www.youtube.com/watch?v=frfED9U14-I
---

### Screenshots
![Store](/assets/images/blacksmith2024/blacksmith2024-0.png "Store")
![Crafting](/assets/images/blacksmith2024/blacksmith2024-1.png "Crafting section")

## Project Overview

* Casual simulation management game developed during **Game Jam Plus 24/25 Indonesia**.
* Designed as a **single-stage, single in-game day experience**, focusing on crafting flow and time pressure rather than long-term progression.

## Role & Responsibilities

* Implemented core gameplay systems end-to-end.
* Made system-level design decisions under strict time constraints.
* Iterated on gameplay clarity and balance with limited playtesting.

<br><details>
<summary><strong>Technical Contributions, Trade-offs & Design Shortcomings</strong></summary>

### Time & Day Loop

* Implemented a **single in-game day loop** with continuous time progression.
* No night cycle, pause, or fast-forward mechanics.
* All gameplay systems operate within this fixed time window.

**Design implication:**
The constrained timeframe shifted challenge toward moment-to-moment decision-making rather than long-term planning.

### Crafting System

* Implemented a **3×3 grid-based crafting system** requiring exact item placement.
* No auto-correction, hints, or quality variation.

**Intentional design decision:**
Recipes were kept intentionally non-obvious to increase difficulty.

**Shortcoming:**
Due to limited iteration time, the recipe list became overly jumbled, increasing confusion beyond the intended challenge.

### Inventory Architecture

* Designed two inventory categories:

  * **Material inventory**: stack-based item counts.
  * **Crafted inventory**: intended to be non-stackable to preserve item identity per order.
* Order submission logic correctly treats crafted items as individual units.

**Shortcoming:**
A runtime issue allowed crafted items to stack, partially undermining the intended constraint. This was identified post-submission.

### Orders & Customers

* Implemented **randomly generated, time-limited orders** within a single-day session.
* Orders expire when time runs out; players freely decide which orders to fulfill.
* No prioritization system was enforced.

### System-Level Design & Iteration

* Core systems were designed and implemented based on a **barebones initial design**.
* Iteration relied on limited playtesting and internal discussion.

**Shortcoming:**
Several design intentions (difficulty ramp, recipe readability, player guidance) could not be fully validated within the jam timeframe.

### Collaboration & Constraints

* Developed by a **3-person team** within a **48-hour game jam timeframe**.
* Contributed to improving **in-game wording and text clarity**, while broader UX polish was constrained by scope and time.

</details>

## Outcome

* Delivered a complete, playable prototype within jam constraints.
* Clearly identified design and UX limitations through post-submission evaluation.

## If Continued

* Expand the prototype into the intended full design with longer-term progression.
* Introduce **multi-day time progression**, restocking mechanics, and resource planning.
* Improve replayability through expanded order variety and pacing adjustments.
* Refine crafting UX and information presentation.

## Why We Chose Not to Continue

* The submitted build primarily served as a **vertical slice / proof of concept**.
* Post-jam playtesting indicated the **core loop lacked sustained engagement**.
* Feedback suggested a **craft-only loop felt incomplete** without resource gathering.
* Based on these findings, the project was treated as a learning prototype rather than extended further.
