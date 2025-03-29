import { ChatInput } from "@/components/custom/chatinput";
import { PreviewMessage, ThinkingMessage } from "../../components/custom/message";
import { useScrollToBottom } from '@/components/custom/use-scroll-to-bottom';
import { useState, useEffect } from "react";
import { message } from "../../interfaces/interfaces";
import { Overview } from "@/components/custom/overview";
import { Header } from "@/components/custom/header";
import { v4 as uuidv4 } from 'uuid';
import { useWebSocket } from "@/components/custom/websocket";

export function Chat() {
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();
  const [messages, setMessages] = useState<message[]>([]);
  const [question, setQuestion] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
      

  const onMessage = (data: string) => {
    if (data.includes("[END]")) {
      setIsLoading(false);
    }

    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1];
      const newContent =
        lastMessage?.role === "assistant"
          ? lastMessage.content + data.replace("[END]", "")
          : data;

      const newMessage = { content: newContent, role: "assistant", id: uuidv4() };
      return lastMessage?.role === "assistant"
        ? [...prev.slice(0, -1), newMessage]
        : [...prev, newMessage];
    });

  };

  const { connectWebSocket, disconnectWebSocket, sendMessage } = useWebSocket(onMessage);

  
  useEffect(() => {
    if (token) {
      connectWebSocket(token);
    }
    return () => {
      disconnectWebSocket();
    };
  }, [token]);

  const handleLoginSuccess = (token: string) => {
    setIsLoggedIn(true);
    setToken(token);
    setShowSuccessMessage(true);
    setTimeout(() => {
      setShowSuccessMessage(false);
    }
    , 2000);
  };

  const handleLogout = () => {
    disconnectWebSocket();
    setMessages([]);
    setQuestion("");
    setIsLoggedIn(false);
    setToken(null);
    localStorage.removeItem("google_id_token");
    console.log("Logged out");
  };

  const handleTokenExpired = () => {
    console.warn("Token expired");
    handleLogout();
  };

  const handleSubmit = async (text?: string) => {
    const messageText = text || question;
    setIsLoading(true);

    const traceId = uuidv4();
    setMessages(prev => [...prev, { content: messageText, role: "user", id: traceId }]);
    setQuestion("");

    if (!token) {
      setMessages(prev => [
        ...prev,
        { content: "Unauthorized, please login...", role: "assistant", id: uuidv4() }
      ]);
      setIsLoading(false);
      return;
    }

    const sent = sendMessage(messageText, token);
    if (!sent) {
      setMessages(prev => [
        ...prev,
        { content: "Please try again...", role: "assistant", id: uuidv4() }
      ]);
      setIsLoading(false);
      return;
    }
  };

  return (
    <div className="flex flex-col min-w-0 h-screen bg-background">
      <Header
        isLoggedIn={isLoggedIn}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        onTokenExpired={handleTokenExpired}
      />
      {showSuccessMessage && (
        <div className="absolute top-0 left-0 w-full p-4 bg-green-500 text-white text-center">
          Logged in
        </div>
      )}
      <div className="flex flex-col min-w-0 flex-1 overflow-y-scroll pt-4" ref={messagesContainerRef}>
        {messages.length == 0 && <Overview />}
        {messages.map((message, index) => (
          <PreviewMessage key={index} message={message} />
        ))}
        {isLoading && <ThinkingMessage />}
        <div ref={messagesEndRef} className="shrink-0 min-w-[24px] min-h-[24px]"/>
      </div>
      <div className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
        <ChatInput  
          question={question}
          setQuestion={setQuestion}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};