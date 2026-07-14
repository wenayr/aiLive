# Controlled genetic simulation

This is a deliberately small experiment, not an autonomous agent runtime.

The resource establishes a baseline from file revisions, with no dependency on
a Git repository or first commit. A later explicit scan computes one change
batch. It then exposes exactly one pending request for an external controller:

1. Terra discovers a new observation and its initial instruction, or
2. Luna checks the changed files selected by an existing instruction, then
3. Terra independently keeps, refines, or retires that instruction.

The resource neither reads the filesystem nor calls a model. The workspace
sampler is a separate binding; a future model adapter must call the pending
action itself and submit the result explicitly. This makes every role call and
every memory change observable and testable.
