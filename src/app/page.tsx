"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlignLeft,
  ArrowUp,
  ArrowUpRight,
  AudioLines,
  Check,
  ChevronDown,
  Ellipsis,
  Github,
  Instagram,
  NotebookPen,
  Mail,
  Mic,
  Plus,
  PanelLeft,
  Timer,
  Trash2,
  X,
} from "lucide-react";

const MOBILE_BREAKPOINT = 750;
const NEWEST_MESSAGE_TOP_GAP = 10;
const CHAT_THREADS_STORAGE_KEY = "portfolio.chatThreads";
const ACTIVE_CHAT_STORAGE_KEY = "portfolio.activeChatId";
const RESPONSE_MODE_STORAGE_KEY = "portfolio.responseMode";
const DEFAULT_CHAT_TITLE = "Nov klepet";
const MESSAGE_SUGGESTIONS = [
  "Kakšen je moj pristop k arhitekturi skalabilnih Next.js aplikacij?",
  "Kako razmišljam o dolgoročni vzdrževanosti in čisti strukturi kode?",
  "Kako moje frontend odločitve vplivajo na poslovne rezultate in uporabniško izkušnjo?",
  "Kako pristopam k optimizaciji performance (SSR, SSG, ISR, code splitting)?",
  "Kako zagotavljam type-safety in stabilnost v večjih TypeScript projektih?",
  "Kako vodim ali izboljšujem tehnične standarde znotraj ekipe?",
  "Kako pristopam k razvoju produkta od ideje do produkcije?",
  "Kako razmišljam o skaliranju aplikacije, ko število uporabnikov raste?",
  "Kako sodelujem z backend, produktno in dizajn ekipo pri kompleksnih projektih?",
  "Zakaj sem primeren kandidat za junior frontend pozicijo?",
];
type LanguageCode = "SLO" | "ENG";
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isTranscribed?: boolean;
};
type SidebarItem = {
  label: string;
  Icon?: typeof Github;
  iconSrc?: string;
  href?: string;
};
type SidebarSection = {
  heading?: string;
  items: SidebarItem[];
};
type ResponseMode = "Instant" | "Thinking";
type ChatThread = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};
type MainView = "chat" | "contact";

const sidebarSections: SidebarSection[] = [
  {
    items: [{ label: "Nov klepet", Icon: NotebookPen }],
  },
  {
    heading: "Socialna omrežja",
    items: [
      { label: "GitHub", Icon: Github, href: "https://github.com/Luc069" },
      { label: "Instagram", Icon: Instagram, href: "https://www.instagram.com/luci_horvat/" },
      { label: "TrendHoppers", iconSrc: "/x-logo.svg", href: "https://x.com/trendhoppers_io" },
    ],
  },
];

export default function Home() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = useState(true);
  const [isInstantMenuOpen, setIsInstantMenuOpen] = useState(false);
  const [responseMode, setResponseMode] = useState<ResponseMode>("Thinking");
  const [isTopMenuOpen, setIsTopMenuOpen] = useState(false);
  const [language] = useState<LanguageCode>("SLO");
  const [inputValue, setInputValue] = useState("");
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<MainView>("chat");
  const [threadTitleDisplay, setThreadTitleDisplay] = useState<Record<string, string>>({});
  const [pendingDeleteChatId, setPendingDeleteChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isNavbarScrolled, setIsNavbarScrolled] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRequestingMicPermission, setIsRequestingMicPermission] = useState(false);
  const [isEndingTranscription, setIsEndingTranscription] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [isRequestingDictatePermission, setIsRequestingDictatePermission] = useState(false);
  const [isEndingDictation, setIsEndingDictation] = useState(false);
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [isContactSubmitted, setIsContactSubmitted] = useState(false);
  const [isDesktopContactModalOpen, setIsDesktopContactModalOpen] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [typingResponse, setTypingResponse] = useState("");
  const responseModeLabel = responseMode === "Instant" ? "Takojšen" : "Razmišljanje";
  const instantMenuRef = useRef<HTMLDivElement>(null);
  const topMenuRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatHeaderRef = useRef<HTMLElement>(null);
  const latestMessageRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const typingResponseRef = useRef("");
  const assistantOutputTokenRef = useRef(0);
  const isAssistantSpeakingRef = useRef(false);
  const chatAbortRef = useRef<AbortController | null>(null);
  const activeChatRequestIdRef = useRef(0);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasCancelledMicRequestRef = useRef(false);
  const hasCancelledDictateRequestRef = useRef(false);
  const keepTranscribingRef = useRef(false);
  const keepDictatingRef = useRef(false);
  const segmentStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioDataRef = useRef<Uint8Array | null>(null);
  const micRafRef = useRef<number | null>(null);
  const shouldPlayStopPopRef = useRef(false);
  const transcriptionSessionIdRef = useRef(0);
  const dictationSessionIdRef = useRef(0);
  const shouldCommitDictationRef = useRef(false);
  const titleTypingIntervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const isAssistantOutputRunning = isAiThinking || Boolean(typingResponse);
  const inferChatThemeTitle = (inputMessages: ChatMessage[]): string | null => {
    const userMessages = inputMessages
      .filter((message) => message.role === "user")
      .map((message) => message.content.toLowerCase().trim())
      .filter(Boolean);

    if (!userMessages.length) {
      return null;
    }

    const greetings = [
      "hej",
      "živjo",
      "zdravo",
      "hello",
      "hi",
      "yo",
      "oj",
      "hey",
    ];
    const lastUserMessage = userMessages[userMessages.length - 1];
    const normalizedLast = lastUserMessage.replace(/[!?.,]/g, "").trim();
    if (
      normalizedLast &&
      normalizedLast.split(/\s+/).length <= 3 &&
      greetings.includes(normalizedLast)
    ) {
      return null;
    }

    const fullText = userMessages.join(" ");
    const topicMap: Array<{ keywords: string[]; title: string }> = [
      { keywords: ["nextjs", "next.js", "ssr", "ssg", "isr"], title: "Next.js arhitektura" },
      { keywords: ["typescript", "tipizacija", "type-safety"], title: "TypeScript pristop" },
      { keywords: ["performance", "optimizacija", "hitrost"], title: "Optimizacija aplikacije" },
      { keywords: ["arhitektura", "skalabilnost", "vzdrževanost"], title: "Arhitektura in skaliranje" },
      { keywords: ["react native", "mobiln", "ios", "android"], title: "Mobilni razvoj" },
      { keywords: ["ai", "umetna inteligenca", "llm"], title: "AI integracija" },
      { keywords: ["razgovor", "intervju", "zaposlitev"], title: "Priprava na razgovor" },
      { keywords: ["portfolio", "predstavitev", "profil"], title: "Portfolio strategija" },
      {
        keywords: ["specializiran", "specializacija", "v cemu", "v čemu", "kompetence"],
        title: "Moja specializacija",
      },
    ];

    const matched = topicMap.find(({ keywords }) =>
      keywords.some((keyword) => fullText.includes(keyword)),
    );
    if (matched) {
      return matched.title;
    }

    if (normalizedLast.length < 12) {
      return null;
    }

    const words = normalizedLast
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 6)
      .join(" ");
    if (!words) {
      return null;
    }
    const sentenceTitle = words.charAt(0).toUpperCase() + words.slice(1);
    return sentenceTitle.length > 44 ? `${sentenceTitle.slice(0, 44).trim()}...` : sentenceTitle;
  };

  const openFreshChat = () => {
    if (chatAbortRef.current) {
      chatAbortRef.current.abort();
      chatAbortRef.current = null;
    }
    activeChatRequestIdRef.current += 1;
    setIsAiThinking(false);
    if (typingResponseRef.current || isAssistantSpeakingRef.current) {
      interruptAssistantOutput();
    } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setActiveChatId(null);
    setActiveView("chat");
    setIsDesktopContactModalOpen(false);
    setMessages([]);
    setInputValue("");
    setIsAboutExpanded(false);
  };

  const handleDeleteThread = (threadId: string) => {
    clearTitleTyping(threadId);
    setThreadTitleDisplay((previous) => {
      const next = { ...previous };
      delete next[threadId];
      return next;
    });
    setChatThreads((previous) => previous.filter((thread) => thread.id !== threadId));
    if (activeChatId === threadId) {
      openFreshChat();
    }
  };

  const openContactView = () => {
    if (typeof window !== "undefined" && window.innerWidth > MOBILE_BREAKPOINT) {
      setIsDesktopContactModalOpen(true);
      setActiveView("chat");
      return;
    }
    setActiveView("contact");
    setIsDesktopContactModalOpen(false);
    setIsMobileSidebarOpen(false);
    setIsTopMenuOpen(false);
  };

  const handleContactSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactName.trim(),
          email: contactEmail.trim(),
          subject: contactSubject.trim(),
          message: contactMessage.trim(),
        }),
      });
    } catch {
    }
    setIsContactSubmitted(true);
    setContactName("");
    setContactEmail("");
    setContactSubject("");
    setContactMessage("");
  };

  const clearTitleTyping = (threadId?: string) => {
    if (threadId) {
      const active = titleTypingIntervalsRef.current[threadId];
      if (active) {
        clearInterval(active);
        delete titleTypingIntervalsRef.current[threadId];
      }
      return;
    }
    Object.values(titleTypingIntervalsRef.current).forEach((intervalId) => {
      clearInterval(intervalId);
    });
    titleTypingIntervalsRef.current = {};
  };

  const startThreadTitleTyping = (threadId: string, finalTitle: string) => {
    clearTitleTyping(threadId);
    let charIndex = 0;
    setThreadTitleDisplay((previous) => ({ ...previous, [threadId]: "" }));
    titleTypingIntervalsRef.current[threadId] = setInterval(() => {
      charIndex += 1;
      const partial = finalTitle.slice(0, charIndex);
      setThreadTitleDisplay((previous) => ({ ...previous, [threadId]: partial }));
      if (charIndex >= finalTitle.length) {
        clearTitleTyping(threadId);
      }
    }, 45);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && window.innerWidth <= MOBILE_BREAKPOINT) {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > MOBILE_BREAKPOINT) {
        setIsMobileSidebarOpen(false);
      } else {
        setIsDesktopContactModalOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (instantMenuRef.current && !instantMenuRef.current.contains(event.target as Node)) {
        setIsInstantMenuOpen(false);
      }
      if (topMenuRef.current && !topMenuRef.current.contains(event.target as Node)) {
        setIsTopMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container) {
      return;
    }

    const updateNavbarBorder = () => {
      setIsNavbarScrolled(container.scrollTop > 0);
    };

    updateNavbarBorder();
    container.addEventListener("scroll", updateNavbarBorder);
    window.addEventListener("resize", updateNavbarBorder);

    return () => {
      container.removeEventListener("scroll", updateNavbarBorder);
      window.removeEventListener("resize", updateNavbarBorder);
    };
  }, []);

  useEffect(() => {
    if (messages.length < 2) {
      return;
    }

    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || latestMessage.role !== "user") {
      return;
    }

    const container = chatScrollRef.current;
    const header = chatHeaderRef.current;
    const latestMessageElement = latestMessageRef.current;
    if (!container || !latestMessageElement) {
      return;
    }

    const headerHeight = header?.offsetHeight ?? 56;
    const targetTop = Math.max(
      0,
      latestMessageElement.offsetTop - headerHeight - NEWEST_MESSAGE_TOP_GAP,
    );
    container.scrollTo({
      top: targetTop,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedResponseMode = window.localStorage.getItem(RESPONSE_MODE_STORAGE_KEY);
    if (storedResponseMode === "Instant" || storedResponseMode === "Thinking") {
      setResponseMode(storedResponseMode);
    }

    const rawThreads = window.localStorage.getItem(CHAT_THREADS_STORAGE_KEY);
    if (!rawThreads) {
      return;
    }

    try {
      const parsed = JSON.parse(rawThreads) as unknown;
      if (!Array.isArray(parsed)) {
        return;
      }

      const validThreads = parsed
        .filter((thread) => {
          if (!thread || typeof thread !== "object") {
            return false;
          }
          const candidate = thread as Partial<ChatThread>;
          return (
            typeof candidate.id === "string" &&
            typeof candidate.title === "string" &&
            Array.isArray(candidate.messages) &&
            typeof candidate.createdAt === "number" &&
            typeof candidate.updatedAt === "number"
          );
        })
        .map((thread) => thread as ChatThread)
        .sort((a, b) => b.updatedAt - a.updatedAt);

      setChatThreads(validThreads);

      const storedActiveId = window.localStorage.getItem(ACTIVE_CHAT_STORAGE_KEY);
      if (!storedActiveId) {
        return;
      }
      const existing = validThreads.find((thread) => thread.id === storedActiveId);
      if (!existing) {
        return;
      }
      setActiveChatId(existing.id);
      setMessages(existing.messages);
    } catch {
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(RESPONSE_MODE_STORAGE_KEY, responseMode);
  }, [responseMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(CHAT_THREADS_STORAGE_KEY, JSON.stringify(chatThreads));
  }, [chatThreads]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!activeChatId) {
      window.localStorage.removeItem(ACTIVE_CHAT_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, activeChatId);
  }, [activeChatId]);

  useEffect(() => {
    if (!activeChatId) {
      return;
    }
    setChatThreads((previous) => {
      let changed = false;
      const next = previous.map((thread) => {
        if (thread.id !== activeChatId) {
          return thread;
        }
        changed = true;
        return {
          ...thread,
          messages,
          updatedAt: Date.now(),
        };
      });
      return changed ? next : previous;
    });
  }, [messages, activeChatId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    typingResponseRef.current = typingResponse;
  }, [typingResponse]);

  useEffect(() => {
    return () => {
      clearTitleTyping();
      assistantOutputTokenRef.current += 1;
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (chatAbortRef.current) {
        chatAbortRef.current.abort();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (segmentStopTimeoutRef.current) {
        clearTimeout(segmentStopTimeoutRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (micRafRef.current !== null) {
        cancelAnimationFrame(micRafRef.current);
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, []);

  const clearTypingTimer = () => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
  };

  const setTypingResponseValue = (value: string) => {
    typingResponseRef.current = value;
    setTypingResponse(value);
  };

  const formatAssistantContent = (value: string) =>
    value
      .replace(/\s-\s/g, "\n- ")
      .replace(/:\s*\n- /g, ":\n- ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  const renderAssistantContent = (value: string): ReactNode[] => {
    const lines = value.split("\n");
    const rendered: ReactNode[] = [];

    lines.forEach((line, lineIndex) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      parts.forEach((part, partIndex) => {
        const isBold = /^\*\*[^*]+\*\*$/.test(part);
        if (isBold) {
          rendered.push(
            <strong key={`line-${lineIndex}-part-${partIndex}`} className="font-semibold text-white">
              {part.slice(2, -2)}
            </strong>,
          );
          return;
        }
        if (part) {
          rendered.push(
            <span key={`line-${lineIndex}-part-${partIndex}`}>{part}</span>,
          );
        }
      });
      if (lineIndex < lines.length - 1) {
        rendered.push(<br key={`line-break-${lineIndex}`} />);
      }
    });

    return rendered;
  };

  const stopMicLevelMonitoring = () => {
    if (micRafRef.current !== null) {
      cancelAnimationFrame(micRafRef.current);
      micRafRef.current = null;
    }
    analyserRef.current = null;
    audioDataRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setMicLevel(0);
  };

  const startMicLevelMonitoring = (stream: MediaStream) => {
    stopMicLevelMonitoring();
    if (typeof window === "undefined") {
      return;
    }

    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }

    const context = new AudioContextCtor();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.85;
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    audioContextRef.current = context;
    analyserRef.current = analyser;
    audioDataRef.current = dataArray;

    const tick = () => {
      const activeAnalyser = analyserRef.current;
      const activeData = audioDataRef.current;
      if (!activeAnalyser || !activeData) {
        return;
      }
      activeAnalyser.getByteTimeDomainData(activeData);
      let sum = 0;
      for (let i = 0; i < activeData.length; i += 1) {
        const normalized = (activeData[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / activeData.length);
      const nextLevel = Math.min(1, rms * 6);
      setMicLevel((previous) => previous * 0.65 + nextLevel * 0.35);
      micRafRef.current = requestAnimationFrame(tick);
    };

    micRafRef.current = requestAnimationFrame(tick);
  };

  const playStopPop = () => {
    if (typeof window === "undefined") {
      return;
    }
    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(420, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(210, context.currentTime + 0.06);
    gainNode.gain.setValueAtTime(0.0001, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.09);
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.09);
    oscillator.onended = () => {
      void context.close();
    };
  };

  const appendAssistantMessage = (content: string) => {
    const trimmed = content.trimEnd();
    if (!trimmed) {
      return;
    }
    const nextMessages = [
      ...messagesRef.current,
      {
        id: `assistant-${Date.now()}-${messagesRef.current.length}`,
        role: "assistant" as const,
        content: trimmed,
      },
    ];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
  };

  const interruptAssistantOutput = () => {
    const partial = typingResponseRef.current;
    assistantOutputTokenRef.current += 1;
    clearTypingTimer();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    isAssistantSpeakingRef.current = false;
    if (partial) {
      appendAssistantMessage(partial);
    }
    setTypingResponseValue("");
  };

  const startAssistantTyping = (
    assistantResponse: string,
    options?: { narrateAssistant?: boolean },
  ) => {
    const token = assistantOutputTokenRef.current + 1;
    assistantOutputTokenRef.current = token;
    clearTypingTimer();
    setTypingResponseValue("");
    isAssistantSpeakingRef.current = false;

    const finishResponse = () => {
      if (assistantOutputTokenRef.current !== token) {
        return;
      }
      clearTypingTimer();
      isAssistantSpeakingRef.current = false;
      appendAssistantMessage(assistantResponse);
      setTypingResponseValue("");
    };

    if (
      options?.narrateAssistant &&
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(assistantResponse);
      utterance.lang = language === "SLO" ? "sl-SI" : "en-US";
      isAssistantSpeakingRef.current = true;

      utterance.onboundary = (event: SpeechSynthesisEvent) => {
        if (assistantOutputTokenRef.current !== token) {
          return;
        }
        const boundaryIndex = Math.max(1, event.charIndex + 1);
        const partial = assistantResponse.slice(
          0,
          Math.min(boundaryIndex, assistantResponse.length),
        );
        setTypingResponseValue(partial);
      };

      utterance.onend = () => {
        finishResponse();
      };

      utterance.onerror = () => {
        finishResponse();
      };

      window.speechSynthesis.speak(utterance);
      return;
    }

    let charIndex = 0;
    typingIntervalRef.current = setInterval(() => {
      if (assistantOutputTokenRef.current !== token) {
        clearTypingTimer();
        return;
      }
      charIndex += 1;
      const partial = assistantResponse.slice(0, charIndex);
      setTypingResponseValue(partial);

      if (charIndex >= assistantResponse.length) {
        finishResponse();
      }
    }, 28);
  };

  const handleSendMessage = async (
    overrideContent?: string,
    options?: { narrateAssistant?: boolean; isTranscribed?: boolean },
  ) => {
    const trimmedValue = (overrideContent ?? inputValue).trim();
    if (!trimmedValue) {
      return;
    }

    if (typingResponseRef.current || isAssistantSpeakingRef.current) {
      interruptAssistantOutput();
    }
    setActiveView("chat");
    if (chatAbortRef.current) {
      chatAbortRef.current.abort();
      chatAbortRef.current = null;
    }

    let targetChatId = activeChatId;
    let createdNewThread = false;
    if (!targetChatId) {
      const now = Date.now();
      targetChatId = `chat-${now}`;
      createdNewThread = true;
      const newThread: ChatThread = {
        id: targetChatId,
        title: DEFAULT_CHAT_TITLE,
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
      setChatThreads((previous) => [newThread, ...previous]);
      setActiveChatId(targetChatId);
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}-${messagesRef.current.length}`,
      role: "user",
      content: trimmedValue,
      isTranscribed: !!options?.isTranscribed,
    };
    const nextMessages = [...messagesRef.current, userMessage];
    const inferredTitle = inferChatThemeTitle(nextMessages);
    const existingThreadTitle = targetChatId
      ? chatThreads.find((thread) => thread.id === targetChatId)?.title
      : undefined;
    const shouldAnimateThreadTitle = Boolean(
      targetChatId &&
      inferredTitle &&
      (createdNewThread || existingThreadTitle === DEFAULT_CHAT_TITLE),
    );

    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    if (targetChatId) {
      setChatThreads((previous) =>
        previous.map((thread) => {
          if (thread.id !== targetChatId) {
            return thread;
          }
          if (thread.title !== DEFAULT_CHAT_TITLE || !inferredTitle) {
            return thread;
          }
          return {
            ...thread,
            title: inferredTitle,
          };
        }),
      );
      if (shouldAnimateThreadTitle && inferredTitle) {
        startThreadTitleTyping(targetChatId, inferredTitle);
      }
    }
    setInputValue("");
    setIsAiThinking(true);
    const controller = new AbortController();
    chatAbortRef.current = controller;
    const requestId = activeChatRequestIdRef.current + 1;
    activeChatRequestIdRef.current = requestId;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      if (requestId !== activeChatRequestIdRef.current) {
        return;
      }
      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok || !payload.message?.trim()) {
        throw new Error(payload.error || "Chat response failed.");
      }

      if (requestId !== activeChatRequestIdRef.current) {
        return;
      }
      const assistantMessage = formatAssistantContent(payload.message.trim());
      startAssistantTyping(assistantMessage, {
        narrateAssistant: !!options?.narrateAssistant,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      if (requestId !== activeChatRequestIdRef.current) {
        return;
      }
      setMessages((previous) => [
        ...previous,
        {
          id: `assistant-error-${Date.now()}-${previous.length}`,
          role: "assistant",
          content: "Napaka pri odgovoru.",
        },
      ]);
    } finally {
      if (requestId === activeChatRequestIdRef.current) {
        setIsAiThinking(false);
        if (chatAbortRef.current === controller) {
          chatAbortRef.current = null;
        }
      }
    }
  };

  const startTranscription = async () => {
    if (isAiThinking) {
      return;
    }
    if (isDictating || isRequestingDictatePermission || isEndingDictation) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessages((previous) => [
        ...previous,
        {
          id: `assistant-error-${Date.now()}-${previous.length}`,
          role: "assistant",
          content: "Snemanje mikrofona ni podprto v tem brskalniku.",
        },
      ]);
      return;
    }

    hasCancelledMicRequestRef.current = false;
    setIsEndingTranscription(false);
    setIsRequestingMicPermission(true);
    const sessionId = transcriptionSessionIdRef.current + 1;
    transcriptionSessionIdRef.current = sessionId;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (hasCancelledMicRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        setIsRequestingMicPermission(false);
        return;
      }
      mediaStreamRef.current = stream;
      keepTranscribingRef.current = true;
      startMicLevelMonitoring(stream);

      const mimeTypeCandidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ];
      const mimeType = mimeTypeCandidates.find((candidate) =>
        MediaRecorder.isTypeSupported(candidate),
      );
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        keepTranscribingRef.current = false;
        shouldPlayStopPopRef.current = false;
        setIsEndingTranscription(false);
        setIsListening(false);
        setIsRequestingMicPermission(false);
        setMessages((previous) => [
          ...previous,
          {
            id: `assistant-error-${Date.now()}-${previous.length}`,
            role: "assistant",
            content: "Napaka pri mikrofonu.",
          },
        ]);
      };

      recorder.onstop = async () => {
        const activeStream = mediaStreamRef.current;

        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        audioChunksRef.current = [];

        const hasLiveTrack =
          !!activeStream &&
          activeStream.active &&
          activeStream.getAudioTracks().some((track) => track.readyState === "live");

        if (!audioBlob.size || !activeStream || !hasLiveTrack) {
          mediaRecorderRef.current = null;
          shouldPlayStopPopRef.current = false;
          setIsEndingTranscription(false);
          setIsListening(false);
          setIsRequestingMicPermission(false);
          stopMicLevelMonitoring();
          return;
        }

        const extension = recorder.mimeType.includes("mp4") ? "mp4" : "webm";
        const formData = new FormData();
        formData.append("file", audioBlob, `recording.${extension}`);
        formData.append("language", language === "SLO" ? "sl" : "en");
        const canProcessTranscript =
          keepTranscribingRef.current && sessionId === transcriptionSessionIdRef.current;

        try {
          if (canProcessTranscript) {
            const response = await fetch("/api/transcribe", {
              method: "POST",
              body: formData,
            });
            const payload = (await response.json()) as { text?: string; error?: string };
            const transcript = payload.text?.trim() ?? "";
            if (!response.ok) {
              throw new Error(payload.error || "Transcription failed.");
            }
            if (
              transcript &&
              keepTranscribingRef.current &&
              sessionId === transcriptionSessionIdRef.current
            ) {
              setInputValue(transcript);
              void handleSendMessage(transcript, {
                narrateAssistant: true,
                isTranscribed: true,
              });
            }
          }
        } catch {
          if (canProcessTranscript) {
            setMessages((previous) => [
              ...previous,
              {
                id: `assistant-error-${Date.now()}-${previous.length}`,
                role: "assistant",
                content: "Napaka pri prepisu zvoka.",
              },
            ]);
          }
        }

        if (!keepTranscribingRef.current) {
          activeStream.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
          mediaRecorderRef.current = null;
          setIsEndingTranscription(false);
          setIsListening(false);
          setIsRequestingMicPermission(false);
          stopMicLevelMonitoring();
          if (shouldPlayStopPopRef.current) {
            playStopPop();
            shouldPlayStopPopRef.current = false;
          }
          return;
        }

        const nextRecorder = mimeType
          ? new MediaRecorder(activeStream, { mimeType })
          : new MediaRecorder(activeStream);
        mediaRecorderRef.current = nextRecorder;
        audioChunksRef.current = [];
        nextRecorder.ondataavailable = recorder.ondataavailable;
        nextRecorder.onerror = recorder.onerror;
        nextRecorder.onstop = recorder.onstop;
        try {
          nextRecorder.start(250);
          segmentStopTimeoutRef.current = setTimeout(() => {
            if (nextRecorder.state === "recording") {
              nextRecorder.stop();
            }
          }, 3000);
        } catch {
          keepTranscribingRef.current = false;
          shouldPlayStopPopRef.current = false;
          activeStream.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
          mediaRecorderRef.current = null;
          setIsEndingTranscription(false);
          setIsListening(false);
          setIsRequestingMicPermission(false);
          stopMicLevelMonitoring();
        }
      };

      try {
        recorder.start(250);
      } catch {
        keepTranscribingRef.current = false;
        shouldPlayStopPopRef.current = false;
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        setIsEndingTranscription(false);
        setIsListening(false);
        setIsRequestingMicPermission(false);
        stopMicLevelMonitoring();
        setMessages((previous) => [
          ...previous,
          {
            id: `assistant-error-${Date.now()}-${previous.length}`,
            role: "assistant",
            content: "Mikrofon trenutno ni aktiven.",
          },
        ]);
        return;
      }
      setIsRequestingMicPermission(false);
      setIsListening(true);
      segmentStopTimeoutRef.current = setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, 3000);
    } catch {
      keepTranscribingRef.current = false;
      shouldPlayStopPopRef.current = false;
      setIsEndingTranscription(false);
      setIsRequestingMicPermission(false);
      stopMicLevelMonitoring();
      if (hasCancelledMicRequestRef.current) {
        return;
      }
      setMessages((previous) => [
        ...previous,
        {
          id: `assistant-error-${Date.now()}-${previous.length}`,
          role: "assistant",
          content: "Dostop do mikrofona ni dovoljen.",
        },
      ]);
    }
  };

  const stopTranscription = () => {
    transcriptionSessionIdRef.current += 1;
    shouldPlayStopPopRef.current = true;
    setIsEndingTranscription(true);
    if (typingResponseRef.current || isAssistantSpeakingRef.current) {
      interruptAssistantOutput();
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (chatAbortRef.current) {
      chatAbortRef.current.abort();
      chatAbortRef.current = null;
    }
    activeChatRequestIdRef.current += 1;
    setIsAiThinking(false);
    keepTranscribingRef.current = false;
    if (segmentStopTimeoutRef.current) {
      clearTimeout(segmentStopTimeoutRef.current);
      segmentStopTimeoutRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    } else if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      setIsEndingTranscription(false);
      setIsListening(false);
      setIsRequestingMicPermission(false);
      stopMicLevelMonitoring();
      if (shouldPlayStopPopRef.current) {
        playStopPop();
        shouldPlayStopPopRef.current = false;
      }
    } else {
      setIsEndingTranscription(false);
      setIsListening(false);
      setIsRequestingMicPermission(false);
      stopMicLevelMonitoring();
      if (shouldPlayStopPopRef.current) {
        playStopPop();
        shouldPlayStopPopRef.current = false;
      }
    }
  };

  const startDictation = async () => {
    if (isAiThinking) {
      return;
    }
    if (isListening || isRequestingMicPermission || isEndingTranscription) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessages((previous) => [
        ...previous,
        {
          id: `assistant-error-${Date.now()}-${previous.length}`,
          role: "assistant",
          content: "Snemanje mikrofona ni podprto v tem brskalniku.",
        },
      ]);
      return;
    }

    hasCancelledDictateRequestRef.current = false;
    shouldCommitDictationRef.current = false;
    setIsEndingDictation(false);
    setIsRequestingDictatePermission(true);
    const sessionId = dictationSessionIdRef.current + 1;
    dictationSessionIdRef.current = sessionId;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (hasCancelledDictateRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        setIsRequestingDictatePermission(false);
        return;
      }

      mediaStreamRef.current = stream;
      keepDictatingRef.current = true;
      startMicLevelMonitoring(stream);

      const mimeTypeCandidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ];
      const mimeType = mimeTypeCandidates.find((candidate) =>
        MediaRecorder.isTypeSupported(candidate),
      );
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        keepDictatingRef.current = false;
        shouldCommitDictationRef.current = false;
        setIsEndingDictation(false);
        setIsDictating(false);
        setIsRequestingDictatePermission(false);
        setMessages((previous) => [
          ...previous,
          {
            id: `assistant-error-${Date.now()}-${previous.length}`,
            role: "assistant",
            content: "Napaka pri mikrofonu.",
          },
        ]);
      };

      recorder.onstop = async () => {
        if (segmentStopTimeoutRef.current) {
          clearTimeout(segmentStopTimeoutRef.current);
          segmentStopTimeoutRef.current = null;
        }
        const activeStream = mediaStreamRef.current;

        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        audioChunksRef.current = [];

        if (!audioBlob.size || !activeStream) {
          mediaRecorderRef.current = null;
          shouldCommitDictationRef.current = false;
          setIsEndingDictation(false);
          setIsDictating(false);
          setIsRequestingDictatePermission(false);
          stopMicLevelMonitoring();
          return;
        }

        const extension = recorder.mimeType.includes("mp4") ? "mp4" : "webm";
        const formData = new FormData();
        formData.append("file", audioBlob, `recording.${extension}`);
        formData.append("language", language === "SLO" ? "sl" : "en");
        const canProcessTranscript =
          sessionId === dictationSessionIdRef.current &&
          (keepDictatingRef.current || shouldCommitDictationRef.current);

        try {
          if (canProcessTranscript) {
            const response = await fetch("/api/transcribe", {
              method: "POST",
              body: formData,
            });
            const payload = (await response.json()) as { text?: string; error?: string };
            const transcript = payload.text?.trim() ?? "";
            if (!response.ok) {
              throw new Error(payload.error || "Transcription failed.");
            }
            if (
              transcript &&
              (keepDictatingRef.current || shouldCommitDictationRef.current) &&
              sessionId === dictationSessionIdRef.current
            ) {
              setInputValue((previous) =>
                previous.trim() ? `${previous.trim()} ${transcript}` : transcript,
              );
            }
          }
        } catch {
          if (canProcessTranscript) {
            setMessages((previous) => [
              ...previous,
              {
                id: `assistant-error-${Date.now()}-${previous.length}`,
                role: "assistant",
                content: "Napaka pri prepisu zvoka.",
              },
            ]);
          }
        }
        activeStream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        shouldCommitDictationRef.current = false;
        setIsEndingDictation(false);
        setIsDictating(false);
        setIsRequestingDictatePermission(false);
        stopMicLevelMonitoring();
      };

      try {
        recorder.start(250);
      } catch {
        keepDictatingRef.current = false;
        shouldCommitDictationRef.current = false;
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        setIsEndingDictation(false);
        setIsDictating(false);
        setIsRequestingDictatePermission(false);
        stopMicLevelMonitoring();
        setMessages((previous) => [
          ...previous,
          {
            id: `assistant-error-${Date.now()}-${previous.length}`,
            role: "assistant",
            content: "Mikrofon trenutno ni aktiven.",
          },
        ]);
        return;
      }

      setIsRequestingDictatePermission(false);
      setIsDictating(true);
    } catch {
      keepDictatingRef.current = false;
      shouldCommitDictationRef.current = false;
      setIsEndingDictation(false);
      setIsRequestingDictatePermission(false);
      stopMicLevelMonitoring();
      if (hasCancelledDictateRequestRef.current) {
        return;
      }
      setMessages((previous) => [
        ...previous,
        {
          id: `assistant-error-${Date.now()}-${previous.length}`,
          role: "assistant",
          content: "Dostop do mikrofona ni dovoljen.",
        },
      ]);
    }
  };

  const stopDictation = (commitTranscript: boolean) => {
    if (!commitTranscript) {
      dictationSessionIdRef.current += 1;
    }
    shouldCommitDictationRef.current = commitTranscript;
    setIsEndingDictation(true);
    keepDictatingRef.current = false;
    if (segmentStopTimeoutRef.current) {
      clearTimeout(segmentStopTimeoutRef.current);
      segmentStopTimeoutRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      try {
        mediaRecorderRef.current.requestData();
      } catch {
      }
      mediaRecorderRef.current.stop();
    } else if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      shouldCommitDictationRef.current = false;
      setIsEndingDictation(false);
      setIsDictating(false);
      setIsRequestingDictatePermission(false);
      stopMicLevelMonitoring();
    } else {
      shouldCommitDictationRef.current = false;
      setIsEndingDictation(false);
      setIsDictating(false);
      setIsRequestingDictatePermission(false);
      stopMicLevelMonitoring();
    }
  };

  const cancelDictatePermissionRequest = () => {
    hasCancelledDictateRequestRef.current = true;
    keepDictatingRef.current = false;
    shouldCommitDictationRef.current = false;
    setIsRequestingDictatePermission(false);
  };

  const cancelMicPermissionRequest = () => {
    hasCancelledMicRequestRef.current = true;
    keepTranscribingRef.current = false;
    setIsRequestingMicPermission(false);
  };

  return (
    <>
      <div className="h-screen overflow-hidden bg-[#212121] min-[751px]:flex">
        {isMobileSidebarOpen && (
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-label="Close sidebar backdrop"
            className="fixed inset-0 z-30 bg-black/40 min-[751px]:hidden"
          />
        )}

        <aside
          id="app-sidebar"
          onClickCapture={() => {
            if (isDesktopContactModalOpen) {
              setIsDesktopContactModalOpen(false);
            }
          }}
          className={`fixed left-0 top-0 z-40 h-screen w-[260px] overflow-hidden border-r border-border bg-[#181818] transition-transform duration-300 ease-in-out will-change-transform min-[751px]:static min-[751px]:translate-x-0 min-[751px]:shrink-0 min-[751px]:transition-[width,background-color] ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
            } ${isDesktopSidebarExpanded
              ? "min-[751px]:w-[260px] min-[751px]:bg-[#181818]"
              : "min-[751px]:w-[52px] min-[751px]:bg-[#212121]"
            }`}
        >
          <span
            className={`absolute left-[10px] top-3 flex h-8 w-8 items-center justify-center text-lg font-semibold leading-none text-white ${isDesktopSidebarExpanded ? "" : "min-[751px]:hidden"
              }`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[11px] font-bold text-black">
              LH
            </span>
          </span>
          <button
            type="button"
            onClick={() => setIsDesktopSidebarExpanded(true)}
            aria-label="Expand sidebar"
            className={`group absolute left-[10px] top-3 hidden h-8 w-8 cursor-pointer items-center justify-center rounded-md min-[751px]:flex ${isDesktopSidebarExpanded ? "min-[751px]:hidden" : ""
              }`}
          >
            <span className="transition-opacity duration-200 group-hover:opacity-0">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[11px] font-bold text-black">
                LH
              </span>
            </span>
            <PanelLeft
              size={18}
              className="absolute text-[#afafaf] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            />
          </button>
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-label="Close sidebar"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center text-white min-[751px]:hidden"
          >
            <X size={20} />
          </button>
          <button
            type="button"
            onClick={() => setIsDesktopSidebarExpanded((previous) => !previous)}
            aria-label={isDesktopSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-controls="app-sidebar"
            aria-expanded={isDesktopSidebarExpanded}
            className={`absolute right-[10px] top-3 hidden h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[#afafaf] ${isDesktopSidebarExpanded ? "min-[751px]:flex" : "min-[751px]:hidden"
              }`}
          >
            <PanelLeft size={18} />
          </button>
          <div className="absolute inset-x-0 top-16 bottom-16 overflow-y-auto px-[10px]">
            <div
              className={`mb-3 rounded-xl border border-border bg-[#202020] p-2 ${isDesktopSidebarExpanded ? "" : "min-[751px]:hidden"
                }`}
            >
              <div className="relative mb-2 h-[134px] w-full overflow-hidden rounded-lg">
                <Image
                  src="/profile-sidebar-v2.png"
                  alt="Lucian Horvat"
                  fill
                  sizes="224px"
                  className="object-cover"
                  priority
                />
              </div>
              <p className="px-1 text-sm font-semibold text-white">
                Lucian Horvat <span className="text-[#afafaf]">18</span>
              </p>
              <p className="px-1 text-xs text-[#afafaf]">Slovenia</p>
            </div>
            {sidebarSections.map((section, sectionIndex) => (
              <div key={`section-${sectionIndex}`} className="mb-3">
                {section.heading && (
                  <p
                    className={`mb-1 px-3 text-xs uppercase tracking-wide text-[#afafaf] ${isDesktopSidebarExpanded ? "" : "min-[751px]:hidden"
                      }`}
                  >
                    {section.heading}
                  </p>
                )}
                <div className="flex flex-col gap-0">
                  {section.items.map(({ label, Icon, iconSrc, href }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        if (label === "Nov klepet") {
                          openFreshChat();
                          return;
                        }
                        if (href && typeof window !== "undefined") {
                          window.open(href, "_blank", "noopener,noreferrer");
                        }
                      }}
                      className={`group flex w-full cursor-pointer items-center justify-start rounded-md py-2 text-left text-[15px] text-white transition-[padding,background-color] duration-200 hover:bg-[#afafaf]/15 ${Icon || iconSrc ? "gap-2" : ""
                        } ${isDesktopSidebarExpanded
                          ? "px-3"
                          : "min-[751px]:pl-[7px] min-[751px]:pr-0"
                        }`}
                    >
                      {Icon && (
                        <Icon
                          size={18}
                          className={`h-[18px] w-[18px] shrink-0 ${!isDesktopSidebarExpanded && label === "Nov klepet"
                              ? "min-[751px]:translate-x-[1px]"
                              : ""
                            }`}
                        />
                      )}
                      {iconSrc && (
                        <Image
                          src={iconSrc}
                          alt={label}
                          width={16}
                          height={16}
                          className="h-[16px] w-[16px] shrink-0"
                        />
                      )}
                      <span className={isDesktopSidebarExpanded ? "" : "min-[751px]:hidden"}>
                        {label}
                      </span>
                      {section.heading === "Socialna omrežja" && (
                        <ArrowUpRight
                          size={16}
                          className={`ml-auto shrink-0 text-[#afafaf] opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${isDesktopSidebarExpanded ? "" : "min-[751px]:hidden"
                            }`}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {chatThreads.length > 0 && (
              <div className="mb-3">
                <p
                  className={`mb-1 px-3 text-xs uppercase tracking-wide text-[#afafaf] ${isDesktopSidebarExpanded ? "" : "min-[751px]:hidden"
                    }`}
                >
                  Klepeti
                </p>
                <div className="flex flex-col gap-1">
                  {chatThreads.map((thread) => (
                    <div
                      key={thread.id}
                      className={`group relative rounded-md ${isDesktopSidebarExpanded
                          ? activeChatId === thread.id
                            ? "bg-[#afafaf]/15"
                            : "hover:bg-[#afafaf]/15"
                          : ""
                        }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (chatAbortRef.current) {
                            chatAbortRef.current.abort();
                            chatAbortRef.current = null;
                          }
                          activeChatRequestIdRef.current += 1;
                          setIsAiThinking(false);
                          if (typingResponseRef.current || isAssistantSpeakingRef.current) {
                            interruptAssistantOutput();
                          } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
                            window.speechSynthesis.cancel();
                          }
                          setActiveChatId(thread.id);
                          setMessages(thread.messages);
                          setInputValue("");
                        }}
                        className={`flex w-full cursor-pointer items-center rounded-md py-2 text-left text-[15px] text-white transition-[padding,background-color] duration-200 ${isDesktopSidebarExpanded
                            ? "px-3 pr-10"
                            : "min-[751px]:pl-[7px] min-[751px]:pr-0"
                          }`}
                      >
                        <span
                          className={`block flex-1 truncate ${isDesktopSidebarExpanded ? "" : "min-[751px]:hidden"}`}
                        >
                          {threadTitleDisplay[thread.id] ?? thread.title}
                        </span>
                      </button>
                      {isDesktopSidebarExpanded && (
                        <button
                          type="button"
                          aria-label="Izbriši klepet"
                          onClick={() => setPendingDeleteChatId(thread.id)}
                          className="invisible absolute right-2 top-1/2 z-10 inline-flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-[#afafaf] opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 hover:bg-[#afafaf]/15 hover:text-white"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="absolute bottom-0 left-0 w-full border-t border-border px-[10px] py-2">
            <button
              type="button"
              className={`flex w-full cursor-pointer items-center justify-start gap-2 rounded-md py-2 text-left text-[15px] text-white transition-[padding,background-color] duration-200 hover:bg-[#afafaf]/15 ${isDesktopSidebarExpanded ? "px-3" : "min-[751px]:pl-[7px] min-[751px]:pr-0"
                }`}
              onClick={openContactView}
            >
              <Mail size={18} className="h-[18px] w-[18px] shrink-0" />
              <span className={isDesktopSidebarExpanded ? "" : "min-[751px]:hidden"}>
                Kontaktiraj me
              </span>
            </button>
          </div>
        </aside>

        <main className="relative h-screen overflow-hidden bg-[#000000] min-[751px]:flex-1 min-[751px]:bg-[#212121]">
          <div className="relative h-screen">
            <div
              ref={chatScrollRef}
              className={`h-full overflow-y-auto ${activeView === "chat" ? "pb-32" : ""}`}
            >
              {activeView === "chat" && (
                <header
                  ref={chatHeaderRef}
                  className={`sticky top-0 z-20 flex h-14 items-center justify-between bg-[#000000] px-4 transition-colors duration-200 min-[751px]:bg-[#212121] ${isNavbarScrolled ? "border-b border-border" : "border-b border-transparent"
                    }`}
                >
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setIsMobileSidebarOpen(true)}
                      aria-label="Open sidebar"
                      aria-controls="app-sidebar"
                      aria-expanded={isMobileSidebarOpen}
                      className="flex h-10 w-10 shrink-0 items-center justify-center text-white min-[751px]:hidden"
                    >
                      <AlignLeft size={22} />
                    </button>
                    <div className="flex h-full items-center text-base min-[751px]:ml-0 ml-2">
                      <span className="px-2 py-1 text-lg font-semibold text-white">LuciGPT</span>
                    </div>
                  </div>
                  <div ref={topMenuRef} className="relative">
                    <button
                      type="button"
                      aria-label="More options"
                      onClick={() => setIsTopMenuOpen((previous) => !previous)}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-white transition-colors duration-200 hover:bg-[#afafaf]/15"
                    >
                      <Ellipsis size={20} />
                    </button>
                    {isTopMenuOpen && (
                      <div className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-36 rounded-md border border-border bg-[#353535] p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsTopMenuOpen(false);
                            if (activeChatId) {
                              setPendingDeleteChatId(activeChatId);
                            }
                          }}
                          disabled={!activeChatId}
                          className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors duration-200 ${activeChatId
                              ? "text-white hover:bg-[#afafaf]/15"
                              : "cursor-not-allowed text-[#7f7f7f]"
                            }`}
                        >
                          <Trash2 size={14} />
                          <span>Izbriši</span>
                        </button>
                      </div>
                    )}
                  </div>
                </header>
              )}
              <div className="mx-auto w-full max-w-3xl px-4">
                {activeView === "chat" && messages.length === 0 && !typingResponse && !isAiThinking && (
                  <div className="flex min-h-[calc(100vh-220px)] items-center justify-center">
                    <div className="w-full text-left">
                      <p className="text-4xl font-semibold text-white">Lucian Horvat</p>
                      <p className="mt-0 text-lg text-[#afafaf]">
                        Front-End Web &amp; Mobile Developer
                      </p>
                      <div className="mt-6 max-w-3xl overflow-hidden rounded-2xl border border-border bg-[#2b2b2b]/45">
                        <div
                          className={`relative overflow-hidden px-4 py-4 transition-[max-height] duration-300 ease-in-out ${isAboutExpanded ? "max-h-[1200px]" : "max-h-[240px]"
                            }`}
                        >
                          <div className="space-y-4 text-sm leading-7 text-[#afafaf]">
                            <p>
                              Ta portfolio ni nastal kot klasična zbirka projektov z dolgimi opisi in
                              seznamom tehnologij. Želel sem ustvariti prostor, ki bolje odraža način,
                              kako razmišljam in delam.
                            </p>
                            <p>
                              Programirati sem začel pri dvanajstih letih. Sprva iz radovednosti,
                              kasneje iz resnega interesa, danes pa je razvoj programske opreme nekaj,
                              kar me iskreno veseli in motivira. Skozi leta to ni postala le tehnična
                              veščina, temveč način razmišljanja in pristop k reševanju problemov.
                            </p>
                            <p>
                              Nenehno ustvarjam nove projekte in preizkušam različne niše ter poslovne
                              ideje. Zanimajo me različni modeli produktov, od preprostih orodij do
                              kompleksnejših aplikacij, saj verjamem, da širina razumevanja trga
                              pomaga pri boljših tehničnih odločitvah. Razvoj zame ni le
                              implementacija funkcionalnosti, temveč gradnja rešitve, ki ima smisel in
                              dolgoročno vrednost.
                            </p>
                            <p>
                              V zadnjem obdobju sem se z vso resnostjo posvetil tudi področju umetne
                              inteligence. Aktivno raziskujem, kako AI vključiti v realne produkte,
                              kako ga uporabiti kot del arhitekture in kako lahko izboljša uporabniško
                              izkušnjo ter učinkovitost razvoja. Ne kot trend, ampak kot orodje, ki
                              odpira nove možnosti.
                            </p>
                            <p>
                              Namesto statične predstavitve sem se zato odločil za interaktiven
                              pristop. Verjamem, da je pri razvijalcu pomembnejši način razmišljanja
                              kot zgolj seznam tehnologij. Ta prostor omogoča vpogled v to, kako
                              pristopam k arhitekturi, kako sprejemam tehnične odločitve in kako
                              gradim zanesljive, dolgoročno vzdržne rešitve s poudarkom na kakovosti
                              in uporabniški izkušnji.
                            </p>
                            <p>
                              Želel sem, da portfolio ne govori samo o tem, kaj znam, temveč predvsem
                              o tem, kako razmišljam, kako prevzemam odgovornost in kakšno vrednost
                              lahko prinesem ekipi ali produktu.
                            </p>
                          </div>
                          {!isAboutExpanded && (
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#2b2b2b] to-transparent" />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAboutExpanded((previous) => !previous)}
                          className="flex w-full cursor-pointer items-center justify-center gap-2 border-t border-border px-4 py-2 text-sm text-[#afafaf] transition-colors duration-200 hover:text-white"
                        >
                          <span>{isAboutExpanded ? "Prikaži manj" : "Preberi več"}</span>
                          <ChevronDown
                            size={16}
                            className={`transition-transform duration-200 ${isAboutExpanded ? "rotate-180" : ""
                              }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {activeView === "chat" &&
                  messages.map((message) => (
                    <div
                      key={message.id}
                      ref={message.id === messages[messages.length - 1]?.id ? latestMessageRef : null}
                      className={`mb-3 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {message.role === "user" ? (
                        <div
                          className={`max-w-[85%] rounded-full bg-[#303030] px-4 py-3 text-sm ${message.isTranscribed ? "italic text-[#afafaf]" : "text-white"
                            }`}
                        >
                          {message.isTranscribed ? `"${message.content}"` : message.content}
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap px-1 py-1 text-sm leading-7 text-white">
                          {renderAssistantContent(message.content)}
                        </div>
                      )}
                    </div>
                  ))}
                {activeView === "chat" && isAiThinking && (
                  <div className="mb-3 flex justify-start">
                    <div className="px-1 py-1">
                      <span className="inline-flex h-4 w-4 rounded-full bg-white animate-pulse" />
                    </div>
                  </div>
                )}
                {activeView === "chat" && typingResponse && (
                  <div className="mb-3 flex justify-start">
                    <div className="whitespace-pre-wrap px-1 py-1 text-sm leading-7 text-white">
                      {renderAssistantContent(typingResponse)}
                    </div>
                  </div>
                )}
                {activeView === "chat" && messages.length > 1 && (
                  <div
                    aria-hidden
                    className="h-[70vh]"
                  />
                )}
                {activeView === "contact" && (
                  <div className="flex min-h-screen items-center justify-center py-8 min-[751px]:hidden">
                    <div className="w-full max-w-xl rounded-2xl border border-border bg-[#2b2b2b]/45 p-5">
                      <p className="text-2xl font-semibold text-white">Kontaktiraj me</p>
                      <p className="mt-1 text-sm text-[#afafaf]">
                        Pošljite sporočilo in odgovorim vam v najkrajšem možnem času.
                      </p>
                      <form
                        onSubmit={(event) => { void handleContactSubmit(event); }}
                        className="mt-4 space-y-3"
                      >
                        <input
                          type="text"
                          required
                          value={contactName}
                          onChange={(event) => setContactName(event.target.value)}
                          placeholder="Ime"
                          className="w-full rounded-xl border border-border bg-[#303030] px-3 py-2 text-sm text-white outline-none"
                        />
                        <input
                          type="email"
                          required
                          value={contactEmail}
                          onChange={(event) => setContactEmail(event.target.value)}
                          placeholder="Email"
                          className="w-full rounded-xl border border-border bg-[#303030] px-3 py-2 text-sm text-white outline-none"
                        />
                        <input
                          type="text"
                          required
                          value={contactSubject}
                          onChange={(event) => setContactSubject(event.target.value)}
                          placeholder="Zadeva"
                          className="w-full rounded-xl border border-border bg-[#303030] px-3 py-2 text-sm text-white outline-none"
                        />
                        <textarea
                          required
                          rows={5}
                          value={contactMessage}
                          onChange={(event) => setContactMessage(event.target.value)}
                          placeholder="Sporočilo"
                          className="w-full resize-none rounded-xl border border-border bg-[#303030] px-3 py-2 text-sm text-white outline-none"
                        />
                        <button
                          type="submit"
                          className="cursor-pointer rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition-colors duration-200 hover:bg-[#e5e7eb]"
                        >
                          Pošlji sporočilo
                        </button>
                      </form>
                      {isContactSubmitted && (
                        <p className="mt-3 text-sm text-[#afafaf]">
                          Hvala, vaše sporočilo je pripravljeno.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {isDesktopContactModalOpen && (
              <div className="absolute inset-0 z-40 hidden min-[751px]:block">
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                <div
                  className="relative z-10 flex h-full items-center justify-center px-4 py-8"
                  onClick={() => setIsDesktopContactModalOpen(false)}
                >
                  <div
                    className="w-full max-w-xl rounded-2xl border border-border bg-[#2b2b2b]/45 p-5"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-2xl font-semibold text-white">Kontaktiraj me</p>
                        <p className="mt-1 text-sm text-[#afafaf]">
                          Pošljite sporočilo in odgovorim vam v najkrajšem možnem času.
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Zapri kontaktni modal"
                        onClick={() => setIsDesktopContactModalOpen(false)}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[#afafaf] transition-colors duration-200 hover:bg-[#afafaf]/15 hover:text-white"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <form
                      onSubmit={(event) => { void handleContactSubmit(event); }}
                      className="mt-4 space-y-3"
                    >
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(event) => setContactName(event.target.value)}
                        placeholder="Ime"
                        className="w-full rounded-xl border border-border bg-[#303030] px-3 py-2 text-sm text-white outline-none"
                      />
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(event) => setContactEmail(event.target.value)}
                        placeholder="Email"
                        className="w-full rounded-xl border border-border bg-[#303030] px-3 py-2 text-sm text-white outline-none"
                      />
                      <input
                        type="text"
                        required
                        value={contactSubject}
                        onChange={(event) => setContactSubject(event.target.value)}
                        placeholder="Zadeva"
                        className="w-full rounded-xl border border-border bg-[#303030] px-3 py-2 text-sm text-white outline-none"
                      />
                      <textarea
                        required
                        rows={5}
                        value={contactMessage}
                        onChange={(event) => setContactMessage(event.target.value)}
                        placeholder="Sporočilo"
                        className="w-full resize-none rounded-xl border border-border bg-[#303030] px-3 py-2 text-sm text-white outline-none"
                      />
                      <button
                        type="submit"
                        className="cursor-pointer rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition-colors duration-200 hover:bg-[#e5e7eb]"
                      >
                        Pošlji sporočilo
                      </button>
                    </form>
                    {isContactSubmitted && (
                      <p className="mt-3 text-sm text-[#afafaf]">Hvala, vaše sporočilo je pripravljeno.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            {pendingDeleteChatId && (
              <div className="absolute inset-0 z-50">
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                <div
                  className="relative z-10 flex h-full items-center justify-center px-4 py-8"
                  onClick={() => setPendingDeleteChatId(null)}
                >
                  <div
                    className="w-full max-w-xl rounded-2xl border border-border bg-[#2b2b2b]/45 p-5"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-2xl font-semibold text-white">Izbris klepeta</p>
                        <p className="mt-1 text-sm text-[#afafaf]">
                          Ali ste prepričani, da želite izbrisati ta klepet?
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Zapri izbris klepeta"
                        onClick={() => setPendingDeleteChatId(null)}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[#afafaf] transition-colors duration-200 hover:bg-[#afafaf]/15 hover:text-white"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="mt-5 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setPendingDeleteChatId(null)}
                        className="cursor-pointer rounded-md px-3 py-2 text-sm text-[#afafaf] transition-colors duration-200 hover:bg-[#afafaf]/15 hover:text-white"
                      >
                        Prekliči
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (pendingDeleteChatId) {
                            handleDeleteThread(pendingDeleteChatId);
                          }
                          setPendingDeleteChatId(null);
                        }}
                        className="cursor-pointer rounded-md bg-[#ef4444] px-3 py-2 text-sm text-white transition-colors duration-200 hover:bg-[#dc2626]"
                      >
                        Izbriši
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeView === "chat" && (
              <>
                <div aria-hidden className="absolute inset-x-0 bottom-0 h-10 bg-[#000000] min-[751px]:bg-[#212121]" />
                <div className="absolute bottom-4 left-1/2 w-full max-w-3xl -translate-x-1/2 px-4">
                  {!isDictating && !isRequestingDictatePermission && !isEndingDictation && (
                    <div className="mb-3 flex gap-2 overflow-x-auto whitespace-nowrap rounded-full pr-1">
                      {MESSAGE_SUGGESTIONS.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setInputValue(suggestion)}
                          className="shrink-0 cursor-pointer rounded-full border border-border bg-[#303030] px-3 py-1.5 text-sm text-[#afafaf] transition-colors duration-200 hover:bg-[#3a3a3a] hover:text-white"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                  {isDictating || isRequestingDictatePermission || isEndingDictation ? (
                    <div className="relative flex h-[58px] w-full items-center justify-between rounded-[29px] border border-border bg-[#303030] px-4">
                      <div className="flex items-center gap-4">
                        <Mic size={22} className="text-white" />
                        <div className="flex h-10 items-center gap-2">
                          {[0.58, 0.82, 1, 0.74].map((multiplier, index) => (
                            <span
                              key={`dictate-meter-${index}`}
                              className="w-[5px] rounded-full bg-white transition-[height] duration-100 ease-out"
                              style={{ height: `${8 + micLevel * 26 * multiplier}px` }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label="Prekliči narekovanje"
                          onClick={() => {
                            if (isEndingDictation) {
                              return;
                            }
                            if (isRequestingDictatePermission) {
                              cancelDictatePermissionRequest();
                              return;
                            }
                            if (isDictating) {
                              stopDictation(false);
                            }
                          }}
                          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-white/10"
                        >
                          <X size={17} />
                        </button>
                        <button
                          type="button"
                          aria-label="Potrdi narekovanje"
                          onClick={() => {
                            if (isEndingDictation || isRequestingDictatePermission) {
                              return;
                            }
                            if (isDictating) {
                              stopDictation(true);
                            }
                          }}
                          className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ${isEndingDictation || isRequestingDictatePermission
                              ? "text-white"
                              : "text-white hover:bg-white/10"
                            }`}
                        >
                          {isEndingDictation || isRequestingDictatePermission ? (
                            <span className="h-3 w-3 animate-spin rounded-full border border-white/35 border-t-white" />
                          ) : (
                            <Check size={17} />
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative h-[100px] rounded-[29px] border border-border bg-[#303030] px-2 py-2 min-[751px]:h-auto min-[751px]:rounded-none min-[751px]:border-0 min-[751px]:bg-transparent min-[751px]:px-0 min-[751px]:py-0">
                      <input
                        type="text"
                        value={inputValue}
                        onChange={(event) => setInputValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            if (
                              !isListening &&
                              !isRequestingMicPermission &&
                              !isEndingTranscription &&
                              !isDictating &&
                              !isRequestingDictatePermission &&
                              !isEndingDictation
                            ) {
                              handleSendMessage();
                            }
                          }
                        }}
                        placeholder="Vprašaj karkoli..."
                        className="absolute left-0 top-0 w-full rounded-full bg-transparent px-4 py-3 text-white outline-none min-[751px]:static min-[751px]:border min-[751px]:border-solid min-[751px]:border-border min-[751px]:bg-[#303030] min-[751px]:py-4 min-[751px]:pl-14 min-[751px]:pr-40"
                      />
                      <button
                        type="button"
                        aria-label="Add attachment"
                        onClick={openContactView}
                        className="absolute bottom-[9px] left-[9px] flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-white/10 min-[751px]:top-1/2 min-[751px]:bottom-auto min-[751px]:-translate-y-1/2"
                      >
                        <Plus size={18} />
                      </button>
                      <button
                        type="button"
                        aria-label={
                          isEndingDictation
                            ? "Zaključujem narekovanje"
                            : isDictating
                              ? "Zaključi narekovanje"
                              : isRequestingDictatePermission
                                ? "Prekliči dovoljenje mikrofona"
                                : "Začni narekovanje"
                        }
                        onClick={() => {
                          if (isListening || isRequestingMicPermission || isEndingTranscription) {
                            return;
                          }
                          if (isEndingDictation) {
                            return;
                          }
                          if (isDictating) {
                            stopDictation(false);
                            return;
                          }
                          if (isRequestingDictatePermission) {
                            cancelDictatePermissionRequest();
                            return;
                          }
                          void startDictation();
                        }}
                        className={`absolute bottom-[9px] flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-white/10 min-[751px]:top-1/2 min-[751px]:bottom-auto min-[751px]:-translate-y-1/2 ${isListening || isRequestingMicPermission || isEndingTranscription
                            ? "right-[116px]"
                            : "right-[56px]"
                          }`}
                      >
                        {isEndingDictation || isRequestingDictatePermission ? (
                          <span className="h-3 w-3 animate-spin rounded-full border border-white/35 border-t-white" />
                        ) : (
                          <Mic
                            size={18}
                            className={`text-white ${isDictating ? "animate-pulse" : ""}`}
                          />
                        )}
                      </button>
                      <div
                        ref={instantMenuRef}
                        className={`absolute bottom-[13px] left-[52px] min-[751px]:left-auto min-[751px]:top-1/2 min-[751px]:bottom-auto min-[751px]:-translate-y-1/2 ${isListening || isRequestingMicPermission || isEndingTranscription
                            ? "min-[751px]:right-[156px]"
                            : "min-[751px]:right-[96px]"
                          }`}
                      >
                        <button
                          type="button"
                          onClick={() => setIsInstantMenuOpen((previous) => !previous)}
                          className={`flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors duration-200 hover:bg-[#afafaf]/15 ${responseMode === "Thinking"
                              ? "text-[#98cdfe] hover:text-[#98cdfe]"
                              : "text-[#afafaf] hover:text-white"
                            }`}
                        >
                          {responseMode === "Thinking" && (
                            <Timer size={17} className="text-inherit" />
                          )}
                          <span>{responseModeLabel}</span>
                          <ChevronDown size={14} className="text-inherit" />
                        </button>
                        {isInstantMenuOpen && (
                          <div className="absolute bottom-[calc(100%+8px)] left-0 z-30 w-max rounded-[24px] border border-border bg-[#303030] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.35)] min-[751px]:right-0 min-[751px]:left-auto">
                            <p className="mb-2 text-xs text-[#afafaf]">Nedavno</p>
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setResponseMode("Instant");
                                  setIsInstantMenuOpen(false);
                                }}
                                className="grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-6 rounded-xl px-2 py-1.5 text-left transition-colors duration-200 hover:bg-[#afafaf]/15"
                              >
                                <div>
                                  <p className="text-[15px] text-white">Takojšen</p>
                                  <p className="text-xs text-[#afafaf]">Za vsakodnevne pogovore</p>
                                </div>
                                <span className="flex h-5 w-5 items-center justify-center text-white">
                                  {responseMode === "Instant" ? <Check size={16} /> : null}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setResponseMode("Thinking");
                                  setIsInstantMenuOpen(false);
                                }}
                                className="grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-6 rounded-xl px-2 py-1.5 text-left transition-colors duration-200 hover:bg-[#afafaf]/15"
                              >
                                <div>
                                  <p className="text-[15px] text-white">Razmišljanje</p>
                                  <p className="text-xs text-[#afafaf]">Za kompleksna vprašanja</p>
                                </div>
                                <span className="flex h-5 w-5 items-center justify-center text-white">
                                  {responseMode === "Thinking" ? <Check size={16} /> : null}
                                </span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label={
                          isEndingTranscription
                            ? "Zaključujem prepis"
                            : isListening
                              ? "Končaj snemanje"
                              : isRequestingMicPermission
                                ? "Prekliči dovoljenje mikrofona"
                                : isAssistantOutputRunning
                                  ? "Stop assistant output"
                                  : inputValue.trim()
                                    ? "Send message"
                                    : "Start transcription"
                        }
                        onClick={() => {
                          if (isDictating || isRequestingDictatePermission || isEndingDictation) {
                            return;
                          }
                          if (isEndingTranscription) {
                            return;
                          }
                          if (isListening) {
                            stopTranscription();
                            return;
                          }
                          if (isRequestingMicPermission) {
                            cancelMicPermissionRequest();
                            return;
                          }
                          if (isAssistantOutputRunning) {
                            if (chatAbortRef.current) {
                              chatAbortRef.current.abort();
                              chatAbortRef.current = null;
                            }
                            activeChatRequestIdRef.current += 1;
                            setIsAiThinking(false);
                            if (typingResponseRef.current || isAssistantSpeakingRef.current) {
                              interruptAssistantOutput();
                            } else if (
                              typeof window !== "undefined" &&
                              "speechSynthesis" in window
                            ) {
                              window.speechSynthesis.cancel();
                            }
                            return;
                          }
                          if (inputValue.trim()) {
                            void handleSendMessage();
                            return;
                          }

                          void startTranscription();
                        }}
                        className={`group absolute bottom-[9px] right-[9px] flex h-10 cursor-pointer items-center justify-center rounded-full transition-[background-color,filter] duration-200 hover:brightness-95 min-[751px]:top-1/2 min-[751px]:bottom-auto min-[751px]:-translate-y-1/2 ${isListening || isRequestingMicPermission || isEndingTranscription
                            ? "px-4"
                            : "w-10"
                          } ${isEndingTranscription
                            ? "bg-white"
                            : isListening
                              ? "bg-[#0285ff]"
                              : isAssistantOutputRunning
                                ? "bg-[#424242]"
                                : "bg-white"
                          }`}
                      >
                        {isEndingTranscription ? (
                          <span className="flex items-center gap-2 text-sm font-medium text-black">
                            <span className="h-3 w-3 animate-spin rounded-full border border-black/35 border-t-black" />
                            <span>Zaključujem</span>
                          </span>
                        ) : isListening ? (
                          <span className="flex items-center gap-2 text-sm font-medium text-white">
                            <span className="flex h-4 items-center gap-[2px]">
                              <span
                                className="w-[2px] rounded-full bg-white transition-[height] duration-100 ease-out"
                                style={{ height: `${4 + micLevel * 7}px` }}
                              />
                              <span
                                className="w-[2px] rounded-full bg-white transition-[height] duration-100 ease-out"
                                style={{ height: `${6 + micLevel * 10}px` }}
                              />
                              <span
                                className="w-[2px] rounded-full bg-white transition-[height] duration-100 ease-out"
                                style={{ height: `${8 + micLevel * 12}px` }}
                              />
                              <span
                                className="w-[2px] rounded-full bg-white transition-[height] duration-100 ease-out"
                                style={{ height: `${6 + micLevel * 9}px` }}
                              />
                            </span>
                            <span>Zaključi</span>
                          </span>
                        ) : isRequestingMicPermission ? (
                          <span className="flex items-center gap-2 text-sm font-medium text-black">
                            <span className="relative h-3 w-3">
                              <span className="absolute inset-0 h-3 w-3 animate-spin rounded-full border border-black/35 border-t-black transition-opacity duration-150 group-hover:opacity-0" />
                              <X
                                size={12}
                                className="absolute inset-0 h-3 w-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                              />
                            </span>
                            <span>Prekliči</span>
                          </span>
                        ) : isAssistantOutputRunning ? (
                          <span className="h-3.5 w-3.5 rounded-[2px] bg-white" />
                        ) : inputValue.trim() ? (
                          <ArrowUp size={18} className="text-black" />
                        ) : (
                          <AudioLines
                            size={18}
                            className={`text-black ${isListening ? "animate-pulse" : ""}`}
                          />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
