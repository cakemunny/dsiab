import { Button, Card, Flex, Heading, Provider, Text } from "dsiab";

export default function App() {
  return (
    <Provider accentColor="purple">
      <Flex p="5" maxWidth="480px">
        <Card variant="filled">
          <Flex direction="column" gap="3">
            <Heading as="h2">Welcome back</Heading>
            <Text>Your workspace is ready.</Text>
            <Button priority="primary">Open workspace</Button>
          </Flex>
        </Card>
      </Flex>
    </Provider>
  );
}
