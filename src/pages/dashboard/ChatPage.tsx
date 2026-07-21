import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, Phone, ChevronLeft, Search, MoreVertical, CheckCheck } from "lucide-react";

interface Message {
  id: string
  text: string
  sender: "user" | "other"
  time: string
}

interface Conversation {
  id: string
  name: string
  avatar: string
  lastMessage: string
  time: string
  unread: number
  online: boolean
  messages: Message[]
}

const mockConversations: Conversation[] = [
  {
    id: "1",
    name: "Expedition-Go Support",
    avatar: "",
    lastMessage: "Your booking has been confirmed!",
    time: "2m ago",
    unread: 2,
    online: true,
    messages: [
      { id: "m1", text: "Hi! How can I help you today?", sender: "other", time: "10:30 AM" },
      { id: "m2", text: "I have a question about my booking.", sender: "user", time: "10:32 AM" },
      { id: "m3", text: "Sure, I'd be happy to help! Which booking?", sender: "other", time: "10:33 AM" },
      { id: "m4", text: "The Cape Coast Castle tour on March 15th.", sender: "user", time: "10:35 AM" },
      { id: "m5", text: "Your booking has been confirmed!", sender: "other", time: "10:36 AM" },
    ],
  },
  {
    id: "2",
    name: "Sarah (Tour Guide)",
    avatar: "",
    lastMessage: "See you at the meeting point!",
    time: "1h ago",
    unread: 0,
    online: false,
    messages: [
      { id: "m6", text: "Hi! I'm your guide for tomorrow.", sender: "other", time: "9:00 AM" },
      { id: "m7", text: "Great, looking forward to it!", sender: "user", time: "9:15 AM" },
      { id: "m8", text: "Please meet at the hotel lobby at 6 AM.", sender: "other", time: "9:16 AM" },
      { id: "m9", text: "See you at the meeting point!", sender: "other", time: "9:17 AM" },
    ],
  },
];

// Deterministic gradient per avatar based on name
const avatarGradients = [
  "from-[#065f46] to-[#10b981]",
  "from-[#0e7490] to-[#22d3ee]",
  "from-[#7c3aed] to-[#a78bfa]",
  "from-[#b45309] to-[#f59e0b]",
];

function gradientForName(name: string) {
  const index = name.charCodeAt(0) % avatarGradients.length;
  return avatarGradients[index];
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [search, setSearch] = useState("");
  const [typingChatId, setTypingChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null!);
  const mobileMessagesEndRef = useRef<HTMLDivElement>(null!);
  const replyTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const activeConversation = conversations.find((c) => c.id === activeChat);

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  useEffect(() => {
    // Scroll whichever panel is visible (hidden panels no-op safely)
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    mobileMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages.length, activeChat, typingChatId, mobileView]);

  // Clean up any pending reply timers on unmount
  useEffect(() => {
    return () => {
      replyTimers.current.forEach(clearTimeout);
    };
  }, []);

  const autoReplies = [
    "Thanks for your message! Let me check that for you.",
    "Got it — I'll look into this right away.",
    "Sure thing! Give me just a moment.",
    "Great question! Here's what I can tell you...",
    "Noted! Is there anything else I can help with?",
  ];

  const handleSend = () => {
    const text = messageInput.trim();
    if (!text || !activeChat) return;

    const chatId = activeChat;
    const newMessage: Message = {
      id: `m-${Date.now()}`,
      text,
      sender: "user",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === chatId
          ? { ...conv, messages: [...conv.messages, newMessage], lastMessage: text, time: "now" }
          : conv
      )
    );
    setMessageInput("");

    // Pick the reply up front so timing can scale with its length
    const reply = autoReplies[Math.floor(Math.random() * autoReplies.length)];

    // Small random pause before they "notice" the message and start typing
    const readDelay = 400 + Math.random() * 500; // 0.4s - 0.9s

    // Typing duration scales with reply length (~45ms/char), clamped to a
    // believable range, with a little jitter so it never feels mechanical
    const typingDuration = Math.min(
      4200,
      Math.max(900, reply.length * 45 + Math.random() * 400)
    );

    const typingTimer = setTimeout(() => setTypingChatId(chatId), readDelay);
    const replyTimer = setTimeout(() => {
      const replyMessage: Message = {
        id: `m-${Date.now()}-r`,
        text: reply,
        sender: "other",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setTypingChatId((current) => (current === chatId ? null : current));
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === chatId
            ? { ...conv, messages: [...conv.messages, replyMessage], lastMessage: reply, time: "now" }
            : conv
        )
      );
    }, readDelay + typingDuration);

    replyTimers.current.push(typingTimer, replyTimer);
  };

  const openChat = (id: string) => {
    setActiveChat(id);
    setMobileView("chat");
    // Clear unread on open
    setConversations((prev) =>
      prev.map((conv) => (conv.id === id ? { ...conv, unread: 0 } : conv))
    );
  };

  const backToList = () => {
    setMobileView("list");
  };

  // Shared chat body (header + messages + input) reused by the desktop panel
  // and the mobile sliding overlay. `endRef` scrolls that panel's message list.
  const renderChatBody = (conv: Conversation, endRef: React.RefObject<HTMLDivElement>) => (
    <>
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-[#e5e4e7] bg-white">
        <button
          onClick={backToList}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#f3f4f6] transition-colors"
          aria-label="Back to conversations"
        >
          <ChevronLeft size={18} className="text-[#6b7280]" />
        </button>
        <div className="relative shrink-0">
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradientForName(conv.name)} flex items-center justify-center shadow-sm`}>
            <span className="text-[14px] font-bold text-white">
              {conv.name.charAt(0)}
            </span>
          </div>
          {conv.online && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#22c55e] border-2 border-white" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[#1a1a1a] truncate">{conv.name}</p>
          <p className={`text-[12px] flex items-center gap-1 ${conv.online ? "text-[#22c55e]" : "text-[#9ca3af]"}`}>
            {conv.online && <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />}
            {conv.online ? "Online" : "Offline"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[#f3f4f6] transition-colors">
            <Phone size={16} className="text-[#6b7280]" />
          </button>
          <button className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[#f3f4f6] transition-colors">
            <MoreVertical size={16} className="text-[#6b7280]" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-1"
        style={{
          backgroundColor: "#efeae2",
          backgroundImage: "radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      >
        <AnimatePresence initial={false}>
          {conv.messages.map((msg, idx) => {
            const prev = conv.messages[idx - 1];
            const isFirstInGroup = !prev || prev.sender !== msg.sender;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} ${isFirstInGroup ? "mt-3.5 sm:mt-4" : "mt-1.5"} px-0.5`}
              >
                <div
                  className={`relative max-w-[85%] sm:max-w-[75%] pl-2.5 pr-2 py-1.5 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] ${
                    msg.sender === "user"
                      ? "bg-[#d9fdd3] text-[#111b21]"
                      : "bg-white text-[#111b21]"
                  } ${
                    isFirstInGroup
                      ? msg.sender === "user"
                        ? "rounded-lg rounded-tr-sm"
                        : "rounded-lg rounded-tl-sm"
                      : "rounded-lg"
                  }`}
                >
                  {/* Tail on the first message of a group */}
                  {isFirstInGroup && (
                    <span
                      className={`absolute top-0 w-2 h-3 overflow-hidden ${
                        msg.sender === "user" ? "-right-[7px]" : "-left-[7px]"
                      }`}
                      aria-hidden="true"
                    >
                      <span
                        className={`absolute top-0 block w-3 h-3 ${
                          msg.sender === "user"
                            ? "right-[1px] bg-[#d9fdd3] [clip-path:polygon(0_0,0_100%,100%_0)]"
                            : "left-[1px] bg-white [clip-path:polygon(100%_0,0_0,100%_100%)]"
                        }`}
                      />
                    </span>
                  )}
                  <span className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words align-bottom">
                    {msg.text}
                  </span>
                  <span className="float-right inline-flex items-center gap-1 ml-2 mt-[6px] translate-y-[3px] select-none">
                    <span className="text-[11px] text-[#667781] leading-none">
                      {msg.time}
                    </span>
                    {msg.sender === "user" && (
                      <CheckCheck size={15} className="text-[#53bdeb]" />
                    )}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <AnimatePresence>
          {typingChatId === conv.id && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="flex justify-start mt-2"
            >
              <div className="bg-white rounded-lg rounded-tl-sm px-4 py-3 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]">
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-2 h-2 rounded-full bg-[#9ca3af]"
                      animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                      transition={{
                        duration: 0.9,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.15,
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#e5e4e7] bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder="Type a message..."
            className="flex-1 h-11 px-4 rounded-xl border border-[#e5e4e7] text-[14px] text-[#1a1a1a] bg-[#f8fafc] outline-none focus:border-[#065f46] focus:bg-white focus:ring-2 focus:ring-[#065f46]/10 transition-all placeholder:text-[#9ca3af]"
          />
          <motion.button
            onClick={handleSend}
            disabled={!messageInput.trim()}
            whileTap={{ scale: 0.92 }}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-[#065f46] to-[#0a7a58] text-white shadow-md shadow-[#065f46]/20 hover:shadow-lg hover:shadow-[#065f46]/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <Send size={16} />
          </motion.button>
        </div>
      </div>
    </>
  );

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-[#e5e4e7] w-full max-w-4xl mx-auto shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#065f46] to-[#10b981] flex items-center justify-center mb-5 shadow-lg shadow-[#065f46]/20">
          <MessageCircle size={30} className="text-white" />
        </div>
        <h3 className="text-xl font-heading font-semibold text-[#1a1a1a] mb-2">No Messages</h3>
        <p className="text-[14px] text-[#6b7280] max-w-sm leading-relaxed mb-7">
          You don't have any conversations yet. Start chatting with our support team or your tour guides.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl lg:max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl border border-[#e5e4e7] overflow-hidden shadow-sm">
        <div className="relative flex h-[600px] lg:h-[calc(100vh-220px)] lg:min-h-[640px] lg:max-h-[820px]">
          {/* Conversation List (base layer on mobile, left column on desktop) */}
          <div className="w-full md:w-80 border-r border-[#e5e4e7] flex flex-col bg-[#fafbfc]">
            <div className="p-4 border-b border-[#e5e4e7] bg-white">
              <h2 className="text-[16px] font-heading font-semibold text-[#1a1a1a] mb-3">Messages</h2>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#e5e4e7] bg-[#f8fafc] text-[13px] text-[#1a1a1a] outline-none focus:border-[#065f46] focus:bg-white transition-colors placeholder:text-[#9ca3af]"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-1 scrollbar-none">
              {filteredConversations.length === 0 ? (
                <div className="px-4 py-8 text-center text-[13px] text-[#9ca3af]">
                  No conversations found
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => openChat(conv.id)}
                    className={`relative w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white ${
                      activeChat === conv.id ? "bg-white" : ""
                    }`}
                  >
                    {activeChat === conv.id && (
                      <motion.span
                        layoutId="active-conv-accent"
                        className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#065f46]"
                      />
                    )}
                    <div className="relative shrink-0">
                      <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${gradientForName(conv.name)} flex items-center justify-center shadow-sm`}>
                        <span className="text-[15px] font-bold text-white">
                          {conv.name.charAt(0)}
                        </span>
                      </div>
                      {conv.online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#22c55e] border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] font-semibold text-[#1a1a1a] truncate">{conv.name}</span>
                        <span className="text-[11px] text-[#9ca3af] shrink-0">{conv.time}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className={`text-[13px] truncate ${conv.unread > 0 ? "text-[#1a1a1a] font-medium" : "text-[#6b7280]"}`}>
                          {conv.lastMessage}
                        </span>
                        {conv.unread > 0 && (
                          <span className="shrink-0 ml-2 min-w-[20px] h-5 px-1.5 rounded-full bg-[#065f46] text-white text-[11px] font-bold flex items-center justify-center leading-none">
                            {conv.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area — desktop only (hidden on mobile) */}
          <div className="hidden md:flex flex-1 flex-col">
            <AnimatePresence mode="wait">
              {activeConversation ? (
                <motion.div
                  key={activeConversation.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  className="flex-1 flex flex-col min-h-0"
                >
                  {renderChatBody(activeConversation, messagesEndRef)}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="flex-1 flex items-center justify-center text-center p-8 bg-gradient-to-b from-[#f9fafb] to-white"
                >
                  <div>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#065f46] to-[#10b981] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#065f46]/20">
                      <MessageCircle size={28} className="text-white" />
                    </div>
                    <p className="text-[15px] font-medium text-[#1a1a1a] mb-1">Your Messages</p>
                    <p className="text-[13px] text-[#6b7280]">Select a conversation to start chatting</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Chat Area — mobile sliding overlay */}
          <AnimatePresence>
            {mobileView === "chat" && activeConversation && (
              <motion.div
                key="mobile-chat"
                className="md:hidden absolute inset-0 z-20 flex flex-col bg-white"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "tween", duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              >
                {renderChatBody(activeConversation, mobileMessagesEndRef)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
