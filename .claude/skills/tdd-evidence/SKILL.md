---
name: tdd-evidence
description: Genuine TDD with recorded evidence. Use before writing any production code.
---

# TDD Evidence

1. Add a behavioral test for the change, named after its C08 case (FC-NN) when one applies.
2. Run it on the current code.
3. Record RED only if it truly fails (note the failing assertion).
4. Implement the minimal change; run GREEN; refactor only if justified; run regression.
5. Configuration or documentation changes (CI, Docker, nginx, rules) record verification
   commands instead of RED.

Never fabricate chronology or command results.
