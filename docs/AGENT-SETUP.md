# Agent setup for a product repository

Read this file once, in the repository that ran `dsiab init`, and you will know which files arrived,
which of your coding tools reads each one, and the one or two steps a tool may still need. The package
changes no tool settings. Every step below is a file the user approves, and every vendor fact below was
checked against the vendor's own documentation on 2026-10-01.

## What `dsiab init` writes

`npx dsiab init --write` hands its agent step to `npx ds-check --init`, which also runs on its own as
`npx ds-check --init [dir] [--force]`. That step writes exactly seven files:

| File | What it holds | Who reads it |
| --- | --- | --- |
| `AGENTS.md` | The rules that bind code built on the system, under a one-line header comment. | Claude Code (when the project has no `CLAUDE.md`), Cursor, Codex, GitHub Copilot, Antigravity CLI and most other tools |
| `.agents/skills/dsiab/SKILL.md` | The `dsiab` skill: how to build on the system, step by step. | Cursor, Codex, GitHub Copilot, Antigravity CLI, Gemini CLI |
| `.agents/skills/dsiab/references/rules.md` | The same rules as `AGENTS.md`, for the skill to load. | The same tools, when the skill loads |
| `.agents/skills/design-system-steward/SKILL.md` | The reviewer for tokens, accessibility, reuse and the cascade, as a skill. | The same tools |
| `.claude/skills/dsiab/SKILL.md` | The `dsiab` skill again. | Claude Code, Cursor, GitHub Copilot |
| `.claude/skills/dsiab/references/rules.md` | The rules again, for the skill. | The same tools, when the skill loads |
| `.claude/agents/design-system-steward.md` | The reviewer as a subagent, generated from the skill: the same name, description and body, plus a Claude `tools` line and `model: inherit`. | Claude Code, Cursor |

Two folders hold the skill because Claude Code reads `.claude/skills` and not `.agents/skills`, while
most other tools read `.agents/skills`. A tool that reads both folders, such as Cursor, finds two
identical copies.

`dsiab init` never writes `CLAUDE.md`, `GEMINI.md`, a settings file, a hook, or anything under
`.codex/`, `.github/` or `.gemini/`. The package installs no gate.

### The marker, and the four states

Each of the seven files carries the marker `dsiab-managed`: in the header comment of a Markdown file,
and under `metadata:` as `dsiab-managed: "true"` in the frontmatter of a skill or the generated agent.
Ownership comes from the marker, never from the path, and the report names one of four states per file:

| State | Meaning | What `--force` does |
| --- | --- | --- |
| WROTE | The file was absent, and init wrote it. | Nothing more to do. |
| ALREADY CURRENT | The file carries the marker and matches the package. | Nothing. |
| KEPT | The file carries the marker but differs from the package. | Replaces it with the package copy. |
| YOURS | The file carries no marker. | Nothing. Init never replaces it, `--force` included. |

So a hand edit to a managed file turns it KEPT, and the next `--force` undoes the edit. To keep a local
change for good, delete the marker from that file, and it becomes YOURS. It then receives no upgrades.
In `AGENTS.md` the marker is the first line, a comment that explains itself:

```markdown
<!-- dsiab-managed: a copy of the rules in the dsiab package. `npx ds-check --init --force` replaces it. Remove this line to make the file yours, and --init never replaces it again. -->
```

## When `AGENTS.md` or `CLAUDE.md` is yours

**Your `AGENTS.md` came first.** The report lists it as YOURS, and the rules did not land in it. Tell
the user, and change nothing in that file without their word. The report prints two ways to reach the
rules, and either one goes into the user's `AGENTS.md` on their approval:

- **A sentence that any tool follows**, which tells the agent to read
  `node_modules/dsiab/skills/dsiab/references/rules.md` before it writes code that imports `dsiab`.
- **An import line**, `@node_modules/dsiab/skills/dsiab/references/rules.md`, on its own line. Claude
  Code expands an `@path` line and loads the file at session start. Antigravity CLI expands only the
  `@[label](path)` form, and treats a bare `@path` as a reference. Codex documents no import, so for
  Codex the sentence is the route.

Until one of them lands, the rules still reach an agent through the `dsiab` skill, but only when the
skill loads, and not in every session.

**Your project has a `CLAUDE.md`.** Claude Code then reads `CLAUDE.md` and skips `AGENTS.md`, by
default. A `CLAUDE.local.md` has the same effect. Init leaves `CLAUDE.md` untouched and, when it does
not mention `AGENTS.md`, prints the line `@AGENTS.md` for the user to add. Add it to `CLAUDE.md`, on a
line of its own, with the user's approval. The other route is the user's own setting: **Project
instructions** set to `claude-md-and-agents-md` in `/config`.

## Per tool

Each section gives the action, if any, and a load check that proves the files arrived. Run the load
check after the action. A converted reviewer belongs to the user, so the copy drops the `metadata` block
that carries the marker.

### Claude Code

Claude Code reads `AGENTS.md` when the project has no `CLAUDE.md` or `CLAUDE.local.md`, from version
2.1.277. It reads the skill from `.claude/skills` and the reviewer from `.claude/agents`, and it reads
nothing under `.agents/`.

- **Action:** none, unless the project has a `CLAUDE.md` or runs a version older than 2.1.277. In either
  case add `@AGENTS.md` to `CLAUDE.md`, as the section above describes.
- **Load check:** `/memory` lists the path of `AGENTS.md` or `CLAUDE.md`. `/skills` lists `dsiab`. Type
  `@` and the typeahead offers `design-system-steward (agent)`.

### Cursor

Cursor reads `AGENTS.md` at the project root and in subdirectories. It reads skills from
`.agents/skills` and `.claude/skills`, and subagents from `.claude/agents`. Its subagent format
documents `name`, `description`, `model`, `readonly` and `is_background`, and no `tools` field.

- **Action:** none.
- **Load check:** open **Customize** in the sidebar, then **Skills**, and find `dsiab`. Type
  `/design-system-steward` in Agent chat to run the reviewer. To check the rules, ask the agent what
  this project says about `!important`.

### Codex

Codex reads `AGENTS.md`, or `AGENTS.override.md` when one exists in the same directory, and it stops
adding instruction files once their combined size reaches `project_doc_max_bytes`, 32 KiB by default.
It reads skills from `.agents/skills`. It reads a custom agent only as a TOML file in
`.codex/agents/`, which init does not write.

- **Action, for the reviewer:** with the user's approval, write `.codex/agents/design-system-steward.toml`
  from `.claude/agents/design-system-steward.md`:
  1. `name`: the `name` value from the frontmatter.
  2. `description`: the `description` value on one line, as a TOML string in double quotes. Write each
     double quote inside it as `\"`.
  3. `developer_instructions`: the body below the closing `---` of the frontmatter, word for word,
     inside a TOML multi-line literal string that opens and closes with `'''`. A literal string needs
     no escape, and the body held no `'''` on 2026-10-01.
  4. Omit `tools` and `model`. The reviewer then runs on the model and the sandbox of the session.
- **Load check:** run `codex --ask-for-approval never "Summarize the current instructions."` and look
  for the rules. `/skills` lists `dsiab`. Ask Codex to spawn the `design-system-steward` agent.

```toml
name = "design-system-steward"
description = "The steward and guide for the dsiab design system ..."
developer_instructions = '''
# Design System Steward
...
'''
```

### GitHub Copilot

Copilot's agents read `AGENTS.md`, and the nearest one in the directory tree takes precedence. Copilot
reads project skills from `.github/skills`, `.claude/skills` or `.agents/skills`. It reads a custom
agent from `.github/agents/<name>.agent.md`, which init does not write.

- **Action, for the reviewer:** with the user's approval, copy `.claude/agents/design-system-steward.md`
  to `.github/agents/design-system-steward.agent.md`. Keep `name`, `description`, `tools` and the body.
  Copilot accepts the Claude names `Read`, `Edit`, `Write`, `Grep`, `Glob` and `Bash` as aliases of its
  own tools. Delete the `model: inherit` line, since `inherit` is not a value Copilot documents, and an
  agent with no `model` inherits the default model.
- **Load check:** the custom agent appears in the agent dropdown of the agents tab on GitHub, or under
  `/agent` in the Copilot CLI. To check the rules, ask the agent what this project says about
  `!important`.

### Antigravity CLI

Antigravity CLI reads `AGENTS.md` with no frontmatter and keeps it active in every turn. It truncates
any rule file above 24,000 bytes, and all active rules share a budget of 20,000 tokens. It reads skills
from `.agents/skills` and turns each one into a slash command. It reads a custom subagent from
`.agents/agents/<name>.md`, which init does not write.

- **Action, for the reviewer:** with the user's approval, write `.agents/agents/design-system-steward.md`
  from `.claude/agents/design-system-steward.md`:
  1. Keep `name` and `description` as they stand.
  2. Replace the `tools` line with a YAML list of Antigravity tool names: `view_file`, `grep_search`,
     `run_command` and `replace_file_content`. Use only these exact names. A misspelled or unmapped tool
     name can hang the subagent, a known issue the vendor documents.
  3. Add `subagent: true`, and keep `model: inherit`.
  4. Keep the body below the frontmatter word for word.
- **Load check:** type `/` and find `/dsiab` among the commands. `/agents` lists
  `design-system-steward` among the custom agents. To check the rules, ask the agent what this project
  says about `!important`.

### Gemini CLI, for paid and enterprise users

On 18 June 2026 Gemini CLI stopped serving the unpaid tier and the Google AI Pro and Ultra plans, and
Antigravity CLI replaced it for those users. Gemini CLI stays available with a Gemini Code Assist
Standard or Enterprise licence and with paid Gemini API keys. For everyone else, the Antigravity CLI
section applies.

Gemini CLI reads `GEMINI.md` and not `AGENTS.md` by default. It reads skills from `.gemini/skills` or
the `.agents/skills` alias, and subagents from `.gemini/agents/<name>.md`, which init does not write.

- **Action, for the rules:** with the user's approval, add the line `@./AGENTS.md` to the project's
  `GEMINI.md`, or create `GEMINI.md` with that one line. The other route is the user's own setting,
  `context.fileName` in `settings.json`.
- **Action, for the reviewer:** with the user's approval, copy `.claude/agents/design-system-steward.md`
  to `.gemini/agents/` under the same file name. Keep `name` and `description`, and add `kind: local`.
  Replace the `tools` line with a YAML list of the Gemini tools of the same kind: `Read` as `read_file`,
  `Grep` as `grep_search`, `Glob` as `glob`, `Bash` as `run_shell_command`, `Write` as `write_file` and
  `Edit` as `replace`. Delete the `model: inherit` line, and the reviewer runs on the model of the
  session. Keep the body word for word.
- **Load check:** `/memory show` prints the rules. `/skills list` shows `dsiab`. Start a prompt with
  `@design-system-steward` to run the reviewer.

### Any other tool

Most coding tools read `AGENTS.md` and `.agents/skills`, so the rules and the skill reach them with no
step. For a tool that reads neither, point its own instruction file at `AGENTS.md` with a sentence or
an import, and never paste a second copy of the rules, so that one copy stays current. A tool with no
subagent format runs a review when the agent opens `.agents/skills/design-system-steward/SKILL.md` and
follows it in the current session.

## Size budgets

| Budget | Limit | What it meets on 2026-10-01 |
| --- | --- | --- |
| Codex instruction chain | 32 KiB (32,768 bytes) for all instruction files together | `AGENTS.md` at about 13.3 KB leaves about 19 KB for the rest of the chain. If the chain exceeds the cap, tell the user. `project_doc_max_bytes` is their setting. |
| Antigravity rule file | 24,000 bytes per file, after includes | `AGENTS.md` fits. A user's own `AGENTS.md` that includes the rules with `@[label](path)` must fit with them. |
| Antigravity rules budget | 20,000 tokens for all active rules | Above it, Antigravity turns the largest rule files into pointers that the agent reads on demand. |
| Copilot custom agent body | 30,000 characters | The reviewer body measured about 23,000 characters. |
| Skill `description` | 1,024 characters, in the Agent Skills specification | `dsiab` and `design-system-steward` both sit under it. Claude Code also cuts a listed description at 1,536 characters. |

## Upgrading

After an upgrade of the package, run `npx dsiab init --write --force`, or `npx ds-check --init --force`
for the agent files alone. Every KEPT file takes the new package copy. A YOURS file stays as it is, so
re-read the report and repeat any step above that a YOURS file needs. A converted reviewer under
`.codex/`, `.github/`, `.agents/agents/` or `.gemini/` is the user's file, so convert it again from the
new `.claude/agents/design-system-steward.md` when the user agrees.

## Suggested gates

A gate is a check that a harness runs while an agent works, before a tool call or before a reply ends,
and it holds a rule whether or not the model complies. None of the gates below ships with this package,
and nothing in the package installs or applies one, because a gate changes how the user's tools behave.
Each is a suggestion for the user's own harness, built with their own agent, if they want it.

The floor in every harness is three commands, and a gate supplements them and never replaces them:
`npx ds-check`, the type check `./node_modules/.bin/tsc --noEmit`, and the project's tests.

| Gate | When it runs | What it holds | Why |
| --- | --- | --- | --- |
| Evidence for a visual claim | When a reply ends | After an edit to a user interface (UI) file, a reply that claims success cites a before and an after screenshot that exist on disk, the after file newer than the first edit, and states "Before: ... After: ...". | A passing type check, a class name in the markup and a quiet console prove nothing about the pixels. Only a look at the render earns a visual claim. |
| The prose rules | Before a write to a Markdown or text file, and before a commit message | The written style rules of the project, such as no em dash, no contraction and a list of banned words, plus a document shape that opens with a title and a summary paragraph. | A style rule in an instruction file loses force as a session grows. A check at write time holds it at every write. |
| A review block before a UI edit | Before an edit to a UI file | The edit waits until the user approved a message that names the file and states the issue, the fix and the intended experience. One approval covers one issue. | A UI change that the user never saw described is a change the user cannot review. |
| No force push or history rewrite | Before a shell command | Denies a force push in every spelling, a remote branch delete, an amend or hard reset of a pushed commit, a rebase of pushed commits and the history rewrite tools, unless the message from the user for that turn names the action. | These commands destroy work on a remote, and no later step can restore it. |
| A tool call behind every claim | When a reply ends | Each sentence that claims an action, such as "tests pass", "I read X" or "I updated X", matches a tool call of the same turn whose result supports it. | A model can report work it never did, and the transcript is the one record that can disprove the report. |
| Read before extract | Before a shell command | A command that extracts text from a document with grep, sed, awk, jq or a script waits until the agent read that document in full in the session. | An extract from an unread file carries the lines that matched and drops the context that gives them their meaning. |
| A worktree that writes only inside itself | Before a write or a shell command | A session whose working directory sits in a git worktree writes only inside that worktree, the temp directories, and a path the user named in the turn. | Parallel sessions in separate worktrees stay independent only while none of them writes into another checkout. |
| The address of the running docs page after a UI change | When a reply ends | When the session started a local server and the turn changed a UI file, the reply carries the `http://localhost:<port>/<page>` address of the page that shows the change, on a port the session used. | The user reviews a UI change in the browser, and a report without the address leaves the search to the user. |
| Review of a plan by a named skill | When a reply ends | When the turn wrote a plan file, the reply waits until a named review skill ran on that file after its first write. No skill is named by default. | A plan costs least to correct before the first edit, and a named reviewer makes that review a step. |

Two properties made these gates work in their source harness. Every denial states why it blocked
and the concrete action that passes it, so an agent can fix the cause at once. And no number of retries
converts a denial to a pass, so repetition cannot defeat a check.

## Sources

Every page below was read on 2026-10-01.

- Claude Code: [memory and AGENTS.md](https://code.claude.com/docs/en/memory),
  [skills](https://code.claude.com/docs/en/skills), [subagents](https://code.claude.com/docs/en/sub-agents).
- Cursor: [rules and AGENTS.md](https://cursor.com/docs/rules), [skills](https://cursor.com/docs/skills),
  [subagents](https://cursor.com/docs/subagents).
- Codex: [AGENTS.md](https://developers.openai.com/codex/guides/agents-md),
  [skills](https://developers.openai.com/codex/skills),
  [subagents](https://developers.openai.com/codex/subagents).
- GitHub Copilot: [repository instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions),
  [custom agents configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration),
  [creating custom agents](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/create-custom-agents),
  [agent skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills).
- Antigravity CLI: [rules](https://antigravity.google/docs/rules), [skills](https://antigravity.google/docs/skills),
  [subagents](https://antigravity.google/docs/subagents).
- Gemini CLI: [GEMINI.md](https://geminicli.com/docs/cli/gemini-md), [skills](https://geminicli.com/docs/cli/skills),
  [subagents](https://geminicli.com/docs/core/subagents), and the
  [transition to Antigravity CLI](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli),
  posted 19 May 2026.
- The [Agent Skills specification](https://agentskills.io/specification), for the `description` limit.
