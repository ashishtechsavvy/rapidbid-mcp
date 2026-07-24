import { z } from "zod";

const EDGE_FUNCTION_URL = "https://bokndfvlvdudktuovyil.supabase.co/functions/v1/mcp-post-project";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = req.body;
  const { method, params, id } = body;

  // MCP handshake
  if (method === "initialize") {
    res.json({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "rapidbid", version: "1.0.0" }
      }
    });
    return;
  }

  if (method === "tools/list") {
    res.json({
      jsonrpc: "2.0",
      id,
      result: {
        tools: [{
          name: "post_project",
          description: "Post a new project to RapidBid marketplace for bidding.",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Project title" },
              description: { type: "string", description: "Project description" },
              budget_min: { type: "number", description: "Minimum budget" },
              budget_max: { type: "number", description: "Maximum budget" },
              currency: { type: "string", description: "Currency code e.g. USD" },
              skills: { type: "array", items: { type: "string" }, description: "Required skills" },
              deadline: { type: "string", description: "Deadline in ISO 8601 format" },
              status: { type: "string", enum: ["draft", "active"], description: "Project status" }
            },
            required: ["title"]
          }
        }]
      }
    });
    return;
  }

  if (method === "tools/call") {
    const { name, arguments: args } = params;

    if (name !== "post_project") {
      res.json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Tool not found" } });
      return;
    }

    const token = process.env.RAPIDBID_API_TOKEN;
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });

    const data = await response.json();

    if (!response.ok) {
      res.json({
        jsonrpc: "2.0", id,
        result: { content: [{ type: "text", text: `Error: ${data.error}` }], isError: true }
      });
      return;
    }

    const p = data.project;
    res.json({
      jsonrpc: "2.0", id,
      result: {
        content: [{
          type: "text",
          text: `Project posted!\nID: ${p.id}\nTitle: ${p.title}\nStatus: ${p.status}\nBudget: ${p.currency} ${p.budget_min ?? "?"} – ${p.budget_max ?? "?"}`
        }]
      }
    });
    return;
  }

  res.json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } });
}
