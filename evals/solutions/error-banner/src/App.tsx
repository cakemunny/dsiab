import { useState } from "react";
import { Button, Callout, Flex, Heading, Provider } from "dsiab";

export default function App() {
  const [failed, setFailed] = useState(false);
  return (
    <Provider>
      <Flex direction="column" gap="4" p="5">
        {failed && (
          <Callout tone="error" title="The draft was not saved" actions={<Button onClick={() => setFailed(false)}>Retry</Button>}>
            Check your connection and try again.
          </Callout>
        )}
        <Heading as="h1">Draft</Heading>
        <Button priority="primary" onClick={() => setFailed(true)}>Save (simulate a failure)</Button>
      </Flex>
    </Provider>
  );
}
