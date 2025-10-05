"use client"

import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"
import { useChatbot } from "./chatbot-provider"

export function ChatbotTrigger() {
  const { isOpen, setIsOpen } = useChatbot()

  if (isOpen) return null

  return (
    <Button
      onClick={() => setIsOpen(true)}
      size="lg"
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50"
    >
      <MessageCircle className="h-6 w-6" />
      <span className="sr-only">Open chatbot</span>
    </Button>
  )
} 