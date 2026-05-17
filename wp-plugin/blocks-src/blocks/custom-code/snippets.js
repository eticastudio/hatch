/**
 * Snippet library for the Custom Code block.
 * Each snippet pre-fills HTML+CSS (and sometimes JS) for common "wow" effects.
 *
 * Designer-friendly: clickable in the sidebar, instantly editable.
 *
 * @package HatchBlocks
 */

export const SNIPPETS = [
	{
		id: 'gradient-bg',
		label: 'Animated gradient',
		mode: 'inline',
		html: '<div class="anim-gradient">Hello headless</div>',
		css:
`.anim-gradient {
  display: grid;
  place-items: center;
  min-height: 300px;
  font: 600 3rem/1 system-ui, sans-serif;
  color: white;
  background: linear-gradient(120deg, #6366f1, #ec4899, #f59e0b, #10b981);
  background-size: 300% 300%;
  animation: anim-grad 8s ease infinite;
}
@keyframes anim-grad {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}`,
		js: '',
	},
	{
		id: 'marquee',
		label: 'Smooth marquee',
		mode: 'inline',
		html:
`<div class="hatch-marquee">
  <div class="hatch-marquee-track">
    <span>Headless WordPress</span>
    <span>Built with Hatch</span>
    <span>Astro Frontend</span>
    <span>REST API Native</span>
    <span>Tailwind Utility</span>
    <span>Headless WordPress</span>
    <span>Built with Hatch</span>
    <span>Astro Frontend</span>
  </div>
</div>`,
		css:
`.hatch-marquee {
  overflow: hidden;
  padding: 1.5rem 0;
  -webkit-mask-image: linear-gradient(90deg, transparent, black 10%, black 90%, transparent);
          mask-image: linear-gradient(90deg, transparent, black 10%, black 90%, transparent);
}
.hatch-marquee-track {
  display: flex;
  gap: 3rem;
  width: max-content;
  animation: hatch-marquee 22s linear infinite;
  font: 600 1.25rem/1 system-ui, sans-serif;
  color: #0f172a;
}
@keyframes hatch-marquee {
  to { transform: translateX(-50%); }
}`,
		js: '',
	},
	{
		id: 'glass',
		label: 'Glassmorphism card',
		mode: 'inline',
		html:
`<div class="glass-card">
  <h3>Frosted Glass</h3>
  <p>Pure CSS, no JS. Beautiful on any background.</p>
</div>`,
		css:
`.glass-card {
  max-width: 420px;
  padding: 2rem;
  border-radius: 1rem;
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(12px) saturate(140%);
  -webkit-backdrop-filter: blur(12px) saturate(140%);
  border: 1px solid rgba(255,255,255,0.25);
  box-shadow: 0 8px 32px rgba(0,0,0,0.08);
  color: #0f172a;
  font: 1rem/1.5 system-ui, sans-serif;
}
.glass-card h3 { margin: 0 0 .5rem; font-size: 1.5rem; }
.glass-card p  { margin: 0; opacity: 0.85; }`,
		js: '',
	},
	{
		id: 'neon-glow',
		label: 'Neon glow text',
		mode: 'inline',
		html: '<h2 class="neon">HELLO HEADLESS</h2>',
		css:
`.neon {
  font: 800 4rem/1 system-ui, sans-serif;
  text-align: center;
  color: #fff;
  text-shadow:
    0 0 4px #fff,
    0 0 11px #fff,
    0 0 19px #fff,
    0 0 40px #0ea5e9,
    0 0 80px #0ea5e9,
    0 0 90px #0ea5e9;
  padding: 4rem 1rem;
  background: #020617;
  border-radius: 1rem;
}`,
		js: '',
	},
	{
		id: 'typewriter',
		label: 'Typewriter effect',
		mode: 'inline',
		html: '<div class="tw"><span>headless WordPress</span></div>',
		css:
`.tw {
  display: grid;
  place-items: center;
  min-height: 240px;
  font: 700 2.5rem/1 ui-monospace, "SF Mono", monospace;
}
.tw span {
  overflow: hidden;
  white-space: nowrap;
  border-right: 3px solid currentColor;
  width: 0;
  animation: tw-type 3s steps(20) 1 forwards, tw-blink 0.7s step-end infinite;
}
@keyframes tw-type { to { width: 18ch; } }
@keyframes tw-blink { 50% { border-color: transparent; } }`,
		js: '',
	},
	{
		id: 'parallax',
		label: 'Scroll parallax',
		mode: 'inline',
		html:
`<section class="parallax">
  <div class="parallax-bg"></div>
  <div class="parallax-content">
    <h2>Smooth Parallax</h2>
    <p>Pure CSS scroll-driven animation.</p>
  </div>
</section>`,
		css:
`.parallax {
  position: relative;
  height: 60vh;
  overflow: hidden;
  border-radius: 1rem;
}
.parallax-bg {
  position: absolute;
  inset: -20% 0;
  background: linear-gradient(135deg, #06b6d4, #6366f1, #ec4899);
  animation: parallax-move linear;
  animation-timeline: scroll();
}
.parallax-content {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  height: 100%;
  color: white;
  text-align: center;
  font: 600 1.5rem/1.4 system-ui, sans-serif;
}
@keyframes parallax-move {
  to { transform: translateY(20%); }
}`,
		js: '',
	},
	{
		id: '3d-card',
		label: '3D card flip on hover',
		mode: 'inline',
		html:
`<div class="card3d">
  <div class="card3d-inner">
    <div class="card3d-front">Hover me</div>
    <div class="card3d-back">Surprise!</div>
  </div>
</div>`,
		css:
`.card3d { perspective: 1000px; width: 280px; height: 200px; margin: 2rem auto; }
.card3d-inner {
  position: relative; width: 100%; height: 100%;
  transition: transform 0.6s; transform-style: preserve-3d;
}
.card3d:hover .card3d-inner { transform: rotateY(180deg); }
.card3d-front, .card3d-back {
  position: absolute; inset: 0;
  backface-visibility: hidden; -webkit-backface-visibility: hidden;
  display: grid; place-items: center;
  border-radius: 1rem;
  font: 600 1.5rem/1 system-ui, sans-serif;
}
.card3d-front { background: #1e293b; color: white; }
.card3d-back  { background: #ec4899; color: white; transform: rotateY(180deg); }`,
		js: '',
	},
	{
		id: 'particles',
		label: 'Particles (iframe sandbox)',
		mode: 'iframe',
		html:
`<canvas id="p"></canvas>
<style>html,body,canvas { margin:0; padding:0; width:100%; height:100%; background:#020617; display:block; }</style>
<script>
const c = document.getElementById('p');
const x = c.getContext('2d');
let W, H, parts = [];
function resize(){ W = c.width = innerWidth; H = c.height = innerHeight; }
window.addEventListener('resize', resize); resize();
for (let i=0;i<60;i++) parts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.8,vy:(Math.random()-.5)*.8,r:Math.random()*2+1});
(function loop(){
  x.fillStyle='rgba(2,6,23,0.2)'; x.fillRect(0,0,W,H);
  x.fillStyle='#7dd3fc';
  parts.forEach(p=>{
    p.x+=p.vx; p.y+=p.vy;
    if(p.x<0||p.x>W) p.vx=-p.vx;
    if(p.y<0||p.y>H) p.vy=-p.vy;
    x.beginPath(); x.arc(p.x,p.y,p.r,0,Math.PI*2); x.fill();
  });
  requestAnimationFrame(loop);
})();
</script>`,
		css: '',
		js: '',
	},
];
