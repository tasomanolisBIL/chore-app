import { PNG } from 'pngjs'
import pngToIco from 'png-to-ico'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SIZE = 256
const cx = 128, cy = 128

// ── helpers ───────────────────────────────────────────────────────────────────

function setPixel(data, x, y, r, g, b, a) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return
  const i = (y * SIZE + x) * 4
  // Alpha-blend over existing pixel
  const srcA = a / 255
  data[i]   = Math.round(r * srcA + data[i]   * (1 - srcA))
  data[i+1] = Math.round(g * srcA + data[i+1] * (1 - srcA))
  data[i+2] = Math.round(b * srcA + data[i+2] * (1 - srcA))
  data[i+3] = Math.min(255, data[i+3] + a)
}

function fillCircle(data, ox, oy, radius, r, g, b) {
  for (let y = oy - radius; y <= oy + radius; y++) {
    for (let x = ox - radius; x <= ox + radius; x++) {
      const d = Math.sqrt((x - ox) ** 2 + (y - oy) ** 2)
      if (d <= radius) {
        const aa = d > radius - 1 ? Math.round((radius - d) * 255) : 255
        setPixel(data, x, y, r, g, b, aa)
      }
    }
  }
}

function drawThickLine(data, x0, y0, x1, y1, r, g, b, thickness) {
  const dx = x1 - x0, dy = y1 - y0
  const steps = Math.ceil(Math.sqrt(dx * dx + dy * dy) * 2)
  const rad = thickness / 2
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const px = x0 + dx * t
    const py = y0 + dy * t
    for (let oy = Math.floor(py - rad); oy <= Math.ceil(py + rad); oy++) {
      for (let ox = Math.floor(px - rad); ox <= Math.ceil(px + rad); ox++) {
        const d = Math.sqrt((ox - px) ** 2 + (oy - py) ** 2)
        if (d <= rad) {
          const aa = d > rad - 1 ? Math.round((rad - d) * 255) : 255
          setPixel(data, ox, oy, r, g, b, aa)
        }
      }
    }
  }
}

// ── build image ───────────────────────────────────────────────────────────────

const png = new PNG({ width: SIZE, height: SIZE })
png.data.fill(0) // transparent

// Outer glow ring — deep navy
fillCircle(png.data, cx, cy, 122, 15, 40, 80)

// Main circle — classic app navy
fillCircle(png.data, cx, cy, 114, 12, 31, 63)   // #0c1f3f

// Inner accent ring — blue highlight
fillCircle(png.data, cx, cy, 114, 30, 58, 110)   // #1e3a6e

// Soft radial highlight (top-left quarter) for depth
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    if (d > 114) continue
    // Subtle highlight in top-left
    const angle = Math.atan2(y - cy, x - cx)
    const highlight = Math.max(0, Math.cos(angle + Math.PI * 0.75)) * 0.18
    const i = (y * SIZE + x) * 4
    png.data[i]   = Math.min(255, png.data[i]   + highlight * 80)
    png.data[i+1] = Math.min(255, png.data[i+1] + highlight * 80)
    png.data[i+2] = Math.min(255, png.data[i+2] + highlight * 120)
  }
}

// Checkmark — white with rounded caps
// Short arm: bottom-left to center-bottom
// Long arm:  center-bottom to top-right
drawThickLine(png.data,  68, 128, 108, 170, 255, 255, 255, 20)
drawThickLine(png.data, 108, 170, 196,  82, 255, 255, 255, 20)

// ── write files ───────────────────────────────────────────────────────────────

const outDir = join(__dirname, '..', 'build-resources')
mkdirSync(outDir, { recursive: true })

const pngBuf = PNG.sync.write(png)
writeFileSync(join(outDir, 'icon.png'), pngBuf)

const icoBuf = await pngToIco([pngBuf])
writeFileSync(join(outDir, 'icon.ico'), icoBuf)

console.log('Done — build-resources/icon.ico created')
