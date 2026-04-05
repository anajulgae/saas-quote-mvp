import { CustomersBoard } from "@/components/app/customers-board"
import { getCustomersPageData } from "@/lib/data"

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; new?: string }>
}) {
  const sp = await searchParams
  const { customers } = await getCustomersPageData()

  const initialRegisterOpen = sp.new === "1" || sp.new === "true"

  return (
    <CustomersBoard
      customers={customers}
      initialCustomerId={sp.customer}
      initialRegisterOpen={initialRegisterOpen}
    />
  )
}
