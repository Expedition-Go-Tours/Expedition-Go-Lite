import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  MessageCircle, X, ChevronLeft, ChevronRight,
  Phone, Mail, Clock, Headphones, LogIn, Send,
} from 'lucide-react';
import { toast } from 'sonner';
import './SupportChatWidget.css';
import './SupportChatMessenger.css';
import { useChat, otherParticipant } from '../chat/ChatContext';
import { useAuthUser } from '../hooks/useAuthUser';
import ChatThread from '../chat/ChatThread';
import { uploadChatImage } from '../chat/chatApi';
import type { ChatRecipient } from '../chat/types';

/** Contact details come from env; rows are hidden when unset (no fake data). */
const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE || '';
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || '';
const SUPPORT_HOURS_LABEL = import.meta.env.VITE_SUPPORT_HOURS || 'Mon–Fri 8:00–18:00 GMT · Sat 9:00–14:00 GMT';

interface SupportChatWidgetProps {
  initialOpen?: boolean
  /** Opens straight into a chat with this recipient (e.g. the tour's supplier). */
  initialRecipient?: ChatRecipient | null
  onOpenAuth?: (mode: 'signin' | 'signup') => void
}

type SupportView = 'welcome' | 'signin' | 'contact' | 'chat'

export default function SupportChatWidget({ initialOpen, initialRecipient, onOpenAuth }: SupportChatWidgetProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const isPublicPage = !location.pathname.startsWith("/dashboard") && !location.pathname.startsWith("/review");

  const chat = useChat();
  const user = useAuthUser();
  const myUserId = user?.id || user?._id || user?.uid || user?.firebaseUid;

  const [isOpen, setIsOpen] = useState(!!initialOpen);
  const [view, setView] = useState<SupportView>(() => (initialRecipient?.id ? "chat" : "welcome"));
  const [isMobile, setIsMobile] = useState(false);
  const autoOpenedRef = useRef(false);
  const pendingIntentRef = useRef<null | 'support' | 'supplier'>(null);
  const pendingRecipientRef = useRef<ChatRecipient | null>(initialRecipient ?? null);

  // Pick the most recent existing support thread (unread first) so reopening
  // the bubble resumes the conversation instead of showing welcome each time.
  const pickExistingSupportThread = useCallback(() => {
    const candidates = chat.conversations.filter(
      (c) => c.type === "USER_SUPPORT" || c.type === "EXPEDITION_CUSTOMER",
    );
    if (candidates.length === 0) return null;
    return candidates.slice().sort((a, b) => {
      const aUnread = (a.unreadCount ?? 0) > 0 ? 1 : 0;
      const bUnread = (b.unreadCount ?? 0) > 0 ? 1 : 0;
      if (aUnread !== bUnread) return bUnread - aUnread;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    })[0];
  }, [chat.conversations]);

  const openWidget = useCallback(async () => {
    setIsOpen(true);
    const existing = pickExistingSupportThread();
    if (existing) {
      try {
        await chat.openConversation(existing.id);
        setView("chat");
        return;
      } catch {
        // fall through to welcome if the thread can't be opened
      }
    }
    setView("welcome");
  }, [pickExistingSupportThread, chat]);

  // External trigger: pages like the Help Centre / Contact Us raise the widget.
  useEffect(() => {
    const open = () => { void openWidget(); };
    window.addEventListener("expedition:open-support-chat", open);
    return () => window.removeEventListener("expedition:open-support-chat", open);
  }, [openWidget]);

  const activeConversation = chat.conversations.find((c) => c.id === chat.activeConversationId) ?? null;
  const other = activeConversation ? otherParticipant(activeConversation, myUserId) : undefined;
  // Platform support threads (admin "Customer Support" / legacy expedition
  // support) are answered by staff — never show a staff member's personal
  // name/photo in the header; brand it as "Admin Support" instead.
  const activeType = activeConversation?.type;
  const isSupportActive =
    view === "chat" &&
    !!activeType &&
    (activeType === "USER_SUPPORT" || activeType === "EXPEDITION_CUSTOMER");
  const activeName = other?.name || activeConversation?.title || t('supportChat.customerSupport');
  const activePhoto = other?.photoURL ?? null;
  const activeMessages = chat.activeConversationId ? (chat.messages[chat.activeConversationId] ?? []) : [];
  const otherLastReadAt = other
    ? (activeConversation?.participants?.find((p) => p.userId === other.id)?.lastReadAt ?? null)
    : null;
  const activeTypingUserId = chat.activeConversationId ? chat.typingUserId[chat.activeConversationId] : null;
  const activeTypingName = activeTypingUserId === other?.id ? other.name : undefined;

  // Tour detail: open the supplier conversation immediately when signed in.
  useEffect(() => {
    if (!isOpen || autoOpenedRef.current) return;
    if (initialRecipient?.id && user) {
      autoOpenedRef.current = true;
      // View already starts as "chat" for an initialRecipient; just open the
      // thread (state settles once the conversation resolves, avoiding a
      // synchronous setState inside the effect).
      chat.openSupplierChat(initialRecipient).catch(() => {
        toast.error(t('supportChat.chatStartFailed'));
      });
    }
  }, [isOpen, initialRecipient, user, chat, t]);

  // Mobile sheet tracking + body scroll lock.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isOpen || !isMobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen, isMobile]);

  const goSupportChat = useCallback(async () => {
    try {
      await chat.openSupportChat();
      setView("chat");
    } catch {
      toast.error(t('supportChat.supportUnavailable'));
    }
  }, [chat, t]);

  const closeWidget = () => {
    setIsOpen(false);
    setView("welcome");
    chat.closeConversation();
  };

  const backToWelcome = () => setView("welcome");

  const openContact = () => setView("contact");

  // Resume a pending intent after the user finishes sign-in / sign-up.
  useEffect(() => {
    if (!user || !isOpen) return;
    const pending = pendingIntentRef.current;
    if (!pending) return;
    pendingIntentRef.current = null;
    if (pending === 'supplier' && pendingRecipientRef.current) {
      chat.openSupplierChat(pendingRecipientRef.current).catch(() => {
        toast.error(t('supportChat.chatStartFailed'));
      });
      setView('chat');
    } else {
      goSupportChat();
    }
  }, [user, isOpen, goSupportChat, chat, t]);

  const openSupportIntent = useCallback(() => {
    if (user) {
      goSupportChat();
      return;
    }
    pendingIntentRef.current = 'support';
    setView('signin');
  }, [user, goSupportChat]);

  const signInCTA = () => {
    pendingIntentRef.current = 'support';
    onOpenAuth?.('signup');
  };

  if (!isPublicPage) return null;

  const headerTitle = view === "chat" && !isSupportActive ? activeName : t('supportChat.adminSupport');
  const headerSub = t('supportChat.typicalReply');
  const showBack = view !== "welcome";

  return (
    <>
      <MotionConfig reducedMotion="user">
      {/* Launcher (unchanged trigger) */}
      <button
        onClick={isOpen ? closeWidget : openWidget}
        className={`support-chat-btn${isOpen ? " open" : ""}`}
        aria-label={isOpen ? t('supportChat.closeChat') : t('supportChat.openChat')}
        aria-expanded={isOpen}
      >
        <span className="support-chat-btn-body">
          <span className="support-chat-btn-icon-wrap">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isOpen ? "close" : "open"}
                className="support-chat-btn-icon"
                initial={{ scale: 0.5, rotate: -90, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0.5, rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
              >
                {isOpen ? <X size={18} /> : <MessageCircle size={18} />}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="support-chat-btn-label">{t('supportChat.chatShort')}</span>
          <span className="support-chat-btn-hint">{t('supportChat.chatWithUs')}</span>
          {chat.unreadCount > 0 && !isOpen && (
            <span className="support-chat-badge">{chat.unreadCount > 99 ? "99+" : chat.unreadCount}</span>
          )}
        </span>
      </button>

      {/* Messenger */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="messenger"
            className={`msc-layer${isMobile ? " msc-mobile" : ""}`}
            initial={isMobile ? { y: "100%" } : { opacity: 0, y: 16, scale: 0.97 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={isMobile ? { y: "100%" } : { opacity: 0, y: 20, scale: 0.97 }}
            transition={isMobile
              ? { type: "tween", duration: 0.3, ease: [0.32, 0.72, 0, 1] }
              : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }
            }
            role="dialog"
            aria-modal="true"
            aria-label={t('supportChat.customerSupport')}
          >
            {/* Click-outside close (desktop only) */}
            {!isMobile && <button type="button" className="msc-scrim" onClick={closeWidget} aria-label={t('supportChat.closeChat')} />}

            <div className="msc-panel">
              {/* Header */}
              <header className="msc-header">
                {showBack ? (
                  <button type="button" className="msc-ghost" onClick={backToWelcome} aria-label={t('supportChat.back')}>
                    <ChevronLeft size={18} />
                  </button>
                ) : (
                  <span className="msc-ghost msc-ghost-spacer" />
                )}
                <div className="msc-header-main">
                  <span className="msc-avatar">
                    {view === "chat" && activePhoto ? (
                      <img src={activePhoto} alt="" />
                    ) : (
                      <Headphones size={17} />
                    )}
                  </span>
                    <span className="msc-header-text">
                      <span className="msc-header-title">{headerTitle}</span>
                      <span className="msc-header-sub">{headerSub}</span>
                    </span>
                </div>
                <button type="button" className="msc-ghost" onClick={closeWidget} aria-label={t('supportChat.closeChat')}>
                  <X size={18} />
                </button>
              </header>

              <div className="msc-body">
                <AnimatePresence mode="popLayout">
                  {view === "welcome" && (
                    <motion.div
                      key="welcome"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                      className="msc-view msc-welcome"
                    >
                      <div className="msc-welcome-head">
                        <span className="msc-welcome-icon"><MessageCircle size={26} /></span>
                        <h3 className="msc-welcome-title">{t('supportChat.welcomeTitle')}</h3>
                        <p className="msc-welcome-text">{t('supportChat.welcomeText')}</p>
                      </div>

                      <button type="button" className="msc-cta" onClick={openSupportIntent}>
                        <span className="msc-cta-icon"><Send size={16} /></span>
                        <span className="msc-cta-text">
                          <span className="msc-cta-title">{t('supportChat.chatWithUs')}</span>
                          <span className="msc-cta-sub">{t('supportChat.chatWithSupportSub')}</span>
                        </span>
                        <ChevronRight size={18} className="msc-cta-arrow" />
                      </button>

                      <div className="msc-options">
                        <button type="button" className="msc-option" onClick={openContact}>
                          <Phone size={15} />
                          <span>{t('supportChat.contactUs')}</span>
                        </button>
                      </div>

                      <p className="msc-trust">{t('supportChat.typicallyMinutes')}</p>
                    </motion.div>
                  )}

                  {view === "signin" && (
                    <motion.div
                      key="signin"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.18 }}
                      className="msc-view msc-center"
                    >
                      <div className="msc-center-icon"><LogIn size={24} /></div>
                      <h3 className="msc-welcome-title">{t('supportChat.signInToChat')}</h3>
                      <p className="msc-welcome-text">{t('supportChat.signInPrompt')}</p>
                      <button type="button" className="msc-cta msc-cta-full" onClick={signInCTA}>
                        {t('supportChat.signIn')}
                      </button>
                    </motion.div>
                  )}

                  {view === "contact" && (
                    <motion.div
                      key="contact"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.18 }}
                      className="msc-view"
                    >
                      <div className="msc-contact">
                        <div className="msc-contact-head">
                          <span className="msc-center-icon"><Headphones size={22} /></span>
                          <h3 className="msc-welcome-title">{t('supportChat.getInTouch')}</h3>
                          <p className="msc-welcome-text">{t('supportChat.getInTouchSub')}</p>
                        </div>

                        {SUPPORT_PHONE && (
                          <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="msc-contact-item">
                            <span className="msc-contact-icon call"><Phone size={15} /></span>
                            <span className="msc-contact-text">
                              <span className="msc-contact-label">{t('supportChat.callUs')}</span>
                              <span className="msc-contact-value">{SUPPORT_PHONE}</span>
                            </span>
                          </a>
                        )}
                        {SUPPORT_EMAIL && (
                          <a href={`mailto:${SUPPORT_EMAIL}`} className="msc-contact-item">
                            <span className="msc-contact-icon email"><Mail size={15} /></span>
                            <span className="msc-contact-text">
                              <span className="msc-contact-label">{t('supportChat.emailUs')}</span>
                              <span className="msc-contact-value">{SUPPORT_EMAIL}</span>
                            </span>
                          </a>
                        )}
                        <div className="msc-hours">
                          <span className="msc-hours-icon"><Clock size={14} /></span>
                          <span>{SUPPORT_HOURS_LABEL}</span>
                        </div>

                        <button type="button" className="msc-option msc-option-cta" onClick={openSupportIntent}>
                          <Send size={14} />
                          <span>{t('supportChat.chatWithUs')}</span>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {view === "chat" && (
                    <motion.div
                      key="chat"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="msc-view msc-thread"
                    >
                      <ChatThread
                        messages={activeMessages}
                        myUserId={myUserId}
                        statuses={chat.messageStatuses}
                        otherLastReadAt={otherLastReadAt}
                        isTyping={!!activeTypingUserId}
                        typingName={activeTypingName}
                        onSend={chat.sendMessage}
                        onLoadMore={() => chat.activeConversationId && chat.loadMore(chat.activeConversationId)}
                        hasMore={chat.activeConversationId ? chat.hasMore[chat.activeConversationId] : false}
                        onTyping={(v) => chat.activeConversationId && chat.setTyping(chat.activeConversationId, v)}
                        onUpload={uploadChatImage}
                        emptyText={t('supportChat.startConversation')}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </MotionConfig>
    </>
  );
}
