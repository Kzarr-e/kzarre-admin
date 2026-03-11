import { useEffect, useState } from "react"
import { crmApi } from "../services/crmApi"
import { Customer } from "../types/crmTypes"

export function useCustomers(){

  const [customers,setCustomers] = useState<Customer[]>([])
  const [loading,setLoading] = useState(false)

  useEffect(()=>{
    fetchCustomers()
  },[])

  const fetchCustomers = async ()=>{
    setLoading(true)
    try{
      const data = await crmApi.getCustomers()
      setCustomers(Array.isArray(data) ? data : [])
    }finally{
      setLoading(false)
    }
  }

  return {
    customers,
    loading,
    refresh:fetchCustomers
  }

}