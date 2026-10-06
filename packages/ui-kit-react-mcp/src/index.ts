#!/usr/bin/env node
// stdio only: started locally by the MCP client, never exposed on the network.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createServer } from './server';

async function main() {
  const server = createServer();
  await server.connect(new StdioServerTransport());
}

main().catch((error: unknown) => {
  // stdout carries the protocol: log to stderr only.
  console.error('[@4sh/ui-kit-react-mcp] échec au démarrage :', error);
  process.exit(1);
});
