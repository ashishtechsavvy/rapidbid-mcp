import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const EDGE_FUNCTION_URL = "https://bokndfvlvdudktuovyil.supabase.co/functions/v1/mcp-post-project";

export default async function handler(req, res) {
  const server = new McpServer({ name: "rapidbid", version: "1.0.0" });
  const MCP_API_TOKEN = process.env.RAPIDBID_API_TOKEN;

  server.registerTool("post_project", {
    description: "Post a new project to RapidBid marketplace for bidding.",
    inputSchema: {
      title: z.string().min(1).max(500).describe("Project title"),
      description: z.string().optional().describe("Project description"),
      budget_min: z.number().nonnegative().optional().describe("Minimum budget"),
      budget_max: z.number().nonnegative().optional().describe("Maximum budget"),
      currency: z.string().optional().default("USD").describe("Currency code"),
      skills: z.array(z.string()).optional().describe("Required skills"),
      deadline: z.string().optional().describe("Deadline in ISO 8601 format"),
      status: z.enum(["draft", "active"]).optional().default("active"),
    },
  }, async (args) => {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MCP_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });
    const data = await response.json();
    if (!response.ok) {
      return { content: [{ type: "text", text: `Error: ${data.error}` }], isError: true };
    }
    const p = data.project;
    return {
      content: [{ type: "text", text: `Project posted!\nID: ${p.id}\nTitle: ${p.title}\nStatus: ${p.status}\nBudget: ${p.currency} ${p.budget_min ?? "?"} – ${p.budget_max ?? "?"}` }]
    };
  });

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
