'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'

type OrderDetailPageProps = {
  params: Promise<{
    id: string
  }>
}

type OrderDetail = {
  id: string
  order_number: string
  customer_email: string
  customer_first_name: string
  customer_last_name: string | null
  customer_phone: string | null
  shipping_country: string | null
  shipping_state: string | null
  shipping_city: string | null
  shipping_postal_code: string | null
  shipping_address_line_1: string | null
  shipping_address_line_2: string | null
  total_amount: number
  love_letter_included?: boolean
  love_letter_type?: 'generate_for_me' | 'write_myself' | 'no_letter' | null
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  payment_status: string
  created_at: string
  notes: string | null
}

type OrderItem = {
  id: string
  product_name: string
  product_slug: string | null
  sku: string | null
  quantity: number
  unit_price: number
  line_total: number
  selected_metal: string | null
  selected_purity: string | null
  selected_size_or_fit: string | null
  selected_gemstone: string | null
  selected_carat: string | null
  image_url: string | null
}

type OrderLoveLetter = {
  id: string
  wants_letter: boolean
  letter_type: 'generate_for_me' | 'write_myself' | 'no_letter'
  recipient_name: string | null
  sender_name: string | null
  occasion_key: 'proposal' | 'anniversary' | 'birthday' | 'justbecause' | 'apology' | 'mother' | 'newchapter' | null
  about_her_text: string | null
  custom_letter_text: string | null
  final_letter_text: string | null
  final_letter_html: string | null
  print_status: 'pending' | 'ready' | 'printed' | 'skipped'
  admin_notes: string | null
}

const OCCASION_LABELS: Record<NonNullable<OrderLoveLetter['occasion_key']>, string> = {
  proposal: 'A marriage proposal',
  anniversary: 'An anniversary',
  birthday: 'A birthday',
  justbecause: 'No occasion - just love',
  apology: 'A reconciliation',
  mother: 'A gift for her mother',
  newchapter: 'A new chapter',
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function authedFetch(url: string, options: RequestInit = {}) {
  const accessToken = await getAccessToken()
  const headers = new Headers(options.headers)
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`)
  if (!(options.body instanceof FormData)) headers.set('content-type', 'application/json')
  return fetch(url, { ...options, headers })
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { toast } = useToast()
  const [id, setId] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingStatus, setSavingStatus] = useState(false)
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [loveLetter, setLoveLetter] = useState<OrderLoveLetter | null>(null)
  const [status, setStatus] = useState<OrderDetail['status']>('pending')
  const [showLetterPreview, setShowLetterPreview] = useState(false)

  useEffect(() => {
    void params.then((resolved) => setId(resolved.id))
  }, [params])

  useEffect(() => {
    if (!id) return
    void loadOrder(id)
  }, [id])

  const loadOrder = async (orderId: string) => {
    setLoading(true)
    try {
      const response = await authedFetch(`/api/orders/${orderId}`)
      const payload = await response.json().catch(() => null)
      if (response.ok && payload) {
        setOrder(payload.order)
        setItems(payload.items ?? [])
        setLoveLetter(payload.loveLetter ?? null)
        setStatus(payload.order.status)
      }
    } finally {
      setLoading(false)
    }
  }

  const saveStatus = async () => {
    if (!order) return
    setSavingStatus(true)
    try {
      const response = await authedFetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      const payload = await response.json().catch(() => null)
      if (response.ok) {
        if (payload?.emailStatus === 'failed') {
          toast({
            title: 'Status updated with email warning',
            description: payload?.emailError ?? 'The order status changed, but the email was not sent.',
            variant: 'destructive',
          })
        } else if (payload?.emailStatus === 'sent') {
          toast({ title: 'Status updated', description: 'Order status updated and customer email sent.' })
        } else {
          toast({ title: 'Status updated', description: 'Order status updated successfully.' })
        }
        await loadOrder(order.id)
      } else {
        toast({
          title: 'Status update failed',
          description: payload?.error ?? 'Unable to update order status.',
          variant: 'destructive',
        })
      }
    } finally {
      setSavingStatus(false)
    }
  }

  const statusSteps: OrderDetail['status'][] = ['pending', 'processing', 'shipped', 'delivered']
  const activeStatusIndex = status === 'cancelled' ? -1 : statusSteps.indexOf(status)
  const formatStatusLabel = (value: OrderDetail['status']) => value.charAt(0).toUpperCase() + value.slice(1)
  const formatOccasionLabel = (value: OrderLoveLetter['occasion_key']) => (value ? OCCASION_LABELS[value] : '-')
  const letterTypeLabel =
    loveLetter?.letter_type === 'generate_for_me'
      ? 'Generated for me'
      : loveLetter?.letter_type === 'write_myself'
        ? 'Written by customer'
        : 'No letter'
  const customerName = [order?.customer_first_name, order?.customer_last_name].filter(Boolean).join(' ') || '-'
  const shippingCityLine =
    [order?.shipping_city, order?.shipping_state, order?.shipping_postal_code].filter(Boolean).join(', ') || '-'
  const statusBadgeClass =
    status === 'delivered'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : status === 'shipped'
        ? 'bg-sky-50 text-sky-700 border-sky-200'
        : status === 'processing'
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : status === 'cancelled'
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-slate-50 text-slate-700 border-slate-200'
  const printableLetterHtml =
    loveLetter?.final_letter_html ||
    (loveLetter?.final_letter_text
      ? loveLetter.final_letter_text
          .split(/\n\n+/)
          .map((entry) => `<p>${escapeHtml(entry)}</p>`)
          .join('')
      : '<p>No printable letter body saved.</p>')

  const printLoveLetter = () => {
    if (!order || !loveLetter?.wants_letter) return
    const printWindow = window.open('', '_blank', 'width=900,height=1200')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>${order.order_number} Love Letter</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Manrope, Arial, sans-serif; background: #f6f1e8; color: #0a1628; margin: 0; padding: 32px; }
            .sheet { max-width: 820px; margin: 0 auto; }
            .brand { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-bottom: 28px; }
            .wordmark { font-size: 22px; font-weight: 600; letter-spacing: .28em; text-transform: uppercase; color: #0a1628; }
            .submark { font-size: 10px; letter-spacing: .34em; text-transform: uppercase; color: #7c8696; }
            .meta { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #8b94a5; }
            .paper { background: linear-gradient(180deg,#fffdf9 0%,#fbf5ea 100%); border: 1px solid #ddd8d0; padding: 42px; box-shadow: 0 20px 48px rgba(10,22,40,0.08); }
            .divider { width: 64px; height: 1px; background: rgba(166,124,34,0.35); margin: 22px 0; }
            .dear { font-size: 28px; font-weight: 600; margin-bottom: 0; color: #0a1628; }
            .body { font-size: 15px; line-height: 1.9; color: #253246; }
            .body p { margin: 0 0 16px; }
            .sign { margin-top: 28px; font-size: 12px; font-style: italic; color: #8b94a5; }
            .name { font-size: 22px; font-weight: 600; font-style: italic; margin-top: 8px; color: #0a1628; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="brand">
              <div>
                <div class="wordmark">House of Diams</div>
                <div class="submark">Fine Jewellery</div>
              </div>
              <div class="meta">Order ${order.order_number}</div>
            </div>
            <div class="paper">
              <div class="dear">Dear <em>${loveLetter.recipient_name || 'Her'}</em>,</div>
              <div class="divider"></div>
              <div class="body">${printableLetterHtml}</div>
              <div class="divider"></div>
              <div class="sign">Yours, always</div>
              <div class="name">${loveLetter.sender_name || '-'}</div>
            </div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  if (loading) {
    return <div className="p-8"><div className="rounded-lg border border-border bg-white px-6 py-12 text-sm text-muted-foreground">Loading order...</div></div>
  }

  if (!order) {
    return <div className="p-8"><div className="rounded-lg border border-border bg-white px-6 py-12 text-sm text-muted-foreground">Order not found.</div></div>
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <Link href="/dashboard/orders" className="text-sm font-semibold text-primary hover:text-primary/80">Back to Orders</Link>
          <h1 className="mt-3 font-jakarta text-3xl font-semibold text-foreground">{order.order_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Placed on {new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={(value) => setStatus(value as OrderDetail['status'])}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <button onClick={() => void saveStatus()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60" disabled={savingStatus}>
            {savingStatus ? 'Saving...' : 'Update Status'}
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-border bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-jakarta text-lg font-semibold text-foreground">Order Progress</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {status === 'cancelled' ? 'This order has been cancelled.' : `Current stage: ${formatStatusLabel(status)}`}
            </p>
          </div>
          {status === 'cancelled' ? (
            <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">Cancelled</span>
          ) : null}
        </div>

        {status !== 'cancelled' ? (
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {statusSteps.map((step, index) => {
              const isComplete = index <= activeStatusIndex
              const isCurrent = index === activeStatusIndex
              return (
                <div key={step} className="relative rounded-xl border border-border bg-secondary/10 px-4 py-4">
                  <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${isComplete ? 'bg-foreground text-white' : 'bg-white text-muted-foreground border border-border'}`}>
                    {index + 1}
                  </div>
                  <div className="text-sm font-semibold text-foreground">{formatStatusLabel(step)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{isCurrent ? 'Current step' : isComplete ? 'Completed' : 'Upcoming'}</div>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-white shadow-xs overflow-hidden">
            <div className="border-b border-border px-6 py-4">
              <h2 className="font-jakarta text-lg font-semibold text-foreground">Order Items</h2>
            </div>
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 px-6 py-5">
                  <div className="h-20 w-20 overflow-hidden rounded-lg border border-border bg-secondary/30">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.product_name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{item.product_name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">Slug: {item.product_slug || '-'}</div>
                    <div className="mt-1 text-sm text-muted-foreground">SKU: {item.sku || '-'}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {item.selected_metal ? <span>Metal: {item.selected_metal}</span> : null}
                      {item.selected_purity ? <span>Purity: {item.selected_purity}</span> : null}
                      {item.selected_gemstone ? <span>Stone: {item.selected_gemstone}</span> : null}
                      {item.selected_carat ? <span>Carat: {item.selected_carat}</span> : null}
                      {item.selected_size_or_fit ? <span>Size/Fit: {item.selected_size_or_fit}</span> : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Qty {item.quantity}</div>
                    <div className="mt-1 font-semibold text-foreground">${Number(item.line_total || 0).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-[20px] border border-border bg-white p-6 shadow-xs">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Order Snapshot</div>
                <h2 className="mt-2 font-jakarta text-lg font-semibold text-foreground">At a glance</h2>
              </div>
              <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${statusBadgeClass}`}>
                {formatStatusLabel(status)}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total</div>
                <div className="mt-2 text-base font-semibold text-foreground">${Number(order.total_amount || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Payment</div>
                <div className="mt-2 text-sm font-semibold capitalize text-foreground">{order.payment_status || '-'}</div>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Items</div>
                <div className="mt-2 text-sm font-semibold text-foreground">{items.length}</div>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Love Letter</div>
                <div className="mt-2 text-sm font-semibold text-foreground">{order.love_letter_included ? 'Included' : 'None'}</div>
              </div>
            </div>

            <div className="mt-6 space-y-5 border-t border-border pt-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Customer</div>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <div><span className="font-semibold text-foreground">Name:</span> {customerName}</div>
                  <div><span className="font-semibold text-foreground">Email:</span> {order.customer_email}</div>
                  <div><span className="font-semibold text-foreground">Phone:</span> {order.customer_phone || '-'}</div>
                </div>
              </div>

              <div className="border-t border-border pt-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Shipping</div>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <div>{order.shipping_address_line_1 || '-'}</div>
                  {order.shipping_address_line_2 ? <div>{order.shipping_address_line_2}</div> : null}
                  <div>{shippingCityLine}</div>
                  <div>{order.shipping_country || '-'}</div>
                </div>
              </div>

              {order.notes ? (
                <div className="border-t border-border pt-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Notes</div>
                  <div className="mt-3 rounded-2xl border border-border bg-secondary/20 px-4 py-3 text-sm leading-6 text-muted-foreground">
                    {order.notes}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-[20px] border border-border bg-white p-6 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-jakarta text-lg font-semibold text-foreground">Love Letter</h2>
                <p className="mt-1 text-sm text-muted-foreground">Saved with the order and printable for packing.</p>
              </div>
            </div>

            {loveLetter ? (
              loveLetter.wants_letter ? (
                <div className="mt-5 space-y-5">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Type</div>
                      <div className="mt-2 font-semibold text-foreground">{letterTypeLabel}</div>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Print Status</div>
                      <div className="mt-2 font-semibold capitalize text-foreground">{loveLetter.print_status}</div>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Recipient</div>
                      <div className="mt-2 font-semibold text-foreground">{loveLetter.recipient_name || '-'}</div>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sender</div>
                      <div className="mt-2 font-semibold text-foreground">{loveLetter.sender_name || '-'}</div>
                    </div>
                    <div className="col-span-2 rounded-2xl border border-border bg-secondary/20 px-4 py-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Occasion</div>
                      <div className="mt-2 font-semibold text-foreground">{formatOccasionLabel(loveLetter.occasion_key)}</div>
                    </div>
                  </div>

                  {loveLetter.about_her_text ? (
                    <details className="rounded-2xl border border-border bg-secondary/10 px-4 py-3">
                      <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        About Her
                      </summary>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">{loveLetter.about_her_text}</p>
                    </details>
                  ) : null}

                  {loveLetter.custom_letter_text ? (
                    <details className="rounded-2xl border border-border bg-secondary/10 px-4 py-3">
                      <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        Original Draft
                      </summary>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{loveLetter.custom_letter_text}</p>
                    </details>
                  ) : null}

                  <div className="rounded-xl border border-border bg-[#faf7f2] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Letter Actions</div>
                        <p className="mt-1 text-sm text-muted-foreground">Use preview for a quick check, then print the final packing insert.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setShowLetterPreview((current) => !current)}
                          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
                        >
                          {showLetterPreview ? 'Hide Preview' : 'Preview Letter'}
                        </button>
                        <button
                          type="button"
                          onClick={printLoveLetter}
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                        >
                          Print Letter
                        </button>
                      </div>
                    </div>

                    {showLetterPreview ? (
                      <div className="mt-4 border border-[#ddd8d0] bg-[linear-gradient(180deg,#fffdf9_0%,#fbf5ea_100%)] p-6">
                        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[rgba(166,124,34,0.2)] pb-4">
                          <div>
                            <div className="text-[18px] font-semibold uppercase tracking-[0.28em] text-[#0A1628]">House of Diams</div>
                            <div className="mt-1 text-[10px] uppercase tracking-[0.34em] text-[#8b94a5]">Fine Jewellery</div>
                          </div>
                          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8b94a5]">
                            Order {order.order_number}
                          </div>
                        </div>

                        <div className="mt-5 text-2xl font-semibold text-foreground">
                          Dear <em>{loveLetter.recipient_name || 'Her'}</em>,
                        </div>
                        <div className="mt-5 h-px w-14 bg-[rgba(166,124,34,0.35)]" />
                        <div
                          className="prose prose-neutral mt-5 max-h-[320px] max-w-none overflow-y-auto pr-2 text-[15px] leading-8 text-[#253246] [&_p]:mb-4"
                          dangerouslySetInnerHTML={{ __html: printableLetterHtml }}
                        />
                        <div className="mt-6 h-px w-14 bg-[rgba(166,124,34,0.35)]" />
                        <div className="mt-5 text-sm italic text-muted-foreground">Yours, always</div>
                        <div className="mt-2 text-xl font-semibold italic text-foreground">{loveLetter.sender_name || '-'}</div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="mt-5 text-sm text-muted-foreground">This customer chose not to include a love letter with the order.</div>
              )
            ) : (
              <div className="mt-5 text-sm text-muted-foreground">No love letter record is attached to this order.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
