import { useEffect, useRef, useState } from 'react';
import type { InternalDispatch } from '../../domain/internalDispatch';
import { paginateRemission, type RemissionPage } from '../../domain/remissionLayout';
import { InternalPrintHeader, InternalPrintTable, internalClosing } from './InternalPrintSections';
import '../remission/remission.css';
import './internal-print.css';

export function InternalPrintDocument({loan,scale,onReady}:{loan:InternalDispatch;scale:number;onReady:(ready:boolean)=>void}) {
  const measure=useRef<HTMLDivElement>(null),[pages,setPages]=useState<RemissionPage[]>([]),closing=internalClosing(loan);
  const footer=(page:number,total:number)=><footer className="rm-footer"><span>{loan.empresa.nombre} · Salida interna</span><span>Página {page} de {total}</span></footer>;
  useEffect(()=>{
    let cancelled=false;onReady(false);
    const calculate=()=>{if(cancelled||!measure.current)return;const node=measure.current,height=(selector:string)=>node.querySelector(selector)!.getBoundingClientRect().height;
      setPages(paginateRemission([...node.querySelectorAll('[data-internal-row]')].map(row=>row.getBoundingClientRect().height+1),[...node.querySelectorAll('[data-internal-closing]')].map(row=>row.getBoundingClientRect().height),1122-72-height('.ip-header')-height('.rm-footer')-20,height('thead')));onReady(true);};
    const logo=measure.current?.querySelector('img');void Promise.all([document.fonts?.ready,logo?.decode?.().catch(()=>{})]).then(calculate);return()=>{cancelled=true;};
  },[loan,onReady]);
  const end=(indices:number[])=>indices.map(i=><div data-internal-closing key={i} className="ip-closing">{closing[i]}</div>);
  return <><div ref={measure} className="rm-measure" aria-hidden="true"><div className="rm-content"><InternalPrintHeader loan={loan}/><InternalPrintTable loan={loan} indices={loan.items.map((_,i)=>i)}/>{end(closing.map((_,i)=>i))}{footer(1,1)}</div></div>
    <div className="rm-document" style={{width:794*scale,height:(pages.length*1122+Math.max(0,pages.length-1)*20)*scale}}><div className="rm-sheets" style={{transform:`scale(${scale})`}}>{pages.map((page,index)=><section key={index} className="a4-print-container rm-sheet" aria-label={`Salida interna, página ${index+1} de ${pages.length}`}><div className="rm-content"><InternalPrintHeader loan={loan}/>{!!page.rows.length&&<InternalPrintTable loan={loan} indices={page.rows}/>} {end(page.closing)}{footer(index+1,pages.length)}</div></section>)}</div></div></>;
}
