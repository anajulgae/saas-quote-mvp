import { CustomersBoard } from "@/components/app/customers-board"
import { getCustomersPageData } from "@/lib/data"

export default async function CustomersPage() {
  const { customers } = await getCustomersPageData()

  return <CustomersBoard customers={customers} />
}
