import { ReactNode } from 'react';

interface Props {
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

export default function Modal({ onClose, children, maxWidth = 'max-w-md' }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className={`bg-cb-surface border border-cb-border rounded-xl w-full ${maxWidth} mx-4 p-6 max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
