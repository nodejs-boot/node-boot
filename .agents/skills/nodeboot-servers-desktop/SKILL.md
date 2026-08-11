---
name: nodeboot-servers-desktop
description: Use when the user wants to run or embed a Node-Boot application inside an Electron or Tauri desktop app, but no desktop adapters are published yet and the task is to pioneer one — choosing Electron first if possible, deciding between an IPC-based driver or an embedded HTTP adapter, and following the same adapter contract as the existing Node-Boot server integrations.
---

# Node-Boot Desktop Adapters

No desktop adapters are published yet. This skill is for pioneering one, not for loading a ready-made package.

## What the project guidance says

Per [`CONTRIBUTING.md#13-desktop-adapters`](https://github.com/nodejs-boot/node-boot/blob/main/CONTRIBUTING.md#13-desktop-adapters):

-   Start by opening an issue describing the target desktop shell.
-   Prefer **Electron first** because it is Node.js-native; Tauri is a possible follow-up target.
-   Choose one of two designs:
    -   **IPC-native driver**: bind Node-Boot directly to the Electron main process with an IPC-based `NodeBootDriver`.
    -   **Embedded HTTP adapter**: run an existing HTTP adapter such as `http-server` inside the main process and have the renderer call it locally.
-   Whichever design you choose, it must follow the same `BaseServer` / `NodeBootDriver` contract as the existing adapters.
-   A real contribution should add a sample such as `samples/sample-electron` proving the pattern end to end.

For the contract details and extension workflow, load [`../nodeboot-extending-nodeboot/SKILL.md`](../nodeboot-extending-nodeboot/SKILL.md) and then read the linked `CONTRIBUTING.md` sections it points to.

## Practical direction

-   Reach for Electron when the user wants the first published desktop adapter; it minimizes runtime mismatch with the rest of Node-Boot.
-   Prefer the IPC-native design if the goal is a true desktop integration with no loopback HTTP port.
-   Prefer the embedded HTTP design if the goal is the fastest proof of concept by reusing a mature adapter first.

## Validate

A minimal proof is a `samples/sample-electron` app where an Electron renderer can successfully reach a Node-Boot controller — either through IPC handled by the new driver or through an embedded local HTTP endpoint exposed from the main process.
