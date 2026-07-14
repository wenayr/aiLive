# Networked Tank Arena baseline

This is the first BUILD campaign after L0. The current code is an ordinary project baseline, not a proposed reusable module.

The core uses an integer grid and fixed ticks deliberately. It lets replay equality, scenario validity and transport recovery be tested before the project takes on floating-point physics, rendering or deployment complexity.

Read contracts and pure transforms first. Server, web and L0 bindings are consumers and must not be pulled into a core change by default.
