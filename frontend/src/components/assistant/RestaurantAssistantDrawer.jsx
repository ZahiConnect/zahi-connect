import { useEffect, useMemo, useRef, useState } from "react";
import {
  HiOutlineChatAlt2,
  HiOutlinePaperAirplane,
  HiOutlineSparkles,
  HiOutlineTrash,
  HiOutlineX,
} from "react-icons/hi";

import aiService from "../../services/aiService";

const formatClock = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

const buildWelcomeMessage = (tenantName) => ({
  id: "welcome-message",
  role: "assistant",
  message:
    `I’m your ${tenantName || "restaurant"} assistant. Ask for the menu, item prices, low stock alerts, ` +
    "or tell me to create a website order from the live data.",
  timestamp: new Date().toISOString(),
});

const normalizeHistory = (messages) =>
  messages.map((message, index) => ({
    id:
      message.id ||
      `${message.role || "assistant"}-${message.timestamp || "message"}-${index}`,
    role: message.role || "assistant",
    message: message.message || "",
    timestamp: message.timestamp || new Date().toISOString(),
    pending: Boolean(message.pending),
  }));

const RestaurantAssistantDrawer = ({ user }) => {
  const [open, setOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollContainerRef = useRef(null);

  const welcomeMessage = useMemo(
    () => buildWelcomeMessage(user?.tenant_name),
    [user?.tenant_name]
  );

  useEffect(() => {
    setInitialized(false);
    setConversationId(null);
    setMessages([]);
    setError("");
  }, [user?.tenant_id]);

  useEffect(() => {
    if (!open || initialized || loadingHistory) return;

    const loadHistory = async () => {
      try {
        setLoadingHistory(true);
        setError("");
        const data = await aiService.getRestaurantHistory(conversationId);
        setConversationId(data.conversation_id || null);
        setMessages(normalizeHistory(data.messages || []));
      } catch (fetchError) {
        console.error("Failed to load restaurant assistant history", fetchError);
        setError("I couldn't load the previous chat yet.");
      } finally {
        setInitialized(true);
        setLoadingHistory(false);
      }
    };

    loadHistory();
  }, [conversationId, initialized, loadingHistory, open]);

  useEffect(() => {
    if (!open) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open]);

  const displayMessages = messages.length ? messages : [welcomeMessage];

  const handleSend = async (presetMessage = null) => {
    const text = (presetMessage ?? input).trim();
    if (!text || sending) return;

    const optimisticUserMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      message: text,
      timestamp: new Date().toISOString(),
    };
    const pendingAssistantMessage = {
      id: `assistant-pending-${Date.now()}`,
      role: "assistant",
      message: "Thinking through the live restaurant data...",
      timestamp: new Date().toISOString(),
      pending: true,
    };

    setOpen(true);
    setInput("");
    setError("");
    setSending(true);
    setMessages((current) => [...current, optimisticUserMessage, pendingAssistantMessage]);

    try {
      const data = await aiService.sendRestaurantMessage({
        conversation_id: conversationId,
        message: text,
      });

      setConversationId(data.conversation_id || conversationId);
      setMessages((current) => {
        const withoutPending = current.filter(
          (message) => message.id !== pendingAssistantMessage.id
        );
        return [
          ...withoutPending,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            message: data.reply,
            timestamp: new Date().toISOString(),
          },
        ];
      });
    } catch (sendError) {
      console.error("Failed to send restaurant assistant message", sendError);
      setMessages((current) =>
        current.filter((message) => message.id !== pendingAssistantMessage.id)
      );
      setError("The assistant couldn't answer right now. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Clear this assistant conversation?")) return;

    try {
      await aiService.clearRestaurantHistory(conversationId);
      setMessages([]);
      setConversationId(null);
      setInitialized(false);
      setError("");
    } catch (clearError) {
      console.error("Failed to clear restaurant assistant history", clearError);
      setError("I couldn't clear the chat right now.");
    }
  };

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close restaurant assistant"
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-[#E6DBCF] bg-[#FFFDF9] shadow-[0_24px_80px_rgba(37,23,14,0.16)] transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="border-b border-[#F0E3D6] bg-[linear-gradient(135deg,#FFF7EF_0%,#F7E9DA_100%)] px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#DFC7B2] bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A76541]">
                <HiOutlineSparkles className="text-sm" />
                Restaurant AI
              </div>
              <div>
                <h3 className="text-2xl font-serif text-[#1F1A17]">Zahi Assistant</h3>
                <p className="mt-1 text-sm leading-6 text-[#5C4A3C]">
                  Live menu help, order capture, and quick ops answers for this workspace.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearHistory}
                className="rounded-full border border-[#DCCDBC] bg-white px-3 py-2 text-sm text-[#6C5847] transition-colors hover:bg-[#FBF6F0]"
                title="Clear conversation"
              >
                <HiOutlineTrash className="text-lg" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[#DCCDBC] bg-white px-3 py-2 text-sm text-[#6C5847] transition-colors hover:bg-[#FBF6F0]"
                title="Close assistant"
              >
                <HiOutlineX className="text-lg" />
              </button>
            </div>
          </div>
        </div>

        <div ref={scrollContainerRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
          {loadingHistory ? (
            <div className="space-y-3">
              <div className="h-16 animate-pulse rounded-3xl bg-[#F6EFE7]" />
              <div className="ml-auto h-12 w-3/4 animate-pulse rounded-3xl bg-[#F6EFE7]" />
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {!loadingHistory &&
            displayMessages.map((message) => {
              const isAssistant = message.role === "assistant";
              return (
                <div
                  key={message.id}
                  className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[86%] rounded-[24px] px-4 py-3 shadow-sm ${
                      isAssistant
                        ? "border border-[#E9DCCE] bg-white text-[#3A2C21]"
                        : "bg-[#1F1A17] text-white"
                    } ${message.pending ? "animate-pulse" : ""}`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-6">{message.message}</p>
                    <p
                      className={`mt-2 text-[11px] uppercase tracking-[0.16em] ${
                        isAssistant ? "text-[#A18570]" : "text-white/65"
                      }`}
                    >
                      {isAssistant ? "Assistant" : "You"}
                      {message.timestamp ? ` • ${formatClock(message.timestamp)}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>

        <div className="border-t border-[#F0E3D6] bg-white px-4 py-4">
          <div className="flex items-end gap-3 rounded-[28px] border border-[#E6DBCF] bg-[#FFFDF9] px-4 py-3 shadow-sm">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder="Ask about menu items, prices, orders, or stock..."
              className="max-h-32 min-h-[48px] flex-1 resize-none border-0 bg-transparent text-sm leading-6 text-[#2E221B] outline-none placeholder:text-[#9C8776]"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={sending || !input.trim()}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#1F1A17] text-white transition-colors hover:bg-[#36281F] disabled:cursor-not-allowed disabled:bg-[#C7B8AA]"
            >
              <HiOutlinePaperAirplane className="text-lg" />
            </button>
          </div>
        </div>
      </aside>


    </>
  );
};

export default RestaurantAssistantDrawer;
