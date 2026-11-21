import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

type ModalProps = {
  title: string;
  subtitle?: string;
  busy?: boolean;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({ title, subtitle, busy, children, onClose }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      className="workspace-modal"
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={event => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={event => {
        if (!busy && event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-content">
        <header className="modal-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" type="button" aria-label="Close dialog" disabled={busy} onClick={onClose}><X size={21} aria-hidden="true" /></button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
