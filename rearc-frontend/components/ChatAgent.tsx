"use client";

import * as React from "react";
import { useSDK } from "@metamask/sdk-react";
import { useState, useRef, useEffect } from "react";
import { WORKER_URL } from "@/lib/constants";
import { formatMessage } from "@/lib/formatMessage";
import Input from "@components/Input";
import Button from "@components/Button";
import Message from "@components/Message";
import MessageViewer from "@components/MessageViewer";
import Table from "@components/Table";
import TableRow from "@components/TableRow";
import TableColumn from "@components/TableColumn";

// Custom styles for chat input - targets Input component's internal structure
const chatInputStyles = `
  .chat-input-wrapper [class*="displayed"] {
    min-height: 60px !important;
    height: auto !important;
    padding: 0.5rem !important;
    white-space: pre-wrap !important;
    word-wrap: break-word !important;
    overflow-wrap: break-word !important;
  }
  .chat-input-wrapper [class*="hidden"] {
    min-height: 60px !important;
    height: auto !important;
    padding: 0.5rem !important;
  }
  .chat-input-wrapper input {
    -webkit-autocomplete: off !important;
    autocomplete: off !important;
  }
`;

interface MessageType {
  sender: "user" | "assistant";
  text: string;
  timestamp: Date;
}

export default function ChatAgent() {
  const { account } = useSDK();
  const [messages, setMessages] = useState<MessageType[]>([
    {
      sender: "assistant",
      text: "Hi! I'm your AI assistant for REARC.XYZ. I can help you with swaps, check balances, and answer questions about the AMM.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !account) return;

    const userMessage: MessageType = {
      sender: "user",
      text: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      if (!WORKER_URL || WORKER_URL === "") {
        throw new Error("Worker URL not configured");
      }

      // Send conversation history (last 10 messages) for context
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text,
      }));

      const response = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: input, 
          address: account,
          history: conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`Worker responded with status ${response.status}`);
      }

      const text = await response.text();
      const assistantMessage: MessageType = {
        sender: "assistant",
        text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error calling AI worker:", error);
      let errorText = "Sorry, I couldn't process that request.";
      
      if (error?.message?.includes("Failed to fetch") || error?.message?.includes("NetworkError")) {
        errorText = "Unable to connect to AI worker. Please make sure the Cloudflare Worker is running. If running locally, start it with: `cd rearc-worker && npx wrangler dev`";
      } else if (error?.message?.includes("Worker URL not configured")) {
        errorText = "AI worker URL not configured. Please set NEXT_PUBLIC_WORKER_URL in your .env.local file.";
      } else if (error?.message) {
        errorText = `Error: ${error.message}`;
      }
      
      const errorMessage: MessageType = {
        sender: "assistant",
        text: errorText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!account) {
    return (
      <Table style={{ minWidth: '71ch' }}>
        <TableRow>
          <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;CONNECT WALLET TO USE AI ASSISTANT</TableColumn>
        </TableRow>
      </Table>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: chatInputStyles }} />
      <div style={{ minHeight: '300px', maxHeight: '400px', overflowY: 'auto', overflowX: 'hidden', width: '100%', marginBottom: '1rem' }}>
        {messages.map((msg, i) => (
          <React.Fragment key={i}>
            {msg.sender === "user" ? (
              <MessageViewer>{msg.text}</MessageViewer>
            ) : (
              <Message>{formatMessage(msg.text)}</Message>
            )}
          </React.Fragment>
        ))}
        {loading && (
          <Message>
            THINKING
            <span style={{ color: 'var(--theme-focused-foreground)' }}>_</span>
          </Message>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div>
        <div className="chat-input-wrapper" style={{ position: 'relative' }}>
          <Input
            name="chat_input"
            placeholder="Ask about swaps, balances, pools..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-chat-input="true"
          />
        </div>
        <br />
        <Button onClick={sendMessage} isDisabled={loading || !input.trim()}>
          SEND
        </Button>
      </div>
    </>
  );
}
