import React, { useEffect, useMemo, useState } from 'react'
import { socket } from './socket'
import Board from './components/Board.jsx'
import { validateWord } from './api'

function useRoomState() {
  const [room, setRoom] = useState(null)
  useEffect(() => {
    const onState = (data) => setRoom(data)
    socket.on('roomState', onState)
    return () => socket.off('roomState', onState)
  }, [])
  return [room, setRoom]
}

export default function App() {
  const [screen, setScreen] = useState('home') // home | lobby | game
  const [name, setName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [mode, setMode] = useState('duel') // 'duel' | 'battle'

  // Duel
  const [secret, setSecret] = useState('')
  const [guess, setGuess] = useState('')

  // Battle
  const [hostWord, setHostWord] = useState('')

  const [msg, setMsg] = useState('')
  const [room, setRoom] = useRoomState()

  const me = useMemo(() => room?.players && room.players[socket.id], [room])
  const players = useMemo(() => room?.players ? Object.entries(room.players).map(([id, p]) => ({ id, ...p })) : [], [room])
  const isHost = room?.hostId === socket.id

  function create() {
    socket.emit('createRoom', { name, mode }, (resp) => {
      if (resp?.roomId) { setRoomId(resp.roomId); setScreen('lobby'); }
    })
  }
  function join() {
    socket.emit('joinRoom', { name, roomId }, (resp) => {
      if (resp?.error) setMsg(resp.error); else setScreen('lobby')
    })
  }

  // Duel helpers
  async function submitSecret() {
    const v = await validateWord(secret)
    if (!v.valid) { setMsg('Secret must be a valid 5-letter word'); return; }
    socket.emit('setSecret', { roomId, secret })
  }
  async function submitGuess() {
    const v = await validateWord(guess)
    if (!v.valid) { setMsg('Guess must be a valid 5-letter word'); return; }
    socket.emit('makeGuess', { roomId, guess }, (resp) => {
      if (resp?.error) setMsg(resp.error)
      setGuess('')
    })
  }

  // Battle helpers
  async function setWordAndStart() {
    const v = await validateWord(hostWord)
    if (!v.valid) { setMsg('Host word must be valid'); return; }
    socket.emit('setHostWord', { roomId, secret: hostWord }, (r) => {
      if (r?.error) return setMsg(r.error);
      socket.emit('startBattle', { roomId }, (r2) => {
        if (r2?.error) setMsg(r2.error)
      })
    })
  }
  async function battleGuess(g) {
    const v = await validateWord(g)
    if (!v.valid) { setMsg('Guess must be a valid 5-letter word'); return; }
    socket.emit('makeGuess', { roomId, guess: g }, (resp) => {
      if (resp?.error) setMsg(resp.error)
    })
  }
  function playAgain(keepWord) {
    socket.emit('playAgain', { roomId, keepWord }, (r) => {
      if (r?.error) setMsg(r.error)
    })
  }

  useEffect(() => {
    if (room?.mode === 'duel' && room?.started) setScreen('game')
    if (room?.mode === 'battle' && (room?.battle?.started || room?.battle?.winner || room?.battle?.reveal)) setScreen('game')
  }, [room?.started, room?.battle?.started, room?.battle?.winner, room?.battle?.reveal, room?.mode])

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 980, margin: '24px auto', padding: 16 }}>
      <h1>Friendle Clone</h1>
      {screen === 'home' && (
        <div style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
          <input placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} />
          <div>
            <label><input type="radio" name="mode" checked={mode==='duel'} onChange={()=>setMode('duel')} /> Duel (1v1)</label>{' '}
            <label style={{ marginLeft: 16 }}><input type="radio" name="mode" checked={mode==='battle'} onChange={()=>setMode('battle')} /> Battle Royale</label>
          </div>
          <button disabled={!name} onClick={create}>Create Room</button>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr auto' }}>
            <input placeholder="Room ID" value={roomId} onChange={e=>setRoomId(e.target.value.toUpperCase())} />
            <button disabled={!name || !roomId} onClick={join}>Join</button>
          </div>
          {!!msg && <p style={{color:'crimson'}}>{msg}</p>}
        </div>
      )}

      {screen === 'lobby' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <p><b>Room:</b> {roomId} • <b>Mode:</b> {room?.mode}</p>

          {room?.mode === 'duel' ? (
            <>
              <p>Pick a secret five-letter word for your opponent to guess.</p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input placeholder="Secret word" value={secret} onChange={e=>setSecret(e.target.value)} maxLength={5} />
                <button onClick={submitSecret}>Set Secret</button>
              </div>
              <PlayersList players={players} hostId={room?.hostId} />
              <p>Game {room?.started ? 'started!' : 'waiting for both players...'}</p>
            </>
          ) : (
            <>
              <p>Battle Royale: The host sets a single secret word. Everyone else tries to guess it. First correct guess wins. Each player has 6 guesses.</p>
              {isHost ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input placeholder="Host secret word" value={hostWord} onChange={e=>setHostWord(e.target.value)} maxLength={5} />
                  <button onClick={setWordAndStart}>Start Battle</button>
                  <span style={{opacity:0.7}}>{room?.battle?.hasSecret ? 'Word set' : 'No word yet'}</span>
                </div>
              ) : (
                <p>Waiting for host to start…</p>
              )}
              <PlayersList players={players} hostId={room?.hostId} />
            </>
          )}

          {!!msg && <p style={{color:'crimson'}}>{msg}</p>}
        </div>
      )}

      {screen === 'game' && room?.mode === 'duel' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <PlayersList players={players} hostId={room?.hostId} />
          <Board guesses={me?.guesses || []} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input placeholder="Your guess" value={guess} onChange={e=>setGuess(e.target.value)} maxLength={5} />
            <button onClick={submitGuess}>Guess</button>
          </div>
          {room?.winner && <p><b>Winner:</b> {room.winner === 'draw' ? 'Draw' : (room.winner === socket.id ? 'You' : 'Opponent')}</p>}
          {!!msg && <p style={{color:'crimson'}}>{msg}</p>}
        </div>
      )}

      {screen === 'game' && room?.mode === 'battle' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <PlayersList players={players} hostId={room?.hostId} showProgress />
          <Board guesses={me?.guesses || []} />
          {room?.battle?.started ? (
            <BattleInput onSubmit={battleGuess} />
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {room?.battle?.winner ? (
                <p><b>Winner:</b> {room.battle.winner === socket.id ? 'You' : players.find(p=>p.id===room.battle.winner)?.name || 'Unknown'}</p>
              ) : room?.battle?.reveal ? (
                <p><b>No winner.</b> The word was <code>{room.battle.reveal}</code>.</p>
              ) : (
                <p>Waiting for host…</p>
              )}
              {isHost && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={()=>playAgain(true)}>Play again (same word)</button>
                  <button onClick={()=>playAgain(false)}>Play again (new word)</button>
                  {!room?.battle?.hasSecret && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input placeholder="New host word" value={hostWord} onChange={e=>setHostWord(e.target.value)} maxLength={5} />
                      <button onClick={setWordAndStart}>Start Battle</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {!!msg && <p style={{color:'crimson'}}>{msg}</p>}
        </div>
      )}
    </div>
  )
}

function PlayersList({ players, hostId, showProgress }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <b>Players</b>
      <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        {players.map(p => (
          <div key={p.id} style={{ border: '1px solid #ddd', padding: 10, borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div><b>{p.name}</b>{p.id===hostId ? ' (Host)': ''}</div>
              {showProgress && <div>{p.done ? 'Done' : `${(p.guesses?.length||0)}/6`}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BattleInput({ onSubmit }) {
  const [g, setG] = useState('')
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input placeholder="Your guess" value={g} onChange={e=>setG(e.target.value)} maxLength={5} />
      <button onClick={()=>{ onSubmit(g); setG('') }}>Guess</button>
    </div>
  )
}
