import { Customer } from "../types/crmTypes"

type Props = {
  customers: Customer[]
  onSelect: (c:Customer)=>void
}

export default function CustomerTable({customers,onSelect}:Props){

  return (

    <div className="border rounded-xl overflow-hidden">

      <table className="w-full text-sm">

        <thead className="border-b">
          <tr>
            <th className="px-3 py-2 text-left">Name</th>
            <th>Email</th>
            <th>Status</th>
            <th>LTV</th>
          </tr>
        </thead>

        <tbody>

          {customers.map(c => (

            <tr
              key={c._id}
              onClick={()=>onSelect(c)}
              className="border-t cursor-pointer hover:bg-gray-50"
            >

              <td className="px-3 py-2">{c.name}</td>

              <td>{c.email}</td>

              <td>
                {c.lastPromiseStatus || "—"}
              </td>

              <td>
                ${c.metrics?.ltv ?? 0}
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  )

}