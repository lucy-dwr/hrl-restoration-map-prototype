import { useEffect, useId, useRef, useState } from 'react'
import styles from './InfoPopover.module.css'

interface Props {
  label: string
  children: string
  placement?: 'top' | 'bottom'
}

export function InfoPopover({ label, children, placement = 'bottom' }: Props) {
  const [open, setOpen] = useState(false)
  const popoverId = useId()
  const rootRef = useRef<HTMLSpanElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <span className={styles.root} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-expanded={open}
        aria-controls={popoverId}
        aria-describedby={open ? popoverId : undefined}
        onClick={() => setOpen(current => !current)}
      >
        ?
      </button>
      {open && (
        <span
          id={popoverId}
          role="tooltip"
          className={placement === 'top' ? styles.popoverTop : styles.popoverBottom}
        >
          {children}
        </span>
      )}
    </span>
  )
}
