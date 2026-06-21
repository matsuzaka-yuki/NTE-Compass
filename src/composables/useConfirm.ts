import { reactive } from 'vue'

interface ConfirmState {
  open: boolean
  message: string
  confirmLabel: string
  cancelLabel: string
  tone: 'primary' | 'danger'
  resolve: ((v: boolean) => void) | null
}

/** Global confirm-dialog state. Driven by `useConfirm()`; rendered once by `<ConfirmHost>`. */
export const confirmState = reactive<ConfirmState>({
  open: false,
  message: '',
  confirmLabel: '确定',
  cancelLabel: '取消',
  tone: 'primary',
  resolve: null,
})

export interface ConfirmOptions {
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'primary' | 'danger'
}

/**
 * Promise-based confirm. Returns true if the user confirmed, false otherwise.
 * Mount `<ConfirmHost>` once in App.vue for the dialog to actually render.
 */
export function useConfirm() {
  function confirm(options: ConfirmOptions | string): Promise<boolean> {
    const opts = typeof options === 'string' ? { message: options } : options
    return new Promise<boolean>((resolve) => {
      confirmState.message = opts.message
      confirmState.confirmLabel = opts.confirmLabel ?? '确定'
      confirmState.cancelLabel = opts.cancelLabel ?? '取消'
      confirmState.tone = opts.tone ?? 'primary'
      confirmState.resolve = resolve
      confirmState.open = true
    })
  }
  return { confirm }
}

/** Called by the host component. */
export function resolveConfirm(value: boolean) {
  if (confirmState.resolve) confirmState.resolve(value)
  confirmState.resolve = null
  confirmState.open = false
}
