// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/FileInput/FileInput.tsx @ 88c95e4 (MIT, © Meta Platforms)

import {
  forwardRef,
  useCallback,
  useId,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { Box, Text, VisuallyHidden } from "@radix-ui/themes";
import { UploadSimple, File as FileGlyph, Warning, X } from "@phosphor-icons/react";
import { useResolvedSize } from "../../theme/SizeContext";
import {
  Field,
  useOptionalFieldControl,
  useDisabledReason,
  DisabledReasonTooltip,
  DisabledReasonGlyph,
} from "./Field";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { useAnnounce } from "./useAnnounce";
import { formatFileSize } from "../../utils/formatFileSize";
import { validateFiles } from "../../utils/validateFiles";

/* FileInput — a file picker with a default dropzone, on the shared Field shell.
 *
 * Ported from Astryx (facebook/astryx `@astryxdesign/core`, commit 88c95e4) onto our system
 * (DECISIONS [[catalog-as-specification]], wave-3 D2/D8, [[file-input]]). It is the one wave-3 component earning genuinely net-new UI — a
 * visual drop surface — and the net-new is confined to THAT surface: everything else is assembled from
 * shipped parts (Field / D8 soft-disable / IconButton clear / Button / useAnnounce / the accent preview
 * tier). Both pure helpers are the LIFTED `formatFileSize` + `validateFiles` (`src/utils/*`, [[catalog-as-specification]] @ 88c95e4).
 *
 * DELTAS from the source / the deliberate divergences (say them so nobody normalizes them back):
 *   • THE NATIVE `<input type="file">` IS THE OPERABLE CONTROL AND THE TAB STOP (dropzone mode) — NOT a
 *     hand-rolled `role="button"` div (Astryx does; we don't). The native input ships Enter/Space/focus/
 *     disabled/label-association for free, and it keeps the styled drop surface an enhancement over a
 *     control that already works rather than the control itself. It is hidden with the CLIP technique
 *     (never display:none/visibility:hidden, which drop
 *     it from the tab order + a11y tree) and takes its id / aria-describedby / aria-invalid from the Field
 *     (the Field label's htmlFor NAMES it). The drop surface is wrapped in a `<label>` so a pointer click
 *     anywhere opens the picker and the input's focus lights the zone's ring via `:focus-within`; the
 *     dropzone's visible content is `aria-hidden` so the wrapping label never pollutes the input's name.
 *   • `mode="dropzone"` is the DEFAULT — a STATED divergence from Astryx's `'input'` default, which aligns
 *     our default with Astryx's OWN doc guidance that pushes the dropzone.
 *   • `mode="input"` (compact): the visible affordance is a real System Button ("Choose file") calling
 *     input.click(), with the input `tabIndex={-1}`. FOCUS-MECHANISM DELTA: input-is-tab-stop in dropzone
 *     vs Button-is-tab-stop in compact.
 *   • Drag-and-drop is a POINTER-ONLY enhancement on the zone (`dragenter/over/leave/drop` toggling a
 *     `data-drop-target` attribute) — keyboard users are fully served by the same input, so no second tab
 *     stop, WCAG 2.1.1 met.
 *   • REPLACE-NEVER-APPEND: every selection/drop REPLACES value; the native input's `.value` is reset to
 *     `''` after each pick so re-selecting the same file re-fires. A SINGLE clear-all ✕ (per-file remove
 *     is a named deferral) is NEUTRAL (not tone="danger" — clearing an un-uploaded selection is trivially
 *     reversible) and is a REAL tab stop (tabbable — it's the ONLY way to clear, so unlike the [[field-family-anatomy]]
 *     date/time ✕ it earns the tab order; the same logic [[date-input]] §4 used for DateInput's calendar button).
 *   • THREE feedback surfaces ([[file-input]]): (1) clean-selection confirmation → the shared POLITE
 *     `useAnnounce`; (2) rejections + PARTIAL acceptance → a component-local `role="status"` that is ALSO
 *     visible text below the control (status, NOT alert — partial acceptance isn't a blocking failure;
 *     the user must SEE which files were dropped); (3) a STANDING whole-field invalid → `Field.validation`
 *     (`role="alert"`), reserved for a caller `validation` (a form owns submit-time required-empty). On a
 *     partial accept we COMMIT the accepted subset AND surface the rejection on surface 2, and NEVER
 *     double-announce — the local region self-announces; `useAnnounce` owns only clean-success + clear-all.
 *   • API normalization (D2): `value?: File | File[]` (`undefined` = empty — null-free, normalized from
 *     upstream's `null`), required `onValueChange(File | File[] | undefined)`; controlled.
 *   • D8 `disabledReason` soft-disable ([[disabled-reason]]): the operable control + drag handlers early-return while soft.
 *
 * DEFERRED (named parks, NOT built): per-file removable rows + per-file progress (upstream has neither);
 * the `changeAction`/`isLoading` optimistic layer; InputGroup composition; the scroll/spoken-form niceties.
 */

type Size = "1" | "2" | "3";
type Tone = "error" | "warning" | "success" | "info";
type Validation = { tone: Tone; message: ReactNode };
type Mode = "dropzone" | "input";

export interface FileInputProps {
  /** Field label — sets the accessible name (via htmlFor → the native input's id). Required. */
  label: ReactNode;
  /** Controlled selection — a single `File`, a `File[]` (when `isMultiple`), or `undefined` when empty.
   *  `null`-free (D2): `undefined` is the only empty. */
  value?: File | File[];
  /** Required. Fires with the committed file(s), or `undefined` when cleared / nothing valid was picked. */
  onValueChange: (value: File | File[] | undefined) => void;
  /** Accepted file types — the HTML `accept` format (".pdf,.docx" · "image/*" · "image/png,image/jpeg"). */
  accept?: string;
  /** Allow selecting more than one file. When true, `value`/`onValueChange` use `File[]`. @default false */
  isMultiple?: boolean;
  /** Maximum size per file, in bytes. Oversize files are rejected (surface 2). */
  maxSize?: number;
  /** Maximum number of files (only applies when `isMultiple`). */
  maxFiles?: number;
  /** Visual mode. `dropzone` = a large drag-and-drop target (default); `input` = a compact Button row. */
  mode?: Mode;
  /** Overrides the resting primary prompt (dropzone) / the empty hint (compact). */
  placeholder?: string;
  size?: Size;
  /** Optional inline affordance beside the label (a tip icon / helper toggle). */
  info?: ReactNode;
  /** Optional pinned note at the far end of the label row. */
  endSlot?: ReactNode;
  /** Persistent helper line under the control — calm guidance that holds in any validation state. */
  description?: ReactNode;
  /** A STANDING validation state (surface 3, `role="alert"`) — a caller-owned real problem the user must
   *  resolve. Rejections + partial acceptance do NOT flow here; they self-announce on surface 2. */
  validation?: Validation;
  disabled?: boolean;
  /** D8 ([[disabled-reason]]): a non-empty reason SOFT-disables (aria-disabled + reason tooltip + glyph) instead of
   *  natively disabling, so the reason stays perceivable on hover AND keyboard focus. */
  disabledReason?: string;
  /** Marks the field required — sets `required`/`aria-required` on the input and a subtle `*` after the
   *  label. FileInput does NOT paint an error at rest; a form owns submit-time required-empty validation. */
  isRequired?: boolean;
  width?: number | string;
}

/* ---- pure display/copy helpers (component-local; the accept/size PROSE the honest surface-2 copy needs,
   which the byte-faithful lifted validateFiles doesn't produce) ---------------------------------------- */

const toFiles = (value: File | File[] | undefined): File[] =>
  value == null ? [] : Array.isArray(value) ? value : [value];

/** A human rendering of the `accept` tokens — ".png,.jpg" → "PNG or JPG"; "image/*" → "images". */
function describeAccept(accept: string | undefined): string {
  if (!accept) return "these file types";
  const parts = accept
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((tok) => {
      if (tok.startsWith(".")) return tok.slice(1).toUpperCase(); // ".png" → "PNG"
      if (tok.endsWith("/*")) return `${tok.slice(0, tok.indexOf("/"))}s`; // "image/*" → "images"
      const sub = tok.split("/")[1];
      return sub ? sub.toUpperCase() : tok.toUpperCase(); // "image/png" → "PNG"
    });
  const uniq = [...new Set(parts)];
  if (uniq.length === 1) return uniq[0];
  if (uniq.length === 2) return `${uniq[0]} or ${uniq[1]}`;
  return `${uniq.slice(0, -1).join(", ")}, or ${uniq[uniq.length - 1]}`;
}

/** The up-front constraints line ("PNG or JPG, up to 5 MB") — derived from accept / maxSize / maxFiles. */
function describeConstraints(o: {
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  isMultiple?: boolean;
}): string {
  const parts: string[] = [];
  if (o.accept) parts.push(describeAccept(o.accept));
  if (o.maxSize != null) parts.push(`up to ${formatFileSize(o.maxSize)}`);
  if (o.isMultiple && o.maxFiles != null) parts.push(`up to ${o.maxFiles} files`);
  return parts.join(", ");
}

type RejectReason = "type" | "size" | "count";

/** Categorize the rejected files, mirroring validateFiles' PROGRESSIVE order (accept → size → maxFiles
 *  slice), so the honest surface-2 copy can name WHY each file was dropped. */
function categorizeRejections(
  files: File[],
  valid: File[],
  o: { accept?: string; maxSize?: number },
): { file: File; reason: RejectReason }[] {
  const validSet = new Set(valid);
  const acceptedTypes = o.accept ? o.accept.split(",").map((t) => t.trim().toLowerCase()) : null;
  const matchesAccept = (file: File) =>
    !acceptedTypes ||
    acceptedTypes.some((type) => {
      if (type.startsWith(".")) return file.name.toLowerCase().endsWith(type);
      if (type.endsWith("/*")) return file.type.startsWith(type.slice(0, -1));
      return file.type.toLowerCase() === type;
    });
  return files
    .filter((f) => !validSet.has(f))
    .map((file) => {
      if (acceptedTypes && !matchesAccept(file)) return { file, reason: "type" as const };
      if (o.maxSize != null && file.size > o.maxSize) return { file, reason: "size" as const };
      return { file, reason: "count" as const }; // passed type+size but sliced by maxFiles
    });
}

const wasWere = (n: number) => (n === 1 ? "wasn’t" : "weren’t");

/** Name up to two files (quoted), else a plain count. `withSize` appends "(2.4 MB)" per named file. */
function namesOrCount(files: File[], withSize = false): string {
  if (files.length > 2) return `${files.length} files`;
  const q = files.map((f) => (withSize ? `“${f.name}” (${formatFileSize(f.size)})` : `“${f.name}”`));
  return q.length === 2 ? `${q[0]} and ${q[1]}` : q[0];
}

function reasonClause(reason: RejectReason, o: { accept?: string; maxSize?: number; maxFiles?: number }): string {
  if (reason === "type") return `${describeAccept(o.accept)} only`;
  if (reason === "size") return `each file must be under ${formatFileSize(o.maxSize!)}`;
  return `up to ${o.maxFiles} files`;
}

/** Compose the honest one-sentence surface-2 message, or null when nothing was rejected. Leads with the
 *  WIN on a partial accept ("Added 2 files. …"); leads with the reason when nothing was accepted. */
function buildRejectionMessage(
  files: File[],
  valid: File[],
  o: { accept?: string; maxSize?: number; maxFiles?: number },
): string | null {
  const rejections = categorizeRejections(files, valid, o);
  if (rejections.length === 0) return null;
  const accepted = valid.length;
  const typeR = rejections.filter((r) => r.reason === "type").map((r) => r.file);
  const sizeR = rejections.filter((r) => r.reason === "size").map((r) => r.file);
  const countR = rejections.filter((r) => r.reason === "count").map((r) => r.file);
  const present = ([["type", typeR], ["size", sizeR], ["count", countR]] as const)
    .filter(([, list]) => list.length > 0)
    .map(([r]) => r);

  // Partial acceptance — lead with the win.
  if (accepted > 0) {
    const rejectedFiles = rejections.map((r) => r.file);
    const lead = `Added ${accepted} ${accepted === 1 ? "file" : "files"}.`;
    const suffix = present.length === 1 ? ` — ${reasonClause(present[0], o)}` : "";
    return `${lead} ${namesOrCount(rejectedFiles)} ${wasWere(rejectedFiles.length)} added${suffix}.`;
  }

  // Nothing accepted, a single reason — the canonical sentence for that reason, exactly.
  if (present.length === 1) {
    const reason = present[0];
    if (reason === "type")
      return `${describeAccept(o.accept)} only — ${namesOrCount(typeR)} ${wasWere(typeR.length)} added.`;
    if (reason === "size")
      return `Each file must be under ${formatFileSize(o.maxSize!)} — ${namesOrCount(sizeR, true)} ${wasWere(sizeR.length)} added.`;
    return `You can add up to ${o.maxFiles} files — ${countR.length} ${wasWere(countR.length)} added.`;
  }

  // Nothing accepted, mixed reasons — plain honest listing.
  const all = rejections.map((r) => r.file);
  return `${namesOrCount(all)} ${wasWere(all.length)} added.`;
}

/* ---- the selected-files display (shared by both modes) ------------------------------------------------ */
function FileList({ files, size, inline }: { files: File[]; size: Size; inline?: boolean }) {
  const glyph = size === "3" ? 18 : 16;
  const textSize = size === "3" ? "2" : size === "1" ? "1" : "2";
  return (
    <>
      {files.map((f, i) => (
        <span className="rt-ds-fileinput-file" key={`${f.name}-${i}`} data-inline={inline || undefined}>
          <FileGlyph size={glyph} weight="regular" style={{ color: "var(--ds-icon-neutral)", flexShrink: 0 }} />
          <Text size={textSize} className="rt-ds-fileinput-file-name" title={f.name} style={{ color: "var(--ds-text-strong)" }}>
            {f.name}
          </Text>
          <Text size={textSize} style={{ color: "var(--ds-text-weak)", flexShrink: 0 }}>
            {formatFileSize(f.size)}
          </Text>
        </span>
      ))}
    </>
  );
}

/* ---- the control body — rendered INSIDE Field.Root so useOptionalFieldControl reads the field aria ---- */
interface BodyProps {
  resolvedSize: Size;
  mode: Mode;
  value: File | File[] | undefined;
  onValueChange: (value: File | File[] | undefined) => void;
  accept?: string;
  isMultiple: boolean;
  maxSize?: number;
  maxFiles?: number;
  placeholder?: string;
  disabled?: boolean;
  disabledReason?: string;
  isRequired?: boolean;
  forwardedRef?: React.Ref<HTMLInputElement>;
}

function FileInputBody({
  resolvedSize,
  mode,
  value,
  onValueChange,
  accept,
  isMultiple,
  maxSize,
  maxFiles,
  placeholder,
  disabled,
  disabledReason,
  isRequired,
  forwardedRef,
}: BodyProps) {
  const aria = useOptionalFieldControl();
  const announce = useAnnounce();
  const dr = useDisabledReason({ disabled, disabledReason });
  const soft = dr.soft;

  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const constraintsId = useId();
  const statusId = useId();
  const selectionId = useId();

  const [dragOver, setDragOver] = useState(false);
  // Surface 2 — the visible, self-announcing rejection/partial status (null ⇒ the live region sits empty).
  const [status, setStatus] = useState<string | null>(null);

  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
    },
    [forwardedRef],
  );

  const files = toFiles(value);
  const hasFiles = files.length > 0;
  const constraints = describeConstraints({ accept, maxSize, maxFiles, isMultiple });

  // The core selection handler — REPLACE-NEVER-APPEND. Validates, commits the surviving subset, and routes
  // feedback to exactly ONE surface (never double-announcing).
  const handleFiles = useCallback(
    (list: File[]) => {
      if (disabled) return; // [[disabled-reason]] consumer contract — the operable control bails while soft
      const { valid, errors } = validateFiles(list, accept, maxSize, maxFiles, isMultiple);
      const rejected = errors.length > 0;
      // Surface 2 (visible role=status) owns rejections + partial acceptance; it self-announces.
      setStatus(rejected ? buildRejectionMessage(list, valid, { accept, maxSize, maxFiles }) : null);

      if (valid.length === 0) {
        onValueChange(undefined); // replace-never-append: an all-rejected batch clears to empty
        return;
      }
      onValueChange(isMultiple ? valid : valid[0]);
      // Surface 1 (shared polite announce) fires ONLY on a clean selection — never alongside surface 2.
      if (!rejected) {
        announce(
          valid.length === 1
            ? `Added ${valid[0].name}, ${formatFileSize(valid[0].size)}`
            : `${valid.length} files selected`,
        );
      }
    },
    [disabled, accept, maxSize, maxFiles, isMultiple, onValueChange, announce],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(Array.from(e.target.files ?? []));
      // Reset so re-selecting the SAME file re-fires change (replace-never-append).
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleFiles],
  );

  const openPicker = useCallback(() => {
    if (disabled) return; // [[disabled-reason]] — the compact Button trigger bails while soft
    inputRef.current?.click();
  }, [disabled]);

  const handleClearAll = useCallback(() => {
    if (disabled) return;
    onValueChange(undefined);
    setStatus(null);
    if (inputRef.current) inputRef.current.value = "";
    announce("Files removed"); // useAnnounce owns clear-all (polite)
    // Refocus the tab stop the ✕ is disappearing from: the input (dropzone) or the Button (compact).
    (mode === "dropzone" ? inputRef.current : buttonRef.current)?.focus();
  }, [disabled, onValueChange, announce, mode]);

  // Drag-and-drop — POINTER-ONLY, dropzone mode only, inert while disabled (keyboard is served by the input).
  const onDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      if (disabled || mode !== "dropzone") return;
      setDragOver(true);
    },
    [disabled, mode],
  );
  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    // Ignore dragleave onto a child of the zone (prevents a drop-target highlight flicker); clear only on
    // a true exit from the zone.
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOver(false);
  }, []);
  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled || mode !== "dropzone") return;
      const list = Array.from(e.dataTransfer.files);
      if (list.length > 0) handleFiles(list);
    },
    [disabled, mode, handleFiles],
  );

  // aria-describedby MERGES the field-level id (validation / description) with the constraints hint + the
  // D8 reason id. The surface-2 status is a live region, NOT a persistent description, so it is NOT here.
  // The committed selection is folded into aria-describedby via a persistent VisuallyHidden node (below) so
  // a screen reader — or a seeded/edit form — hears the attached file. The native input's value is reset to
  // re-fire same-file picks, so it can't carry the value itself, and the visible list is aria-hidden (WCAG
  // 4.1.2 Value / 1.3.1). Surface-2 (the rejection live region) is NOT here — it's transient, not a description.
  const selectionSummary = !hasFiles
    ? null
    : files.length === 1
      ? `Selected: ${files[0].name}, ${formatFileSize(files[0].size)}`
      : `${files.length} files selected`;
  const describedBy =
    [
      aria?.["aria-describedby"],
      constraints ? constraintsId : undefined,
      selectionSummary ? selectionId : undefined,
      soft ? dr.reasonId : undefined,
    ]
      .filter(Boolean)
      .join(" ") || undefined;
  const ariaInvalid = soft ? undefined : aria?.["aria-invalid"] || undefined;

  const glyphSize = resolvedSize === "3" ? 18 : 16;
  const dropIconSize = resolvedSize === "3" ? 32 : 28;
  const showClear = hasFiles && !disabled;
  const primaryPrompt = placeholder ?? "Drag files here, or browse";

  // The native input — the operable control in BOTH modes; a tab stop in dropzone, tabIndex=-1 in compact.
  const nativeInput = (
    <input
      ref={setInputRef}
      type="file"
      className="rt-ds-fileinput-native"
      accept={accept}
      multiple={isMultiple}
      required={isRequired}
      aria-required={isRequired || undefined}
      tabIndex={mode === "input" ? -1 : undefined}
      onChange={handleInputChange}
      // Backstop for soft-disable: preventDefault cancels the native picker (covers pointer via the label
      // AND keyboard Enter/Space, which dispatch a click) — the input isn't natively disabled while soft.
      onClick={(e) => {
        if (disabled) e.preventDefault();
      }}
      id={aria?.id}
      {...dr.controlProps}
      aria-describedby={describedBy}
      aria-invalid={ariaInvalid}
    />
  );

  const control =
    mode === "dropzone" ? (
      <div className="rt-ds-fileinput-shell" data-size={resolvedSize}>
        {/* The <label> makes a pointer click anywhere open the picker; the input's focus lights the ring
            via :focus-within. All visible content is aria-hidden so the wrapping label never adds to the
            input's accessible name (which comes solely from Field.Label's htmlFor). */}
        <label
          className="rt-ds-fileinput-dropzone"
          data-drop-target={dragOver || undefined}
          data-disabled={disabled || undefined}
          onDragEnter={onDragOver}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {nativeInput}
          <span className="rt-ds-fileinput-dropzone-content" aria-hidden>
            {hasFiles ? (
              <span className="rt-ds-fileinput-files">
                <FileList files={files} size={resolvedSize} />
              </span>
            ) : (
              <>
                <UploadSimple size={dropIconSize} weight="regular" style={{ color: "var(--ds-icon-neutral)" }} />
                <span className="rt-ds-fileinput-prompt">
                  {dragOver ? (
                    "Drop files to add"
                  ) : (
                    <>
                      {primaryPrompt.includes("browse") ? (
                        <>
                          {primaryPrompt.split("browse")[0]}
                          <span className="rt-ds-fileinput-browse">browse</span>
                          {primaryPrompt.split("browse")[1]}
                        </>
                      ) : (
                        primaryPrompt
                      )}
                    </>
                  )}
                </span>
                {constraints && <span className="rt-ds-fileinput-hint">{constraints}</span>}
              </>
            )}
          </span>
          {soft && (
            <span className="rt-ds-fileinput-affix-glyph">
              <DisabledReasonGlyph size={glyphSize} />
            </span>
          )}
        </label>
        {/* The clear-all ✕ sits OUTSIDE the <label> (a sibling) so it never double-activates the picker. */}
        {showClear && (
          <IconButton
            inset
            size="1"
            className="rt-ds-fileinput-clear"
            aria-label="Remove all files"
            onClick={handleClearAll}
          >
            <X weight="bold" />
          </IconButton>
        )}
        {constraints && <VisuallyHidden id={constraintsId}>{constraints}</VisuallyHidden>}
        {selectionSummary && <VisuallyHidden id={selectionId}>{selectionSummary}</VisuallyHidden>}
      </div>
    ) : (
      <div className="rt-ds-fileinput-shell" data-size={resolvedSize}>
        <div className="rt-ds-fileinput-compact" data-disabled={disabled || undefined}>
          {nativeInput}
          <Button
            ref={buttonRef}
            type="button"
            priority="secondary"
            size={resolvedSize}
            onClick={openPicker}
            {...(soft
              ? { "aria-disabled": true as const, "aria-describedby": dr.reasonId }
              : dr.hardDisabled
                ? { disabled: true }
                : {})}
          >
            <UploadSimple weight="regular" />
            {isMultiple ? "Choose files" : "Choose file"}
          </Button>
          <span className="rt-ds-fileinput-compact-body" aria-hidden>
            {hasFiles ? (
              <span className="rt-ds-fileinput-files">
                <FileList files={files} size={resolvedSize} inline />
              </span>
            ) : (
              <span className="rt-ds-fileinput-placeholder">{placeholder ?? "No file chosen"}</span>
            )}
          </span>
          {soft && <DisabledReasonGlyph size={glyphSize} />}
          {showClear && (
            <IconButton
              inset
              size="1"
              className="rt-ds-fileinput-clear-compact"
              aria-label="Remove all files"
              onClick={handleClearAll}
            >
              <X weight="bold" />
            </IconButton>
          )}
          {constraints && <VisuallyHidden id={constraintsId}>{constraints}</VisuallyHidden>}
        {selectionSummary && <VisuallyHidden id={selectionId}>{selectionSummary}</VisuallyHidden>}
        </div>
      </div>
    );

  return (
    <Box>
      <DisabledReasonTooltip {...dr.tooltip}>{control}</DisabledReasonTooltip>
      {/* Surface 2 — a component-local live region, ALWAYS mounted (empty ⇒ zero-height, no gap) so a
          later-populated status announces reliably (the useAnnounce / upstream "born-with-content" lesson).
          Colour-not-alone: a Warning glyph + text, in the accent-aware warning family (a heads-up, NOT the
          red error vocabulary surface 3 owns). */}
      <Box
        id={statusId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="rt-ds-fileinput-status"
      >
        {status && (
          <>
            <Warning size={glyphSize} weight="fill" aria-hidden style={{ flexShrink: 0 }} />
            <Text size={resolvedSize === "3" ? "2" : "1"} style={{ color: "inherit", lineHeight: resolvedSize === "3" ? "20px" : "16px", textWrap: "pretty" }}>
              {status}
            </Text>
          </>
        )}
      </Box>
    </Box>
  );
}

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(function FileInput(
  {
    label,
    value,
    onValueChange,
    accept,
    isMultiple = false,
    maxSize,
    maxFiles,
    mode = "dropzone",
    placeholder,
    size,
    info,
    endSlot,
    description,
    validation,
    disabled,
    disabledReason,
    isRequired,
    width,
  },
  ref,
) {
  const resolvedSize = (useResolvedSize<Size>("control", size) ?? "1") as Size;

  const wrapped = (
    <Field.Root validation={validation} description={description} size={resolvedSize}>
      <Field.Label info={info} endSlot={endSlot}>
        {label}
        {isRequired && (
          <span aria-hidden style={{ color: "var(--ds-text-error)", marginInlineStart: "var(--space-1)" }}>
            *
          </span>
        )}
      </Field.Label>
      <FileInputBody
        resolvedSize={resolvedSize}
        mode={mode}
        value={value}
        onValueChange={onValueChange}
        accept={accept}
        isMultiple={isMultiple}
        maxSize={maxSize}
        maxFiles={maxFiles}
        placeholder={placeholder}
        disabled={disabled}
        disabledReason={disabledReason}
        isRequired={isRequired}
        forwardedRef={ref}
      />
      {description != null && <Field.Description>{description}</Field.Description>}
      <Field.Message />
    </Field.Root>
  );

  return width != null ? <Box style={{ width }}>{wrapped}</Box> : wrapped;
});
