---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

First re-read `docs/WORKFLOW.md` section 5 from the source, not from a handoff's summary, and follow every step.

If a ticket has screens, capture its frames through the pen.dev MCP before writing any UI code. If `Des/nezfocus.pen` is not open in pen.dev, stop and ask the user to open it; never build a screen from the spec text alone.

Before writing any code, do step 2 for every child ticket, then ask once (WORKFLOW step 3 and section 8): one table with every open question and every place a frame disagrees with the spec, the component board or `DESIGN.md`, each row with what changes if the frame wins and your recommendation (default: the frame, unless it is plainly a drawing slip). Never pick a side yourself, and never stop screen by screen. Conflicts found later go into the step 7 report, built meanwhile per the recommendation.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work.

Commit your work to the current branch.
