import { ReactNode } from 'react';

interface Props {
  title: string;
  action?: ReactNode;
}

export default function PageHeader({ title, action }: Props) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      {action}
    </div>
  );
}
