# Tableer

Tableer is the first real product sandbox: a small headless table workspace.
Its modules are ordinary product modules, not agent modules. The agent and the
genetic module live outside this directory in
[`development/tableer/`](../../development/tableer/).

Run its product check from this directory:

```powershell
npm run verify
```

The initial capability is intentionally narrow: load rows and search them by
their visible values. New product work should extend a real need here, then the
external development sandbox may observe the changed paths.
