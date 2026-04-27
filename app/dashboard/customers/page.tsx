import { getAdminCustomerUsers } from '@/lib/admin-users'
import { CustomersClient } from './customers-client'

export type CustomerRow = {
  id: string
  name: string
  email: string
  joinDate: string
  status: 'active' | 'invited'
}

async function getCustomers(): Promise<CustomerRow[]> {
  const users = await getAdminCustomerUsers()

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email ?? 'No email',
    joinDate: user.createdAt,
    status: user.confirmed ? 'active' : 'invited',
  }))
}

export default async function CustomersPage() {
  const customers = await getCustomers()
  return <CustomersClient initialCustomers={customers} />
}
