'use client'

import { useState } from 'react'
import { ChevronLeft, Phone, Mail, MapPin, Calendar, Package, DollarSign, Edit2, Trash2, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const mockCustomer = {
  id: '1',
  name: 'Fatima Al-Mansouri',
  email: 'fatima@email.com',
  phone: '+971 50 123 4567',
  status: 'active',
  location: 'Dubai, UAE',
  joinDate: '2024-01-15',
  totalOrders: 8,
  totalSpent: 'AED 45,000',
  lastOrder: '2024-04-10',
  preferences: ['Solitaire Diamonds', 'Gold', 'Custom Orders'],
  notes: 'VIP customer - prefers custom designs. Interested in engagement rings and special occasions.',
  orders: [
    { id: 'ORD-001', date: '2024-04-10', total: 'AED 8,500', status: 'delivered' },
    { id: 'ORD-002', date: '2024-03-22', total: 'AED 12,000', status: 'delivered' },
    { id: 'ORD-003', date: '2024-02-15', total: 'AED 5,500', status: 'delivered' },
  ]
}

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/customers">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <h1 className="text-3xl font-semibold">{mockCustomer.name}</h1>
        <Badge variant={mockCustomer.status === 'active' ? 'default' : 'secondary'}>
          {mockCustomer.status === 'active' ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">Contact Information</h2>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                <Edit2 className="w-4 h-4 mr-2" />
                {isEditing ? 'Done' : 'Edit'}
              </Button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{mockCustomer.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{mockCustomer.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{mockCustomer.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Join Date</p>
                  <p className="font-medium">{mockCustomer.joinDate}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Order History</h2>
            <div className="space-y-3">
              {mockCustomer.orders.map((order) => (
                <div key={order.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{order.id}</p>
                    <p className="text-sm text-muted-foreground">{order.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{order.total}</p>
                    <Badge variant="outline" className="text-xs">{order.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Notes</h2>
            <p className="text-muted-foreground">{mockCustomer.notes}</p>
          </Card>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-semibold">{mockCustomer.totalOrders}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-semibold">{mockCustomer.totalSpent}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-3">Preferences</h3>
            <div className="flex flex-wrap gap-2">
              {mockCustomer.preferences.map((pref) => (
                <Badge key={pref} variant="secondary">{pref}</Badge>
              ))}
            </div>
          </Card>

          <div className="flex gap-2">
            <Button className="flex-1" variant="outline">
              <MessageSquare className="w-4 h-4 mr-2" />
              Message
            </Button>
            <Button className="flex-1" variant="destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
