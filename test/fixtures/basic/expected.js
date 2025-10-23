import {McpServer} from 'tmcp';
import {ZodJsonSchemaAdapter} from '@tmcp/adapter-zod';
import {StdioTransport} from '@tmcp/transport-stdio';
import {z} from 'zod/mini';

const adapter = new ZodJsonSchemaAdapter();
const server = new McpServer(
  {
    name: 'test-server',
    version: '1.0.0',
    description: 'a test description'
  },
  {
    adapter,
    capabilities: {
      tools: {listChanged: true},
      prompts: {listChanged: true},
      resources: {listChanged: true}
    }
  }
);

server.tool(
  {
    name: 'playWithNumbers',
    description: 'Plays with numbers',
    schema: z.object({
      num: z.number()
    })
  },
  async ({num}) => {
    return num * 2 + 10;
  }
);

const transport = new StdioTransport(server);
transport.listen();
