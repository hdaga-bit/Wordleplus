import React from 'react'
export default function Board({ guesses }) {
  const rows = [...guesses, ...Array(Math.max(0, 6 - guesses.length)).fill({ guess: '', pattern: [] })].slice(0,6)
  return (<div style={{ display:'grid', gap:6 }}>
    {rows.map((row, idx) => (<div key={idx} style={{ display:'grid', gridTemplateColumns:'repeat(5, 48px)', gap:6 }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const ch = row.guess?.[i] || ''; const state = row.pattern?.[i] || 'empty'
        const bg = state==='green' ? '#6aaa64' : state==='yellow' ? '#c9b458' : state==='gray' ? '#787c7e' : '#fff'
        const color = state==='empty' ? '#000' : '#fff'
        return (<div key={i} style={{ height:48, border:'1px solid #ccc', display:'grid', placeItems:'center', background:bg, color, fontWeight:'bold', textTransform:'uppercase' }}>{ch}</div>)
      })}
    </div>))}
  </div>)
}