# dsiab: the rules that bind code built on it

These are the rules for any code that imports `dsiab`, written for the agent or the person who writes
that code in a product repository. Follow them and a brand swap re-skins your product cleanly, a
release upgrade leaves your screens intact, and `npx ds-check` passes. Each rule names the check or the
ruling behind it, so you can verify it instead of trusting it.

`dsiab` is a brand-themeable layer on Radix Themes: components, a token layer and a check you run over
your own code. Brand and neutral are runtime `Provider` props, so one swap re-skins everything. That
is also why a hardcoded colour or a private spacing value costs more here than in an ordinary app.

## Where the rest is written down

Everything below except the documentation site ships inside the package, so your agent can read it offline:

- **`node_modules/dsiab/docs/GUIDELINES.md`** holds the design language: voice, the alpha and solid
  layering rule, the priority ladder, iconography, state, motion, elevation, seams, and §9
  Accessibility (WCAG 2.2 AA). That claim is **scoped**, and §9 states what is verified and what is
  not. Read the scope before you repeat the claim to anyone.
- **`node_modules/dsiab/dist/DECISIONS.md`** (the package subpath `dsiab/DECISIONS.md`) is the ruling ledger.
  Each ruling has a permanent name, such as `focus-ring`, and one to three tags. Cite it as
  `[[focus-ring]]` instead of restating it.
- **`node_modules/dsiab/dist/registry.json`** (imported as `dsiab/registry.json`) is the roster of
  every component. The next section explains it.
- **`node_modules/dsiab/CHANGELOG.md`** records what changed in each release.
- **`node_modules/dsiab/dist/index.d.ts`** stays the authority on exact type signatures.
- **The documentation site** renders every component live. `npx dsiab docs` opens the pages for the
  exact version you installed. When a page and this file disagree about what a component does, the
  rendered page wins and the doc is a defect.

**Scope:** responsive web, pointer and touch input. Interactive targets are at least 24 by 24 pixels,
the pointer floor. The larger 44 by 44 touch accommodation is ruled but **not shipped**, as GUIDELINES
§9 states. Native-app chrome, such as bottom tab bars, home indicators and platform navigation idioms,
is out of scope.

## What exists, and how to find out

**Read the roster before you build anything.** `import roster from "dsiab/registry.json"` gives you
every component's `name`, `status`, `tier`, `exports[]` and `wraps`. The `wraps` field names the Radix
Themes primitive a component thinly wraps, or holds `null` for a custom composition with no props
passthrough to assume. Never trust a remembered list, including any count in this file.

```bash
# does a dialog already exist?
node -e "console.log(require('dsiab/registry.json').components.filter(e=>/dialog/i.test(e.name)).map(e=>e.name+' '+e.status).join('\n'))"
```

Each answer has one correct response:

| What the roster says | What you do |
| --- | --- |
| `available` | Import it. Do not rebuild it, and do not wrap it "just to add one prop". |
| `out-of-scope` | Deliberately absent, and the entry's `reason` says why. Do not build your own. |
| Not there at all | Use the raw Radix Themes component under the GUIDELINES conventions, or **surface the gap**. Never improvise an equivalent of a system component. |

The same rule covers values. If the system specifies no number for your context, such as a target
size, a duration or a spacing step, **surface the gap**. Never invent a number, and never split the
difference between two numbers you found elsewhere.

To surface a gap, stop and tell the user what you needed, what the roster or the guidelines offer, and
why that falls short. The user decides whether to raise it with the system.

## The rules that bind your code

**Paint from the `--ds-*` semantic tokens, never from raw Radix scales or hardcoded colours.** The
`--ds-*` layer is accent-aware: it follows the shift that moves a semantic colour away from a brand
colour it collides with. So status and validation colour comes from the semantic families
(`--ds-{text,fill,stroke,icon}-{error,warning,success,info}`), never from Radix `red` or `green`. A bare
scale step (`--accent-9`, `--gray-a7`) or a hex value in your component is a defect. The one sanctioned
exception is the deliberate reuse of a Radix component's own skin, and `CheckboxVisual` reusing
Radix's `BaseCheckbox` classes is the shipped example.

**Never `!important`.** Win the cascade with specificity and source order, scoped under `.radix-themes`.
A `.radix-themes`-scoped selector (0,2,0) beats Radix's own `:where()`-wrapped rule (0,1,0) when it
loads after it. Before you add any override, probe `getComputedStyle` on the live element to confirm
the cascade actually needs it. Most of the time the selector already wins and the `!important` is dead
weight.

**Reuse before you invent.** Existing components, tokens and patterns are the default, and anything new
is an exception you earn. Repeating a system asset is consistency, not laziness. Before the first edit
that adds a new component, token or pattern, write down three things:

1. What already exists that could serve this need, with component names or token names.
2. Which of those you apply, and how.
3. Only if nothing fits: what you must invent, and why no existing pattern adapts.

"Cleaner", "I prefer it" and "faster to write fresh" are not reasons. An empty first list is a claim
that you looked, so name where you looked.

**Inputs carry their own field chrome, and you do not compose it.** Label, persistent helper text and
validation are props on the input itself: `label`, `description` and `validation`, plus `info` and
`endSlot` where the label row takes them. A `validation` message **replaces** the description, and the
two never stack. The shell those props render into (`Field.Root`, `Field.Label`, `Field.Description`,
`Field.Message`) is internal by ruling and is **not exported**, so there is no supported way to build an
input with this chrome from scratch. If the shipped inputs do not cover your case, surface the gap
instead of a hand-rolled field. `useOptionalFieldControl()` **is** exported, but it reads the
`Field.Root` above it, so in your code it returns `null` everywhere except inside an input that renders
its own. It is not a route to field chrome for a hand-built control, and no other route exists either.

**The focus ring belongs to the system** ([[focus-ring]], [[validation-focus-paint]]). The system builds it by overriding Radix's own focus
selector. Do not add a parallel focus class: `:focus-visible` matches the inner input and not the
wrapper, so a parallel class never fires, and nothing tells you.

**Known gap: group-level validation.** `CheckboxGroup` and `RadioGroup` take no `label` or `validation`
of their own, and the `FieldGroup` shell that would supply them ([[group-validation]]) is not exported either. So a
group-level error message has no supported route today. Name the group with `aria-label` or
`aria-labelledby`, and put the error where the rest of your form puts its errors. This is an open gap,
not a ruling, so raise it instead of reaching into the package for `FieldGroup`.

**A container that resolves a size seeds it to its slots.** Content passed into a sized container's
slot resolves the container's step, never the ambient tier behind it, and an explicitly sized child
still wins. A slot whose content can disagree with the container's own children is a bug.

**A seam is drawn once.** The hairline between two regions, such as a rail against content or content
against an inspector, has exactly one owner, and several components paint one from the same
`--ds-stroke-weak`. `Layout`'s divider owns the boundary between its areas. A resizable `Layout.Panel`'s
`ResizeHandle` *is* the seam, and `Layout` drops its divider there. `SideNav` owns its trailing border.
A `Separator` or a border beside any of them gives you two hairlines a pixel apart, which reads as a
heavy border instead of a bug and so survives review. For two plain regions you laid out yourself, pick
a side and leave the other bare. A `ScrollArea`'s gutter is not a seam and should not sit on one: inset
the PARENT of the scrolling region, because Radix pins the scrollbar to the scroll root and padding on
the root barely moves it. GUIDELINES §8a has the table of owners, and [[seam-ownership]] is the ruling.

**Floating surfaces come from the system.** A portal moves its content outside the theme root, and
Radix's `Theme`, the one way to restore that root, is deliberately unexported. So from your code there
is no supported way to build a themed floating surface of your own. Use one the system ships, each of
which owns its portal: `Dialog`, `AlertDialog`, `Popover`, `Tooltip`, `HoverCard`, `DropdownMenu`,
`ContextMenu`, `Overlay`, `CommandPalette`, `MultiSelect`, `Select`. If none of them fits, surface the
gap and do not hand-roll one.

**When a component cannot do what you need.** First check the props, then `asChild` where the component
offers it (GUIDELINES §10 states what you take on), then surface the gap. The last resort is a copy you
own: take `src/components/ui/<Name>.tsx` from the release tag on GitHub that matches your installed
version, and from then on the copy is yours. It no longer receives fixes, and the guarantees in the
guidelines stop at its edge.

## Install it the way it expects

Consuming the package takes two imports and one root, and none of the three is optional:

```tsx
import "dsiab/styles.css";        // once, at your app's entry point
import { Provider, Button } from "dsiab";

export function App() {
  return (
    <Provider accentColor="iris" uiSize="small">
      <Button priority="primary">Create project</Button>
    </Provider>
  );
}
```

- **The stylesheet import.** The library build extracts the CSS out of the JS, so an import of
  `Provider` alone paints nothing.
- **`Provider`, once, above everything.** It is the theme root that every `--ds-*` role and every Radix
  scale resolves against. A component rendered outside it gets unresolved custom properties. In
  development, each of these two failures prints one console warning ([[missing-provider-warning]]). A production build prints
  nothing, and the page paints wrong.
- **No second copy of Radix's stylesheet.** `dsiab/styles.css` already contains it, in the right order.
  Do **not** also import `@radix-ui/themes/styles.css`. This system wins the cascade by source order and
  bans `!important`, so a second copy loaded after ours silently costs every override, and nothing
  reports it.

## The traps worth knowing before you hit them

**Check overlay and menu opacity over a coloured backdrop, not white.** A transparent panel looks
correct on a white page. This once hid a real blocker that a clean type check, a green test suite and a
visual self-check all passed.

**Colour checks are wide-gamut-sensitive.** On a P3 display `getComputedStyle` returns
`color(display-p3 …)`. Rasterize colours before you compare them, because a regular expression over
`rgb()` mangles the value.

## What a done-claim requires

**`npx ds-check` must exit 0 before you say anything works.** Run it over the code you touched and read
the output. Mentioning it does not count, and neither does knowing it exists. It reports its own reach,
the extensions it read and the ones it could not, so a pass is a statement about the files it lists and
nothing else.

```bash
npx ds-check                 # the current directory
npx ds-check src/features    # a subtree, or a single file
npx ds-check --rules         # the rules in full, and how to allow a line on purpose
```

Exit `0` means nothing to fix in what it read. Exit `1` means a violation, or an allowance that it
rejected or that went stale. Exit `2` means the command itself was wrong. To keep a deliberate
deviation, annotate the line as `npx ds-check --rules` describes. The line then shows under ALLOWED
instead of failing the run, and an allowance on a line that no longer violates the rule fails, so
allowances cannot silt into permanent exemptions.

Then, in this order:

- **Your project's type check.** For TypeScript, run the local binary, `./node_modules/.bin/tsc
  --noEmit`, not `npx tsc`.
- **Your project's tests.**
- **Look at it.** A visual claim is earned by observing rendered pixels and writing the diff sentence:
  *"Before: [what I saw]. After: [what I see]."* A `className` in the markup, a passing type check and
  "no console errors" are not visual verification. The reply that makes the claim cites the baseline
  `.screenshots/<task>-before.png` and the result `.screenshots/<task>-after.png`, both taken by you
  and present on disk, the after file newer than the change.

## The reviewer

The `design-system-steward` reviewer ships with these rules. It owns system fidelity: tokens,
accessibility, reuse, the cascade and visual proof. Dispatch it before any done-claim on a change a
user can see. It reviews and reports and does not implement, and its findings are worth a second look,
because some come back overstated.
