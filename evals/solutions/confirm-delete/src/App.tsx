import { useState } from "react";
import { AlertDialog, Button, Flex, Provider, Text } from "dsiab";

export default function App() {
  const [deleted, setDeleted] = useState(false);
  return (
    <Provider>
      <Flex direction="column" gap="4" p="5">
        <Text>{deleted ? "The project was deleted." : "Project Atlas"}</Text>
        <AlertDialog.Root>
          <AlertDialog.Trigger>
            <Button tone="danger" disabled={deleted}>Delete project</Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content maxWidth="420px">
            <AlertDialog.Title>Delete this project?</AlertDialog.Title>
            <AlertDialog.Description>This cannot be undone.</AlertDialog.Description>
            <Flex gap="3" mt="4" justify="end">
              <AlertDialog.Cancel>
                <Button>Cancel</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action>
                <Button priority="primary" tone="danger" onClick={() => setDeleted(true)}>Delete</Button>
              </AlertDialog.Action>
            </Flex>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </Flex>
    </Provider>
  );
}
