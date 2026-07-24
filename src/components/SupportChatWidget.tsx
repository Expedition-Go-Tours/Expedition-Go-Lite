import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  MessageCircle, X, Send, ChevronLeft, ChevronRight,
  Phone, Mail, Clock, Headphones, CheckCheck,
} from "lucide-react";
import "./SupportChatWidget.css";

interface Message {
  id: string
  text: string
  sender: "user" | "other"
  time: string
}

const mockMessages: Message[] = [
  { id: "m1", text: "Hi! How can I help you today?", sender: "other", time: "10:30 AM" },
  { id: "m2", text: "I have a question about a tour.", sender: "user", time: "10:32 AM" },
  { id: "m3", text: "Sure! Which tour are you interested in?", sender: "other", time: "10:33 AM" },
  { id: "m4", text: "The Cape Coast Castle tour.", sender: "user", time: "10:35 AM" },
  { id: "m5", text: "Great choice! It's available every day. Let me know if you need help booking.", sender: "other", time: "10:36 AM" },
];

const SUPPORT_PHONE = "+233 XX XXX XXXX";
const SUPPORT_EMAIL = "support@expedition-go.com";
const SUPPORT_HOURS = [
  { label: "Mon - Fri", value: "8:00 AM - 6:00 PM" },
  { label: "Saturday", value: "9:00 AM - 2:00 PM" },
  { label: "Sunday", value: "Closed" },
];

interface SupportChatWidgetProps {
  initialOpen?: boolean
}

export default function SupportChatWidget({ initialOpen }: SupportChatWidgetProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const isPublicPage = !location.pathname.startsWith("/dashboard") && !location.pathname.startsWith("/review");

  const [isOpen, setIsOpen] = useState(!!initialOpen);
  const [view, setView] = useState<"welcome" | "contact" | "chat">("welcome");
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [input, setInput] = useState("");
  const [unread] = useState(2);
  const [isMobile, setIsMobile] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const replyTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const autoReplies = [
    "Thanks for reaching out! Let me look into that for you.",
    "Got it — one moment while I check.",
    "Happy to help! Could you share a bit more detail?",
    "Sure thing! I'll sort this out for you right away.",
    "Great question! Here's what I can tell you...",
    "Noted! Is there anything else I can help with?",
  ];

  const followUpReplies = [
    "Is there anything else I can help you with?",
    "Let me know if that works for you!",
    "Feel free to ask if you have more questions.",
    "I'm here if you need anything else. 😊",
    "Hope that helps!",
  ];

  // Clean up pending reply timers on unmount
  useEffect(() => {
    return () => {
      replyTimers.current.forEach(clearTimeout);
    };
  }, []);

  // Track the mobile breakpoint (matches the full-screen popup CSS at 480px)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 480px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Lock background scroll while the chat is open so the page behind the
  // full-screen overlay doesn't scroll.
  useEffect(() => {
    if (!isOpen || !isMobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, isMobile]);

  const openWidget = () => {
    setIsOpen(true);
    setView("welcome");
  };

  const closeWidget = () => {
    setIsOpen(false);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    const newMessage: Message = {
      id: `m-${Date.now()}`,
      text,
      sender: "user",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");

    // Pick the reply up front so the typing time can scale with its length
    const reply = autoReplies[Math.floor(Math.random() * autoReplies.length)];
    const readDelay = 400 + Math.random() * 500; // 0.4s - 0.9s before "typing"
    const typingDuration = Math.min(
      4200,
      Math.max(900, reply.length * 45 + Math.random() * 400)
    );

    const pushOtherMessage = (text: string) => {
      const replyMessage: Message = {
        id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text,
        sender: "other",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, replyMessage]);
    };

    const typingTimer = setTimeout(() => setIsTyping(true), readDelay);
    const replyTimer = setTimeout(() => {
      setIsTyping(false);
      pushOtherMessage(reply);

      // ~40% of the time, send a short follow-up second message
      if (Math.random() < 0.4) {
        const followUp = followUpReplies[Math.floor(Math.random() * followUpReplies.length)];
        const followUpTypingDelay = 500 + Math.random() * 400;
        const followUpTypingDuration = Math.min(
          3000,
          Math.max(800, followUp.length * 45 + Math.random() * 300)
        );

        const followUpTypingTimer = setTimeout(() => setIsTyping(true), followUpTypingDelay);
        const followUpReplyTimer = setTimeout(() => {
          setIsTyping(false);
          pushOtherMessage(followUp);
        }, followUpTypingDelay + followUpTypingDuration);

        replyTimers.current.push(followUpTypingTimer, followUpReplyTimer);
      }
    }, readDelay + typingDuration);

    replyTimers.current.push(typingTimer, replyTimer);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (view === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, view, isTyping]);

  if (!isPublicPage) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={openWidget}
        className={`support-chat-btn ${isOpen || initialOpen ? "hidden" : ""}`}
        aria-label={t('supportChat.openChat')}
      >
        <span className="support-chat-btn-content">
          <span className="support-chat-btn-inner">
            <MessageCircle className="support-chat-btn-icon" />
          </span>
          <span className="support-chat-btn-text">{t('supportChat.needHelp')}</span>
        </span>
        {unread > 0 && (
          <span className="support-chat-badge">{unread > 99 ? "99+" : unread}</span>
        )}
      </button>

      {/* Popup */}
      <AnimatePresence onExitComplete={() => setView("welcome")}>
        {isOpen && (
          <motion.div
            className="support-chat-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeWidget}
          >
            <motion.div
              className="support-chat-popup"
              initial={isMobile ? { y: "100%" } : { opacity: 0, y: 16, scale: 0.96 }}
              animate={isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
              exit={isMobile ? { y: "100%" } : { opacity: 0, y: 24, scale: 0.94 }}
              transition={isMobile
                ? { type: "tween", duration: 0.34, ease: [0.4, 0, 0.2, 1] }
                : { duration: 0.28, ease: [0.16, 1, 0.3, 1] }
              }
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="support-chat-header">
                <div className="support-chat-header-left">
                  {view !== "welcome" && (
                    <button
                      onClick={() => setView("welcome")}
                      className="support-chat-back-btn"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  )}
                  <div className="support-chat-avatar">
                    <Headphones size={16} />
                  </div>
                  <div className="support-chat-header-info">
                    <p className="support-chat-header-title">{t('supportChat.adminSupport')}</p>
                    <p className="support-chat-header-sub">
                      {view === "chat" ? (
                        <span className="support-chat-online">
                          <span className="support-chat-online-dot" />
                          {t('supportChat.online')}
                        </span>
                      ) : (
                        t('supportChat.typicalReply')
                      )}
                    </p>
                  </div>
                </div>
                <button onClick={closeWidget} className="support-chat-close-btn">
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <AnimatePresence mode="popLayout">
                {view === "welcome" && (
                  <motion.div
                    key="welcome"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.18 }}
                    className="support-chat-body"
                  >
                    <div className="support-chat-welcome">
                      <div className="support-chat-welcome-icon">
                        <MessageCircle size={28} />
                      </div>
                      <h3 className="support-chat-welcome-title">{t('supportChat.welcomeTitle')}</h3>
                      <p className="support-chat-welcome-text">
                        {t('supportChat.welcomeText')}
                      </p>
                      <div className="support-chat-options">
                        <button
                          onClick={() => setView("contact")}
                          className="support-chat-option"
                        >
                          <div className="support-chat-option-icon">
                            <Phone size={16} />
                          </div>
                          <div className="support-chat-option-text">
                            <p className="support-chat-option-title">{t('supportChat.contactUs')}</p>
                            <p className="support-chat-option-sub">{t('supportChat.contactUsSub')}</p>
                          </div>
                          <ChevronRight size={16} className="support-chat-option-arrow" />
                        </button>
                        <button
                          onClick={() => setView("chat")}
                          className="support-chat-option"
                        >
                          <div className="support-chat-option-icon">
                            <MessageCircle size={16} />
                          </div>
                          <div className="support-chat-option-text">
                            <p className="support-chat-option-title">{t('supportChat.chatWithUs')}</p>
                            <p className="support-chat-option-sub">{t('supportChat.chatWithUsSub')}</p>
                          </div>
                          <ChevronRight size={16} className="support-chat-option-arrow" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {view === "contact" && (
                  <motion.div
                    key="contact"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.18 }}
                    className="support-chat-body"
                  >
                    <div className="support-chat-contact">
                      <div className="support-chat-contact-header">
                        <div className="support-chat-contact-icon">
                          <Headphones size={24} />
                        </div>
                        <h3 className="support-chat-contact-title">{t('supportChat.getInTouch')}</h3>
                        <p className="support-chat-contact-text">
                          {t('supportChat.getInTouchSub')}
                        </p>
                      </div>
                      <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="support-chat-contact-item">
                        <div className="support-chat-contact-item-icon call">
                          <Phone size={15} />
                        </div>
                        <div className="support-chat-contact-item-text">
                          <p className="support-chat-contact-item-label">{t('supportChat.callUs')}</p>
                          <p className="support-chat-contact-item-value">{SUPPORT_PHONE}</p>
                        </div>
                        <span className="support-chat-contact-item-action">{t('supportChat.call')}</span>
                      </a>
                      <a href={`mailto:${SUPPORT_EMAIL}`} className="support-chat-contact-item">
                        <div className="support-chat-contact-item-icon email">
                          <Mail size={15} />
                        </div>
                        <div className="support-chat-contact-item-text">
                          <p className="support-chat-contact-item-label">{t('supportChat.emailUs')}</p>
                          <p className="support-chat-contact-item-value">{SUPPORT_EMAIL}</p>
                        </div>
                        <span className="support-chat-contact-item-action">{t('supportChat.email')}</span>
                      </a>
                      <div className="support-chat-hours">
                        <div className="support-chat-hours-header">
                          <Clock size={14} />
                          <span>{t('supportChat.businessHours')}</span>
                        </div>
                        {SUPPORT_HOURS.map((item) => (
                          <div key={item.label} className="support-chat-hours-row">
                            <span>{item.label}</span>
                            <span className={item.value === "Closed" ? "support-chat-hours-closed" : ""}>
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {view === "chat" && (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.18 }}
                    className="support-chat-body support-chat-body-chat"
                  >
                    <div className="support-chat-messages" id="support-chat-messages">
                      {messages.map((msg, idx) => {
                        const prev = messages[idx - 1];
                        const next = messages[idx + 1];
                        const isFirstInGroup = !prev || prev.sender !== msg.sender;
                        const isLastInGroup = !next || next.sender !== msg.sender;

                        return (
                          <div
                            key={msg.id}
                            className={`support-chat-msg ${msg.sender === "user" ? "own" : "other"} ${isFirstInGroup ? "mt-2" : "mt-0.5"}`}
                          >
                            <div
                              className={`support-chat-bubble ${
                                msg.sender === "user" ? "own" : "other"
                              } ${
                                isFirstInGroup && isLastInGroup
                                  ? "rounded-lg"
                                  : isFirstInGroup
                                    ? msg.sender === "user" ? "rounded-t-lg rounded-bl-lg rounded-br-sm" : "rounded-t-lg rounded-br-lg rounded-bl-sm"
                                    : isLastInGroup
                                      ? msg.sender === "user" ? "rounded-lg rounded-br-sm" : "rounded-lg rounded-bl-sm"
                                      : msg.sender === "user" ? "rounded-lg rounded-br-sm rounded-bl-lg" : "rounded-lg rounded-bl-sm rounded-br-lg"
                              }`}
                            >
                              <div className={isLastInGroup ? "pb-0.5" : ""}>{msg.text}</div>
                              {isLastInGroup && (
                                <p className={`support-chat-msg-time ${msg.sender === "user" ? "own" : "other"}`}>
                                  {msg.time}
                                  {msg.sender === "user" && (
                                    <CheckCheck size={14} className="support-chat-msg-tick" />
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      <AnimatePresence>
                        {isTyping && (
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.98 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            className="support-chat-msg other mt-2"
                          >
                            <div className="support-chat-bubble other rounded-lg rounded-bl-sm support-chat-typing">
                              {[0, 1, 2].map((i) => (
                                <motion.span
                                  key={i}
                                  className="support-chat-typing-dot"
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
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div ref={messagesEndRef} />
                    </div>

                    <div className="support-chat-input-bar">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('supportChat.typeMessage')}
                        rows={1}
                        className="support-chat-input"
                      />
                      <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="support-chat-send-btn"
                      >
                        <Send size={15} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
