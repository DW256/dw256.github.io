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

### What I Did

- Build a **Unity Editor toolkit** for inspecting and managing ScriptableObject assets at scale
- Design **safe batch operations** for serialized fields, with validation and explicit execution steps
- Create an **extensible batch operation architecture** (logic, UI, validation separated)
- Focus on **data hygiene and error prevention** in content-heavy Unity projects
- Replace ad-hoc manual editing with **repeatable, auditable editor workflows**
- Package the tool as a **UPM-ready editor utility** for clean integration into existing projects
- Intentionally scope the system to **Editor-only tooling**, avoiding runtime coupling
