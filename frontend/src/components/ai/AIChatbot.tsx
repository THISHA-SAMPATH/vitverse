'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles } from 'lucide-react';
import { aiApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  'What events are happening this week?',
  'How do I earn FOC credits?',
  'Which clubs are open for recruitment?',
  'Tell me about technical events in Vellore',
];

export function AIChatbot() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'bot',
      text: `Hey ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm VITBot. Ask me anything about events, clubs, FOC, or campus life across all VIT campuses!`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await aiApi.chat(text.trim(), user?.campus);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: data.response || 'I couldn\'t process that. Try rephrasing!',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          text: 'Sorry, I\'m having trouble connecting right now. Please try again in a moment.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0052CC 0%, #6366F1 100%)' }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="h-6 w-6 text-white" />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle className="h-6 w-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
        {!open && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-success flex items-center justify-center">
            <Sparkles className="h-2.5 w-2.5 text-white" />
          </span>
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 z-50 w-80 md:w-96 flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{ height: '520px', background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-white/10"
              style={{ background: 'linear-gradient(135deg, rgba(0,82,204,0.2), rgba(99,102,241,0.2))' }}>
              <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">VITBot</div>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  <span className="text-[11px] text-slate-400">AI Campus Assistant</span>
                </div>
              </div>
              <div className="ml-auto">
                <span className="badge badge-secondary text-[10px]">GPT-4o</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs ${
                    msg.role === 'user' ? 'bg-primary/30 text-primary-400' : 'bg-secondary/30 text-violet-400'
                  }`}>
                    {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary/20 text-white rounded-tr-sm'
                      : 'bg-white/5 text-slate-200 rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-secondary/30 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-violet-400" />
                  </div>
                  <div className="bg-white/5 rounded-2xl rounded-tl-sm px-3 py-2 flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-slate-400"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {messages.length === 1 && (
                <div className="space-y-2 mt-2">
                  <p className="text-[11px] text-slate-500">Try asking:</p>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="block w-full text-left text-xs px-3 py-2 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about events, clubs, FOC…"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-primary/50"
                  disabled={loading}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={loading || !input.trim()}
                  className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center disabled:opacity-40 transition-all hover:bg-primary-400"
                >
                  {loading ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : <Send className="h-4 w-4 text-white" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
