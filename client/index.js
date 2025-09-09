import dotenv from "dotenv";
dotenv.config();
import readline from "readline/promises";
import { GoogleGenAI } from "@google/genai";

// Import the MCP Client and SSE Transport
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";


let tools = [];


// Initialize the GoogleGenAI client with your API key
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });
// Create an MCP Client instance
const mcpClient = new Client({
    name: "example-client",
    version: "1.0.0"
});



// Create an SSE transport to connect to the server which communicates over Server-Sent Events (SSE)
mcpClient.connect(new SSEClientTransport(new URL("http://localhost:4000/sse"))).then(async () => {
    console.log("Connected to MCP server via SSE");
    console.log("Fetching available tools from server...");
    tools = (await mcpClient.listTools()).tools.map(tool => {
        return {
            name: tool.name,
            description: tool.description,
            parameters: {
                type: tool.inputSchema.type,
                properties: tool.inputSchema.properties,
                required: tool.inputSchema.required
            }
        }
    })
    //When Connect to MCP server Then call the createChatLoop function again to take next input from user
    createChatLoop();
 })



const chatHistoryData = [];
//instance of readline
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

//create a loop to take input from user continuously like continuous conversation
async function createChatLoop(toolCall){
    try {
        if(toolCall){
            console.log("Calling tool:", toolCall.name);
            chatHistoryData.push({
                role: "model",
                parts: [
                    {
                        text: `Calling tool: ${toolCall.name}`,
                        type: "text"
                    }
                ]
            });
            const toolResult = await mcpClient.callTool({
                name: toolCall.name,
                arguments: toolCall.args
            });
            chatHistoryData.push({
                role: "user",
                parts: [
                    {
                        text: "Tool Result: " + toolResult.content[0].text,
                        type: "text"
                    }
                ]
            });
            console.log("toolResult:", toolResult);
        } else {
            const question = await rl.question("You: ");
            if (question === 'exit') {
                rl.close();
                return;
            }
            chatHistoryData.push({
                role: "user",
                parts: [
                    {
                        text: question,
                        type: "text"
                    }
                ]
            });
        }
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: chatHistoryData,
            config: {
                tools: [
                    {
                        functionDeclarations: tools,
                    }
                ]
            }
        });
        const functionCall = response.candidates[0].content.parts[0].functionCall;
        const modelResponseText = response.candidates[0].content.parts[0].text;
        if (functionCall) {
            return createChatLoop(functionCall);
        }
        chatHistoryData.push({
            role: "model",
            parts: [
                {
                    text: modelResponseText,
                    type: "text"
                }
            ]
        });
        console.log(`AI: ${modelResponseText}`);
        createChatLoop();
    } catch (error) {
        if (error.code === 'ABORT_ERR') {
            console.log('Chat session aborted by user.');
            rl.close();
        } else {
            console.error('An unexpected error occurred:', error);
        }
    }
}



