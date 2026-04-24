'use client'

import { AlertCircle, CheckCircle, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  type?: 'confirm' | 'delete' | 'warning'
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'confirm',
  onConfirm,
  onCancel,
  isLoading,
}: ConfirmDialogProps) {
  const bgColor = type === 'delete' ? 'bg-red-50' : type === 'warning' ? 'bg-yellow-50' : 'bg-blue-50'
  const borderColor = type === 'delete' ? 'border-red-200' : type === 'warning' ? 'border-yellow-200' : 'border-blue-200'
  const iconColor = type === 'delete' ? 'text-red-600' : type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
  const buttonColor =
    type === 'delete'
      ? 'bg-red-600 hover:bg-red-700'
      : type === 'warning'
      ? 'bg-yellow-600 hover:bg-yellow-700'
      : 'bg-primary hover:bg-primary/90'

  const Icon = type === 'delete' ? Trash2 : type === 'warning' ? AlertCircle : CheckCircle

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => (!open ? onCancel() : undefined)}>
      <AlertDialogContent className="z-[90] max-w-sm border-0 bg-transparent p-0 shadow-none">
        <div className={`${bgColor} mx-4 rounded-lg border ${borderColor} p-6 shadow-lg`}>
          <div className="flex items-start gap-4">
            <Icon className={`${iconColor} mt-0.5 shrink-0`} size={24} />
            <div className="flex-1">
              <AlertDialogHeader className="gap-0 text-left">
                <AlertDialogTitle className="font-jakarta text-lg font-semibold text-foreground">{title}</AlertDialogTitle>
                {description ? <AlertDialogDescription className="mt-2 text-sm text-muted-foreground">{description}</AlertDialogDescription> : null}
              </AlertDialogHeader>
            </div>
          </div>

          <AlertDialogFooter className="mt-6 flex-row justify-end gap-3">
            <AlertDialogCancel
              onClick={onCancel}
              disabled={isLoading}
              className="mt-0 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
            >
              {cancelText}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirm}
              disabled={isLoading}
              className={`${buttonColor} rounded-lg px-4 py-2 text-sm font-semibold text-white`}
            >
              {isLoading ? 'Processing...' : confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
