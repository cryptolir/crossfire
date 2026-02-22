import React, { useRef } from 'react';

const Empty = () => <div style={{ width: 52, height: 52 }} />;

function DBtn({ label, color, onStart, onEnd }) {
  const pressedRef = useRef(false);

  const handlePointerDown = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    pressedRef.current = true;
    onStart();
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    if (!pressedRef.current) return;
    pressedRef.current = false;
    onEnd();
  };

  return (
    <div
      style={{
        width: 52, height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: color === 'blue' ? 'rgba(30,58,138,0.6)' : 'rgba(127,29,29,0.6)',
        border: `2px solid ${color === 'blue' ? '#60a5fa' : '#f97316'}`,
        borderRadius: 12,
        color: color === 'blue' ? '#bfdbfe' : '#fdba74',
        fontSize: 22,
        fontWeight: 'bold',
        touchAction: 'none',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        cursor: 'pointer',
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {label}
    </div>
  );
}

export function MovePad({ keysPressed }) {
  const handleStart = (key) => { keysPressed.current[key] = true; };
  const handleEnd = (key) => { keysPressed.current[key] = false; };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '0 4px' }}>
      <div style={{ color: '#67e8f9', fontSize: 9, fontWeight: 'bold', letterSpacing: 2, marginBottom: 2 }}>MOVE</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 52px)', gridTemplateRows: 'repeat(3, 52px)', gap: 4 }}>
        <Empty />
        <DBtn label="▲" color="blue" onStart={() => handleStart('ArrowUp')} onEnd={() => handleEnd('ArrowUp')} />
        <Empty />
        <DBtn label="◀" color="blue" onStart={() => handleStart('ArrowLeft')} onEnd={() => handleEnd('ArrowLeft')} />
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(30,58,138,0.15)', border: '1px solid rgba(96,165,250,0.15)' }} />
        <DBtn label="▶" color="blue" onStart={() => handleStart('ArrowRight')} onEnd={() => handleEnd('ArrowRight')} />
        <Empty />
        <DBtn label="▼" color="blue" onStart={() => handleStart('ArrowDown')} onEnd={() => handleEnd('ArrowDown')} />
        <Empty />
      </div>
    </div>
  );
}

export function FirePad({ keysPressed }) {
  const fireTimers = useRef({});

  const handleStart = (key) => {
    keysPressed.current[key] = true;
    clearInterval(fireTimers.current[key]);
    fireTimers.current[key] = setInterval(() => { keysPressed.current[key] = true; }, 40);
  };

  const handleEnd = (key) => {
    keysPressed.current[key] = false;
    clearInterval(fireTimers.current[key]);
    delete fireTimers.current[key];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '0 4px' }}>
      <div style={{ color: '#fb923c', fontSize: 9, fontWeight: 'bold', letterSpacing: 2, marginBottom: 2 }}>FIRE</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 52px)', gridTemplateRows: 'repeat(3, 52px)', gap: 4 }}>
        <Empty />
        <DBtn label="⬆" color="red" onStart={() => handleStart('w')} onEnd={() => handleEnd('w')} />
        <Empty />
        <DBtn label="⬅" color="red" onStart={() => handleStart('a')} onEnd={() => handleEnd('a')} />
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(127,29,29,0.15)', border: '1px solid rgba(249,115,22,0.15)' }} />
        <DBtn label="➡" color="red" onStart={() => handleStart('d')} onEnd={() => handleEnd('d')} />
        <Empty />
        <DBtn label="⬇" color="red" onStart={() => handleStart('x')} onEnd={() => handleEnd('x')} />
        <Empty />
      </div>
    </div>
  );
}