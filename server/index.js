import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { createTweetPost } from "./mcpServer.toolList.js";

const server = new McpServer({
    name: "example-server",
    version: "1.0.0"
});


//now we can register resources, tools, and prompts with the server
server.tool(
  "addTwoNumbers",
  "Add two numbers",
  {
    a: z.number(),
    b: z.number()
  },
  async (arg) => {
    const { a, b } = arg;
    return {
     content: [
        {
            type: "text",
            text: `The sum of ${a} and ${b} is ${a + b}.`
        }
     ]
    };
  }
);

//Now Create a tool to post a tweet using Twitter API
server.tool(
    "createTweetPost",
    "Create a tweet post on X (formerly Twitter)",
    {
        postContent: z.string()
    }, async (arg) => {
        const { postContent } = arg;
        return createTweetPost(postContent);
    }
);


// ... set up server resources, tools, and prompts ...
//create a express server 
const app = express();

// to support multiple simultaneous connections we have a lookup object from
// sessionId to transport
const transports = {};

//send data/response/messages server to client using SSE
app.get("/sse", async (req, res) => {
    const transport = new SSEServerTransport('/messages', res);
    transports[ transport.sessionId ] = transport;
    res.on("close", () => {
        delete transports[ transport.sessionId ];
    });
    await server.connect(transport);
});

//sends data/requests/messages from client to server using POST
app.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId;
    const transport = transports[ sessionId ];
    if (transport) {
        await transport.handlePostMessage(req, res);
    } else {
        res.status(400).send('No transport found for sessionId');
    }
});

app.listen(4000, () => {
    console.log("Server is running on http://localhost:4000");
});