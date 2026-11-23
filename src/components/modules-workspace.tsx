'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, BookOpen, CalendarDays, CheckCircle2, Download, FileText, Plus, Wallet } from 'lucide-react';
import type { Role } from '@/lib/models';

type Option = { id: string; name: string; admissionNo?: string; email?: string; role?: string };
type Row = Record<string, unknown>;
type Props = { role: Role; userId: string; classes: Option[]; students: Option[]; staff: Option[]; initialPayroll: {id:string;month:string;amount:number;status:string}[] };
const tabs = ['Fees','Payroll','Timetable','Homework','Notices','Report cards'];
const field = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100';
const label = 'block text-sm font-medium text-slate-700';
const dateValue = (offset = 0) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

export function ModulesWorkspace({ role, classes, students, staff, initialPayroll }: Props) {
  const availableTabs = role === 'admin' ? tabs : role === 'teacher' ? ['Payroll','Timetable','Homework','Notices'] : ['Fees','Timetable','Homework','Notices','Report cards'];
  const [active, setActive] = useState(availableTabs[0]);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<Record<string,string>>({ dueDate: dateValue(7), month: new Date().toISOString().slice(0,7), day: 'Monday', startTime: '09:00', endTime: '10:00', audience: 'all' });
  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const kindByTab: Record<string,string> = { Fees:'fees', Payroll:'payroll', Timetable:'timetable', Homework:'homework', Notices:'notices' };

  useEffect(() => {
    let alive = true;
    const kind = kindByTab[active];
    if (!kind) { setRows([]); return; }
    fetch(`/api/modules?kind=${kind}`, { cache: 'no-store' }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (alive) setRows(Array.isArray(result) ? result : []);
    }).catch(error => { if (alive) setMessage(error instanceof Error ? error.message : 'Unable to load records.'); });
    return () => { alive = false; };
  }, [active]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const kind = ({ Fees:'fee', Payroll:'payroll', Timetable:'timetable', Homework:'homework', Notices:'notice' } as Record<string,string>)[active];
    const payload: Record<string, unknown> = { ...form };
    if (['Fees','Payroll'].includes(active)) payload.amount = Number(form.amount);
    if (['Fees','Homework'].includes(active)) payload.dueDate = new Date(`${form.dueDate}T12:00:00.000Z`).toISOString();
    try {
      const response = await fetch('/api/modules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, data: payload }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save.');
      setMessage('Saved successfully.');
      const refreshed = await fetch(`/api/modules?kind=${kind}`, { cache: 'no-store' }).then(r => r.json());
      setRows(Array.isArray(refreshed) ? refreshed : []);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save.'); }
    finally { setBusy(false); }
  }

  const headingIcon = active === 'Fees' || active === 'Payroll' ? <Wallet size={19}/> : active === 'Timetable' ? <CalendarDays size={19}/> : active === 'Homework' ? <BookOpen size={19}/> : active === 'Notices' ? <Bell size={19}/> : <FileText size={19}/>;
  return <main className="min-h-screen bg-slate-50 text-slate-900"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-5"><Link href="/dashboard" aria-label="Back to dashboard" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><ArrowLeft size={18}/></Link><div><h1 className="text-xl font-bold">School tools</h1><p className="text-sm text-slate-500">Manage day-to-day school operations.</p></div></div></header><div className="mx-auto max-w-7xl px-5 py-7"><nav className="mb-6 flex gap-2 overflow-x-auto pb-2">{availableTabs.map(tab=><button key={tab} onClick={()=>{setActive(tab);setMessage('')}} className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold ${active===tab?'bg-blue-900 text-white':'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'}`}>{tab}</button>)}</nav><div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,.7fr)]"><section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4"><span className="text-blue-900">{headingIcon}</span><div><h2 className="font-bold">{active}</h2><p className="text-xs text-slate-500">{active === 'Report cards' ? 'Download an individual student report as a PDF.' : 'Recent records for your school.'}</p></div></div>{active === 'Report cards' ? <div className="p-6"><p className="text-sm leading-6 text-slate-600">Your report card includes recorded exam results and attendance. Student and parent accounts can download the linked student’s report.</p><a href="/api/report-card" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"><Download size={16}/>Download report card PDF</a></div> : <Records tab={active} rows={rows} role={role} initialPayroll={initialPayroll}/>}</section>{active === 'Report cards' || (active === 'Fees' && role !== 'admin') ? <aside className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-bold">Helpful information</h3><p className="mt-2 text-sm leading-6 text-slate-600">For questions about fees or report card records, please contact your school administrator.</p></aside> : <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="mb-4 flex items-center gap-2"><Plus size={18} className="text-teal-700"/><h2 className="font-bold">Add {active.toLowerCase().replace(/s$/, '')}</h2></div><form onSubmit={submit} className="space-y-4">
    {active === 'Fees' && <><label className={label}>Student<select required className={field} value={form.studentId||''} onChange={e=>update('studentId',e.target.value)}><option value="">Select student</option>{students.map(s=><option key={s.id} value={s.id}>{s.name} · {s.admissionNo}</option>)}</select></label><TextField name="title" title="Fee description" placeholder="Tuition fee" form={form} update={update}/><TextField name="amount" title="Amount" type="number" placeholder="0.00" form={form} update={update}/><TextField name="dueDate" title="Due date" type="date" form={form} update={update}/></>}
    {active === 'Payroll' && <><label className={label}>Staff member<select required className={field} value={form.userId||''} onChange={e=>update('userId',e.target.value)}><option value="">Select staff member</option>{staff.map(s=><option key={s.id} value={s.id}>{s.name} · {s.role}</option>)}</select></label><TextField name="month" title="Payroll month" type="month" form={form} update={update}/><TextField name="amount" title="Amount" type="number" placeholder="0.00" form={form} update={update}/></>}
    {active === 'Timetable' && <><SelectField name="classId" title="Class" items={classes} form={form} update={update}/><label className={label}>Day<select className={field} value={form.day} onChange={e=>update('day',e.target.value)}>{['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d=><option key={d}>{d}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><TextField name="startTime" title="Starts" type="time" form={form} update={update}/><TextField name="endTime" title="Ends" type="time" form={form} update={update}/></div><TextField name="subject" title="Subject" placeholder="Mathematics" form={form} update={update}/><TextField name="room" title="Room (optional)" placeholder="Room 12" form={form} update={update}/></>}
    {active === 'Homework' && <><SelectField name="classId" title="Class" items={classes} form={form} update={update}/><TextField name="title" title="Assignment title" placeholder="Chapter review" form={form} update={update}/><TextField name="subject" title="Subject" placeholder="Mathematics" form={form} update={update}/><label className={label}>Instructions<textarea className={field} rows={3} maxLength={3000} value={form.description||''} onChange={e=>update('description',e.target.value)}/></label><TextField name="dueDate" title="Due date" type="date" form={form} update={update}/></>}
    {active === 'Notices' && <><TextField name="title" title="Notice title" placeholder="School event" form={form} update={update}/><label className={label}>Audience<select className={field} value={form.audience} onChange={e=>update('audience',e.target.value)}><option value="all">Everyone</option><option value="parents">Parents</option><option value="students">Students</option><option value="teachers">Teachers</option></select></label><label className={label}>Message<textarea required className={field} rows={5} maxLength={4000} value={form.message||''} onChange={e=>update('message',e.target.value)} /></label></>}
    {message && <p role="status" className="text-sm text-slate-600">{message}</p>}<button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy?'Saving…':<><CheckCircle2 size={16}/>Save</>}</button></form></section>}</div></div></main>;
}
function TextField({name,title,type='text',placeholder,form,update}:{name:string;title:string;type?:string;placeholder?:string;form:Record<string,string>;update:(name:string,value:string)=>void}) { return <label className={label}>{title}<input required={name!=='room'} className={field} type={type} placeholder={placeholder} min={type==='number'?'0':undefined} step={type==='number'?'0.01':undefined} value={form[name]||''} onChange={e=>update(name,e.target.value)}/></label>; }
function SelectField({name,title,items,form,update}:{name:string;title:string;items:Option[];form:Record<string,string>;update:(name:string,value:string)=>void}) { return <label className={label}>{title}<select required className={field} value={form[name]||''} onChange={e=>update(name,e.target.value)}><option value="">Select {title.toLowerCase()}</option>{items.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>; }
function Records({tab,rows,role,initialPayroll}:{tab:string;rows:Row[];role:Role;initialPayroll:Props['initialPayroll']}) {
  const records = tab === 'Payroll' && role === 'teacher' ? initialPayroll : rows;
  if (!records.length) return <p className="px-5 py-12 text-center text-sm text-slate-500">No {tab.toLowerCase()} records yet.</p>;
  return <div className="divide-y divide-slate-100">{records.map((row,index)=>{const student=row.studentId as {name?:string;admissionNo?:string}|undefined;const staff=row.userId as {name?:string}|undefined;const classroom=row.classId as {name?:string;section?:string}|undefined;return <article key={String(row._id??row.id??index)} className="px-5 py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">{String(row.title??row.subject??(tab==='Payroll'?staff?.name:'')??'')}</h3><p className="mt-1 text-xs text-slate-500">{student?`${student.name} · ${student.admissionNo}`:classroom?`${classroom.name} ${classroom.section??''}`:staff?.name??String(row.audience??'')}</p></div><span className="text-sm font-semibold text-slate-700">{row.amount!==undefined?Number(row.amount).toLocaleString(undefined,{style:'currency',currency:'USD'}):String(row.status??'')}</span></div><p className="mt-2 text-xs leading-5 text-slate-600">{tab==='Timetable'?`${String(row.day)} · ${String(row.startTime)}–${String(row.endTime)}${row.room?` · ${String(row.room)}`:''}`:tab==='Homework'?`Due ${new Date(String(row.dueDate)).toLocaleDateString()}${row.description?` · ${String(row.description)}`:''}`:tab==='Fees'?`Due ${new Date(String(row.dueDate)).toLocaleDateString()}`:tab==='Payroll'?String(row.month):String(row.message??'')}</p></article>})}</div>;
}
