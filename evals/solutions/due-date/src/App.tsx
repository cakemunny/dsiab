import { useState } from "react";
import { Button, DateInput, type DateInputProps, Flex, FormLayout, Heading, Provider, Text, TextField } from "dsiab";

export default function App() {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState<DateInputProps["value"]>();
  const [tasks, setTasks] = useState<string[]>([]);
  return (
    <Provider>
      <Flex direction="column" gap="4" p="5" maxWidth="420px">
        <Heading as="h1">New task</Heading>
        <FormLayout>
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <DateInput label="Due date" value={due} onValueChange={setDue} hasClear />
        </FormLayout>
        <Button priority="primary" onClick={() => setTasks([...tasks, `${title} (due ${due ?? "any time"})`])}>Add task</Button>
        {tasks.map((t) => <Text key={t}>{t}</Text>)}
      </Flex>
    </Provider>
  );
}
