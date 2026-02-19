"use client";

import { useApp } from "@/contexts/AppContext";
import Header from "@/components/client/Header";
import Sidebar from "@/components/client/Sidebar";
import ChatArea from "@/components/client/ChatArea";
import InputArea from "@/components/client/InputArea";
import TermsOfService from "@/components/client/TermsOfService";

export default function Home() {
  const { tosAccepted, sidebarCollapsed } = useApp();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Terms of Service Banner */}
      <TermsOfService />

      {/* Header */}
      <Header />

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        <main
          className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 pl-0 ${
            sidebarCollapsed ? "md:pl-0" : "md:pl-[17.5rem]"
          }`}
        >
          {/* Chat Area */}
          <ChatArea />

          {/* Input Area - only show if ToS accepted */}
          {tosAccepted && <InputArea />}
        </main>
      </div>

    </div>
  );
}
