"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X, ArrowRight, LoaderCircle } from "lucide-react";
export function Brand() {
  return (
    <div className="brand">
      <svg width="36" height="38" viewBox="0 0 36 38" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <path
            key={i}
            d="M18 18 C12 13 12 6 17 5 C23 4 25 11 18 18Z"
            fill="currentColor"
            transform={`rotate(${i * 60} 18 19)`}
          />
        ))}
      </svg>
      <div>
        <strong>
          aftercare<span className="brand-dot">.</span>
        </strong>
        <span>A little care. Every day.</span>
      </div>
    </div>
  );
}
export function ArrowLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="text-button" onClick={onClick}>
      {children}
      <ArrowRight size={16} />
    </button>
  );
}
export function Spinner() {
  return <LoaderCircle size={18} className="spin" aria-label="Loading" />;
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const node = ref.current;
    node?.showModal();
    const handler = (e: Event) => {
      e.preventDefault();
      closeRef.current();
    };
    node?.addEventListener("cancel", handler);
    return () => {
      node?.removeEventListener("cancel", handler);
      node?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modal-wide" : ""}`}
      aria-labelledby="modal-heading"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-inner">
        <div className="modal-header">
          <h2 id="modal-heading">{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
