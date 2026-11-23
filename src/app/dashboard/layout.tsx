import Link from 'next/link';
import { Wrench } from 'lucide-react';

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><div className="flex items-center justify-end border-b border-slate-100 bg-white px-5 py-2 lg:pr-8"><Link href="/dashboard/modules" className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-blue-900 hover:bg-blue-50"><Wrench size={14}/> School tools</Link></div>{children}</>;
}
