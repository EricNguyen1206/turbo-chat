/**
 * AgentChatPage — Dedicated chat with ZeroClaw AI agent
 * Streaming responses, tool call display, and WebSocket communication.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, User, AlertCircle, Wrench } from 'lucide-react';
import { useZeroClawSocketStore, AIConnectionState } from '@/store/useZeroClawSocketStore';
import type { WsMessage } from '@/types/zeroclaw';

interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  type?: 'text' | 'tool_call' | 'tool_result' | 'error';
}

export default function AgentChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);

  const { connectionState, connect, sendMessage, isConnected } = useZeroClawSocketStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingContentRef = useRef('');

  // Connect on mount
  useEffect(() => {
    if (connectionState === AIConnectionState.DISCONNECTED) {
      connect().catch(() => { });
    }
  }, [connectionState, connect]);

  // Listen for AI chat messages
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as WsMessage;
      if (!detail) return;

      switch (detail.type) {
        case 'chunk':
          setTyping(true);
          pendingContentRef.current += detail.content ?? '';
          break;

        case 'message':
        case 'done': {
          const content = detail.full_response ?? detail.content ?? pendingContentRef.current;
          if (content) {
            setMessages((prev) => [
              ...prev,
              { id: crypto.randomUUID(), role: 'agent', content, timestamp: new Date(), type: 'text' },
            ]);
          }
          pendingContentRef.current = '';
          setTyping(false);
          break;
        }

        case 'tool_call':
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'agent',
              content: `${detail.name ?? 'unknown'}(${JSON.stringify(detail.args ?? {})})`,
              timestamp: new Date(),
              type: 'tool_call',
            },
          ]);
          break;

        case 'tool_result':
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'agent',
              content: String(detail.output ?? ''),
              timestamp: new Date(),
              type: 'tool_result',
            },
          ]);
          break;

        case 'error':
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'agent',
              content: detail.message ?? 'Unknown error',
              timestamp: new Date(),
              type: 'error',
            },
          ]);
          setTyping(false);
          pendingContentRef.current = '';
          break;
      }
    };

    window.addEventListener('ai-chat-message', handler);
    return () => window.removeEventListener('ai-chat-message', handler);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || !isConnected()) return;

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content: trimmed, timestamp: new Date(), type: 'text' },
    ]);

    try {
      sendMessage(trimmed);
      setTyping(true);
      pendingContentRef.current = '';
    } catch {
      // Error handled by store
    }

    setInput('');
    inputRef.current?.focus();
  }, [input, isConnected, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const connected = connectionState === AIConnectionState.CONNECTED;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Connection error */}
      {connectionState === AIConnectionState.ERROR && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          Connection error. Attempting to reconnect...
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Bot className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-lg font-medium">ZeroClaw Agent</p>
            <p className="text-sm mt-1">Send a message to start the conversation</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-primary' : 'bg-secondary'
                }`}
            >
              {msg.role === 'user' ? (
                <User className="h-4 w-4 text-primary-foreground" />
              ) : msg.type === 'tool_call' || msg.type === 'tool_result' ? (
                <Wrench className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Bot className="h-4 w-4 text-foreground" />
              )}
            </div>
            <div
              className={`max-w-[75%] rounded-xl px-4 py-3 ${msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : msg.type === 'error'
                    ? 'bg-destructive/10 text-destructive border border-destructive/20'
                    : msg.type === 'tool_call' || msg.type === 'tool_result'
                      ? 'bg-secondary/70 text-foreground border border-border font-mono text-xs'
                      : 'bg-card text-card-foreground border border-border'
                }`}
            >
              {(msg.type === 'tool_call' || msg.type === 'tool_result') && (
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  {msg.type === 'tool_call' ? '🔧 Tool Call' : '📋 Tool Result'}
                </p>
              )}
              <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
              <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                {msg.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {typing && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <Bot className="h-4 w-4 text-foreground" />
            </div>
            <div className="bg-card border border-border rounded-xl px-4 py-3">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card p-4">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={connected ? 'Type a message...' : 'Connecting...'}
              disabled={!connected}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!connected || !input.trim()}
            className="flex-shrink-0 bg-primary hover:bg-primary/90 disabled:bg-secondary disabled:text-muted-foreground text-primary-foreground rounded-xl p-3 transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center justify-center mt-2 gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span className="text-xs text-muted-foreground">
            {connected ? 'Connected' : connectionState === AIConnectionState.CONNECTING ? 'Connecting...' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
}
