import type { Meta, StoryObj } from "@storybook/react-vite";
import { Text } from "@radix-ui/themes";
import { Mono, Page, PageHeader, Section } from "../components/ui/_storyKit";

/* =============================================================================
   _internal/About this section — the first page inside `_internal` ([[sidebar-order]]).
   -----------------------------------------------------------------------------
   `_internal` opens collapsed (manager.ts), and a reader who expands it anyway
   lands among a few hundred behavioural fixtures with no explanation. This page
   sorts first in the section (preview.tsx storySort) and says what they are.

   Its one story is named after the title's last segment, so Storybook hoists it
   to a single sidebar leaf. Underscore-prefixed like every `_internal` file, so
   the docs guards that bind a reader's pages skip it.
   ============================================================================= */

const prose = { maxWidth: "var(--ds-text-measure)", lineHeight: 1.6 } as const;

function AboutInternal() {
  return (
    <Page>
      <PageHeader
        title="About this section"
        standfirst="These pages are test fixtures. They keep the docs honest, and they are not guidance."
      />
      <Section title="What these pages are">
        <Text as="p" size="2" style={prose}>
          Each page here is a behavioural fixture. It renders a component, drives it the way a person
          would, and checks the result. The checks run as tests in <Mono>npm test</Mono>, in a real
          browser. When a component stops doing what its page claims, a fixture fails and the build
          goes red.
        </Text>
      </Section>
      <Section title="What to read instead">
        <Text as="p" size="2" style={prose}>
          A fixture is written for a test, not for a reader. It skips the explanation, it can show a
          component in a state you should not copy, and it can change without notice. To learn a
          component, open its page under Components.
        </Text>
      </Section>
    </Page>
  );
}

const meta: Meta<typeof AboutInternal> = {
  title: "_internal/About this section",
  component: AboutInternal,
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj<typeof AboutInternal>;
export const About: Story = { name: "About this section" };
