const API = process.env.NEXT_PUBLIC_BACKEND_API_URL

export const crmApi = {

  getCustomers: async () => {
    const res = await fetch(`${API}/api/crm/customers`, {
      credentials: "include"
    })
    return res.json()
  },

  getTimeline: async (customerId:string) => {
    const res = await fetch(`${API}/api/crm/timeline/${customerId}`, {
      credentials: "include"
    })
    return res.json()
  },

  getPromises: async (customerId:string) => {
    const res = await fetch(`${API}/api/crm/promises/${customerId}`, {
      credentials: "include"
    })
    return res.json()
  },

  getContactMessages: async (email:string, token:string) => {
    const res = await fetch(
      `${API}/api/admin/messages/contact?email=${encodeURIComponent(email)}`,
      {
        headers:{
          Authorization:`Bearer ${token}`
        }
      }
    )

    return res.json()
  }

}