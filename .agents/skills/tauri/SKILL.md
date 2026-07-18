---
name: tauri
description: Help with Tauri desktop apps in a TypeScript + React + Vite project. Use for scaffolding, running dev/build workflows, integrating frontend and Rust code, adding plugins, managing permissions, and debugging Tauri-specific issues.
argument-hint: Describe the Tauri task: scaffold, run, build, plugin, IPC, permissions, or debugging.
user-invocable: true
disable-model-invocation: false
---

# Tauri for TypeScript + React + Vite

Tauri lets you ship a desktop app by combining a Vite/React frontend with a Rust backend. In this workspace, the UI lives in the Vite app and the desktop shell and Rust logic live under src-tauri.

## When to Use This Skill

- Starting or maintaining a Tauri app with Vite + React + TypeScript
- Running development and production build workflows
- Adding official Tauri plugins or capabilities
- Wiring frontend code to Rust commands through IPC
- Debugging startup, build, packaging, or plugin issues

## Quick Checklist

- [ ] Ensure Node.js and a Rust toolchain are installed
- [ ] Keep UI work in the Vite/React frontend under src
- [ ] Keep desktop-specific Rust logic in src-tauri/src
- [ ] Run the app with npx tauri dev from the project root
- [ ] Build with npx tauri build and verify output artifacts

## Workflow

1. Confirm the environment
   - Verify Node.js and a package manager are available
   - Verify Rust is installed and the required OS dependencies are present
   - On Windows, ensure the MSVC toolchain and Visual Studio Build Tools are available if needed

2. Choose the right layer
   - Frontend: React components, state, Vite configuration, UI logic
   - Desktop shell: Rust code, window setup, commands, plugins, permissions

3. Start the app for development
   - Use npm run dev for frontend-only checks if needed
   - Use npx tauri dev to launch the full desktop app and reload on changes

4. Build for production
   - Use npm run build for the frontend bundle
   - Use npx tauri build for the desktop binary or app bundle

5. Integrate plugins and capabilities
   - Prefer official Tauri plugins over custom workarounds
   - Add plugin dependencies in src-tauri/Cargo.toml when needed
   - Update permissions and capabilities in src-tauri/capabilities and src-tauri/tauri.conf.json

6. Connect frontend and Rust safely
   - Expose Rust functions with #[tauri::command]
   - Call them from the frontend with invoke
   - Keep payloads small, serializable, and well-typed

7. Validate and debug
   - Read Tauri and Rust errors directly before changing unrelated code
   - Confirm the frontend still builds after Tauri changes
   - Verify permissions and capabilities for any new command or plugin

## Project Conventions for This Repo

- Use the existing Vite React frontend in src
- Keep Tauri-specific Rust code in src-tauri/src
- Respect the existing manifest and capability files in src-tauri/tauri.conf.json and src-tauri/capabilities
- Prefer npx tauri dev and npx tauri build over ad-hoc commands

## Useful Commands

```bash
npm install
npm run dev
npx tauri dev
npm run build
npx tauri build
npx tauri add <plugin>
```

## Common Pitfalls

- Forgetting to install Rust or OS prerequisites before launching Tauri
- Debugging frontend issues without checking the desktop shell output
- Adding commands or plugins without updating permissions/capabilities
- Assuming browser APIs behave the same way inside the Tauri runtime

## Example Prompts

- Set up or improve the Tauri development workflow for this Vite + React app.
- Add a Tauri plugin and wire it into the frontend.
- Help me debug why npx tauri dev is failing.
- Expose a Rust command to the React app and call it safely.

## Reference

Use the official Tauri documentation as the primary source for setup details and current CLI behavior: https://v2.tauri.app/es/start/
