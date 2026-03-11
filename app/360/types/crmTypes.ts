export type Customer = {
  _id: string
  name: string
  email: string
  phone?: string

  fulfilledCount: number
  breachedCount: number
  pendingCount: number

  metrics?: {
    ltv: number
    aov: number
    returnRate: number
  }

  lastPromiseCreatedAt?: string | null
  lastPromiseDueDate?: string | null
  lastPromiseStatus?: "pending" | "breached" | "fulfilled" | null
}

export type PromiseRecord = {
  _id: string
  type: "replacement" | "discount" | "delivery"
  status: "pending" | "fulfilled" | "breached"
  dueDate: string
  notes?: string
}

export type TimelineItem = {
  _id: string
  type: "order" | "ticket" | "chat" | "email" | "note"
  title: string
  description?: string
  createdAt: string
}

export type ContactMessage = {
  _id: string
  name: string
  email: string
  message: string
  status: string
  createdAt: string
}