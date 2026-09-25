#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "focusforge-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const FOCUS_FORGE_API = "http://localhost:3000";

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_tasks",
        description: "List all tasks currently active in Focus Forge.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "create_task",
        description: "Create a new task in Focus Forge.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            desc: { type: "string" },
            priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
            category: { type: "string" },
          },
          required: ["title"],
        },
      },
      {
        name: "update_task",
        description: "Update the completion status of a task in Focus Forge.",
        inputSchema: {
          type: "object",
          properties: {
            taskId: { type: "string" },
            done: { type: "boolean" },
          },
          required: ["taskId", "done"],
        },
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "list_tasks") {
    try {
      const res = await fetch(`${FOCUS_FORGE_API}/api/mcp-state`);
      const state = await res.json();
      return {
        content: [{ type: "text", text: JSON.stringify(state.tasks, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error fetching tasks: ${err.message}. Ensure Focus Forge is running on localhost:3000.` }],
        isError: true,
      };
    }
  }

  if (request.params.name === "create_task" || request.params.name === "update_task") {
    try {
      const res = await fetch(`${FOCUS_FORGE_API}/api/mcp-queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: request.params.name,
          args: request.params.arguments,
        }),
      });
      const data = await res.json();
      return {
        content: [{ type: "text", text: `Command sent successfully to Focus Forge queue: ${JSON.stringify(data)}` }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error sending command: ${err.message}` }],
        isError: true,
      };
    }
  }

  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Focus Forge MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error running MCP server:", err);
  process.exit(1);
});
