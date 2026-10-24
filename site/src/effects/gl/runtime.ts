import { VERTEX } from './shaders/common';
import { PRESETS, type GlPreset } from './shaders';
import { bufferSize, pickLive, TIER_SETTINGS, type FxTier } from './tier';

/**
 * ส่วนที่โหลดทีหลัง (dynamic import จาก GlBackdrop): ดูแล WebGL context ทุกตัวของหน้าในที่เดียว
 *
 * - ช่องที่อยู่ห่างจอไม่เกินหนึ่งจอได้ context ไม่เกิน MAX_CONTEXTS ตัว เลือกตัวที่ใกล้จอที่สุด
 *   ช่องที่ออกไปไกลกว่านั้นคืน context ทันที (reconcile เรียกซ้ำกี่ครั้งก็ได้ผลเท่าเดิม)
 * - render loop เดียวทั้งหน้า วาดเฉพาะช่องที่อยู่บนจอ ไม่มีช่องไหนบนจอหรือแท็บถูกซ่อน loop หยุดเลย
 * - shader คอมไพล์ไม่ผ่าน, context หาย, สร้าง context ไม่ได้: ถอด canvas ออก พื้นหลัง CSS ยังอยู่
 */

export type AttachOptions = {
  preset: GlPreset;
  intensity: number;
  tier: Exclude<FxTier, 'off'>;
  /** ลดการเคลื่อนไหว แต่ผู้ใช้บังคับ ?fx= ไว้: วาดเฟรมเดียวที่เวลาตายตัว ไม่มี loop */
  still: boolean;
  /** บังคับด้วย ?fx= : ยอมวาดบน GPU ซอฟต์แวร์ (ปกติจะปฏิเสธเพราะช้า) */
  forced: boolean;
};

const MAX_CONTEXTS = 2;
const NEAR_MARGIN = '100% 0px';

type Uniforms = Record<
  'uRes' | 'uTime' | 'uPointer' | 'uIntensity' | 'uDither' | 'uScale',
  WebGLUniformLocation | null
>;

type Phase =
  | { kind: 'compiling'; program: WebGLProgram; shaders: WebGLShader[] }
  | { kind: 'ready'; program: WebGLProgram; uniforms: Uniforms }
  | { kind: 'lost' };

type Renderer = {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  version: 'webgl2' | 'webgl';
  phase: Phase;
  resize: ResizeObserver;
  lastDraw: number;
  /** ต้องวาดใหม่แม้เป็นโหมดเฟรมนิ่ง (เพิ่งพร้อม หรือเพิ่งเปลี่ยนขนาด) */
  dirty: boolean;
  releasing: boolean;
};

type Slot = {
  el: HTMLElement;
  opts: AttachOptions;
  near: boolean;
  visible: boolean;
  failed: boolean;
  renderer: Renderer | null;
};

const slots = new Map<Element, Slot>();
const pointer = { x: 0, y: 0, tx: 0, ty: 0, listening: false };
const start = performance.now();
let raf = 0;
let warned = false;
let nearObserver: IntersectionObserver | null = null;
let visibleObserver: IntersectionObserver | null = null;

export function attach(el: HTMLElement, opts: AttachOptions): () => void {
  const slot: Slot = { el, opts, near: false, visible: false, failed: false, renderer: null };
  slots.set(el, slot);
  observers().near.observe(el);
  observers().visible.observe(el);
  if (opts.tier === 'full' && !opts.still) listenPointer();
  return () => {
    nearObserver?.unobserve(el);
    visibleObserver?.unobserve(el);
    release(slot);
    slots.delete(el);
    reconcile();
  };
}

function observers() {
  if (!nearObserver) document.addEventListener('visibilitychange', schedule);
  nearObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const slot = slots.get(entry.target);
        if (slot) slot.near = entry.isIntersecting;
      }
      reconcile();
    },
    { rootMargin: NEAR_MARGIN },
  );
  visibleObserver ??= new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const slot = slots.get(entry.target);
      if (slot) slot.visible = entry.isIntersecting;
    }
    schedule();
  });
  return { near: nearObserver, visible: visibleObserver };
}

function distanceToViewport(el: Element): number {
  const r = el.getBoundingClientRect();
  if (r.bottom < 0) return -r.bottom;
  if (r.top > innerHeight) return r.top - innerHeight;
  return 0;
}

/** ปรับให้ context ที่มีอยู่ตรงกับช่องที่ควรได้ คืนก่อนสร้าง จำนวนที่มีพร้อมกันจึงไม่เกิน MAX_CONTEXTS */
function reconcile() {
  const candidates = [...slots.values()]
    .filter((slot) => !slot.failed)
    .map((slot) => ({ key: slot, near: slot.near, distance: distanceToViewport(slot.el) }));
  const live = pickLive(candidates, MAX_CONTEXTS);
  for (const slot of slots.values()) if (slot.renderer && !live.has(slot)) release(slot);
  for (const slot of live) if (!slot.renderer) create(slot);
  schedule();
}

function create(slot: Slot) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const attrs: WebGLContextAttributes = {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: 'low-power',
    failIfMajorPerformanceCaveat: !slot.opts.forced,
  };
  const gl2 = canvas.getContext('webgl2', attrs);
  const gl = gl2 ?? canvas.getContext('webgl', attrs);
  if (!gl) {
    slot.failed = true;
    return;
  }
  const renderer: Renderer = {
    canvas,
    gl,
    version: gl2 ? 'webgl2' : 'webgl',
    phase: { kind: 'lost' },
    resize: new ResizeObserver(() => fit(slot, renderer)),
    lastDraw: 0,
    dirty: true,
    releasing: false,
  };
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    if (renderer.releasing) return;
    renderer.phase = { kind: 'lost' };
    slot.el.removeAttribute('data-gl');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    if (renderer.releasing) return;
    build(slot, renderer);
    schedule();
  });
  slot.renderer = renderer;
  slot.el.append(canvas);
  renderer.resize.observe(slot.el);
  fit(slot, renderer);
  build(slot, renderer);
}

function release(slot: Slot) {
  const renderer = slot.renderer;
  if (!renderer) return;
  slot.renderer = null;
  renderer.releasing = true;
  renderer.resize.disconnect();
  renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();
  renderer.canvas.remove();
  slot.el.removeAttribute('data-gl');
}

function fail(slot: Slot, log: string | null) {
  if (!warned) {
    warned = true;
    console.warn('[gl-backdrop] shader failed, using the CSS background', log);
  }
  slot.failed = true;
  release(slot);
  reconcile();
}

function fit(slot: Slot, renderer: Renderer) {
  const { scale } = TIER_SETTINGS[slot.opts.tier];
  const { width, height } = bufferSize(
    slot.el.clientWidth,
    slot.el.clientHeight,
    devicePixelRatio,
    scale,
  );
  if (renderer.canvas.width === width && renderer.canvas.height === height) return;
  renderer.canvas.width = width;
  renderer.canvas.height = height;
  renderer.dirty = true;
  schedule();
}

function build(slot: Slot, renderer: Renderer) {
  const { gl } = renderer;
  const program = gl.createProgram();
  const shaders = [
    compile(gl, gl.VERTEX_SHADER, VERTEX),
    compile(gl, gl.FRAGMENT_SHADER, PRESETS[slot.opts.preset].fragment),
  ];
  if (!program || shaders.some((s) => !s)) return fail(slot, 'createShader failed');
  for (const shader of shaders) gl.attachShader(program, shader!);
  gl.bindAttribLocation(program, 0, 'aPos');
  gl.linkProgram(program);
  renderer.phase = { kind: 'compiling', program, shaders: shaders as WebGLShader[] };

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  renderer.dirty = true;
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

/** ตรวจผลคอมไพล์โดยไม่บล็อก ถ้ามี KHR_parallel_shader_compile รอจนเสร็จก่อนค่อยถามสถานะ */
function poll(slot: Slot, renderer: Renderer): boolean {
  const { gl, phase } = renderer;
  if (phase.kind !== 'compiling') return phase.kind === 'ready';
  const parallel = gl.getExtension('KHR_parallel_shader_compile') as {
    COMPLETION_STATUS_KHR: number;
  } | null;
  if (parallel && !gl.getProgramParameter(phase.program, parallel.COMPLETION_STATUS_KHR)) {
    return false;
  }
  if (!gl.getProgramParameter(phase.program, gl.LINK_STATUS)) {
    if (gl.isContextLost()) return false;
    const logs = phase.shaders.map((s) => gl.getShaderInfoLog(s)).filter(Boolean);
    fail(slot, logs.join('\n') || gl.getProgramInfoLog(phase.program));
    return false;
  }
  const at = (name: keyof Uniforms) => gl.getUniformLocation(phase.program, name);
  renderer.phase = {
    kind: 'ready',
    program: phase.program,
    uniforms: {
      uRes: at('uRes'),
      uTime: at('uTime'),
      uPointer: at('uPointer'),
      uIntensity: at('uIntensity'),
      uDither: at('uDither'),
      uScale: at('uScale'),
    },
  };
  return true;
}

function draw(slot: Slot, renderer: Renderer, seconds: number) {
  const { gl, canvas, phase } = renderer;
  if (phase.kind !== 'ready') return;
  const preset = PRESETS[slot.opts.preset];
  const u = phase.uniforms;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(phase.program);
  gl.uniform2f(u.uRes, canvas.width, canvas.height);
  gl.uniform1f(u.uTime, preset.still + seconds);
  gl.uniform2f(u.uPointer, pointer.x, pointer.y);
  gl.uniform1f(u.uIntensity, slot.opts.intensity);
  gl.uniform1f(u.uDither, preset.dither);
  gl.uniform1f(u.uScale, canvas.width / Math.max(1, slot.el.clientWidth));
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  renderer.dirty = false;
  if (!slot.el.dataset.gl) slot.el.dataset.gl = renderer.version;
}

function wantsFrames(): boolean {
  if (document.hidden) return false;
  for (const slot of slots.values()) {
    const r = slot.renderer;
    if (!r || !slot.visible || r.phase.kind === 'lost') continue;
    if (!slot.opts.still || r.dirty || r.phase.kind === 'compiling') return true;
  }
  return false;
}

function schedule() {
  if (!raf && wantsFrames()) raf = requestAnimationFrame(tick);
}

function tick(now: number) {
  raf = 0;
  pointer.x += (pointer.tx - pointer.x) * 0.04;
  pointer.y += (pointer.ty - pointer.y) * 0.04;
  const seconds = (now - start) / 1000;
  for (const slot of slots.values()) {
    const r = slot.renderer;
    if (!r || !slot.visible || !poll(slot, r) || !slot.renderer) continue;
    if (slot.opts.still) {
      if (r.dirty) draw(slot, r, 0);
      continue;
    }
    const interval = 1000 / TIER_SETTINGS[slot.opts.tier].fps;
    if (now - r.lastDraw < interval - 2) continue;
    r.lastDraw = now;
    draw(slot, r, seconds);
  }
  schedule();
}

function listenPointer() {
  if (pointer.listening || !matchMedia('(pointer: fine)').matches) return;
  pointer.listening = true;
  addEventListener(
    'pointermove',
    (event) => {
      pointer.tx = (event.clientX / innerWidth) * 2 - 1;
      pointer.ty = 1 - (event.clientY / innerHeight) * 2;
    },
    { passive: true },
  );
}
