import React, { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// --- Constants ---
const BASE_WIDTH = 1200;
const BASE_HEIGHT = 700;
const ASPECT = BASE_WIDTH / BASE_HEIGHT;
const STAR_COUNT = 80;
const MAX_LIVES = 3;
const INVINCIBLE_TIME = 1800; // ms
const SHAKE_TIME = 400; // ms
const BULLET_COOLDOWN = 220; // ms
const BULLET_MAX_DIST = 520;
const PARTICLE_POOL_SIZE = 120;
const BULLET_POOL_SIZE = 32;
const THRUSTER_PARTICLES = 8;
const LEVEL_UP_ASTEROID_INC = 2;
const LEVEL_UP_SPEED_INC = 0.18;
const LEVEL_UP_MIN_SIZE_DEC = 6;
const ASTEROID_MIN_SIZE = 18;
const ASTEROID_MAX_SIZE = 64;
const ASTEROID_BASE_SPEED = 0.7;
const SCORE_MULTIPLIER_TIME = 1200; // ms

// --- Utility ---
const rand = (a, b) => Math.random() * (b - a) + a;
const wrap = (v, max) => (v < 0 ? v + max : v >= max ? v - max : v);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const lerp = (a, b, t) => a + (b - a) * t;

// --- Classes ---
class Ship {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = -Math.PI / 2;
    this.vel = { x: 0, y: 0 };
    this.radius = 18;
    this.lives = MAX_LIVES;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.blink = false;
    this.blinkTimer = 0;
    this.cooldown = 0;
    this.alive = true;
    this.thrusting = false;
    this.shakeTimer = 0;
  }
  update(dt, keys) {
    if (!this.alive) return;
    // Rotation
    if (keys["ArrowLeft"] || keys["KeyA"]) this.angle -= 0.09 * dt;
    if (keys["ArrowRight"] || keys["KeyD"]) this.angle += 0.09 * dt;
    // Thrust
    this.thrusting = !!(keys["ArrowUp"] || keys["KeyW"]);
    if (this.thrusting) {
      this.vel.x += Math.cos(this.angle) * 0.22 * dt;
      this.vel.y += Math.sin(this.angle) * 0.22 * dt;
    }
    // Brake
    if (keys["KeyS"]) {
      this.vel.x *= 0.92;
      this.vel.y *= 0.92;
    }
    // Friction
    this.vel.x *= 0.992;
    this.vel.y *= 0.992;
    // Move
    this.x = wrap(this.x + this.vel.x * dt, BASE_WIDTH);
    this.y = wrap(this.y + this.vel.y * dt, BASE_HEIGHT);
    // Invincibility
    if (this.invincible) {
      this.invincibleTimer -= dt * 16.67;
      this.blinkTimer -= dt * 16.67;
      if (this.blinkTimer <= 0) {
        this.blink = !this.blink;
        this.blinkTimer = 120;
      }
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
        this.blink = false;
      }
    }
    // Cooldown
    if (this.cooldown > 0) this.cooldown -= dt * 16.67;
    // Shake
    if (this.shakeTimer > 0) this.shakeTimer -= dt * 16.67;
  }
  hit() {
    this.lives--;
    this.invincible = true;
    this.invincibleTimer = INVINCIBLE_TIME;
    this.blink = true;
    this.blinkTimer = 120;
    this.x = BASE_WIDTH / 2;
    this.y = BASE_HEIGHT / 2;
    this.vel = { x: 0, y: 0 };
    this.angle = -Math.PI / 2;
    this.shakeTimer = SHAKE_TIME;
    if (this.lives <= 0) this.alive = false;
  }
  canShoot() {
    return this.cooldown <= 0 && this.alive && !this.invincible;
  }
  shoot() {
    this.cooldown = BULLET_COOLDOWN;
  }
}

class Asteroid {
  constructor(x, y, r, speed, level = 1) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.level = level;
    this.verts = Math.floor(rand(8, 12));
    this.points = [];
    for (let i = 0; i < this.verts; i++) {
      const angle = (i / this.verts) * Math.PI * 2;
      const rr = r * rand(0.8, 1.2);
      this.points.push({ x: Math.cos(angle) * rr, y: Math.sin(angle) * rr });
    }
    const dir = rand(0, Math.PI * 2);
    this.dx = Math.cos(dir) * speed;
    this.dy = Math.sin(dir) * speed;
    this.rot = rand(-0.01, 0.01);
    this.angle = rand(0, Math.PI * 2);
    this.alive = true;
  }
  update(dt) {
    this.x = wrap(this.x + this.dx * dt, BASE_WIDTH);
    this.y = wrap(this.y + this.dy * dt, BASE_HEIGHT);
    this.angle += this.rot * dt;
  }
}

class Bullet {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.dx = 0;
    this.dy = 0;
    this.radius = 2.5;
    this.dist = 0;
    this.maxDist = BULLET_MAX_DIST;
  }
  fire(x, y, angle) {
    this.x = x + Math.cos(angle) * 20;
    this.y = y + Math.sin(angle) * 20;
    this.dx = Math.cos(angle) * 11;
    this.dy = Math.sin(angle) * 11;
    this.dist = 0;
    this.active = true;
  }
  update(dt) {
    if (!this.active) return;
    this.x = wrap(this.x + this.dx * dt, BASE_WIDTH);
    this.y = wrap(this.y + this.dy * dt, BASE_HEIGHT);
    this.dist += Math.hypot(this.dx * dt, this.dy * dt);
    if (this.dist > this.maxDist) this.active = false;
  }
}

class Particle {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.dx = 0;
    this.dy = 0;
    this.radius = 1.5;
    this.life = 0;
    this.maxLife = 0;
    this.color = "#fff";
    this.glow = 0;
  }
  spawn(x, y, color, glow, dx, dy, maxLife, radius) {
    this.x = x;
    this.y = y;
    this.dx = dx;
    this.dy = dy;
    this.radius = radius || 1.5;
    this.life = 0;
    this.maxLife = maxLife;
    this.color = color;
    this.glow = glow;
    this.active = true;
  }
  update(dt) {
    if (!this.active) return;
    this.x = wrap(this.x + this.dx * dt, BASE_WIDTH);
    this.y = wrap(this.y + this.dy * dt, BASE_HEIGHT);
    this.life += dt * 16.67;
    if (this.life > this.maxLife) this.active = false;
  }
}

// --- Main Component ---
export default function Explore() {
  const navigate = useNavigate();
  const canvasRef = useRef();
  const [gameState, setGameState] = useState("start"); // start, playing, paused, gameover
  // Prevent vertical scrollbar on the page
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() =>
    Number(localStorage.getItem("asteroids_highscore") || 0),
  );
  const [level, setLevel] = useState(1);
  const [multiplier, setMultiplier] = useState(1);
  const [lives, setLives] = useState(MAX_LIVES);

  // --- Game objects ---
  const ship = useRef(new Ship(BASE_WIDTH / 2, BASE_HEIGHT / 2));
  const asteroids = useRef([]);
  const bullets = useRef(
    Array.from({ length: BULLET_POOL_SIZE }, () => new Bullet()),
  );
  const particles = useRef(
    Array.from({ length: PARTICLE_POOL_SIZE }, () => new Particle()),
  );
  const keys = useRef({});
  const lastTime = useRef(0);
  const shake = useRef({ timer: 0, mag: 0 });
  const multiplierTimer = useRef(0);
  const stars = useRef(
    Array.from({ length: STAR_COUNT }, () => ({
      x: rand(0, BASE_WIDTH),
      y: rand(0, BASE_HEIGHT),
      z: rand(0.2, 1),
    })),
  );

  // --- Game logic ---
  function startGame() {
    setGameState("playing");
    setScore(0);
    setLevel(1);
    setMultiplier(1);
    setLives(MAX_LIVES);
    ship.current = new Ship(BASE_WIDTH / 2, BASE_HEIGHT / 2);
    asteroids.current = [];
    spawnAsteroids(level);
    clearParticles();
    clearBullets();
    multiplierTimer.current = 0;
  }

  function spawnAsteroids(lvl) {
    asteroids.current = [];
    const count = 4 + (lvl - 1) * LEVEL_UP_ASTEROID_INC;
    const speed = ASTEROID_BASE_SPEED + (lvl - 1) * LEVEL_UP_SPEED_INC;
    const minSize = Math.max(
      ASTEROID_MIN_SIZE,
      ASTEROID_MAX_SIZE - (lvl - 1) * LEVEL_UP_MIN_SIZE_DEC,
    );
    for (let i = 0; i < count; i++) {
      let edge = Math.floor(rand(0, 4));
      let x =
        edge === 0
          ? rand(0, BASE_WIDTH)
          : edge === 1
            ? 0
            : edge === 2
              ? BASE_WIDTH
              : rand(0, BASE_WIDTH);
      let y =
        edge === 0
          ? 0
          : edge === 1
            ? rand(0, BASE_HEIGHT)
            : edge === 2
              ? rand(0, BASE_HEIGHT)
              : BASE_HEIGHT;
      asteroids.current.push(
        new Asteroid(x, y, rand(minSize, ASTEROID_MAX_SIZE), speed, 1),
      );
    }
  }

  function clearParticles() {
    particles.current.forEach((p) => (p.active = false));
  }
  function clearBullets() {
    bullets.current.forEach((b) => (b.active = false));
  }

  function fireBullet() {
    if (!ship.current.canShoot()) return;
    for (let b of bullets.current) {
      if (!b.active) {
        b.fire(ship.current.x, ship.current.y, ship.current.angle);
        ship.current.shoot();
        // Sound hook: playShoot()
        break;
      }
    }
  }

  function addExplosion(
    x,
    y,
    color = "#fff",
    glow = 18,
    count = 18,
    speed = 4,
    radius = 2.5,
  ) {
    for (let i = 0; i < count; i++) {
      for (let p of particles.current) {
        if (!p.active) {
          const angle = rand(0, Math.PI * 2);
          const mag = rand(speed * 0.5, speed);
          p.spawn(
            x,
            y,
            color,
            glow,
            Math.cos(angle) * mag,
            Math.sin(angle) * mag,
            rand(320, 600),
            radius,
          );
          break;
        }
      }
    }
    // Sound hook: playExplosion()
    shake.current = { timer: SHAKE_TIME, mag: 12 };
    flashScreen();
  }

  function addThruster(x, y, angle) {
    for (let i = 0; i < THRUSTER_PARTICLES; i++) {
      for (let p of particles.current) {
        if (!p.active) {
          const spread = rand(-0.3, 0.3);
          const mag = rand(2.2, 3.2);
          p.spawn(
            x - Math.cos(angle) * 16,
            y - Math.sin(angle) * 16,
            "#0ff",
            12,
            Math.cos(angle + Math.PI + spread) * mag,
            Math.sin(angle + Math.PI + spread) * mag,
            rand(120, 220),
            rand(1.2, 2.2),
          );
          break;
        }
      }
    }
  }

  function flashScreen() {
    // Sound hook: playFlash()
    // Just a visual flash, handled in render
    shake.current.mag = 18;
    shake.current.timer = 120;
  }

  // --- Key listeners ---
  useEffect(() => {
    const down = (e) => {
      keys.current[e.code] = true;
      if (gameState === "start" && e.code === "Enter") startGame();
      if (gameState === "gameover" && e.code === "Enter") startGame();
      if (gameState === "playing" && e.code === "KeyP") setGameState("paused");
      if (gameState === "paused" && e.code === "KeyP") setGameState("playing");
    };
    const up = (e) => {
      keys.current[e.code] = false;
    };
    const mouseDown = (e) => {
      if (gameState === "playing" && e.button === 0) {
        fireBullet();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mousedown", mouseDown);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousedown", mouseDown);
    };
  }, [gameState]);

  // --- Game loop ---
  useEffect(() => {
    let anim;
    const ctx = canvasRef.current.getContext("2d");
    let lastScore = score;
    let lastLevel = level;
    let lastLives = lives;
    let lastMultiplier = multiplier;

    function loop(t) {
      let dt = (t - lastTime.current) / 16.67 || 1;
      lastTime.current = t;

      // Responsive scaling
      const parent = canvasRef.current.parentElement;
      let w = parent.offsetWidth;
      let h = parent.offsetHeight;
      let scale = Math.min(w / BASE_WIDTH, h / BASE_HEIGHT);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);

      // --- Starfield ---
      ctx.save();
      ctx.globalAlpha = 0.7;
      for (let s of stars.current) {
        s.x = wrap(s.x + s.z * 0.18 * dt, BASE_WIDTH);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.z * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.shadowColor = "#fff";
        ctx.shadowBlur = s.z * 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.restore();

      // --- Screen shake ---
      let shakeX = 0,
        shakeY = 0;
      if (shake.current.timer > 0) {
        shake.current.timer -= dt * 16.67;
        shakeX = rand(-shake.current.mag, shake.current.mag);
        shakeY = rand(-shake.current.mag, shake.current.mag);
      }

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // --- Background ---
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

      // --- Border ---
      ctx.save();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2.2;
      ctx.shadowColor = "#0ff";
      ctx.shadowBlur = 8;
      ctx.strokeRect(10, 10, BASE_WIDTH - 20, BASE_HEIGHT - 20);
      ctx.restore();

      // --- Game states ---
      if (gameState === "start") {
        drawStartScreen(ctx);
      } else if (gameState === "gameover") {
        drawGameOverScreen(ctx);
      } else {
        // --- Gameplay ---
        // Ship
        ship.current.update(dt, keys.current);

        // Thruster effect
        if (ship.current.thrusting && ship.current.alive) {
          addThruster(ship.current.x, ship.current.y, ship.current.angle);
        }

        // Bullets
        if (keys.current["Space"] && ship.current.canShoot()) {
          fireBullet();
        }
        bullets.current.forEach((b) => b.update(dt));

        // Asteroids
        asteroids.current.forEach((a) => a.update(dt));

        // Particles
        particles.current.forEach((p) => p.update(dt));

        // --- Collisions ---
        // Bullet vs Asteroid
        for (let b of bullets.current) {
          if (!b.active) continue;
          for (let i = asteroids.current.length - 1; i >= 0; i--) {
            let a = asteroids.current[i];
            if (dist(b, a) < a.r) {
              b.active = false;
              addExplosion(a.x, a.y, "#fff", 18, 16, 4, 2.5);
              // Break asteroid
              if (a.r > ASTEROID_MIN_SIZE + 6 && a.level < 3) {
                for (let j = 0; j < 2; j++) {
                  asteroids.current.push(
                    new Asteroid(
                      a.x,
                      a.y,
                      a.r / 2,
                      Math.abs(a.dx) + rand(0.2, 0.5),
                      a.level + 1,
                    ),
                  );
                }
              }
              asteroids.current.splice(i, 1);
              // Score + multiplier
              setScore((s) => s + 10 * multiplier);
              setMultiplier((m) => Math.min(m + 1, 5));
              multiplierTimer.current = SCORE_MULTIPLIER_TIME;
              break;
            }
          }
        }

        // Ship vs Asteroid
        if (ship.current.alive && !ship.current.invincible) {
          for (let a of asteroids.current) {
            if (dist(ship.current, a) < a.r + ship.current.radius - 2) {
              ship.current.hit();
              setLives(ship.current.lives);
              addExplosion(
                ship.current.x,
                ship.current.y,
                "#f00",
                24,
                32,
                6,
                3.5,
              );
              setMultiplier(1);
              multiplierTimer.current = 0;
              break;
            }
          }
        }

        // Next level
        if (asteroids.current.length === 0 && ship.current.alive) {
          setLevel((l) => l + 1);
          spawnAsteroids(level + 1);
        }

        // Multiplier decay
        if (multiplier > 1) {
          multiplierTimer.current -= dt * 16.67;
          if (multiplierTimer.current <= 0) setMultiplier(1);
        }

        // High score
        if (score > highScore) {
          setHighScore(score);
          localStorage.setItem("asteroids_highscore", score);
        }

        // Game over
        if (!ship.current.alive && gameState !== "gameover") {
          setGameState("gameover");
        }

        // --- Draw ---
        drawParticles(ctx);
        drawAsteroids(ctx);
        drawBullets(ctx);
        drawShip(ctx, ship.current);

        // --- UI ---
        drawUI(ctx, score, highScore, lives, level, multiplier, gameState);
      }

      ctx.restore(); // shake

      anim = requestAnimationFrame(loop);
    }
    anim = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(anim);
  }, [gameState, score, highScore, lives, level, multiplier]);

  // --- Responsive canvas ---
  useEffect(() => {
    const handleResize = () => {
      const parent = canvasRef.current.parentElement;
      let w = parent.offsetWidth;
      let h = parent.offsetHeight;
      let scale = Math.min(w / BASE_WIDTH, h / BASE_HEIGHT);
      canvasRef.current.width = BASE_WIDTH * scale;
      canvasRef.current.height = BASE_HEIGHT * scale;
      canvasRef.current.style.width = "100%";
      canvasRef.current.style.height = "70vh";
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- Initial spawn ---
  useEffect(() => {
    setGameState("start");
    setScore(0);
    setLevel(1);
    setMultiplier(1);
    setLives(MAX_LIVES);
    ship.current = new Ship(BASE_WIDTH / 2, BASE_HEIGHT / 2);
    asteroids.current = [];
    spawnAsteroids(1);
    clearParticles();
    clearBullets();
    multiplierTimer.current = 0;
    // eslint-disable-next-line
  }, []);

  // --- Drawing functions ---
  function drawShip(ctx, s) {
    if (!s.alive) return;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle + Math.PI / 2); // Fix orientation: point upwards
    if (s.invincible && s.blink) ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(10, 10);
    ctx.lineTo(0, 6);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2.2;
    ctx.shadowColor = "#0ff";
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Thruster flame
    if (s.thrusting) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 14);
      ctx.lineTo(4, 18 + rand(0, 6));
      ctx.lineTo(-4, 18 + rand(0, 6));
      ctx.closePath();
      ctx.fillStyle = "#0ff";
      ctx.shadowColor = "#0ff";
      ctx.shadowBlur = 18;
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawAsteroids(ctx) {
    for (let a of asteroids.current) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.angle);
      ctx.beginPath();
      a.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2.2;
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  function drawBullets(ctx) {
    for (let b of bullets.current) {
      if (!b.active) continue;
      ctx.save();
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2.2;
      ctx.shadowColor = "#0ff";
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  function drawParticles(ctx) {
    for (let p of particles.current) {
      if (!p.active) continue;
      ctx.save();
      ctx.globalAlpha = 1 - p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.glow;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  function drawUI(ctx, score, highScore, lives, level, multiplier, state) {
    ctx.save();
    ctx.font = "bold 24px monospace";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${score}`, 24, 44);
    ctx.textAlign = "right";
    ctx.fillText(`High Score: ${highScore}`, BASE_WIDTH - 24, 44);
    ctx.textAlign = "center";
    ctx.fillText(`Level: ${level}`, BASE_WIDTH / 2, 44);
    ctx.font = "bold 20px monospace";
    ctx.fillStyle = "#0ff";
    ctx.fillText(`Multiplier: x${multiplier}`, BASE_WIDTH / 2, 74);
    // Lives
    for (let i = 0; i < lives; i++) {
      ctx.save();
      ctx.translate(44 + i * 32, 74);
      ctx.rotate(-Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(6, 8);
      ctx.lineTo(0, 4);
      ctx.lineTo(-6, 8);
      ctx.closePath();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2.2;
      ctx.shadowColor = "#0ff";
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
    ctx.restore();
  }

  function drawStartScreen(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    ctx.globalAlpha = 1;
    ctx.font = "bold 64px monospace";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.shadowColor = "#0ff";
    ctx.shadowBlur = 24;
    ctx.fillText("ASTEROIDS", BASE_WIDTH / 2, BASE_HEIGHT / 2 - 60);
    ctx.shadowBlur = 0;
    ctx.font = "bold 32px monospace";
    ctx.fillStyle = "#0ff";
    ctx.fillText("Press Enter to Start", BASE_WIDTH / 2, BASE_HEIGHT / 2 + 20);
    ctx.font = "bold 20px monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText(
      "Arrow keys: Move & Rotate | Space: Shoot | P: Pause",
      BASE_WIDTH / 2,
      BASE_HEIGHT / 2 + 60,
    );
    ctx.restore();
  }

  function drawGameOverScreen(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    ctx.globalAlpha = 1;
    ctx.font = "bold 64px monospace";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.shadowColor = "#f00";
    ctx.shadowBlur = 24;
    ctx.fillText("GAME OVER", BASE_WIDTH / 2, BASE_HEIGHT / 2 - 60);
    ctx.shadowBlur = 0;
    ctx.font = "bold 32px monospace";
    ctx.fillStyle = "#0ff";
    ctx.fillText(
      "Press Enter to Restart",
      BASE_WIDTH / 2,
      BASE_HEIGHT / 2 + 20,
    );
    ctx.font = "bold 20px monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText(`Final Score: ${score}`, BASE_WIDTH / 2, BASE_HEIGHT / 2 + 60);
    ctx.restore();
  }

  // --- Render ---
  return (
    <div
      className="w-full min-h-screen bg-black flex flex-col items-center justify-center"
      style={{ position: "relative" }}
    >
      <div
        className="w-full flex justify-start p-4"
        style={{ position: "absolute", top: 0, left: 0, zIndex: 10 }}
      >
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
          onClick={() => navigate("/events")}
        >
          Back to Home
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="block border border-white rounded-lg shadow-lg bg-black"
        width={BASE_WIDTH}
        height={BASE_HEIGHT}
        tabIndex={0}
        style={{ outline: "none" }}
      />
    </div>
  );
}
