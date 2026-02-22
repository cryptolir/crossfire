import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MovePad, FirePad } from '@/components/MobileControls';

const isMobileDevice = () => {
  return /Mobi|Android|iPhone|iPad|iPod|Touch/i.test(navigator.userAgent) || window.innerWidth < 768;
};

// Grid is 7x7 blocks with streets in between
const GRID_BLOCKS = 7;
const BLOCK_SIZE = 60;
const STREET_WIDTH = 20;
const TOTAL_SIZE = GRID_BLOCKS * (BLOCK_SIZE + STREET_WIDTH) + STREET_WIDTH;
const INITIAL_LIVES = 3;
const INITIAL_HEALTH = 3; // 3 hits per life
const INITIAL_AMMO = 50;
const AMMO_PACK_AMOUNT = 30;
const CRYSTAL_VALUES = [100, 200, 400, 800];
const EXTRA_LIFE_SCORE = 25000;
const MAX_BULLETS_PER_STREET = 2;

const SHIP_IMAGE = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699253987abdb75e6f27be7a/ee90ec378_image.png";

// Shared AudioContext to prevent memory leaks
let sharedAudioCtx = null;
const getAudioContext = () => {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return sharedAudioCtx;
};

// Sound effects
const playHitSound = () => {
  const audioCtx = getAudioContext();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.frequency.value = 200;
  oscillator.type = 'sawtooth';
  gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + 0.3);
};

const playShootSound = () => {
  const audioCtx = getAudioContext();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.frequency.value = 800;
  oscillator.type = 'square';
  gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + 0.1);
};

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
  const [paused, setPaused] = useState(false);
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
  const [health, setHealth] = useState(INITIAL_HEALTH);
  const [hitEffect, setHitEffect] = useState(false);
  const [playerDirection, setPlayerDirection] = useState(null);
  const [isMobile] = useState(() => isMobileDevice());

  const keysPressed = useRef({});
  const gameLoopRef = useRef(null);
  const lastShotTime = useRef(0);
  const playerRef = useRef(player);
  const aliensRef = useRef(aliens);
  const alienBulletsRef = useRef(alienBullets);
  const bulletsRef = useRef(bullets);
  const invulnerableRef = useRef(invulnerable);
  const healthRef = useRef(health);
  const livesRef = useRef(lives);
  const levelRef = useRef(level);
  const ammoRef = useRef(ammo);
  
  // Keep refs in sync
  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { aliensRef.current = aliens; }, [aliens]);
  useEffect(() => { alienBulletsRef.current = alienBullets; }, [alienBullets]);
  useEffect(() => { bulletsRef.current = bullets; }, [bullets]);
  useEffect(() => { invulnerableRef.current = invulnerable; }, [invulnerable]);
  useEffect(() => { healthRef.current = health; }, [health]);
  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { ammoRef.current = ammo; }, [ammo]);

  const startGame = () => {
    setGameState('playing');
    setLevel(1);
    setScore(0);
    setLives(INITIAL_LIVES);
    setAmmo(INITIAL_AMMO);
    setHealth(INITIAL_HEALTH);
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
      if (e.key === ' ' && gameState === 'playing') {
        e.preventDefault();
        setPaused(p => !p);
        return;
      }
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
    if (gameState !== 'playing' || paused) return;

    gameLoopRef.current = setInterval(() => {
      const now = Date.now();

      // Handle shooting (W, X, A, D) - simplified and more reliable
      const shootCooldown = 150; // ms between shots
      if (now - lastShotTime.current >= shootCooldown) {
        const currentPlayer = playerRef.current;
        const snappedX = snapToNearestStreet(currentPlayer.x);
        const snappedY = snapToNearestStreet(currentPlayer.y);
        
        let shotDirection = null;
        
        if (keysPressed.current['w'] || keysPressed.current['W']) {
          shotDirection = { dx: 0, dy: -5 };
          keysPressed.current['w'] = false;
          keysPressed.current['W'] = false;
        } else if (keysPressed.current['x'] || keysPressed.current['X']) {
          shotDirection = { dx: 0, dy: 5 };
          keysPressed.current['x'] = false;
          keysPressed.current['X'] = false;
        } else if (keysPressed.current['a'] || keysPressed.current['A']) {
          shotDirection = { dx: -5, dy: 0 };
          keysPressed.current['a'] = false;
          keysPressed.current['A'] = false;
        } else if (keysPressed.current['d'] || keysPressed.current['D']) {
          shotDirection = { dx: 5, dy: 0 };
          keysPressed.current['d'] = false;
          keysPressed.current['D'] = false;
        }
        
        if (shotDirection && ammoRef.current > 0) {
          playShootSound();
          lastShotTime.current = now;
          setAmmo(prev => prev - 1);
          setBullets(prev => [...prev, {
            id: now + Math.random(),
            x: snappedX,
            y: snappedY,
            dx: shotDirection.dx,
            dy: shotDirection.dy
          }]);
        }
      }

      // Smooth continuous movement while arrow key is held
      setPlayer(prevPlayer => {
        const moveSpeed = 3;
        let newX = prevPlayer.x;
        let newY = prevPlayer.y;
        
        if (keysPressed.current['ArrowUp']) {
          newY = prevPlayer.y - moveSpeed;
        } else if (keysPressed.current['ArrowDown']) {
          newY = prevPlayer.y + moveSpeed;
        } else if (keysPressed.current['ArrowLeft']) {
          newX = prevPlayer.x - moveSpeed;
        } else if (keysPressed.current['ArrowRight']) {
          newX = prevPlayer.x + moveSpeed;
        }
        
        // Snap to nearest street when moving perpendicular
        if (keysPressed.current['ArrowUp'] || keysPressed.current['ArrowDown']) {
          newX = snapToNearestStreet(newX);
        }
        if (keysPressed.current['ArrowLeft'] || keysPressed.current['ArrowRight']) {
          newY = snapToNearestStreet(newY);
        }
        
        // Wrap around edges
        if (newX < STREET_POSITIONS[0]) newX = STREET_POSITIONS[STREET_POSITIONS.length - 1];
        if (newX > STREET_POSITIONS[STREET_POSITIONS.length - 1]) newX = STREET_POSITIONS[0];
        if (newY < STREET_POSITIONS[0]) newY = STREET_POSITIONS[STREET_POSITIONS.length - 1];
        if (newY > STREET_POSITIONS[STREET_POSITIONS.length - 1]) newY = STREET_POSITIONS[0];
        
        return { x: newX, y: newY, targetX: newX, targetY: newY };
      });

      // Move aliens
      setAliens(prev => {
        const currentLevel = levelRef.current;
        return prev.map(alien => {
          // Skip movement logic here - handled by smooth interpolation below
          if (!alien.targetX) alien.targetX = alien.x;
          if (!alien.targetY) alien.targetY = alien.y;
          
          const baseSpeed = 0.03; // 40% slower base speed
          const speedMultiplier = 1 + (currentLevel - 1) * 0.02; // 2% faster each level
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

      // Aliens shoot (level 3+) - only in streets (cardinal directions)
      if (levelRef.current >= 3) {
        setAliens(prev => {
          const shootingAliens = prev.filter(alien => {
            if (now - alien.lastShot < 1500) return false;
            // Only shoot when at a street intersection
            const onStreetX = STREET_POSITIONS.some(pos => Math.abs(alien.x - pos) < 3);
            const onStreetY = STREET_POSITIONS.some(pos => Math.abs(alien.y - pos) < 3);
            if (!onStreetX || !onStreetY) return false;
            return Math.random() < 0.25;
          });
          
          if (shootingAliens.length > 0) {
            setPlayer(p => {
              const newBullets = shootingAliens.map(alien => {
                const snappedAlienX = snapToNearestStreet(alien.x);
                const snappedAlienY = snapToNearestStreet(alien.y);
                const dx = p.x - snappedAlienX;
                const dy = p.y - snappedAlienY;
                
                // Fire in cardinal direction (street direction) towards player
                let bulletDx = 0;
                let bulletDy = 0;
                
                if (Math.abs(dx) > Math.abs(dy)) {
                  bulletDx = dx > 0 ? 4 : -4;
                } else {
                  bulletDy = dy > 0 ? 4 : -4;
                }
                
                return {
                  id: Date.now() + Math.random(),
                  x: snappedAlienX,
                  y: snappedAlienY,
                  dx: bulletDx,
                  dy: bulletDy
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

      // Check bullet/alien collisions - using refs for accurate detection
      const currentBullets = bulletsRef.current;
      const currentAliensForCollision = aliensRef.current;
      const bulletIdsToRemove = new Set();
      const alienIdsToRemove = new Set();
      
      for (const alien of currentAliensForCollision) {
        for (const bullet of currentBullets) {
          if (bulletIdsToRemove.has(bullet.id)) continue; // Bullet already used
          
          if (Math.abs(bullet.x - alien.x) < 20 && Math.abs(bullet.y - alien.y) < 20) {
            bulletIdsToRemove.add(bullet.id);
            alienIdsToRemove.add(alien.id);
            setScore(s => s + 100 * levelRef.current);
            break; // This alien is hit, move to next alien
          }
        }
      }
      
      if (bulletIdsToRemove.size > 0) {
        setBullets(prev => prev.filter(b => !bulletIdsToRemove.has(b.id)));
      }
      if (alienIdsToRemove.size > 0) {
        setAliens(prev => prev.filter(a => !alienIdsToRemove.has(a.id)));
      }

      // Check player hit by alien bullets - using refs for accurate collision detection
      if (!invulnerableRef.current) {
        const currentPlayer = playerRef.current;
        const currentAlienBullets = alienBulletsRef.current;
        const currentAliens = aliensRef.current;
        
        // Check bullet collision
        const hitBullet = currentAlienBullets.find(b => 
          Math.abs(b.x - currentPlayer.x) < 15 && Math.abs(b.y - currentPlayer.y) < 15
        );
        
        // Check alien collision
        const hitAlien = currentAliens.find(a => 
          Math.abs(a.x - currentPlayer.x) < 20 && Math.abs(a.y - currentPlayer.y) < 20
        );
        
        // Helper to push aliens away from center
        const pushAliensAway = () => {
          setAliens(prevAliens => prevAliens.map(alien => {
            const centerX = STREET_POSITIONS[3];
            const centerY = STREET_POSITIONS[3];
            const dx = alien.x - centerX;
            const dy = alien.y - centerY;
            
            let newTargetX = alien.targetX;
            let newTargetY = alien.targetY;
            
            if (Math.abs(dx) >= Math.abs(dy)) {
              const currentIdx = getStreetIndex(alien.x);
              if (dx >= 0) {
                newTargetX = STREET_POSITIONS[Math.min(currentIdx + 2, STREET_POSITIONS.length - 1)];
              } else {
                newTargetX = STREET_POSITIONS[Math.max(currentIdx - 2, 0)];
              }
            } else {
              const currentIdx = getStreetIndex(alien.y);
              if (dy >= 0) {
                newTargetY = STREET_POSITIONS[Math.min(currentIdx + 2, STREET_POSITIONS.length - 1)];
              } else {
                newTargetY = STREET_POSITIONS[Math.max(currentIdx - 2, 0)];
              }
            }
            
            return { ...alien, targetX: newTargetX, targetY: newTargetY };
          }));
        };

        if (hitBullet) {
          playHitSound();
          setHitEffect(true);
          setTimeout(() => setHitEffect(false), 300);
          setAlienBullets(prev => prev.filter(b => b.id !== hitBullet.id));
          
          const newHealth = healthRef.current - 1;
          setHealth(newHealth);
          
          if (newHealth <= 0) {
            const newLives = livesRef.current - 1;
            setLives(newLives);
            setHealth(INITIAL_HEALTH);
            
            if (newLives <= 0) {
              setGameState('gameOver');
            } else {
              setInvulnerable(true);
              setPlayerDirection(null);
              pushAliensAway();
              setTimeout(() => {
                setPlayer({ x: STREET_POSITIONS[3], y: STREET_POSITIONS[3], targetX: STREET_POSITIONS[3], targetY: STREET_POSITIONS[3] });
                setInvulnerable(false);
              }, 1000);
            }
          } else {
            setInvulnerable(true);
            setTimeout(() => setInvulnerable(false), 500);
          }
        }
        
        if (hitAlien) {
          playHitSound();
          setHitEffect(true);
          setTimeout(() => setHitEffect(false), 300);
          
          const newLives = livesRef.current - 1;
          setLives(newLives);
          setHealth(INITIAL_HEALTH);
          setAlienBullets([]);
          
          if (newLives <= 0) {
            setGameState('gameOver');
          } else {
            setInvulnerable(true);
            setPlayerDirection(null);
            pushAliensAway();
            setTimeout(() => {
              setPlayer({ x: STREET_POSITIONS[3], y: STREET_POSITIONS[3], targetX: STREET_POSITIONS[3], targetY: STREET_POSITIONS[3] });
              setInvulnerable(false);
            }, 1000);
          }
        }
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
  }, [gameState, paused, initLevel]);

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

  // Desktop scale
  const scale = 1;
  const scaledSize = TOTAL_SIZE * scale;

  // Mobile playing: fullscreen fixed layout with pads on sides
  if (isMobile && gameState === 'playing') {
    const PAD_W = 164; // 3*48 + 2*4 (gaps) + 16 (padding)
    const HUD_H = 36;
    const availW = window.innerWidth - PAD_W * 2 - 8;
    const availH = window.innerHeight - HUD_H - 8;
    const mobileScale = Math.min(availW / TOTAL_SIZE, availH / TOTAL_SIZE, 1);
    const mobileScaledSize = TOTAL_SIZE * mobileScale;

    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', touchAction: 'none', zIndex: 9999, overflow: 'hidden' }}>
        {/* HUD */}
        <div style={{ height: HUD_H, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'white', fontSize: 13, flexShrink: 0 }}>
          <span>Lvl: <b style={{ color: '#22d3ee' }}>{level}</b></span>
          <span>Score: <b style={{ color: '#facc15' }}>{score}</b></span>
          <span>{'❤️'.repeat(lives)}</span>
          <span style={{ display: 'flex', gap: 2 }}>
            {[0,1,2].map(i => <span key={i} style={{ width: 10, height: 6, border: '1px solid #f472b6', background: i < health ? '#ec4899' : '#374151', display: 'inline-block' }} />)}
          </span>
          <span>Ammo: <b style={{ color: ammo < 10 ? '#ef4444' : '#4ade80' }}>{ammo}</b></span>
          <button
            style={{ padding: '2px 10px', background: 'rgba(8,145,178,0.6)', color: 'white', border: '1px solid #22d3ee', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
            onPointerDown={(e) => { e.preventDefault(); setPaused(p => !p); }}
          >⏸</button>
        </div>

        {/* Main row: MovePad | Game | FirePad */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <MovePad keysPressed={keysPressed} />

          {/* Game canvas */}
          <div style={{ width: mobileScaledSize, height: mobileScaledSize, position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                width: TOTAL_SIZE,
                height: TOTAL_SIZE,
                position: 'relative',
                border: '4px solid #2563eb',
                background: '#030712',
                transform: `scale(${mobileScale})`,
                transformOrigin: 'top left'
              }}
            >
              {Array.from({ length: GRID_BLOCKS }).map((_, row) =>
                Array.from({ length: GRID_BLOCKS }).map((_, col) => (
                  <div key={`block-${row}-${col}`} style={{ position: 'absolute', left: STREET_WIDTH + col * (BLOCK_SIZE + STREET_WIDTH), top: STREET_WIDTH + row * (BLOCK_SIZE + STREET_WIDTH), width: BLOCK_SIZE, height: BLOCK_SIZE, background: '#000', border: '2px solid #3b82f6' }} />
                ))
              )}
              <div className={`absolute ${invulnerable ? 'animate-pulse' : ''}`} style={{ left: player.x, top: player.y, transform: 'translate(-50%, -50%)' }}>
                {hitEffect && <div className="absolute animate-ping" style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,100,0,0.8) 0%, rgba(255,50,0,0.4) 50%, transparent 70%)', transform: 'translate(-25%, -25%)', zIndex: 10 }} />}
                <img src={SHIP_IMAGE} alt="ship" style={{ width: '32px', height: '32px', imageRendering: 'pixelated', objectFit: 'contain', filter: hitEffect ? 'brightness(2) sepia(1) saturate(5) hue-rotate(-20deg)' : 'none' }} />
              </div>
              {aliens.map(alien => (
                <div key={alien.id} style={{ position: 'absolute', left: alien.x, top: alien.y, transform: 'translate(-50%, -50%)' }}><div className="text-2xl">👾</div></div>
              ))}
              {bullets.map(bullet => (
                <div key={bullet.id} style={{ position: 'absolute', left: bullet.x - 3, top: bullet.y - 3, width: 6, height: 6, background: '#facc15', borderRadius: '50%' }} />
              ))}
              {alienBullets.map(bullet => (
                <div key={bullet.id} style={{ position: 'absolute', left: bullet.x - 3, top: bullet.y - 3, width: 6, height: 6, background: '#ef4444', borderRadius: '50%' }} />
              ))}
              {crystals.map((crystal, idx) => (
                <div key={`crystal-${idx}`} className="absolute animate-pulse" style={{ left: crystal.x, top: crystal.y, transform: 'translate(-50%, -50%)' }}><div className="text-xl">💎</div></div>
              ))}
              {ammoPacks.map((pack, idx) => (
                <div key={`ammo-${idx}`} style={{ position: 'absolute', left: pack.x, top: pack.y, transform: 'translate(-50%, -50%)' }}><div className="text-xl">📦</div></div>
              ))}
            </div>
          </div>

          <FirePad keysPressed={keysPressed} />
        </div>

        {paused && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', zIndex: 100 }}>
            <div style={{ textAlign: 'center', color: 'white' }}>
              <h2 style={{ fontSize: 32, fontWeight: 'bold', color: '#22d3ee', marginBottom: 8 }}>PAUSED</h2>
              <p>Tap ⏸ to continue</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', display: 'flex', flexDirection: 'column', touchAction: 'none' }}>
      {/* Menu / non-playing overlay */}
      {gameState !== 'playing' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', padding: 16 }}>
          <h1 style={{ fontSize: isMobile ? 28 : 40, fontWeight: 'bold', color: '#22d3ee', marginBottom: 8 }}>CROSSFIRE</h1>

          {gameState === 'menu' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: isMobile ? 16 : 20, marginBottom: 12 }}>Defend your city from alien invaders!</p>
              <div style={{ textAlign: 'left', display: 'inline-block', background: '#111827', border: '1px solid #22d3ee', borderRadius: 10, padding: isMobile ? 12 : 16, fontSize: isMobile ? 13 : 15, lineHeight: 1.7 }}>
                {isMobile ? (
                  <>
                    <p style={{ color: '#67e8f9', fontWeight: 'bold' }}>🎮 Left D-pad: Move &nbsp; Right D-pad: Fire</p>
                    <p style={{ color: '#86efac', fontWeight: 'bold', marginTop: 8 }}>📋 TIPS:</p>
                    <p>💎 Crystals: bonus points &nbsp; 📦 Grab ammo packs</p>
                    <p>⭐ Extra life every 25,000 pts &nbsp; ❤️ 3 health per life</p>
                    <p style={{ color: '#f87171', fontWeight: 'bold', marginTop: 8 }}>⚠️ Aliens shoot from Level 3!</p>
                  </>
                ) : (
                  <>
                    <p style={{ color: '#67e8f9', fontWeight: 'bold' }}>🎮 CONTROLS:</p>
                    <p>⬆️⬇️⬅️➡️ Arrow Keys - Move &nbsp; SPACE - Pause</p>
                    <p style={{ color: '#fde047', fontWeight: 'bold', marginTop: 8 }}>🔫 SHOOTING:</p>
                    <p>W - Up &nbsp; X - Down &nbsp; A - Left &nbsp; D - Right</p>
                    <p style={{ color: '#86efac', fontWeight: 'bold', marginTop: 8 }}>📋 TIPS:</p>
                    <p>💎 Crystals: 100–800pts &nbsp; 📦 Ammo packs &nbsp; ⭐ +life/25k pts</p>
                    <p style={{ color: '#f87171', fontWeight: 'bold', marginTop: 8 }}>⚠️ Aliens shoot from Level 3!</p>
                  </>
                )}
              </div>
              <br />
              <button onClick={startGame} style={{ marginTop: 16, padding: '10px 32px', background: '#0891b2', color: 'white', fontWeight: 'bold', fontSize: isMobile ? 16 : 20, border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                START GAME
              </button>
            </div>
          )}

          {gameState === 'gameOver' && (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 32, fontWeight: 'bold', color: '#ef4444', marginBottom: 12 }}>GAME OVER</h2>
              <p style={{ fontSize: 22, marginBottom: 6 }}>Final Score: <span style={{ color: '#facc15', fontWeight: 'bold' }}>{score}</span></p>
              <p style={{ fontSize: 18, marginBottom: 16 }}>Level Reached: <span style={{ color: '#22d3ee', fontWeight: 'bold' }}>{level}</span></p>
              <button onClick={startGame} style={{ padding: '10px 32px', background: '#0891b2', color: 'white', fontWeight: 'bold', fontSize: 20, border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                PLAY AGAIN
              </button>
            </div>
          )}
        </div>
      )}

      {gameState === 'playing' && (
        <div className="flex flex-col items-center w-full">
          {/* HUD */}
          <div className={`flex gap-4 text-white ${isMobile ? 'text-sm mb-1' : 'text-xl mb-4'}`}>
            <div>Lvl: <span className="text-cyan-400 font-bold">{level}</span></div>
            <div>Score: <span className="text-yellow-400 font-bold">{score}</span></div>
            <div className="flex items-center gap-1">
              <span>{'❤️'.repeat(lives)}</span>
              <div className="flex gap-0.5 ml-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className={`border border-pink-400 ${isMobile ? 'w-3 h-1.5' : 'w-5 h-2'} ${i < health ? 'bg-pink-500' : 'bg-gray-700'}`} />
                ))}
              </div>
            </div>
            <div>Ammo: <span className={`font-bold ${ammo < 10 ? 'text-red-500' : 'text-green-400'}`}>{ammo}</span></div>
          </div>

          {paused && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
              <div className="text-center text-white">
                <h2 className="text-4xl font-bold text-cyan-400 mb-4">PAUSED</h2>
                <p className="text-xl">{isMobile ? 'Tap ⏸ to continue' : 'Press SPACE to continue'}</p>
              </div>
            </div>
          )}

          {/* Game canvas */}
          <div style={{ width: scaledSize, height: scaledSize, position: 'relative' }}>
            <div
              className="relative border-4 border-blue-600"
              style={{
                width: TOTAL_SIZE,
                height: TOTAL_SIZE,
                background: '#000',
                transform: `scale(${scale})`,
                transformOrigin: 'top left'
              }}
            >
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
                style={{ left: player.x, top: player.y, transform: 'translate(-50%, -50%)' }}
              >
                {hitEffect && (
                  <div
                    className="absolute animate-ping"
                    style={{
                      width: '50px', height: '50px', borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(255,100,0,0.8) 0%, rgba(255,50,0,0.4) 50%, transparent 70%)',
                      transform: 'translate(-25%, -25%)', zIndex: 10
                    }}
                  />
                )}
                <img
                  src={SHIP_IMAGE}
                  alt="ship"
                  style={{
                    width: '32px', height: '32px', imageRendering: 'pixelated', objectFit: 'contain',
                    filter: hitEffect ? 'brightness(2) sepia(1) saturate(5) hue-rotate(-20deg)' : 'none'
                  }}
                />
              </div>

              {/* Aliens */}
              {aliens.map(alien => (
                <div key={alien.id} className="absolute" style={{ left: alien.x, top: alien.y, transform: 'translate(-50%, -50%)', transition: 'none' }}>
                  <div className="text-2xl">👾</div>
                </div>
              ))}

              {/* Player bullets */}
              {bullets.map(bullet => (
                <div key={bullet.id} className="absolute bg-yellow-400 rounded-full" style={{ left: bullet.x - 3, top: bullet.y - 3, width: 6, height: 6 }} />
              ))}

              {/* Alien bullets */}
              {alienBullets.map(bullet => (
                <div key={bullet.id} className="absolute bg-red-500 rounded-full" style={{ left: bullet.x - 3, top: bullet.y - 3, width: 6, height: 6 }} />
              ))}

              {/* Crystals */}
              {crystals.map((crystal, idx) => (
                <div key={`crystal-${idx}`} className="absolute animate-pulse" style={{ left: crystal.x, top: crystal.y, transform: 'translate(-50%, -50%)' }}>
                  <div className="text-xl">💎</div>
                </div>
              ))}

              {/* Ammo packs */}
              {ammoPacks.map((pack, idx) => (
                <div key={`ammo-${idx}`} className="absolute" style={{ left: pack.x, top: pack.y, transform: 'translate(-50%, -50%)' }}>
                  <div className="text-xl">📦</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}