import React, { useState, useEffect, useRef } from "react";

const INITIAL_WELCOME =
  "Salam! I am Solon, your Pakistani legal AI. Ask me anything about Pakistani law, the Constitution, or just say hello.";

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function createNewChat(name = "New Consultation") {
  return {
    id: "chat_" + Math.random().toString(36).substring(2, 11),
    name: name,
    createdAt: Date.now(),
    messages: [
      {
        role: "solon",
        content: INITIAL_WELCOME,
        timestamp: formatTime(),
      },
    ],
  };
}

const SEED_CHATS = [
  {
    id: "seed_1",
    name: "Article 62 & 63 Qualifications",
    createdAt: Date.now() - 1000 * 60 * 45, // Today
    messages: [
      {
        role: "solon",
        content: INITIAL_WELCOME,
        timestamp: "10:00 AM",
      },
      {
        role: "user",
        content:
          "Explain disqualification criteria under Article 62 and 63 of Pakistan's Constitution.",
        timestamp: "10:02 AM",
      },
      {
        role: "solon",
        content:
          "Under Article 62 of the 1973 Constitution of Pakistan, qualifications for Parliament membership require a citizen to be of good character, sagacious, righteous, non-profligate, and honest and ameen (sadiq and ameen). Article 63 sets forth specific grounds for disqualification, including holding an office of profit, default in government loans, declaration of unsound mind, or actions defaming the judiciary or state institutions.",
        timestamp: "10:03 AM",
      },
    ],
  },
  {
    id: "seed_2",
    name: "Fundamental Rights Enforcement",
    createdAt: Date.now() - 1000 * 60 * 180, // Today
    messages: [
      {
        role: "solon",
        content: INITIAL_WELCOME,
        timestamp: "08:15 AM",
      },
      {
        role: "user",
        content: "How are fundamental rights enforced under Article 199 and 184(3)?",
        timestamp: "08:16 AM",
      },
      {
        role: "solon",
        content:
          "Fundamental rights under Chapter 1 of Part II are enforceable through the High Court via writ jurisdiction (Article 199) and through the Supreme Court of Pakistan under original jurisdiction (Article 184(3)) whenever an issue of public importance relating to fundamental rights arises.",
        timestamp: "08:17 AM",
      },
    ],
  },
  {
    id: "seed_3",
    name: "Constitution 18th Amendment",
    createdAt: Date.now() - 1000 * 60 * 60 * 26, // Yesterday
    messages: [
      {
        role: "solon",
        content: INITIAL_WELCOME,
        timestamp: "Yesterday 2:30 PM",
      },
      {
        role: "user",
        content: "What was the primary impact of the 18th Constitutional Amendment?",
        timestamp: "Yesterday 2:31 PM",
      },
      {
        role: "solon",
        content:
          "Enacted in 2010, the 18th Amendment significantly devolved powers to the provinces by abolishing the Concurrent Legislative List, removed presidential unilateral powers to dissolve assemblies (Article 58-2b), and introduced judicial appointment commissions under Article 175A.",
        timestamp: "Yesterday 2:32 PM",
      },
    ],
  },
];

export default function SolonApp() {
  // LocalStorage - solon_chats
  const [chats, setChats] = useState(() => {
    try {
      const stored = localStorage.getItem("solon_chats");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Could not load solon_chats from localStorage", e);
    }
    return SEED_CHATS;
  });

  const [activeChatId, setActiveChatId] = useState(() => {
    return chats && chats.length > 0 ? chats[0].id : "";
  });

  // LocalStorage - solon_settings
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem("solon_settings");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error("Could not load solon_settings from localStorage", e);
    }
    return { fontSize: "medium" };
  });

  // Interactive UI States
  const [inputMessage, setInputMessage] = useState("");
  const [isResponding, setIsResponding] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [menuOpenChatId, setMenuOpenChatId] = useState(null);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editChatName, setEditChatName] = useState("");

  const chatScrollRef = useRef(null);
  const streamIntervalRef = useRef(null);

  // Sync chats to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("solon_chats", JSON.stringify(chats));
    } catch (e) {
      console.error("Error saving solon_chats", e);
    }
  }, [chats]);

  // Sync settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("solon_settings", JSON.stringify(settings));
    } catch (e) {
      console.error("Error saving solon_settings", e);
    }
  }, [settings]);

  // Cleanup stream interval on unmount
  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    };
  }, []);

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0] || null;

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages, isResponding]);

  // Font size resolver
  const getFontSizeClass = () => {
    switch (settings.fontSize) {
      case "small":
        return "text-[13px] leading-relaxed";
      case "large":
        return "text-[16px] leading-relaxed";
      case "medium":
      default:
        return "text-[14px] md:text-[15px] leading-relaxed";
    }
  };

  // Group chats by date
  const groupChats = () => {
    const groups = {
      TODAY: [],
      YESTERDAY: [],
      "THIS WEEK": [],
      OLDER: [],
    };
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOfThisWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;

    chats.forEach((chat) => {
      const ts = chat.createdAt || 0;
      if (ts >= startOfToday) {
        groups["TODAY"].push(chat);
      } else if (ts >= startOfYesterday) {
        groups["YESTERDAY"].push(chat);
      } else if (ts >= startOfThisWeek) {
        groups["THIS WEEK"].push(chat);
      } else {
        groups["OLDER"].push(chat);
      }
    });

    return groups;
  };

  // New Chat Handler
  const handleNewChat = () => {
    const fresh = createNewChat();
    setChats((prev) => [fresh, ...prev]);
    setActiveChatId(fresh.id);
    setMobileSidebarOpen(false);
  };

  // Rename Chat Handlers
  const handleStartRename = (chat, e) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditChatName(chat.name);
    setMenuOpenChatId(null);
  };

  const handleSaveRename = (chatId) => {
    if (!editChatName.trim()) {
      setEditingChatId(null);
      return;
    }
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, name: editChatName.trim() } : c))
    );
    setEditingChatId(null);
  };

  // Delete Chat Handler
  const handleDeleteChat = (chatId, e) => {
    e.stopPropagation();
    setChats((prev) => {
      const remaining = prev.filter((c) => c.id !== chatId);
      if (activeChatId === chatId) {
        if (remaining.length > 0) {
          setActiveChatId(remaining[0].id);
        } else {
          const fresh = createNewChat();
          setActiveChatId(fresh.id);
          return [fresh];
        }
      }
      return remaining;
    });
    setMenuOpenChatId(null);
  };

  // Clear All Chats Handler
  const handleClearAllChats = () => {
    const fresh = createNewChat();
    setChats([fresh]);
    setActiveChatId(fresh.id);
    setConfirmClearOpen(false);
    setSettingsModalOpen(false);
  };

  // Send Message Logic with API character-by-character streaming
  const handleSend = async (messageText, isRegen = false) => {
    const textToSend = messageText ? messageText.trim() : inputMessage.trim();
    if (!textToSend || isResponding) return;

    const currentSessionId = activeChatId;
    const currentTime = formatTime();

    if (!isRegen) {
      // Append user message
      const userMessage = {
        role: "user",
        content: textToSend,
        timestamp: currentTime,
      };

      setChats((prev) =>
        prev.map((c) => {
          if (c.id === currentSessionId) {
            // Auto rename on first user message if default
            const hasUserMsgs = c.messages.some((m) => m.role === "user");
            const newName =
              !hasUserMsgs || c.name === "New Consultation"
                ? textToSend.length > 30
                  ? textToSend.substring(0, 30) + "..."
                  : textToSend
                : c.name;

            return {
              ...c,
              name: newName,
              messages: [...c.messages, userMessage],
            };
          }
          return c;
        })
      );
      setInputMessage("");
    }

    setIsResponding(true);

    let replyString = "";
    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          session_id: currentSessionId,
        }),
      });

      if (!res.ok) throw new Error("API failed");
      const data = await res.json();
      replyString = data?.response || "No response content received.";
    } catch (err) {
      replyString = "I seem to be offline right now. Make sure the backend is running.";
    }

    // Append initial empty Solon bubble
    const solonTimestamp = formatTime();
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === currentSessionId) {
          return {
            ...c,
            messages: [
              ...c.messages,
              { role: "solon", content: "", timestamp: solonTimestamp },
            ],
          };
        }
        return c;
      })
    );

    // Stream character by character, 18ms per character
    let charIndex = 0;
    streamIntervalRef.current = setInterval(() => {
      charIndex++;
      const currentSlice = replyString.slice(0, charIndex);

      setChats((prev) =>
        prev.map((c) => {
          if (c.id === currentSessionId) {
            const updated = [...c.messages];
            const lastIndex = updated.length - 1;
            if (lastIndex >= 0 && updated[lastIndex].role === "solon") {
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: currentSlice,
              };
            }
            return { ...c, messages: updated };
          }
          return c;
        })
      );

      scrollToBottom();

      if (charIndex >= replyString.length) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
        setIsResponding(false);
      }
    }, 18);
  };

  // Regenerate Response
  const handleRegenerate = () => {
    if (!activeChat || isResponding) return;
    const lastUserMsg = [...activeChat.messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      handleSend(lastUserMsg.content, true);
    }
  };

  const grouped = groupChats();

  return (
    <div className="flex h-screen w-screen bg-[#07140D] text-white font-sans overflow-hidden select-none">
      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR: 260px Fixed Left */}
      <aside
        className={`fixed md:relative top-0 bottom-0 left-0 z-50 w-[260px] flex-none bg-[#050F09] border-r border-[#046A38]/30 flex flex-col transition-transform duration-300 ease-in-out ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Top: Logo & Brand */}
        <div className="p-4 flex items-center justify-between border-b border-[#046A38]/20">
          <div className="flex items-center space-x-2.5">
            {/* Small square shield icon */}
            <div className="w-7 h-7 rounded bg-[#102B1B] border border-[#046A38] flex items-center justify-center text-[#046A38]">
              <svg
                className="w-4 h-4 text-emerald-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="font-bold tracking-widest text-lg text-white">SOLON</span>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden text-gray-400 hover:text-white p-1"
          >
            ✕
          </button>
        </div>

        {/* "+ New Chat" Button */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-[#046A38] hover:bg-[#058446] text-white font-medium text-sm py-2.5 px-4 rounded-lg shadow transition-all active:scale-[0.98]"
          >
            <span className="text-lg font-bold leading-none">+</span>
            <span>New Chat</span>
          </button>
        </div>

        {/* Chat History Grouped */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
          {["TODAY", "YESTERDAY", "THIS WEEK", "OLDER"].map((groupKey) => {
            const list = grouped[groupKey];
            if (!list || list.length === 0) return null;

            return (
              <div key={groupKey} className="space-y-1">
                <div className="px-3 text-[11px] font-semibold tracking-wider text-[#6B7280]">
                  {groupKey}
                </div>
                {list.map((c) => {
                  const isActive = c.id === activeChatId;
                  const isEditing = editingChatId === c.id;

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        if (!isEditing) {
                          setActiveChatId(c.id);
                          setMobileSidebarOpen(false);
                          setMenuOpenChatId(null);
                        }
                      }}
                      className={`group relative flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition-all ${
                        isActive
                          ? "bg-[#102B1B] text-white font-medium border-l-[3px] border-[#046A38]"
                          : "text-gray-300 hover:bg-[#091a10] hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Chat Icon */}
                        <svg
                          className={`w-4 h-4 flex-none ${
                            isActive ? "text-[#046A38]" : "text-[#6B7280]"
                          }`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>

                        {isEditing ? (
                          <input
                            autoFocus
                            type="text"
                            value={editChatName}
                            onChange={(e) => setEditChatName(e.target.value)}
                            onBlur={() => handleSaveRename(c.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename(c.id);
                              if (e.key === "Escape") setEditingChatId(null);
                            }}
                            className="w-full bg-[#07140D] border border-[#046A38] text-white text-xs px-2 py-0.5 rounded focus:outline-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="truncate text-[13px]">{c.name}</span>
                        )}
                      </div>

                      {/* Three-dot menu on hover */}
                      {!isEditing && (
                        <div className="relative flex-none">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenChatId(menuOpenChatId === c.id ? null : c.id);
                            }}
                            className={`p-1 rounded text-[#6B7280] hover:text-white transition-opacity ${
                              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            }`}
                            aria-label="Options"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="12" cy="5" r="2" />
                              <circle cx="12" cy="12" r="2" />
                              <circle cx="12" cy="19" r="2" />
                            </svg>
                          </button>

                          {menuOpenChatId === c.id && (
                            <div
                              className="absolute right-0 top-6 w-28 bg-[#091a10] border border-[#046A38]/50 rounded-lg shadow-xl py-1 z-30 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={(e) => handleStartRename(c, e)}
                                className="w-full text-left px-3 py-1.5 hover:bg-[#102B1B] text-gray-200 flex items-center gap-1.5"
                              >
                                ✏️ <span>Rename</span>
                              </button>
                              <button
                                onClick={(e) => handleDeleteChat(c.id, e)}
                                className="w-full text-left px-3 py-1.5 hover:bg-rose-950/60 text-red-400 flex items-center gap-1.5"
                              >
                                🗑️ <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Bottom: Settings Bar */}
        <div className="p-3 border-t border-[#046A38]/20 bg-[#050F09]">
          <button
            onClick={() => setSettingsModalOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#6B7280] hover:text-white hover:bg-[#102B1B] transition-colors text-sm"
          >
            {/* Gear Icon */}
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Settings</span>
          </button>
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#07140D] relative h-full">
        {/* HEADER: Fixed Top */}
        <header className="flex-none bg-[#07140D] border-b border-[#046A38]/30 px-4 md:px-6 py-3.5 z-20">
          <div className="flex items-center justify-between">
            {/* Left: SOLON & Subtitle */}
            <div className="flex items-center space-x-3 min-w-0">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden p-1 text-[#6B7280] hover:text-white"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>

              <div className="flex items-baseline space-x-2.5 min-w-0">
                <span className="font-bold text-lg md:text-xl text-white tracking-wider">SOLON</span>
                <span className="text-xs text-[#6B7280] hidden sm:inline">
                  AI Legal Assistant for Pakistan
                </span>
              </div>
            </div>

            {/* Middle: Current chat name in muted gray with arrow separator */}
            <div className="hidden lg:flex items-center text-xs text-[#6B7280] truncate max-w-sm px-4">
              <span>SOLON</span>
              <span className="mx-1.5">→</span>
              <span className="truncate">{activeChat?.name || "Legal Consultation"}</span>
            </div>

            {/* Right: Regenerate button + topic pill */}
            <div className="flex items-center space-x-3 flex-none">
              <button
                onClick={handleRegenerate}
                disabled={isResponding}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#046A38] hover:bg-[#058446] text-white text-xs font-medium transition-colors disabled:opacity-40"
              >
                {/* Circular arrow icon */}
                <svg
                  className={`w-3.5 h-3.5 ${isResponding ? "animate-spin" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>Regenerate</span>
              </button>

              {/* Green Pill Tag */}
              <div className="flex items-center space-x-1.5 text-xs bg-[#102B1B] border border-[#046A38] px-2.5 py-1 rounded-full text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-[11px] font-medium">Constitution & Statutes</span>
              </div>
            </div>
          </div>
        </header>

        {/* CHAT MESSAGES SCROLL AREA */}
        <main ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6 scroll-smooth">
          <div className="max-w-4xl mx-auto flex flex-col space-y-6 pb-28">
            {activeChat &&
              activeChat.messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                const fontClass = getFontSizeClass();

                if (isUser) {
                  return (
                    <div
                      key={idx}
                      className="flex flex-col items-end self-end max-w-[85%] md:max-w-[75%] space-y-1"
                    >
                      {/* Timestamp + YOU label above right aligned */}
                      <div className="flex items-center space-x-1.5 text-[11px] text-[#6B7280] pr-1">
                        <span>{msg.timestamp || "Now"}</span>
                        <span className="font-semibold text-gray-300">YOU</span>
                      </div>

                      {/* User Bubble: #1a3a24 */}
                      <div
                        className={`bg-[#1a3a24] text-white ${fontClass} rounded-2xl rounded-tr-sm px-5 py-3.5 shadow-sm whitespace-pre-wrap break-words`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={idx}
                      className="flex flex-col items-start self-start max-w-[85%] md:max-w-[75%] space-y-1"
                    >
                      {/* SOLON label + timestamp above */}
                      <div className="flex items-center space-x-1.5 text-[11px] text-[#6B7280] pl-1">
                        <span className="font-semibold text-emerald-400">SOLON</span>
                        <span>{msg.timestamp || "10:00 AM"}</span>
                      </div>

                      {/* Solon Bubble: #13271C left aligned, 2px left border #046A38 */}
                      <div
                        className={`bg-[#13271C] text-white font-normal ${fontClass} rounded-2xl rounded-tl-sm px-5 py-3.5 border-l-2 border-[#046A38] shadow-sm whitespace-pre-wrap break-words`}
                      >
                        {msg.content}
                      </div>

                      {/* "Regenerate response" small muted link below */}
                      {idx !== 0 && (
                        <button
                          onClick={handleRegenerate}
                          disabled={isResponding}
                          className="text-[11px] text-[#6B7280] hover:text-white pl-1 pt-0.5 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          Regenerate response
                        </button>
                      )}
                    </div>
                  );
                }
              })}

            {/* TYPING INDICATOR: Three dot bouncing animation in a Solon bubble while waiting */}
            {isResponding &&
              activeChat?.messages[activeChat.messages.length - 1]?.role !== "solon" && (
                <div className="flex flex-col items-start self-start max-w-[85%] md:max-w-[75%] space-y-1">
                  <div className="flex items-center space-x-1.5 text-[11px] text-[#6B7280] pl-1">
                    <span className="font-semibold text-emerald-400">SOLON</span>
                  </div>
                  <div className="bg-[#13271C] rounded-2xl rounded-tl-sm px-5 py-3.5 border-l-2 border-[#046A38] shadow-sm flex items-center space-x-1.5 h-[46px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"></span>
                  </div>
                </div>
              )}
          </div>
        </main>

        {/* INPUT BAR: Fixed Bottom */}
        <footer className="fixed bottom-0 right-0 left-0 md:left-[260px] bg-[#0B1A11] border-t border-[#046A38]/30 px-4 md:px-8 py-4 z-20">
          <div className="max-w-4xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="relative flex items-center"
            >
              <input
                type="text"
                maxLength={1000}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isResponding}
                placeholder="Ask about Pakistani law..."
                className="w-full bg-[#07140D] text-white text-sm md:text-base placeholder-[#6B7280] rounded-full pl-5 pr-28 py-3.5 border border-[#046A38]/50 focus:outline-none focus:border-[#046A38] focus:ring-1 focus:ring-[#046A38] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
              />

              {/* Character count & Green Circle Send Button */}
              <div className="absolute right-2.5 flex items-center space-x-3">
                <span className="text-[11px] font-mono text-[#6B7280] select-none">
                  {inputMessage.length} / 1000
                </span>

                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isResponding}
                  className="w-8 h-8 rounded-full bg-[#046A38] hover:bg-[#058446] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow"
                >
                  <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </footer>
      </div>

      {/* SETTINGS MODAL */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            className="bg-[#050F09] border border-[#046A38] w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#046A38]/30 pb-3">
              <h2 className="text-base font-semibold text-white">Settings</h2>
              <button
                onClick={() => setSettingsModalOpen(false)}
                className="text-[#6B7280] hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Font Size Toggle */}
            <div>
              <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">
                Font Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["small", "medium", "large"].map((size) => (
                  <button
                    key={size}
                    onClick={() => setSettings({ ...settings, fontSize: size })}
                    className={`py-2 text-xs font-medium rounded-lg capitalize border transition-all ${
                      settings.fontSize === size
                        ? "bg-[#046A38] border-[#046A38] text-white"
                        : "bg-[#102B1B] border-transparent text-gray-300 hover:bg-[#143521]"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear All Chats */}
            <div>
              <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">
                Data Management
              </label>
              {!confirmClearOpen ? (
                <button
                  onClick={() => setConfirmClearOpen(true)}
                  className="w-full py-2.5 px-4 rounded-lg bg-red-950/40 border border-red-700/50 text-red-300 hover:bg-red-900/60 transition-colors text-xs font-semibold"
                >
                  Clear All Chats
                </button>
              ) : (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-600 space-y-2">
                  <p className="text-xs text-red-200">
                    Are you sure? This will delete all chat history.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleClearAllChats}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-1.5 rounded"
                    >
                      Confirm Clear
                    </button>
                    <button
                      onClick={() => setConfirmClearOpen(false)}
                      className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs py-1.5 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* About Section */}
            <div className="border-t border-[#046A38]/30 pt-4">
              <p className="text-xs text-gray-300">Solon v1.0 — Built for Pakistani citizens.</p>
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSettingsModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-[#102B1B] hover:bg-[#143521] text-xs text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
