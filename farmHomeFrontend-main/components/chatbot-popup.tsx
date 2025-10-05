"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Send, Minimize2 } from "lucide-react"
import { useChatbot } from "./chatbot-provider"
// Remove: import { useTranslations } from "next-intl"

interface Message {
  id: string
  text: string
  timestamp: Date
  topic: string
  role: 'user' | 'assistant'
}

export function ChatbotPopup() {
  const { isOpen, setIsOpen } = useChatbot()
  // Remove: const t = useTranslations('Chatbot')
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [animals, setAnimals] = useState<any[]>([])
  const [animalSearch, setAnimalSearch] = useState("")
  const [selectedAnimal, setSelectedAnimal] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [animalLoading, setAnimalLoading] = useState(false)
  const [animalError, setAnimalError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch animals on mount
  useEffect(() => {
    const fetchAnimals = async () => {
      setAnimalLoading(true)
      setAnimalError(null)
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        if (!token) {
          setAnimalError("You must be signed in to use the chatbot.")
          setAnimalLoading(false)
          return
        }
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/animals/all`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error("Failed to fetch animals")
        const data = await res.json()
        setAnimals(Array.isArray(data.animals) ? data.animals : [])
      } catch (err: any) {
        setAnimalError(err.message || "Failed to fetch animals")
      } finally {
        setAnimalLoading(false)
      }
    }
    if (isOpen) fetchAnimals()
  }, [isOpen])

  // Filtered animals for search
  const filteredAnimals = animals.filter(a => {
    const search = animalSearch.toLowerCase()
    return (
      (a.breed && a.breed.toLowerCase().includes(search)) ||
      (a.tagId && a.tagId.toLowerCase().includes(search)) ||
      (a.name && a.name.toLowerCase().includes(search))
    )
  })

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedAnimal || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      timestamp: new Date(),
      topic: selectedAnimal.tagId,
      role: 'user',
    }
    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ text: m.text, role: m.role })),
          animal: selectedAnimal,
        }),
      })
      const data = await response.json()
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.aiMessage,
        timestamp: new Date(),
        topic: selectedAnimal.tagId,
        role: 'assistant',
      }
      setMessages(prev => [...prev, aiMessage])
    } catch (err) {
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: "Sorry, there was an error contacting the AI.",
        timestamp: new Date(),
        topic: selectedAnimal.tagId,
        role: 'assistant',
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isMinimized])

  if (!isOpen) return null

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[650px] shadow-2xl z-50 flex flex-col rounded-2xl border-0 bg-white overflow-hidden">
      <CardHeader className="flex items-center justify-between space-y-0  rounded-t-2xl bg-gray-900 text-white border-b border-gray-200 ">
        <div className="flex-1 flex items-center justify-center h-full">
          <CardTitle className="text-lg font-semibold tracking-tight pt-4 w-full">Chat Support</CardTitle>
        </div>
        <div className="flex items-center gap-2 ml-auto h-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-8 w-8 p-0 text-white hover:bg-gray-800 flex items-center justify-center"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 p-0 text-white hover:bg-gray-800 flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="flex flex-col flex-1 p-0 bg-white h-full min-h-0 overflow-hidden">
          {/* Animal selection area */}
          <div className="p-3 border-b border-gray-200 flex-shrink-0">
            {animalError && <div className="text-red-500 text-sm mb-2">{animalError}</div>}
            {animalLoading ? (
              <div className="text-gray-500 text-sm">Loading animals...</div>
            ) : selectedAnimal ? (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded px-3 py-2">
                <div>
                  <span className="font-semibold">{selectedAnimal.name || selectedAnimal.breed}</span>
                  <span className="text-xs text-gray-500 ml-2">(Tag: {selectedAnimal.tagId})</span>
                </div>
                <Button size="sm" variant="outline" className="ml-2 px-2 py-1 text-xs" onClick={() => setSelectedAnimal(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Search animal by name, breed, or tagId..."
                  value={animalSearch}
                  onChange={e => setAnimalSearch(e.target.value)}
                  className="w-full mb-2 px-2 py-1 border rounded"
                  disabled={animalLoading}
                />
                <div className="max-h-40 overflow-y-auto border rounded">
                  {filteredAnimals.length === 0 ? (
                    <div className="text-gray-400 text-sm p-2">No animals found.</div>
                  ) : (
                    filteredAnimals.map(animal => (
                      <div
                        key={animal._id}
                        className={`cursor-pointer px-3 py-2 hover:bg-blue-50 ${selectedAnimal && selectedAnimal._id === animal._id ? "bg-blue-100" : ""}`}
                        onClick={() => setSelectedAnimal(animal)}
                      >
                        <span className="font-medium">{animal.name || animal.breed}</span> <span className="text-xs text-gray-500">(Tag: {animal.tagId})</span>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Conversation area */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 space-y-4" style={{ background: 'white' }}>
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 mt-8">
                <p>No messages yet.</p>
                <p className="text-sm mt-2">Please select an animal to start the conversation.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={message.role === 'user' ? "flex flex-col items-end" : "flex flex-col items-start"}>
                    <div className={message.role === 'user' ? "bg-gray-100 rounded-xl p-3 max-w-[80%] self-end shadow border border-gray-200" : "bg-blue-50 rounded-xl p-3 max-w-[80%] self-start shadow border border-blue-200"}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-500">{selectedAnimal ? (selectedAnimal.name || selectedAnimal.breed) : "Animal"}</span>
                        {message.role === 'assistant' && <span className="ml-2 text-xs text-blue-600 font-semibold">AI</span>}
                        {message.role === 'user' && <span className="ml-2 text-xs text-gray-400 font-semibold">You</span>}
                      </div>
                      <p className="text-sm text-gray-900 whitespace-pre-line break-words">{message.text}</p>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 self-end">
                      {formatDate(message.timestamp)} at {formatTime(message.timestamp)}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex flex-col items-start">
                    <div className="bg-blue-50 rounded-xl p-3 max-w-[80%] self-start shadow border border-blue-200">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-500">AI</span>
                        <span className="ml-2 text-xs text-blue-600 font-semibold">AI</span>
                      </div>
                      <p className="text-sm text-gray-900 whitespace-pre-line break-words flex items-center">
                        <span className="animate-pulse">AI is typing...</span>
                      </p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input area - always at the bottom */}
          <div className="border-t border-gray-200 bg-white p-3 flex-shrink-0" style={{ position: 'relative', zIndex: 1 }}>
            <div className="flex gap-2 items-end bg-gray-50 border border-gray-200 rounded-lg px-2 py-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message here..."
                className="flex-1 bg-gray-50 border-0 text-gray-900 placeholder-gray-400 focus:ring-0 focus:outline-none"
                disabled={!selectedAnimal || isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || !selectedAnimal || isLoading}
                size="sm"
                className="px-3 bg-gray-900 text-white border-0 hover:bg-gray-800 rounded-md"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
} 