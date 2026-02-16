import React, { useState, useEffect, useRef, useCallback } from 'react';

// Grid is 7x7 blocks with streets in between
const GRID_BLOCKS = 7;
const BLOCK_SIZE = 60;
const STREET_WIDTH = 20;
const TOTAL_SIZE = GRID_BLOCKS * (BLOCK_SIZE + STREET_WIDTH) + STREET_WIDTH;
const INITIAL_LIVES = 3;
const INITIAL_AMMO = 50;
const AMMO_PACK_AMOUNT = 30;
const CRYSTAL_VALUES = [100, 200, 400, 800];
const EXTRA_LIFE_SCORE = 5000;
const MAX_BULLETS_PER_STREET = 2;

const SHIP_IMAGE = "data:image/png;base64,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";

const DIRECTIONS = {
  UP: { dx: 0, dy: -1 },
  DOWN: { dx: 0, dy: 1 },
  LEFT: { dx: -1, dy: 0 },
  RIGHT: { dx: 1, dy: 0 }
};

// Get all valid street positions
const getStreetPositions = () => {
  const positions = [];
  for (let i = 0; i <= GRID_BLOCKS; i++) {
    positions.push(STREET_WIDTH / 2 + i * (BLOCK_SIZE + STREET_WIDTH));
  }
  return positions;
};

const STREET_POSITIONS = getStreetPositions();

// Snap to nearest street
const snapToNearestStreet = (pos) => {
  let nearest = STREET_POSITIONS[0];
  let minDist = Math.abs(pos - nearest);
  
  for (let streetPos of STREET_POSITIONS) {
    const dist = Math.abs(pos - streetPos);
    if (dist < minDist) {
      minDist = dist;
      nearest = streetPos;
    }
  }
  return nearest;
};

// Get street index
const getStreetIndex = (pos) => {
  const snapped = snapToNearestStreet(pos);
  return STREET_POSITIONS.indexOf(snapped);
};

export default function Crossfire() {
  const [gameState, setGameState] = useState('menu');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [ammo, setAmmo] = useState(INITIAL_AMMO);
  const [player, setPlayer] = useState({ 
    x: STREET_POSITIONS[3], 
    y: STREET_POSITIONS[3],
    targetX: STREET_POSITIONS[3],
    targetY: STREET_POSITIONS[3]
  });
  const [aliens, setAliens] = useState([]);
  const [bullets, setBullets] = useState([]);
  const [alienBullets, setAlienBullets] = useState([]);
  const [crystals, setCrystals] = useState([]);
  const [ammoPacks, setAmmoPacks] = useState([]);
  const [lastExtraLife, setLastExtraLife] = useState(0);
  const [invulnerable, setInvulnerable] = useState(false);
  
  const keysPressed = useRef({});
  const gameLoopRef = useRef(null);

  const startGame = () => {
    setGameState('playing');
    setLevel(1);
    setScore(0);
    setLives(INITIAL_LIVES);
    setAmmo(INITIAL_AMMO);
    setLastExtraLife(0);
    initLevel(1);
  };

  const initLevel = useCallback((levelNum) => {
    setPlayer({ x: STREET_POSITIONS[3], y: STREET_POSITIONS[3], targetX: STREET_POSITIONS[3], targetY: STREET_POSITIONS[3] });
    setBullets([]);
    setAlienBullets([]);
    setCrystals([]);
    setAmmoPacks([]);
    setInvulnerable(true);
    
    const newAliens = [];
    const alienCount = Math.min(1 + levelNum, 20);
    
    for (let i = 0; i < alienCount; i++) {
      const edge = Math.floor(Math.random() * 4);
      let x, y;
      
      if (edge === 0) { // top
        x = STREET_POSITIONS[Math.floor(Math.random() * STREET_POSITIONS.length)];
        y = STREET_POSITIONS[0];
      } else if (edge === 1) { // right
        x = STREET_POSITIONS[STREET_POSITIONS.length - 1];
        y = STREET_POSITIONS[Math.floor(Math.random() * STREET_POSITIONS.length)];
      } else if (edge === 2) { // bottom
        x = STREET_POSITIONS[Math.floor(Math.random() * STREET_POSITIONS.length)];
        y = STREET_POSITIONS[STREET_POSITIONS.length - 1];
      } else { // left
        x = STREET_POSITIONS[0];
        y = STREET_POSITIONS[Math.floor(Math.random() * STREET_POSITIONS.length)];
      }
      
      newAliens.push({
        id: i,
        x,
        y,
        lastMove: Date.now(),
        lastShot: Date.now()
      });
    }
    
    setAliens(newAliens);
    setTimeout(() => setInvulnerable(false), 2000);
  }, []);

  const spawnCrystal = useCallback(() => {
    setCrystals(prev => {
      if (prev.length >= 4) return prev;
      
      let x, y;
      let attempts = 0;
      do {
        x = STREET_POSITIONS[Math.floor(Math.random() * STREET_POSITIONS.length)];
        y = STREET_POSITIONS[Math.floor(Math.random() * STREET_POSITIONS.length)];
        attempts++;
      } while (attempts < 50 && prev.some(c => c.x === x && c.y === y));
      
      return [...prev, { x, y, value: CRYSTAL_VALUES[prev.length] }];
    });
  }, []);

  const spawnAmmoPack = useCallback(() => {
    const x = STREET_POSITIONS[Math.floor(Math.random() * STREET_POSITIONS.length)];
    const y = STREET_POSITIONS[Math.floor(Math.random() * STREET_POSITIONS.length)];
    setAmmoPacks(prev => [...prev, { x, y }]);
  }, []);

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysPressed.current[e.key] = true;
    };

    const handleKeyUp = (e) => {
      keysPressed.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    gameLoopRef.current = setInterval(() => {
      const now = Date.now();

      // Handle shooting (W, X, A, D)
      if (keysPressed.current['w'] || keysPressed.current['W']) {
        keysPressed.current['w'] = false;
        keysPressed.current['W'] = false;
        
        setAmmo(prevAmmo => {
          if (prevAmmo <= 0) return prevAmmo;
          
          setPlayer(p => {
            setBullets(prevBullets => {
              const xIdx = getStreetIndex(p.x);
              const bulletsInStreet = prevBullets.filter(b => 
                getStreetIndex(b.x) === xIdx && b.dy !== 0
              ).length;
              
              if (bulletsInStreet < MAX_BULLETS_PER_STREET) {
                return [...prevBullets, {
                  id: Date.now() + Math.random(),
                  x: p.x,
                  y: p.y,
                  dx: 0,
                  dy: -5
                }];
              }
              return prevBullets;
            });
            return p;
          });
          
          return prevAmmo - 1;
        });
      }

      if (keysPressed.current['x'] || keysPressed.current['X']) {
        keysPressed.current['x'] = false;
        keysPressed.current['X'] = false;
        
        setAmmo(prevAmmo => {
          if (prevAmmo <= 0) return prevAmmo;
          
          setPlayer(p => {
            setBullets(prevBullets => {
              const xIdx = getStreetIndex(p.x);
              const bulletsInStreet = prevBullets.filter(b => 
                getStreetIndex(b.x) === xIdx && b.dy !== 0
              ).length;
              
              if (bulletsInStreet < MAX_BULLETS_PER_STREET) {
                return [...prevBullets, {
                  id: Date.now() + Math.random(),
                  x: p.x,
                  y: p.y,
                  dx: 0,
                  dy: 5
                }];
              }
              return prevBullets;
            });
            return p;
          });
          
          return prevAmmo - 1;
        });
      }

      if (keysPressed.current['a'] || keysPressed.current['A']) {
        keysPressed.current['a'] = false;
        keysPressed.current['A'] = false;
        
        setAmmo(prevAmmo => {
          if (prevAmmo <= 0) return prevAmmo;
          
          setPlayer(p => {
            setBullets(prevBullets => {
              const yIdx = getStreetIndex(p.y);
              const bulletsInStreet = prevBullets.filter(b => 
                getStreetIndex(b.y) === yIdx && b.dx !== 0
              ).length;
              
              if (bulletsInStreet < MAX_BULLETS_PER_STREET) {
                return [...prevBullets, {
                  id: Date.now() + Math.random(),
                  x: p.x,
                  y: p.y,
                  dx: -5,
                  dy: 0
                }];
              }
              return prevBullets;
            });
            return p;
          });
          
          return prevAmmo - 1;
        });
      }

      if (keysPressed.current['d'] || keysPressed.current['D']) {
        keysPressed.current['d'] = false;
        keysPressed.current['D'] = false;
        
        setAmmo(prevAmmo => {
          if (prevAmmo <= 0) return prevAmmo;
          
          setPlayer(p => {
            setBullets(prevBullets => {
              const yIdx = getStreetIndex(p.y);
              const bulletsInStreet = prevBullets.filter(b => 
                getStreetIndex(b.y) === yIdx && b.dx !== 0
              ).length;
              
              if (bulletsInStreet < MAX_BULLETS_PER_STREET) {
                return [...prevBullets, {
                  id: Date.now() + Math.random(),
                  x: p.x,
                  y: p.y,
                  dx: 5,
                  dy: 0
                }];
              }
              return prevBullets;
            });
            return p;
          });
          
          return prevAmmo - 1;
        });
      }

      // Move player with arrow keys - smooth movement along streets
      setPlayer(prevPlayer => {
        let newTargetX = prevPlayer.targetX;
        let newTargetY = prevPlayer.targetY;
        const currentXIdx = getStreetIndex(prevPlayer.targetX);
        const currentYIdx = getStreetIndex(prevPlayer.targetY);
        
        // Only allow new input if player has reached target
        const atTarget = Math.abs(prevPlayer.x - prevPlayer.targetX) < 2 && 
                         Math.abs(prevPlayer.y - prevPlayer.targetY) < 2;
        
        if (atTarget) {
          if (keysPressed.current['ArrowUp']) {
            const nextIdx = currentYIdx > 0 ? currentYIdx - 1 : STREET_POSITIONS.length - 1;
            newTargetY = STREET_POSITIONS[nextIdx];
            keysPressed.current['ArrowUp'] = false;
          }
          if (keysPressed.current['ArrowDown']) {
            const nextIdx = currentYIdx < STREET_POSITIONS.length - 1 ? currentYIdx + 1 : 0;
            newTargetY = STREET_POSITIONS[nextIdx];
            keysPressed.current['ArrowDown'] = false;
          }
          if (keysPressed.current['ArrowLeft']) {
            const nextIdx = currentXIdx > 0 ? currentXIdx - 1 : STREET_POSITIONS.length - 1;
            newTargetX = STREET_POSITIONS[nextIdx];
            keysPressed.current['ArrowLeft'] = false;
          }
          if (keysPressed.current['ArrowRight']) {
            const nextIdx = currentXIdx < STREET_POSITIONS.length - 1 ? currentXIdx + 1 : 0;
            newTargetX = STREET_POSITIONS[nextIdx];
            keysPressed.current['ArrowRight'] = false;
          }
        }
        
        // Smooth interpolation towards target
        const moveSpeed = 0.15;
        const newX = prevPlayer.x + (newTargetX - prevPlayer.x) * moveSpeed;
        const newY = prevPlayer.y + (newTargetY - prevPlayer.y) * moveSpeed;
        
        return { x: newX, y: newY, targetX: newTargetX, targetY: newTargetY };
      });

      // Move aliens
      setAliens(prev => {
        return prev.map(alien => {
          // Skip movement logic here - handled by smooth interpolation below
          if (!alien.targetX) alien.targetX = alien.x;
          if (!alien.targetY) alien.targetY = alien.y;
          
          const baseSpeed = 0.03; // 40% slower base speed
          const speedMultiplier = 1 + (level - 1) * 0.02; // 2% faster each level
          const moveSpeed = baseSpeed * speedMultiplier;
          
          // Update target periodically
          const atTarget = Math.abs(alien.x - alien.targetX) < 2 && Math.abs(alien.y - alien.targetY) < 2;
          if (atTarget && now - alien.lastMove > 500) {
            alien.lastMove = now;
          
          setPlayer(p => {
              const dx = p.x - alien.x;
              const dy = p.y - alien.y;
              
              // Set new target along streets towards player
              if (Math.abs(dx) > Math.abs(dy)) {
                const currentIdx = getStreetIndex(alien.targetX);
                if (dx > 0 && currentIdx < STREET_POSITIONS.length - 1) {
                  alien.targetX = STREET_POSITIONS[currentIdx + 1];
                } else if (dx < 0 && currentIdx > 0) {
                  alien.targetX = STREET_POSITIONS[currentIdx - 1];
                } else if (dx > 0) {
                  alien.targetX = STREET_POSITIONS[0];
                } else {
                  alien.targetX = STREET_POSITIONS[STREET_POSITIONS.length - 1];
                }
              } else {
                const currentIdx = getStreetIndex(alien.targetY);
                if (dy > 0 && currentIdx < STREET_POSITIONS.length - 1) {
                  alien.targetY = STREET_POSITIONS[currentIdx + 1];
                } else if (dy < 0 && currentIdx > 0) {
                  alien.targetY = STREET_POSITIONS[currentIdx - 1];
                } else if (dy > 0) {
                  alien.targetY = STREET_POSITIONS[0];
                } else {
                  alien.targetY = STREET_POSITIONS[STREET_POSITIONS.length - 1];
                }
              }
              
              return p;
            });
          }
          
          // Smooth interpolation towards target
          alien.x = alien.x + (alien.targetX - alien.x) * moveSpeed;
          alien.y = alien.y + (alien.targetY - alien.y) * moveSpeed;
          
          return alien;
        });
      });

      // Aliens shoot (level 3+)
      if (level >= 3) {
        setAliens(prev => {
          const shootingAliens = prev.filter(alien => {
            if (now - alien.lastShot < 1500) return false;
            return Math.random() < 0.25;
          });
          
          if (shootingAliens.length > 0) {
            setPlayer(p => {
              const newBullets = shootingAliens.map(alien => {
                const dx = p.x - alien.x;
                const dy = p.y - alien.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                return {
                  id: Date.now() + Math.random(),
                  x: alien.x,
                  y: alien.y,
                  dx: (dx / dist) * 4,
                  dy: (dy / dist) * 4
                };
              });
              
              setAlienBullets(bullets => [...bullets, ...newBullets]);
              return p;
            });
          }
          
          return prev.map(alien => 
            shootingAliens.some(a => a.id === alien.id)
              ? { ...alien, lastShot: now }
              : alien
          );
        });
      }

      // Move bullets
      setBullets(prev => prev
        .map(b => ({ ...b, x: b.x + b.dx, y: b.y + b.dy }))
        .filter(b => 
          b.x >= 0 && b.x <= TOTAL_SIZE && 
          b.y >= 0 && b.y <= TOTAL_SIZE
        )
      );

      setAlienBullets(prev => prev
        .map(b => ({ ...b, x: b.x + b.dx, y: b.y + b.dy }))
        .filter(b => 
          b.x >= 0 && b.x <= TOTAL_SIZE && 
          b.y >= 0 && b.y <= TOTAL_SIZE
        )
      );

      // Check bullet/alien collisions
      setBullets(prevBullets => {
        const remainingBullets = [...prevBullets];
        const bulletsToRemove = new Set();
        
        setAliens(prevAliens => {
          const remainingAliens = prevAliens.filter(alien => {
            const hitBullet = remainingBullets.findIndex(b => 
              Math.abs(b.x - alien.x) < 20 && Math.abs(b.y - alien.y) < 20
            );
            
            if (hitBullet !== -1) {
              bulletsToRemove.add(hitBullet);
              setScore(s => s + 100 * level);
              return false;
            }
            return true;
          });
          
          return remainingAliens;
        });
        
        return remainingBullets.filter((_, idx) => !bulletsToRemove.has(idx));
      });

      // Check player hit
      if (!invulnerable) {
        setPlayer(p => {
          const hitByBullet = alienBullets.some(b => 
            Math.abs(b.x - p.x) < 12 && Math.abs(b.y - p.y) < 12
          );
          
          setAliens(aliens => {
            const hitByAlien = aliens.some(a => 
              Math.abs(a.x - p.x) < 20 && Math.abs(a.y - p.y) < 20
            );
            
            if (hitByBullet || hitByAlien) {
              setLives(prev => {
                const newLives = prev - 1;
                if (newLives <= 0) {
                  setGameState('gameOver');
                } else {
                  setInvulnerable(true);
                  setTimeout(() => {
                    setPlayer({ x: STREET_POSITIONS[3], y: STREET_POSITIONS[3], targetX: STREET_POSITIONS[3], targetY: STREET_POSITIONS[3] });
                    setInvulnerable(false);
                  }, 100);
                }
                return newLives;
              });
              setAlienBullets([]);
            }
            
            return aliens;
          });
          
          return p;
        });
      }

      // Check pickups
      setPlayer(p => {
        setCrystals(prev => {
          return prev.filter(crystal => {
            if (Math.abs(crystal.x - p.x) < 20 && Math.abs(crystal.y - p.y) < 20) {
              setScore(s => s + crystal.value);
              return false;
            }
            return true;
          });
        });

        setAmmoPacks(prev => {
          return prev.filter(pack => {
            if (Math.abs(pack.x - p.x) < 20 && Math.abs(pack.y - p.y) < 20) {
              setAmmo(a => a + AMMO_PACK_AMOUNT);
              return false;
            }
            return true;
          });
        });
        
        return p;
      });

      // Check level complete
      setAliens(aliens => {
        if (aliens.length === 0) {
          setLevel(l => {
            const newLevel = l + 1;
            initLevel(newLevel);
            return newLevel;
          });
        }
        return aliens;
      });

    }, 50);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState, level, invulnerable, initLevel]);

  // Crystal spawning
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const intervals = [3000, 6000, 9000, 12000];
    const timers = intervals.slice(crystals.length).map((delay, idx) => 
      setTimeout(() => spawnCrystal(), delay)
    );
    
    return () => timers.forEach(clearTimeout);
  }, [gameState, crystals.length, spawnCrystal]);

  // Ammo pack spawning
  useEffect(() => {
    if (gameState !== 'playing' || ammo > 10) return;
    
    const timer = setTimeout(() => spawnAmmoPack(), 2000);
    return () => clearTimeout(timer);
  }, [gameState, ammo, spawnAmmoPack]);

  // Extra life
  useEffect(() => {
    if (score >= lastExtraLife + EXTRA_LIFE_SCORE) {
      setLives(l => l + 1);
      setLastExtraLife(Math.floor(score / EXTRA_LIFE_SCORE) * EXTRA_LIFE_SCORE);
    }
  }, [score, lastExtraLife]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4">
      <div className="text-white mb-4 text-center">
        <h1 className="text-4xl font-bold mb-2 text-cyan-400">CROSSFIRE</h1>
        {gameState === 'menu' && (
          <div className="text-center space-y-4">
            <p className="text-xl">Defend your city from alien invaders!</p>
            <div className="text-left inline-block space-y-2">
              <p>🎮 Arrow Keys - Move in streets</p>
              <p>🔫 W - Shoot Up | X - Shoot Down</p>
              <p>🔫 A - Shoot Left | D - Shoot Right</p>
              <p>💎 Collect crystals for bonus points</p>
              <p>📦 Grab ammo packs when running low</p>
              <p>⭐ Extra life every 5000 points</p>
              <p>⚠️ Aliens shoot from level 3!</p>
            </div>
            <button
              onClick={startGame}
              className="mt-6 px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xl rounded"
            >
              START GAME
            </button>
          </div>
        )}
      </div>

      {gameState === 'playing' && (
        <>
          <div className="flex gap-8 mb-4 text-white text-xl">
            <div>Level: <span className="text-cyan-400 font-bold">{level}</span></div>
            <div>Score: <span className="text-yellow-400 font-bold">{score}</span></div>
            <div>Lives: <span className="text-red-400 font-bold">{lives}</span></div>
            <div>Ammo: <span className={`font-bold ${ammo < 10 ? 'text-red-500' : 'text-green-400'}`}>{ammo}</span></div>
          </div>

          <div 
            className="relative border-4 border-blue-600"
            style={{ 
              width: TOTAL_SIZE, 
              height: TOTAL_SIZE,
              background: '#000'
            }}
          >
            {/* Grid blocks */}
            {Array.from({ length: GRID_BLOCKS }).map((_, row) => 
              Array.from({ length: GRID_BLOCKS }).map((_, col) => (
                <div
                  key={`block-${row}-${col}`}
                  className="absolute border-2 border-blue-500"
                  style={{
                    left: STREET_WIDTH + col * (BLOCK_SIZE + STREET_WIDTH),
                    top: STREET_WIDTH + row * (BLOCK_SIZE + STREET_WIDTH),
                    width: BLOCK_SIZE,
                    height: BLOCK_SIZE,
                    background: '#000'
                  }}
                />
              ))
            )}

            {/* Player */}
            <div
              className={`absolute ${invulnerable ? 'animate-pulse' : ''}`}
              style={{
                left: player.x,
                top: player.y,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <img 
                src={SHIP_IMAGE} 
                alt="ship" 
                style={{ 
                  width: '28px', 
                  height: '12px',
                  imageRendering: 'pixelated'
                }} 
              />
            </div>

            {/* Aliens */}
            {aliens.map(alien => (
              <div
                key={alien.id}
                className="absolute"
                style={{
                  left: alien.x,
                  top: alien.y,
                  transform: 'translate(-50%, -50%)',
                  transition: 'none'
                }}
              >
                <div className="text-2xl">👾</div>
              </div>
            ))}

            {/* Player bullets */}
            {bullets.map(bullet => (
              <div
                key={bullet.id}
                className="absolute bg-yellow-400 rounded-full"
                style={{
                  left: bullet.x - 3,
                  top: bullet.y - 3,
                  width: 6,
                  height: 6
                }}
              />
            ))}

            {/* Alien bullets */}
            {alienBullets.map(bullet => (
              <div
                key={bullet.id}
                className="absolute bg-red-500 rounded-full"
                style={{
                  left: bullet.x - 3,
                  top: bullet.y - 3,
                  width: 6,
                  height: 6
                }}
              />
            ))}

            {/* Crystals */}
            {crystals.map((crystal, idx) => (
              <div
                key={`crystal-${idx}`}
                className="absolute animate-pulse"
                style={{
                  left: crystal.x,
                  top: crystal.y,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="text-xl">💎</div>
              </div>
            ))}

            {/* Ammo packs */}
            {ammoPacks.map((pack, idx) => (
              <div
                key={`ammo-${idx}`}
                className="absolute"
                style={{
                  left: pack.x,
                  top: pack.y,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="text-xl">📦</div>
              </div>
            ))}
          </div>
        </>
      )}

      {gameState === 'gameOver' && (
        <div className="text-center text-white">
          <h2 className="text-3xl font-bold mb-4 text-red-500">GAME OVER</h2>
          <p className="text-2xl mb-2">Final Score: <span className="text-yellow-400">{score}</span></p>
          <p className="text-xl mb-4">Level Reached: <span className="text-cyan-400">{level}</span></p>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xl rounded"
          >
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}