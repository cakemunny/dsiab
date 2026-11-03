import { useState } from "react";
import { Flex, Heading, MultiSelect, Provider, Text } from "dsiab";

const TAGS = ["design", "react", "tokens", "a11y"];
const ARTICLES = [
  { title: "Picking a palette", tags: ["design", "tokens"] },
  { title: "Hooks in practice", tags: ["react"] },
  { title: "Focus rings that work", tags: ["a11y", "design"] },
  { title: "Theming with roles", tags: ["tokens", "react"] },
  { title: "Labels and fields", tags: ["a11y"] },
  { title: "Motion without noise", tags: ["design"] },
];

export default function App() {
  const [tags, setTags] = useState<string[]>([]);
  const shown = ARTICLES.filter((a) => tags.every((t) => a.tags.includes(t)));
  return (
    <Provider>
      <Flex direction="column" gap="4" p="5" maxWidth="480px">
        <Heading as="h1">Articles</Heading>
        <MultiSelect label="Tags" placeholder="Any tag" value={tags} onValueChange={setTags} clearable>
          {TAGS.map((t) => <MultiSelect.Option key={t} value={t}>{t}</MultiSelect.Option>)}
        </MultiSelect>
        {shown.map((a) => <Text key={a.title}>{a.title}</Text>)}
      </Flex>
    </Provider>
  );
}
