import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Headphones, MessageCircle, MessagesSquare } from "lucide-react";
import { toast } from "sonner";
import { useChat, otherParticipant } from "@/chat/ChatContext";
import { useAuthUser } from "@/hooks/useAuthUser";
import ChatThread from "@/chat/ChatThread";
import { uploadChatImage } from "@/chat/chatApi";

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ChatPage() {
  const { t } = useTranslation();
  const chat = useChat();
  const user = useAuthUser();
  const myUserId = user?.id || user?._id || user?.uid || user?.firebaseUid;
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileThread, setMobileThread] = useState(() => !!searchParams.get("conversation"));

  const activeConversation = useMemo(
    () => chat.conversations.find((c) => c.id === chat.activeConversationId) ?? null,
    [chat.conversations, chat.activeConversationId],
  );
  const other = activeConversation ? otherParticipant(activeConversation, myUserId) : undefined;
  const activeName = other?.name || activeConversation?.title || t("supportChat.expeditionSupport");
  const activePhoto = other?.photoURL ?? null;
  const activeMessages = chat.activeConversationId ? (chat.messages[chat.activeConversationId] ?? []) : [];
  const otherLastReadAt = other
    ? (activeConversation?.participants?.find((p) => p.userId === other.id)?.lastReadAt ?? null)
    : null;
  const activeTypingUserId = chat.activeConversationId ? chat.typingUserId[chat.activeConversationId] : null;

  // Deep link: /dashboard/chat?conversation=<id> (from notifications / the
  // booking workspace). Opened once per id â€” the conversations list updates on
  // polling/socket events, so without this guard the effect would re-open and
  // re-issue "mark read" requests on every update.
  const processedDeepLink = useRef<string | null>(null);
  useEffect(() => {
    const id = searchParams.get("conversation");
    if (!id) {
      processedDeepLink.current = null;
      return;
    }
    if (processedDeepLink.current === id) return;
    if (chat.conversations.some((c) => c.id === id)) {
      processedDeepLink.current = id;
      chat.openConversation(id);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, chat.conversations]);

  const goSupportChat = async () => {
    try {
      await chat.openSupportChat();
      setMobileThread(true);
    } catch {
      toast.error(t("supportChat.supportUnavailable"));
    }
  };

  const goConversation = (id: string) => {
    chat.openConversation(id);
    setMobileThread(true);
  };

  return (
    <div className="w-full mx-auto bg-white rounded-xl border border-[var(--bv-border)] overflow-hidden flex flex-col md:flex-row h-[calc(100vh-240px)] min-h-[480px]">
      {/* Conversation list */}
      <div
        className={`w-full md:w-80 md:border-r border-[var(--bv-border)] flex flex-col min-h-0 ${
          mobileThread ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="px-4 py-3 border-b border-[var(--bv-border)] flex items-center gap-2">
          <MessagesSquare size={18} className="text-[var(--bv-accent)]" />
          <h3 className="text-[15px] font-semibold text-[var(--bv-ink)] font-heading">
            {t("supportChat.myChats")}
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          <button
            onClick={goSupportChat}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-lg bg-[var(--bv-accent-soft)] border bg-[var(--bv-accent)]/15 hover:bg-[var(--bv-success-bg)] transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-[var(--bv-success-bg)] text-[var(--bv-success-text)] flex items-center justify-center shrink-0">
              <Headphones size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[var(--bv-ink)] truncate">
                {t("supportChat.expeditionSupport")}
              </p>
              <p className="text-[12px] text-[var(--bv-muted)] truncate">
                {t("supportChat.chatWithSupportSub")}
              </p>
            </div>
          </button>

          {chat.conversations.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <MessageCircle size={30} className="text-[var(--bv-faint)]" />
              <p className="text-[14px] font-medium text-[var(--bv-ink)]">{t("supportChat.noConversations")}</p>
              <p className="text-[12px] text-[var(--bv-faint)] max-w-[220px]">
                {t("supportChat.noConversationsSub")}
              </p>
            </div>
          )}

          {chat.conversations.map((conv) => {
            const otherUser = otherParticipant(conv, myUserId);
            const name = otherUser?.name || conv.title || t("supportChat.expeditionSupport");
            const last = conv.messages?.[0];
            const active = conv.id === chat.activeConversationId;
            return (
              <button
                key={conv.id}
                onClick={() => goConversation(conv.id)}
                className={`flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-colors text-left ${
                  active ? "bg-[var(--bv-accent-soft)]" : "hover:bg-[var(--bv-surface-2)]"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-[var(--bv-success-bg)] text-[var(--bv-success-text)] flex items-center justify-center overflow-hidden shrink-0">
                  {otherUser?.photoURL ? (
                    <img src={otherUser.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <MessageCircle size={16} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[var(--bv-ink)] truncate">{name}</p>
                  <p className="text-[12px] text-[var(--bv-muted)] truncate">
                    {last
                      ? (last.attachmentUrl ? `ðŸ“· ${t("supportChat.imageAttachment")}` : last.content)
                      : t("supportChat.startConversation")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[11px] text-[var(--bv-faint)]">{timeAgo(conv.updatedAt)}</span>
                  {(conv.unreadCount ?? 0) > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--bv-danger-dot)] text-white text-[11px] font-bold flex items-center justify-center">
                      {Math.min(conv.unreadCount ?? 0, 99)}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat window */}
      <div
        className={`flex-1 flex flex-col min-w-0 min-h-0 ${
          mobileThread ? "flex" : "hidden md:flex"
        }`}
      >
        {activeConversation ? (
          <>
            <div className="px-4 py-3 border-b border-[var(--bv-border)] flex items-center gap-3 shrink-0">
              <button
                onClick={() => setMobileThread(false)}
                className="md:hidden flex items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--bv-surface-2)] text-[var(--bv-ink)]"
                aria-label="Back"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="w-10 h-10 rounded-full bg-[var(--bv-success-bg)] text-[var(--bv-success-text)] flex items-center justify-center overflow-hidden shrink-0">
                {activePhoto ? (
                  <img src={activePhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Headphones size={16} />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-[var(--bv-ink)] truncate">{activeName}</p>
                <p className="text-[12px] text-[var(--bv-success-text)] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--bv-success-text)]" />
                  {t("supportChat.online")}
                </p>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <ChatThread
                messages={activeMessages}
                myUserId={myUserId}
                statuses={chat.messageStatuses}
                otherLastReadAt={otherLastReadAt}
                isTyping={!!activeTypingUserId}
                typingName={activeTypingUserId === other?.id ? other.name : undefined}
                onSend={chat.sendMessage}
                onLoadMore={() => chat.activeConversationId && chat.loadMore(chat.activeConversationId)}
                hasMore={chat.activeConversationId ? chat.hasMore[chat.activeConversationId] : false}
                onTyping={(v) => chat.activeConversationId && chat.setTyping(chat.activeConversationId, v)}
                onUpload={uploadChatImage}
                allowDelete
                onDeleteMessage={(messageId) =>
                  chat.activeConversationId
                    ? chat.hideMessageForMe(chat.activeConversationId, messageId)
                    : Promise.resolve()
                }
                emptyText={t("supportChat.startConversation")}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
            <div className="w-14 h-14 rounded-full bg-[var(--bv-accent-soft)] text-[var(--bv-success-text)] flex items-center justify-center">
              <MessagesSquare size={26} />
            </div>
            <p className="text-[15px] font-medium text-[var(--bv-ink)]">{t("supportChat.noConversationSelected")}</p>
            <p className="text-[13px] text-[var(--bv-faint)] max-w-[280px]">
              {t("supportChat.noConversationSelectedSub")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
