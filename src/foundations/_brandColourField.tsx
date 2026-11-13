import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Box, Button, Flex } from "@radix-ui/themes";
import { TextField } from "../components/ui/TextField";
import { storedSeed } from "../palette/storedSeed";

/* THE CUSTOMIZE PAGE'S BRAND COLOUR FIELD ([[brand-colour-setting]]).

   It writes the shared setting through `storedSeed`, the write the docs toolbar
   uses too, so the setting always holds six-digit hex. And it follows the
   setting:

     - its own apply keeps the text the person typed, so an `oklch()` or `rgb()`
       entry stays on screen while the setting holds its hex;
     - a change made anywhere else (the toolbar, a shared link, a reload) shows
       the stored hex;
     - a clear from either control empties it.

   `value` is the setting, `onChange` writes it. The Customize page passes
   Storybook's globals; a test passes a store of its own. */

export interface BrandColourFieldProps {
  /** The stored setting: six-digit hex, or "" when no colour is applied. */
  value: string;
  /** Write the setting. */
  onChange: (next: string) => void;
}

export function BrandColourField({ value, onChange }: BrandColourFieldProps) {
  const [input, setInput] = useState(value);
  // The setting this field last wrote. A change to any other value came from outside.
  const own = useRef(value);
  useEffect(() => {
    if (value === own.current) return;
    own.current = value;
    setInput(value);
  }, [value]);

  const write = (next: string) => {
    own.current = next;
    onChange(next);
  };
  const apply = (text: string) => {
    const r = storedSeed(text);
    if (r.ok && r.hex !== value) write(r.hex);
  };
  const clear = () => {
    setInput("");
    write("");
  };

  // An empty field is the cleared state, not a refusal.
  const parsed = input.trim() === "" ? null : storedSeed(input);

  // Clear sits beside the input box, not beside the whole field. The label above the box grows
  // with the size tier and with `scaling`, so the button's offset is measured, not typed: its
  // centre goes to the centre of the input box, and it follows when the field resizes.
  const fieldBox = useRef<HTMLDivElement>(null);
  const clearButton = useRef<HTMLButtonElement>(null);
  const [clearTop, setClearTop] = useState(0);
  useLayoutEffect(() => {
    const box = fieldBox.current;
    if (!box) return;
    const measure = () => {
      const control = box.querySelector<HTMLElement>(".rt-TextFieldRoot");
      const button = clearButton.current;
      if (!control) return;
      const buttonHeight = button ? button.offsetHeight : control.offsetHeight;
      setClearTop(control.offsetTop + (control.offsetHeight - buttonHeight) / 2);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [value]);

  return (
    <Flex gap="3" align="start" wrap="wrap">
      {/* Sized to what it collects, a colour value such as an oklch() string, not to the page: it
          does not grow, and it shrinks on a narrow screen. */}
      <Box ref={fieldBox} style={{ flex: "0 1 320px", minWidth: 0, position: "relative" }}>
        <TextField
          label="Brand colour"
          value={input}
          placeholder="#ff6b5e"
          onChange={(e) => setInput(e.currentTarget.value)}
          onBlur={() => apply(input)}
          onKeyDown={(e) => { if (e.key === "Enter") apply(input); }}
          onPaste={(e) => {
            const text = e.clipboardData?.getData("text");
            if (!text) return;
            e.preventDefault();
            const next = text.trim();
            setInput(next);
            // Apply the PASTED text: `input` has not seen it yet.
            apply(next);
          }}
          validation={parsed && !parsed.ok ? { tone: "error", message: parsed.reason } : undefined}
          description={
            value
              ? "Applied system-wide. Browse any page — the system is wearing it."
              : "A solid colour. Press Enter, leave the field, or paste to apply."
          }
        />
      </Box>
      {value && <Button ref={clearButton} variant="soft" onClick={clear} style={{ marginTop: clearTop }}>Clear</Button>}
    </Flex>
  );
}
