import { CustomersBoard } from "@/components/app/customers-board"
import { PageHeader } from "@/components/app/page-header"
import { getCustomersPageData } from "@/lib/data"

export default async function CustomersPage() {
  const { customers } = await getCustomersPageData()

  return (
    <div className="space-y-6">
      <PageHeader
        title="고객"
        description="고객별 문의, 견적, 청구 현황과 최근 이력을 빠르게 파악합니다."
      />

      <CustomersBoard customers={customers} />
    </div>
  )
}
