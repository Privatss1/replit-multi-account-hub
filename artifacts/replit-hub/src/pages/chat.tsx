import { useState, useRef, useEffect } from "react";
import { useListConversations } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, Paperclip, Send, SquareSquare, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Chat() {
  const { data: conversations, isLoading } = useListConversations();
  const [activeConv, setActiveConv] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setMessage((prev) => prev + (prev ? " " : "") + transcript);
          setIsRecording(false);
        };
        
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);
        
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setMessage("");
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] h-screen">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-sidebar/50 flex flex-col">
        <div className="p-4 border-b border-border font-medium">Conversations</div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations?.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConv(conv.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  activeConv === conv.id 
                    ? "bg-primary/20 text-primary" 
                    : "hover:bg-sidebar-accent text-sidebar-foreground"
                )}
              >
                <div className="font-medium truncate">{conv.title}</div>
                <div className="text-xs text-muted-foreground truncate">{conv.accountName}</div>
              </button>
            ))}
            {(!conversations || conversations.length === 0) && (
              <div className="text-center p-4 text-sm text-muted-foreground">
                No active conversations
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background">
        {activeConv ? (
          <>
            <div className="p-4 border-b border-border flex justify-between items-center bg-background z-10">
              <div className="font-medium">Chat</div>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              {/* Messages would go here */}
            </ScrollArea>

            <div className="p-4 border-t border-border bg-background">
              <div className="max-w-4xl mx-auto relative flex items-end border border-border bg-card rounded-lg p-2 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground">
                  <Paperclip className="w-5 h-5" />
                </Button>
                
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Message agent..."
                  className="flex-1 max-h-32 min-h-[40px] bg-transparent border-0 focus:ring-0 resize-none px-3 py-2 text-sm"
                  rows={1}
                />
                
                <div className="flex items-center space-x-1 shrink-0">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <Wand2 className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={toggleRecording}
                    className={cn(
                      "text-muted-foreground hover:text-foreground transition-colors",
                      isRecording && "text-red-500 hover:text-red-600 animate-pulse"
                    )}
                  >
                    {isRecording ? <SquareSquare className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </Button>
                  <Button size="icon" className="rounded-md" disabled={!message.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation or start a new one
          </div>
        )}
      </div>
    </div>
  );
}
