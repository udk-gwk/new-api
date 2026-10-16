// Copy of udk/infrastructure design/genki-hero/genki-hero.ts, written by tools/sync-genki-hero.ts.
// Edit the original there and re-run the sync; changes made here are overwritten.
export interface HeroOptions {
  cell?: number
  maxTexels?: number
  stepsPerSecond?: number
  isActive?: () => boolean
  colors?: {
    base?: [number, number, number]
    accent?: [number, number, number]
    /** Colours the brush stamps, picked at random per stroke. Default: the source's four. */
    brush?: [number, number, number][]
  }
}
export interface HeroStats {
  simWidth: number
  simHeight: number
  cell: number
  stepsPerSecond: number
  measuredStepsPerSecond: number
  frameMs: number
  gpuMs: number | null
  running: boolean
}
export interface HeroHandle {
  destroy(): void
  pause(): void
  resume(): void
  setActive(on: boolean): void
  stats?(): HeroStats
}
interface TimerExtension {
  readonly TIME_ELAPSED_EXT: 0x88BF
  readonly GPU_DISJOINT_EXT: 0x8FBB
}
interface Target { texture: WebGLTexture; framebuffer: WebGLFramebuffer }
interface Programs {
  init: WebGLProgram
  update: WebGLProgram
  render: WebGLProgram
  initResolution: WebGLUniformLocation
  updateResolution: WebGLUniformLocation
  size: WebGLUniformLocation
  s1: WebGLUniformLocation
  s2: WebGLUniformLocation
  brush: WebGLUniformLocation
  brushColor: WebGLUniformLocation
  mode1: WebGLUniformLocation
  mode2: WebGLUniformLocation
}

// One oversized triangle; no vertex buffer or attributes.
const VS = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`
const FS_INIT = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform vec3 u_base;
uniform vec3 u_accent;
float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
out vec4 outColor;
void main() {
  vec2 st = gl_FragCoord.xy / u_resolution.xy;
  vec2 grid = floor(st * vec2(2.0, 1.0));
  vec3 c = (random(grid) > 0.6) ? u_accent : u_base;
  outColor = vec4(c, 1.0);
}`
const FS_UPDATE = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D u_texture;
uniform vec2 u_resolution;
uniform ivec2 u_size;
uniform vec4 u_mask_s1;
uniform vec4 u_mask_s2;
uniform vec4 u_mask_brush;
uniform vec3 u_col_brush;
uniform int u_mode_s1;
uniform int u_mode_s2;
out vec4 outColor;
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float sdRect(vec2 uv, vec4 m) {
  vec2 d = abs(uv - m.xy) - m.zw;
  return 1.0 - smoothstep(-0.01, 0.01, max(d.x, d.y));
}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  ivec2 ic = ivec2(gl_FragCoord.xy);
  vec4 current = texelFetch(u_texture, ic, 0);
  float s1 = sdRect(uv, u_mask_s1);
  float s2 = sdRect(uv, u_mask_s2);
  float brush = sdRect(uv, u_mask_brush);
  vec4 next = current;
  if (brush > 0.5) {
    next = vec4(u_col_brush, 1.0);
  } else {
    ivec2 idir = ivec2(0);
    if (s1 > 0.1) {
      idir = (u_mode_s1 == 0) ? ivec2(0, 1) : ivec2(1, 0);
    } else if (s2 > 0.1) {
      idir = (u_mode_s2 == 0) ? ivec2(1, -1) : ivec2(1, 1);
    }
    if (any(notEqual(idir, ivec2(0)))) {
      vec4 nBack = texelFetch(u_texture, clamp(ic - idir, ivec2(0), u_size - 1), 0);
      vec4 nFwd = texelFetch(u_texture, clamp(ic + idir, ivec2(0), u_size - 1), 0);
      float lC = luma(current.rgb);
      float lB = luma(nBack.rgb);
      float lF = luma(nFwd.rgb);
      if (lB > lC) next = nBack;
      else if (lF < lC) next = nFwd;
    }
  }
  outColor = next;
}`
// Keep the previous-step mean: sorting fronts otherwise alternate at 30 Hz.
const FS_RENDER = `#version 300 es
precision mediump float;
precision highp int;
uniform mediump sampler2D u_texture;
uniform mediump sampler2D u_prev;
out vec4 outColor;
void main() {
  highp ivec2 ic = ivec2(gl_FragCoord.xy);
  outColor = mix(texelFetch(u_texture, ic, 0), texelFetch(u_prev, ic, 0), 0.5);
}`

// Brush palette from the source, flattened RGB triples (read-only, shared by all instances).
const BRUSH_COLORS: readonly number[] = [
  1, 0, 0.5,
  0, 1, 0.5,
  1, 0.8, 0,
  0.9, 0.9, 0.9,
]

type RGB = [number, number, number]
type Palette = { base: RGB; accent: RGB; brush: RGB[] }

/** One palette per service, every colour a shade of the service hue from the tint list in
 *  design/udk-digital-style.md. `genki` is the original multi-colour look (the default). */
export const PALETTES: Record<'genki' | 'stt' | 'tts' | 'image' | 'api', Palette> = {
  genki: { base: [0.1, 0.1, 0.1], accent: [0, 0.4, 0.8], brush: [[1, 0, 0.5], [0, 1, 0.5], [1, 0.8, 0], [0.9, 0.9, 0.9]] },
  // stt: pale blue #ebf4ff, hue ~212°
  stt: { base: [0.03, 0.08, 0.16], accent: [0.1, 0.42, 0.82],
    brush: [[0.45, 0.7, 1], [0.78, 0.88, 1], [0.04, 0.24, 0.58], [0.24, 0.56, 0.95]] },
  // tts: pale apricot #fff4eb, hue ~28°
  tts: { base: [0.2, 0.1, 0.04], accent: [0.88, 0.47, 0.14],
    brush: [[1, 0.64, 0.32], [0.98, 0.84, 0.68], [0.62, 0.29, 0.07], [0.95, 0.56, 0.2]] },
  // image: pale violet #f6ebff, hue ~272°
  image: { base: [0.11, 0.05, 0.18], accent: [0.56, 0.27, 0.86],
    brush: [[0.76, 0.56, 1], [0.91, 0.84, 1], [0.36, 0.12, 0.6], [0.66, 0.4, 0.95]] },
  // api: pale yellow #fffbe0, hue ~52°
  api: { base: [0.17, 0.14, 0.03], accent: [0.86, 0.72, 0.1],
    brush: [[1, 0.9, 0.35], [1, 0.96, 0.72], [0.6, 0.48, 0.04], [0.95, 0.8, 0.18]] },
}

// All durations are simulation steps. Scalars avoid brush-transition allocations.
class Mover {
  x = Math.random()
  y = Math.random()
  startX = this.x
  startY = this.y
  tx = this.x
  ty = this.y
  moving = false
  timer = 0
  waitDuration = 30 + Math.random() * 600
  moveDuration = 60 + Math.random() * 1200
  mode = 0
  r = 1
  g = 1
  b = 1
  constructor(readonly isBrush: boolean, public w: number, public h: number,
    private readonly palette: readonly number[] = BRUSH_COLORS) {}
  update(): void {
    this.timer++
    if (!this.moving) {
      if (this.timer >= this.waitDuration) {
        this.moving = true
        this.timer = 0
        this.startX = this.x
        this.startY = this.y
        this.tx = Math.random()
        this.ty = Math.random()
        this.mode = Math.random() > 0.5 ? 0 : 1
        this.moveDuration = 40 + Math.random() * 1500
        if (this.isBrush) {
          const i = Math.floor(Math.random() * (this.palette.length / 3)) * 3
          this.r = this.palette[i] ?? 1
          this.g = this.palette[i + 1] ?? 1
          this.b = this.palette[i + 2] ?? 1
          this.w = 0.02 + Math.random() * 0.08
          this.h = 0.02 + Math.random() * 0.08
        }
      }
    } else {
      const x = this.timer / this.moveDuration
      const eased = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
      this.x = this.startX + (this.tx - this.startX) * eased
      this.y = this.startY + (this.ty - this.startY) * eased
      if (this.timer >= this.moveDuration) {
        this.moving = false
        this.timer = 0
        if (this.isBrush) {
          this.waitDuration = 500 + Math.random() * 1000
          this.w = 0
        } else {
          this.waitDuration = 20 + Math.random() * 100
        }
      }
    }
  }
}

function positive(value: number | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  console.warn(`[genki-hero] invalid ${name}; using ${fallback}`)
  return fallback
}
function color(value: unknown,
  fallback: [number, number, number], name: string): [number, number, number] {
  if (value === undefined) return fallback
  if (Array.isArray(value) && value.length === 3 &&
    value.every((v: unknown) => typeof v === 'number' && Number.isFinite(v))) {
    return value as [number, number, number]
  }
  console.warn(`[genki-hero] invalid ${name}; using default`)
  return fallback
}
function emptyStats(): HeroStats {
  return { simWidth: 0, simHeight: 0, cell: 0, stepsPerSecond: 0,
    measuredStepsPerSecond: 0, frameMs: 0, gpuMs: null, running: false }
}
function noop(): void {}
function noopHandle(): HeroHandle {
  return { destroy: noop, pause: noop, resume: noop, setActive: noop, stats: emptyStats }
}
function reason(error: unknown): string { return error instanceof Error ? error.message : String(error) }

export function mountHero(canvas: HTMLCanvasElement, opts: HeroOptions = {}): HeroHandle {
  const cell = Math.max(1, positive(opts.cell, 1, 'cell'))
  const maxTexels = positive(opts.maxTexels, 1_000_000, 'maxTexels')
  // 30, not 60: half the GPU work for a background; DaNi chose the slower pace 2026-10-16.
  const rate = positive(opts.stepsPerSecond, 30, 'stepsPerSecond')
  const stepMs = 1000 / rate
  const base = color(opts.colors?.base, [0.1, 0.1, 0.1], 'colors.base')
  const accent = color(opts.colors?.accent, [0, 0.4, 0.8], 'colors.accent')
  const brushIn = opts.colors?.brush
  let palette: readonly number[] = BRUSH_COLORS
  if (brushIn !== undefined) {
    const valid = Array.isArray(brushIn) && brushIn.length > 0 && brushIn.every((c) => color(c, [1, 1, 1], 'colors.brush[]') === c)
    if (valid) palette = brushIn.flat()
    else console.warn('[genki-hero] invalid colors.brush; using default')
  }
  let pull = opts.isActive
  if (pull !== undefined && typeof pull !== 'function') {
    console.warn('[genki-hero] invalid isActive; using default')
    pull = undefined
  }
  const originalDisplay = canvas.style.display
  const originalRendering = canvas.style.imageRendering
  let gl: WebGL2RenderingContext
  try {
    const context = canvas.getContext('webgl2', { alpha: false, antialias: false,
      depth: false, stencil: false, premultipliedAlpha: false,
      preserveDrawingBuffer: false, powerPreference: 'low-power' })
    if (!context) throw new Error('WebGL2 unavailable')
    gl = context
  } catch (error: unknown) {
    canvas.style.display = 'none'
    console.warn(`[genki-hero] disabled: ${reason(error)}`)
    return noopHandle()
  }
  canvas.style.imageRendering = 'pixelated'
  let resources: Programs | null = null
  const programs: WebGLProgram[] = []
  let vao: WebGLVertexArrayObject | null = null
  let targets: [Target, Target] | null = null
  let extension: TimerExtension | null = null
  let query: WebGLQuery | null = null
  let queryPending = false
  let queryDisjoint = false
  let current: 0 | 1 = 0
  let width = 0
  let height = 0
  let cssW = 0
  let cssH = 0
  let effectiveCell = cell
  let maxWidth = 1
  let maxHeight = 1
  let destroyed = false
  let lost = false
  let paused = false
  let active = true
  let intersecting = false
  let pullActive = true
  let running = false
  let raf = 0
  let debounce = 0
  let poll = 0
  let lastTime = -1
  let accumulator = 0
  let cpuMs = 0
  let gpuMs: number | null = null
  let resizeObserver: ResizeObserver | null = null
  let intersectionObserver: IntersectionObserver | null = null
  let media: MediaQueryList | null = null
  const buckets = new Float64Array(10)
  const bucketTimes = new Float64Array(10).fill(-Infinity)
  const s1 = new Mover(false, 0.65, 0.25)
  const s2 = new Mover(false, 0.4, 0.4)
  const brush = new Mover(true, 0.4, 0.1, palette)

  function compile(type: number, source: string, name: string): WebGLShader {
    const shader = gl.createShader(type)
    if (!shader) throw new Error(`${name}: createShader failed`)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader)
      gl.deleteShader(shader)
      throw new Error(`${name}: compile failed: ${log}`)
    }
    return shader
  }
  function link(fragment: string, name: string): WebGLProgram {
    const vertex = compile(gl.VERTEX_SHADER, VS, 'vertex')
    let shader: WebGLShader | null = null
    let program: WebGLProgram | null = null
    try {
      shader = compile(gl.FRAGMENT_SHADER, fragment, name)
      program = gl.createProgram()
      if (!program) throw new Error(`${name}: createProgram failed`)
      gl.attachShader(program, vertex)
      gl.attachShader(program, shader)
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(`${name}: link failed: ${gl.getProgramInfoLog(program)}`)
      }
      gl.detachShader(program, vertex)
      gl.detachShader(program, shader)
      programs.push(program)
      return program
    } catch (error: unknown) {
      gl.deleteProgram(program)
      throw error
    } finally {
      gl.deleteShader(vertex)
      gl.deleteShader(shader)
    }
  }
  function uniform(program: WebGLProgram, name: string): WebGLUniformLocation {
    const location = gl.getUniformLocation(program, name)
    if (location === null) throw new Error(`missing uniform ${name}`)
    return location
  }
  function build(): void {
    const init = link(FS_INIT, 'init')
    const update = link(FS_UPDATE, 'update')
    const renderProgram = link(FS_RENDER, 'render')
    // Cache all locations; immutable uniforms are set only during program construction.
    resources = { init, update, render: renderProgram,
      initResolution: uniform(init, 'u_resolution'),
      updateResolution: uniform(update, 'u_resolution'), size: uniform(update, 'u_size'),
      s1: uniform(update, 'u_mask_s1'), s2: uniform(update, 'u_mask_s2'),
      brush: uniform(update, 'u_mask_brush'), brushColor: uniform(update, 'u_col_brush'),
      mode1: uniform(update, 'u_mode_s1'), mode2: uniform(update, 'u_mode_s2') }
    gl.useProgram(init)
    gl.uniform3f(uniform(init, 'u_base'), base[0], base[1], base[2])
    gl.uniform3f(uniform(init, 'u_accent'), accent[0], accent[1], accent[2])
    gl.useProgram(update)
    gl.uniform1i(uniform(update, 'u_texture'), 0)
    gl.useProgram(renderProgram)
    gl.uniform1i(uniform(renderProgram, 'u_texture'), 0)
    gl.uniform1i(uniform(renderProgram, 'u_prev'), 1)
    vao = gl.createVertexArray()
    if (!vao) throw new Error('createVertexArray failed')
    gl.bindVertexArray(vao)
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.STENCIL_TEST)
    gl.disable(gl.BLEND)
    gl.disable(gl.SCISSOR_TEST)
    const textureLimit = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
    const viewportLimit = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array
    maxWidth = Math.min(textureLimit, viewportLimit[0] ?? 1)
    maxHeight = Math.min(textureLimit, viewportLimit[1] ?? 1)
    extension = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExtension | null
    if (extension) {
      query = gl.createQuery()
      if (!query) throw new Error('createQuery failed')
    }
  }
  function makeTarget(w: number, h: number): Target {
    const texture = gl.createTexture()
    const framebuffer = gl.createFramebuffer()
    if (!texture || !framebuffer) {
      gl.deleteTexture(texture)
      gl.deleteFramebuffer(framebuffer)
      throw new Error('texture/framebuffer allocation failed')
    }
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      gl.deleteFramebuffer(framebuffer)
      gl.deleteTexture(texture)
      throw new Error(`incomplete framebuffer: 0x${status.toString(16)}`)
    }
    return { texture, framebuffer }
  }
  function deleteTarget(target: Target): void {
    gl.deleteFramebuffer(target.framebuffer)
    gl.deleteTexture(target.texture)
  }
  function unbindSamplers(): void {
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, null)
  }
  function initialize(): void {
    if (!resources || !targets) return
    unbindSamplers()
    gl.useProgram(resources.init)
    gl.bindFramebuffer(gl.FRAMEBUFFER, targets[0].framebuffer)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.bindFramebuffer(gl.FRAMEBUFFER, targets[1].framebuffer)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    current = 0
    accumulator = 0
    lastTime = -1
  }
  function render(): void {
    if (!resources || !targets) return
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.useProgram(resources.render)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, targets[current].texture)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, targets[current === 0 ? 1 : 0].texture)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    // Unit 1 is unused by update, and may hold its next destination.
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.activeTexture(gl.TEXTURE0)
  }
  function step(): void {
    if (!resources || !targets) return
    s1.update()
    s2.update()
    brush.update()
    const next = current === 0 ? 1 : 0
    // Bind the source before attaching the destination for this draw: no feedback.
    gl.bindTexture(gl.TEXTURE_2D, targets[current].texture)
    gl.bindFramebuffer(gl.FRAMEBUFFER, targets[next].framebuffer)
    gl.useProgram(resources.update)
    gl.uniform4f(resources.s1, s1.x, s1.y, s1.w, s1.h)
    gl.uniform4f(resources.s2, s2.x, s2.y, s2.w, s2.h)
    gl.uniform4f(resources.brush, brush.x, brush.y, brush.w, brush.h)
    gl.uniform3f(resources.brushColor, brush.r, brush.g, brush.b)
    gl.uniform1i(resources.mode1, s1.mode)
    gl.uniform1i(resources.mode2, s2.mode)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    current = next
  }
  function applySize(): void {
    debounce = 0
    if (destroyed || lost || !resources || cssW <= 0 || cssH <= 0) return
    try {
      effectiveCell = Math.max(cell, Math.sqrt(cssW * cssH / maxTexels))
      const w = Math.max(1, Math.min(maxWidth, Math.floor(cssW / effectiveCell)))
      const h = Math.max(1, Math.min(maxHeight, Math.floor(cssH / effectiveCell)))
      if (targets && width === w && height === h) { updateRunning(); return }
      const first = makeTarget(w, h)
      let second: Target
      try { second = makeTarget(w, h) } catch (error: unknown) { deleteTarget(first); throw error }
      const old = targets
      unbindSamplers()
      if (old) {
        // Preserve the latest pattern in BOTH halves of the new ping-pong pair.
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, old[current].framebuffer)
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, first.framebuffer)
        gl.blitFramebuffer(0, 0, width, height, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST)
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, second.framebuffer)
        gl.blitFramebuffer(0, 0, width, height, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST)
        deleteTarget(old[0])
        deleteTarget(old[1])
      }
      targets = [first, second]
      current = 0
      width = canvas.width = w
      height = canvas.height = h
      // Backing store equals simulation size; DPR is deliberately ignored.
      gl.viewport(0, 0, w, h)
      gl.useProgram(resources.init)
      gl.uniform2f(resources.initResolution, w, h)
      gl.useProgram(resources.update)
      gl.uniform2f(resources.updateResolution, w, h)
      gl.uniform2i(resources.size, w, h)
      if (!old) initialize()
      render()
      updateRunning()
    } catch (error: unknown) { disable(`resize: ${reason(error)}`) }
  }
  function otherBlockersClear(): boolean {
    return !destroyed && !lost && !paused && active && intersecting &&
      !document.hidden && !media?.matches && targets !== null && cssW > 0 && cssH > 0
  }
  function shouldRun(): boolean { return otherBlockersClear() && pullActive }
  function stop(): void {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    running = false
    lastTime = -1
    accumulator = 0
  }
  // One gate owns both rAF and the optional pull-only polling timer.
  function updateRunning(): void {
    const eligible = otherBlockersClear()
    if (eligible) {
      try { pullActive = pull ? Boolean(pull()) : true }
      catch (error: unknown) { disable(`isActive: ${reason(error)}`); return }
    }
    if (shouldRun()) {
      if (poll) window.clearInterval(poll)
      poll = 0
      if (!running) {
        running = true
        lastTime = -1
        accumulator = 0
        raf = requestAnimationFrame(frame)
      }
    } else {
      stop()
      if (eligible && !pullActive) {
        if (!poll) poll = window.setInterval(updateRunning, 250)
      } else {
        if (poll) window.clearInterval(poll)
        poll = 0
      }
    }
  }
  function pollQuery(): void {
    if (!query || !extension || !queryPending) return
    if (gl.getParameter(extension.GPU_DISJOINT_EXT)) queryDisjoint = true
    if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) return
    if (!queryDisjoint) {
      const ms = (gl.getQueryParameter(query, gl.QUERY_RESULT) as number) / 1e6
      gpuMs = gpuMs === null ? ms : gpuMs + 0.1 * (ms - gpuMs)
    }
    queryPending = false
    queryDisjoint = false
  }
  function frame(now: number): void {
    const started = performance.now()
    raf = 0
    updateRunning() // Exactly one pull check per running callback.
    if (!running) return
    pollQuery()
    if (lastTime < 0 || now - lastTime > 250) {
      lastTime = now
      accumulator = 0
    } else {
      accumulator += Math.max(0, now - lastTime)
      lastTime = now
      if (accumulator >= stepMs) {
        const timed = query !== null && extension !== null && !queryPending
        if (timed && query && extension) gl.beginQuery(extension.TIME_ELAPSED_EXT, query)
        let count = 0
        while (accumulator >= stepMs && count < 2) {
          step()
          accumulator -= stepMs
          count++
        }
        // Drop time beyond one pending step: a slow display runs slower, never catches up.
        accumulator = Math.min(accumulator, stepMs)
        render() // No step means no render pass.
        if (timed && extension) {
          gl.endQuery(extension.TIME_ELAPSED_EXT)
          queryPending = true
        }
        const bucket = Math.floor(now / 100)
        const index = bucket % 10
        if (bucketTimes[index] !== bucket) { bucketTimes[index] = bucket; buckets[index] = 0 }
        buckets[index] = (buckets[index] ?? 0) + count
        const elapsed = performance.now() - started
        cpuMs = cpuMs === 0 ? elapsed : cpuMs + 0.1 * (elapsed - cpuMs)
      }
    }
    raf = requestAnimationFrame(frame)
  }
  function onResize(entries: ResizeObserverEntry[]): void {
    if (destroyed) return
    const entry = entries[0]
    if (!entry) return
    cssW = entry.contentRect.width
    cssH = entry.contentRect.height
    if (debounce) window.clearTimeout(debounce)
    debounce = 0
    if (cssW <= 0 || cssH <= 0) { updateRunning(); return }
    if (!targets) applySize()
    else debounce = window.setTimeout(applySize, 150)
  }
  function onIntersection(entries: IntersectionObserverEntry[]): void {
    const entry = entries[entries.length - 1]
    if (entry) { intersecting = entry.isIntersecting; updateRunning() }
  }
  function onMotion(): void {
    if (destroyed) return
    if (media?.matches && !lost) { initialize(); render() }
    updateRunning()
  }
  function dropResources(deleteObjects: boolean): void {
    if (deleteObjects) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      unbindSamplers()
      gl.useProgram(null)
      gl.bindVertexArray(null)
      if (targets) { deleteTarget(targets[0]); deleteTarget(targets[1]) }
      for (const program of programs) gl.deleteProgram(program)
      gl.deleteVertexArray(vao)
      gl.deleteQuery(query)
    }
    resources = null
    programs.length = 0
    targets = null
    vao = null
    query = null
    extension = null
    queryPending = false
    queryDisjoint = false
    gpuMs = null
    width = height = 0
  }
  function onLost(event: Event): void {
    event.preventDefault()
    lost = true
    if (debounce) window.clearTimeout(debounce)
    debounce = 0
    updateRunning()
    dropResources(false)
  }
  function onRestored(): void {
    if (destroyed) return
    lost = false
    try { build(); applySize(); updateRunning() }
    catch (error: unknown) { disable(`context restore: ${reason(error)}`) }
  }
  function destroy(): void {
    if (destroyed) return
    destroyed = true
    stop()
    if (debounce) window.clearTimeout(debounce)
    if (poll) window.clearInterval(poll)
    debounce = poll = 0
    resizeObserver?.disconnect()
    intersectionObserver?.disconnect()
    document.removeEventListener('visibilitychange', updateRunning)
    media?.removeEventListener('change', onMotion)
    canvas.removeEventListener('webglcontextlost', onLost)
    canvas.removeEventListener('webglcontextrestored', onRestored)
    dropResources(!lost)
    canvas.style.imageRendering = originalRendering
    canvas.style.display = originalDisplay
  }
  function disable(message: string): void {
    destroy()
    canvas.style.display = 'none'
    console.warn(`[genki-hero] disabled: ${message}`)
  }
  function stats(): HeroStats {
    if (destroyed) return emptyStats()
    const bucket = Math.floor(performance.now() / 100)
    let measured = 0
    for (let i = 0; i < 10; i++) {
      if ((bucketTimes[i] ?? -Infinity) > bucket - 10) measured += buckets[i] ?? 0
    }
    return { simWidth: width, simHeight: height, cell: effectiveCell,
      stepsPerSecond: rate, measuredStepsPerSecond: running ? measured : 0,
      frameMs: cpuMs, gpuMs, running }
  }
  try {
    build()
    media = window.matchMedia('(prefers-reduced-motion: reduce)')
    resizeObserver = new ResizeObserver(onResize)
    intersectionObserver = new IntersectionObserver(onIntersection)
    document.addEventListener('visibilitychange', updateRunning)
    media.addEventListener('change', onMotion)
    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', onRestored)
    resizeObserver.observe(canvas)
    intersectionObserver.observe(canvas)
  } catch (error: unknown) {
    disable(`setup: ${reason(error)}`)
    return noopHandle()
  }
  return {
    destroy,
    pause(): void { if (!destroyed) { paused = true; updateRunning() } },
    resume(): void { if (!destroyed) { paused = false; updateRunning() } },
    setActive(on: boolean): void { if (!destroyed) { active = on; updateRunning() } },
    stats,
  }
}
