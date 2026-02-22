import React, { useRef } from 'react';

export default function MobileControls({ keysPressed, onPause }) {
  const fireIntervals = useRef({});

  const handleMoveStart = (key) => { keysPressed.current[key] = true; };
  const handleMoveEnd = (key) => { keysPressed.current[key] = false; };

  const handleFireStart = (key) => {
    keysPressed.current[key] = true;
    clearInterval(fireIntervals.current[key]);
    fireIntervals.current[key] = setInterval(() => {
      keysPressed.current[key] = true;
    }, 40);
  };

  const handleFireEnd = (key) => {
    keysPressed.current[key] = false;
    clearInterval(fireIntervals.current[key]);
    delete fireIntervals.current[key];
  };

  const MoveBtn = ({ moveKey, label }) => (
    <button
      className="w-16 h-16 flex items-center justify-center bg-blue-900/90 border-2 border-blue-400 rounded-2xl text-blue-200 text-2xl font-bold active:bg-blue-500 select-none"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => { e.preventDefault(); handleMoveStart(moveKey); }}
      onPointerUp={(e) => { e.preventDefault(); handleMoveEnd(moveKey); }}
      onPointerLeave={(e) => { e.preventDefault(); handleMoveEnd(moveKey); }}
    >
      {label}
    </button>
  );

  const FireBtn = ({ fireKey, label }) => (
    <button
      className="w-16 h-16 flex items-center justify-center bg-red-900/90 border-2 border-orange-400 rounded-2xl text-orange-300 text-2xl font-bold active:bg-red-600 select-none"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => { e.preventDefault(); handleFireStart(fireKey); }}
      onPointerUp={(e) => { e.preventDefault(); handleFireEnd(fireKey); }}
      onPointerLeave={(e) => { e.preventDefault(); handleFireEnd(fireKey); }}
    >
      {label}
    </button>
  );

  const Empty = () => <div className="w-16 h-16" />;

  return (
    <div className="flex w-full items-center justify-between px-3 pt-2 pb-4" style={{ touchAction: 'none' }}>
      {/* Left: Movement D-pad */}
      <div className="flex flex-col items-center">
        <div className="text-cyan-400 text-xs font-bold mb-1 tracking-widest">MOVE</div>
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(3, 4rem)', gridTemplateRows: 'repeat(3, 4rem)' }}>
          <Empty />
          <MoveBtn moveKey="ArrowUp" label="▲" />
          <Empty />
          <MoveBtn moveKey="ArrowLeft" label="◀" />
          <div className="w-16 h-16 rounded-full bg-blue-900/20 border border-blue-900/50 self-center justify-self-center" style={{width:'2rem',height:'2rem',margin:'auto'}} />
          <MoveBtn moveKey="ArrowRight" label="▶" />
          <Empty />
          <MoveBtn moveKey="ArrowDown" label="▼" />
          <Empty />
        </div>
      </div>

      {/* Center: Pause */}
      <button
        className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-xl text-gray-300 text-lg font-bold active:bg-gray-600 select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => { e.preventDefault(); onPause(); }}
      >
        ⏸
      </button>

      {/* Right: Fire pad */}
      <div className="flex flex-col items-center">
        <div className="text-orange-400 text-xs font-bold mb-1 tracking-widest">FIRE</div>
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(3, 4rem)', gridTemplateRows: 'repeat(3, 4rem)' }}>
          <Empty />
          <FireBtn fireKey="w" label="⬆" />
          <Empty />
          <FireBtn fireKey="a" label="⬅" />
          <div className="w-16 h-16 rounded-full bg-red-900/20 border border-red-900/50 self-center justify-self-center" style={{width:'2rem',height:'2rem',margin:'auto'}} />
          <FireBtn fireKey="d" label="➡" />
          <Empty />
          <FireBtn fireKey="x" label="⬇" />
          <Empty />
        </div>
      </div>
    </div>
  );
}