import { useState } from "react";
import { Button, Flex, FormLayout, Heading, Provider, Switch, Text, TextField } from "dsiab";

export default function App() {
  const [name, setName] = useState("");
  const [notify, setNotify] = useState(true);
  return (
    <Provider>
      <Flex direction="column" gap="4" p="5" maxWidth="420px">
        <Heading as="h1">Settings</Heading>
        <FormLayout>
          <TextField label="Display name" value={name} onChange={(e) => setName(e.target.value)} />
          <Text as="label">
            <Flex gap="2" align="center">
              <Switch checked={notify} onCheckedChange={setNotify} />
              Email notifications
            </Flex>
          </Text>
        </FormLayout>
        <Button priority="primary" onClick={() => console.info({ name, notify })}>Save</Button>
      </Flex>
    </Provider>
  );
}
