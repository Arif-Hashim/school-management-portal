import { LoginForm } from '@/components/login-form';
import Link from 'next/link';
import { BookOpenCheck } from 'lucide-react';

export default function LoginPage() {
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10"><div className="w-full max-w-md"><Link href="/" className="mb-8 flex justify-center items-center gap-3 font-bold text-slate-900"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-900 text-white"><BookOpenCheck size={21}/></span> Northstar School</Link><div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9"><p className="text-sm font-semibold text-teal-700">Welcome back</p><h1 className="mt-2 text-2xl font-bold">Sign in to your portal</h1><p className="mt-2 text-sm text-slate-500">Use the account provided by your school.</p><div className="mt-7"><LoginForm/></div></div><p className="mt-5 text-center text-xs text-slate-500">Need access? Contact your school administrator.</p></div></main>;
}
