/**
 * Nexora Interactive Technical Particles Engine
 * Implements precise mathematical constellation network lines with cursor physics
 * Inspired by modern scientific visualization systems
 */
const ParticleEngine = {
  canvas: null,
  ctx: null,
  particles: [],
  particleCount: 65,
  maxDistance: 130,
  mouse: {
    x: null,
    y: null,
    radius: 160
  },
  theme: 'dark-lines', // 'dark-lines' for whitish theme
  animationFrameId: null,

  init(canvasId = 'particles-canvas') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.resize();

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('mouseleave', () => this.handleMouseLeave());
    window.addEventListener('click', (e) => this.handleClick(e));

    this.createParticles();
    this.animate();

    console.log('[ParticleEngine] Initialized with precise technical constellation lines.');
  },

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    // Adjust particle count dynamically based on screen area
    const area = this.canvas.width * this.canvas.height;
    this.particleCount = Math.min(100, Math.max(40, Math.floor(area / 18000)));

    if (this.particles.length > 0) {
      this.createParticles();
    }
  },

  handleMouseMove(e) {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
  },

  handleMouseLeave() {
    this.mouse.x = null;
    this.mouse.y = null;
  },

  handleClick(e) {
    // Only spawn if not clicking on an interactive button/input
    if (['BUTTON', 'INPUT', 'SELECT', 'A', 'TEXTAREA'].includes(e.target.tagName)) return;

    for (let i = 0; i < 4; i++) {
      this.particles.push(new Particle(e.clientX, e.clientY));
      if (this.particles.length > this.particleCount + 15) {
        this.particles.shift();
      }
    }
  },

  createParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(new Particle(
        Math.random() * this.canvas.width,
        Math.random() * this.canvas.height
      ));
    }
  },

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Update and draw particles
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].update(this.canvas, this.mouse);
      this.particles[i].draw(this.ctx, this.theme);
    }

    // Connect particles with precise technical lines
    this.connectParticles();

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  },

  connectParticles() {
    const isDarkLines = this.theme === 'dark-lines';
    const baseColor = isDarkLines ? '20, 24, 33' : '255, 255, 255';
    const dotColor = isDarkLines ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.85)';

    for (let a = 0; a < this.particles.length; a++) {
      for (let b = a + 1; b < this.particles.length; b++) {
        const dx = this.particles[a].x - this.particles[b].x;
        const dy = this.particles[a].y - this.particles[b].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.maxDistance) {
          const opacity = (1 - (dist / this.maxDistance)) * (isDarkLines ? 0.22 : 0.28);
          this.ctx.strokeStyle = `rgba(${baseColor}, ${opacity})`;
          this.ctx.lineWidth = 0.85;
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[a].x, this.particles[a].y);
          this.ctx.lineTo(this.particles[b].x, this.particles[b].y);
          this.ctx.stroke();
        }
      }

      // Connect to mouse cursor
      if (this.mouse.x !== null && this.mouse.y !== null) {
        const dxMouse = this.particles[a].x - this.mouse.x;
        const dyMouse = this.particles[a].y - this.mouse.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        if (distMouse < this.mouse.radius) {
          const opacity = (1 - (distMouse / this.mouse.radius)) * (isDarkLines ? 0.45 : 0.55);
          this.ctx.strokeStyle = `rgba(${baseColor}, ${opacity})`;
          this.ctx.lineWidth = 1.1;
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[a].x, this.particles[a].y);
          this.ctx.lineTo(this.mouse.x, this.mouse.y);
          this.ctx.stroke();
        }
      }
    }
  },

  setTheme(theme) {
    this.theme = theme;
  }
};

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 2.2 + 1.2;
    this.vx = (Math.random() - 0.5) * 0.75;
    this.vy = (Math.random() - 0.5) * 0.75;
    this.baseX = this.x;
    this.baseY = this.y;
  }

  update(canvas, mouse) {
    this.x += this.vx;
    this.y += this.vy;

    // Bounce off screen boundaries gently
    if (this.x < 0 || this.x > canvas.width) this.vx = -this.vx;
    if (this.y < 0 || this.y > canvas.height) this.vy = -this.vy;

    // Mouse interactive repulsion/pull
    if (mouse.x !== null && mouse.y !== null) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < mouse.radius && dist > 0) {
        const forceDirectionX = dx / dist;
        const forceDirectionY = dy / dist;
        const force = (mouse.radius - dist) / mouse.radius;
        const direction = -1; // Gentle repel

        this.x += forceDirectionX * force * 1.5 * direction;
        this.y += forceDirectionY * force * 1.5 * direction;
      }
    }
  }

  draw(ctx, theme) {
    const isDarkLines = theme === 'dark-lines';
    ctx.fillStyle = isDarkLines ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  ParticleEngine.init('particles-canvas');
});
