const SIZE = 30

class PixelCanvas {
  constructor(size = SIZE) {
    this.size = size
    this.grid = Array.from({ length: size }, () => Array(size).fill(null))
  }

  dot(x, y, color) {
    const col = Math.round(x)
    const row = Math.round(y)
    if (col >= 0 && row >= 0 && col < this.size && row < this.size && color) {
      this.grid[row][col] = color
    }
    return this
  }

  box(x, y, width, height, color) {
    for (let row = Math.ceil(y); row < y + height; row++) {
      for (let col = Math.ceil(x); col < x + width; col++) this.dot(col, row, color)
    }
    return this
  }

  oval(cx, cy, rx, ry, color) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) this.dot(x, y, color)
      }
    }
    return this
  }

  polygon(points, color) {
    const xs = points.map((p) => p[0])
    const ys = points.map((p) => p[1])
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
        let inside = false
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const a = points[i]
          const b = points[j]
          if ((a[1] > y) !== (b[1] > y) &&
              x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside
        }
        if (inside) this.dot(x, y, color)
      }
    }
    return this
  }

  line(x1, y1, x2, y2, color, thick = 1) {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1)
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x1 + (x2 - x1) * i / steps)
      const y = Math.round(y1 + (y2 - y1) * i / steps)
      this.box(x - Math.floor(thick / 2), y - Math.floor(thick / 2), thick, thick, color)
    }
    return this
  }

  marks(points, color) {
    points.forEach(([x, y]) => this.dot(x, y, color))
    return this
  }

  spark(x, y, color) {
    this.line(x - 2, y, x + 2, y, color)
    this.line(x, y - 2, x, y + 2, color)
    this.dot(x, y, "#ffffff")
    return this
  }
}

const ink = "#24213c"
const white = "#fff7e8"
const cream = "#ffe6b2"
const peach = "#ffa86c"
const coral = "#f57067"
const pink = "#ef78ac"
const yellow = "#ffcf57"
const gold = "#f3a64b"
const mint = "#69d4aa"
const teal = "#289e9d"
const ocean = "#366db1"
const deep = "#232857"
const purple = "#7751a4"
const lilac = "#c4a3e5"

function createTemplate(name, emoji, category, level, description, paint) {
  const canvas = new PixelCanvas()
  paint(canvas)
  const grid = canvas.grid
  const all = grid.flat().filter(Boolean)
  return {
    name,
    emoji,
    category,
    level,
    description,
    size: canvas.size,
    grid,
    colors: new Set(all).size,
    filled: all.length,
  }
}

export const TEMPLATE_CATEGORIES = ["All", "Animals", "Food", "Fantasy", "Nature", "Tech", "Scenes"]

export const TEMPLATES = [
  createTemplate("Sunset Fox", "🦊", "Animals", "Advanced", "Warm fur, blush cheeks and layered woodland shading.", (p) => {
    p.spark(5, 5, yellow).spark(25, 7, mint)
    p.polygon([[4, 5], [12, 10], [5, 18]], ink)
    p.polygon([[26, 5], [18, 10], [25, 18]], ink)
    p.polygon([[6, 7], [12, 12], [7, 16]], coral)
    p.polygon([[24, 7], [18, 12], [23, 16]], coral)
    p.polygon([[7, 12], [15, 7], [23, 12], [26, 20], [21, 27], [9, 27], [4, 20]], ink)
    p.polygon([[8, 13], [15, 10], [22, 13], [24, 20], [19, 25], [11, 25], [6, 20]], coral)
    p.box(10, 13, 10, 3, peach).box(8, 16, 14, 3, peach)
    p.oval(15, 23, 8, 5, cream)
    p.oval(11, 21, 5, 3, white).oval(19, 21, 5, 3, white)
    p.box(9, 17, 3, 3, ink).box(18, 17, 3, 3, ink)
    p.dot(10, 17, white).dot(19, 17, white)
    p.oval(15, 23, 3, 2, ink).box(14, 23, 3, 2, ink)
    p.line(15, 25, 13, 26, "#b85c5d").line(15, 25, 17, 26, "#b85c5d")
    p.box(7, 21, 3, 2, pink).box(20, 21, 3, 2, pink)
    p.marks([[10, 23], [9, 24], [20, 23], [21, 24]], "#d8b7a0")
    p.box(13, 9, 4, 2, yellow)
  }),
  createTemplate("Bamboo Panda", "🐼", "Animals", "Advanced", "Creamy fur, expressive eyes and bright bamboo leaves.", (p) => {
    p.line(3, 3, 3, 26, teal, 2).line(26, 3, 26, 27, teal, 2)
    p.polygon([[3, 7], [8, 4], [6, 10]], mint).polygon([[26, 9], [21, 5], [23, 12]], mint)
    p.polygon([[3, 18], [8, 14], [6, 21]], "#8ce3a8").polygon([[26, 18], [21, 15], [23, 22]], "#8ce3a8")
    p.oval(8, 8, 5, 5, ink).oval(22, 8, 5, 5, ink)
    p.oval(15, 17, 12, 11, ink).oval(15, 16, 11, 10, white)
    p.oval(11, 16, 5, 6, ink).oval(19, 16, 5, 6, ink)
    p.oval(12, 16, 2, 3, "#7ac4bd").oval(18, 16, 2, 3, "#7ac4bd")
    p.box(11, 15, 2, 3, ink).box(17, 15, 2, 3, ink)
    p.dot(12, 15, white).dot(18, 15, white)
    p.oval(15, 22, 4, 3, cream).oval(15, 21, 2, 1, ink)
    p.line(15, 22, 15, 23, ink).line(13, 23, 15, 24, ink).line(15, 24, 17, 23, ink)
    p.box(7, 21, 3, 2, pink).box(20, 21, 3, 2, pink)
    p.box(10, 9, 3, 2, "#d6ece2").box(17, 9, 3, 2, "#d6ece2")
  }),
  createTemplate("Tropical Parrot", "🦜", "Animals", "Expert", "A jewel-toned parrot perched among tropical foliage.", (p) => {
    p.polygon([[1, 5], [8, 2], [5, 13]], "#29745a")
    p.polygon([[25, 3], [29, 9], [23, 12]], "#29745a")
    p.polygon([[2, 7], [9, 7], [5, 15]], mint)
    p.polygon([[26, 6], [22, 11], [28, 14]], mint)
    p.line(2, 25, 28, 25, "#765044", 3).line(4, 26, 26, 26, "#b57f53")
    p.polygon([[16, 17], [11, 22], [10, 28], [20, 23]], ink)
    p.polygon([[14, 19], [11, 23], [12, 27], [18, 23]], ocean)
    p.oval(16, 16, 8, 9, ink).oval(16, 15, 7, 8, coral)
    p.oval(16, 19, 6, 5, "#eeb64b")
    p.polygon([[13, 16], [7, 19], [11, 24], [17, 21], [20, 17]], ink)
    p.polygon([[12, 17], [9, 19], [12, 22], [17, 20], [19, 17]], teal)
    p.polygon([[11, 20], [16, 22], [20, 17], [18, 23], [13, 24]], ocean)
    p.oval(17, 9, 6, 6, ink).oval(17, 8, 5, 5, coral)
    p.box(14, 5, 7, 2, "#ff9580")
    p.polygon([[21, 9], [28, 11], [23, 15]], ink)
    p.polygon([[22, 10], [26, 11], [23, 13]], yellow)
    p.box(17, 8, 3, 3, white).dot(19, 9, ink)
    p.line(14, 23, 14, 25, gold).line(19, 22, 19, 25, gold)
    p.line(13, 25, 16, 25, gold).line(18, 25, 21, 25, gold)
    p.spark(5, 18, "#a6efd0")
  }),
  createTemplate("Koi Pond", "🐟", "Animals", "Expert", "A painted koi swimming through rippling blue water.", (p) => {
    p.box(0, 0, 30, 30, deep)
    for (let y = 1; y < 30; y += 4) {
      p.line(0, y, 29, y, y % 8 ? "#2a5687" : "#306c9b")
    }
    p.oval(15, 15, 12, 10, "#327ca9")
    p.oval(15, 15, 10, 8, "#3a8bad")
    p.line(2, 5, 8, 5, mint).line(22, 24, 28, 24, mint)
    p.polygon([[5, 23], [11, 20], [16, 25], [10, 29]], ink)
    p.polygon([[7, 23], [12, 22], [14, 26], [10, 28]], "#ffb678")
    p.oval(16, 15, 8, 11, ink).oval(16, 15, 7, 10, white)
    p.polygon([[10, 12], [8, 17], [13, 18]], "#ffad6d")
    p.polygon([[21, 14], [25, 19], [20, 20]], "#ffad6d")
    p.oval(15, 12, 4, 3, coral).oval(17, 20, 4, 3, coral)
    p.oval(18, 6, 3, 2, "#d95b52")
    p.box(14, 10, 3, 2, "#ffe0ac").box(17, 18, 2, 3, "#ffbd83")
    p.dot(13, 7, ink).dot(19, 7, ink)
    p.line(12, 6, 9, 4, mint).line(20, 6, 23, 4, mint)
    p.oval(4, 10, 2, 1, "#7acbc7").oval(26, 20, 2, 1, "#7acbc7")
    p.marks([[3, 15], [27, 8], [6, 27], [26, 27]], "#c3dfee")
  }),
  createTemplate("Pixel Burger", "🍔", "Food", "Advanced", "A stacked double burger with sesame, cheese and greens.", (p) => {
    p.spark(4, 6, yellow).spark(25, 7, pink)
    p.oval(15, 26, 13, 2, "#bfc1d2")
    p.oval(15, 13, 12, 8, ink).oval(15, 13, 11, 7, gold)
    p.box(6, 13, 18, 2, "#ffd78b")
    p.marks([[9, 9], [15, 8], [21, 10], [12, 12], [18, 12]], white)
    p.box(4, 17, 22, 3, ink).box(5, 17, 20, 2, "#7b513e")
    p.line(4, 16, 25, 16, "#67bb65", 2)
    p.box(6, 19, 18, 2, coral)
    p.polygon([[5, 19], [25, 19], [20, 23], [15, 21], [10, 23]], yellow)
    p.box(4, 22, 22, 3, ink).box(5, 22, 20, 2, "#774137")
    p.line(5, 24, 24, 24, "#54aa64")
    p.oval(15, 26, 11, 3, ink).oval(15, 25, 10, 2, gold)
    p.box(10, 25, 10, 1, "#ffd083")
  }),
  createTemplate("Strawberry Cake", "🍰", "Food", "Expert", "Layered strawberry gateau with cream and glossy fruit.", (p) => {
    p.oval(15, 27, 13, 2, "#a6adc8")
    p.polygon([[5, 12], [25, 12], [23, 25], [7, 25]], ink)
    p.polygon([[7, 13], [23, 13], [22, 24], [8, 24]], cream)
    p.box(8, 16, 14, 3, "#f2899b").box(8, 21, 14, 2, "#f2899b")
    p.line(8, 19, 22, 19, white).line(8, 23, 22, 23, white)
    p.oval(15, 13, 11, 4, ink).oval(15, 12, 10, 3, "#ffe9d7")
    p.oval(15, 11, 9, 2, "#f7b4c6")
    p.oval(12, 6, 4, 5, "#ab345b").oval(12, 6, 3, 4, coral)
    p.polygon([[9, 3], [12, 1], [15, 3], [12, 4]], "#4e9f65")
    p.oval(19, 7, 3, 4, "#ad3a55").oval(19, 7, 2, 3, coral)
    p.marks([[11, 6], [13, 7], [11, 8], [19, 7], [20, 8]], yellow)
    p.oval(6, 12, 2, 2, white).oval(24, 13, 2, 2, white)
    p.box(10, 24, 10, 1, "#d9b69e")
    p.spark(26, 5, pink)
  }),
  createTemplate("Sushi Bento", "🍣", "Food", "Expert", "Colorful sushi rolls, salmon nigiri and chopsticks.", (p) => {
    p.box(2, 4, 26, 23, ink)
    p.box(3, 5, 24, 21, "#c67b55")
    p.box(5, 7, 20, 17, "#f8d9a9")
    p.box(5, 17, 20, 2, ink)
    for (const [x, y] of [[9, 11], [16, 11], [23, 11]]) {
      p.oval(x, y, 4, 4, ink).oval(x, y, 3, 3, white)
      p.oval(x, y, 2, 2, x === 9 ? coral : x === 16 ? "#61b67b" : gold)
      p.dot(x, y, cream)
    }
    p.oval(10, 21, 5, 3, white)
    p.oval(10, 20, 5, 2, "#ef7e66")
    p.line(6, 20, 13, 20, "#ffb18e")
    p.oval(21, 21, 4, 3, white)
    p.oval(21, 20, 4, 2, "#e88a65")
    p.line(17, 20, 24, 20, "#ffd1ac")
    p.line(5, 3, 25, 3, "#a76d4f")
    p.line(5, 2, 25, 2, cream)
    p.spark(27, 27, yellow)
  }),
  createTemplate("Magic Potion", "🧪", "Fantasy", "Expert", "A glowing potion bottle with sparks and bubbles.", (p) => {
    p.spark(5, 7, lilac).spark(24, 8, mint).spark(25, 23, yellow)
    p.oval(15, 18, 12, 11, "#5c4a86")
    p.oval(15, 18, 10, 9, "#765da3")
    p.box(11, 4, 8, 5, ink).box(12, 4, 6, 4, "#a97d65")
    p.box(11, 8, 8, 4, ink).box(12, 9, 6, 3, "#a8dbe0")
    p.polygon([[11, 11], [19, 11], [24, 17], [23, 26], [19, 28], [11, 28], [7, 26], [6, 17]], ink)
    p.polygon([[12, 12], [18, 12], [22, 18], [21, 25], [18, 26], [12, 26], [9, 24], [8, 18]], "#b9a6db")
    p.box(9, 20, 12, 6, "#5b4dc1")
    p.box(10, 22, 10, 3, "#765dea")
    p.polygon([[9, 19], [21, 19], [20, 21], [10, 21]], "#b96deb")
    p.oval(14, 23, 2, 2, "#ea98e9")
    p.oval(17, 19, 2, 2, "#eab0fc")
    p.dot(12, 16, white).dot(19, 17, white).dot(18, 23, white)
    p.line(10, 16, 10, 21, white)
    p.box(12, 5, 3, 2, "#e0b58c")
  }),
  createTemplate("Treasure Chest", "💰", "Fantasy", "Expert", "Gold-trimmed wooden chest overflowing with gems.", (p) => {
    p.spark(5, 6, yellow).spark(25, 4, mint)
    p.oval(15, 26, 12, 2, "#b2a0a5")
    p.box(6, 11, 19, 5, ink).box(7, 10, 17, 5, "#9d553c")
    p.box(8, 9, 15, 3, "#b66e42")
    p.box(8, 8, 15, 2, gold)
    p.box(9, 6, 4, 3, "#f6b54f").box(15, 5, 3, 4, yellow).box(20, 7, 3, 3, "#efce6d")
    p.oval(10, 8, 2, 2, coral).oval(20, 8, 2, 2, ocean)
    p.box(6, 15, 19, 12, ink).box(7, 16, 17, 10, "#9b563d")
    p.box(9, 17, 13, 2, "#c5784f").box(9, 21, 13, 2, "#a96541")
    p.box(8, 15, 3, 11, gold).box(21, 15, 3, 11, gold)
    p.box(6, 15, 19, 2, yellow).box(7, 24, 17, 2, gold)
    p.box(13, 17, 5, 7, ink).box(14, 18, 3, 5, yellow)
    p.box(15, 20, 1, 2, "#b9742b")
    p.box(3, 24, 3, 2, gold).box(25, 25, 3, 2, yellow)
  }),
  createTemplate("Rune Sword", "⚔️", "Fantasy", "Expert", "A luminous enchanted blade with runic highlights.", (p) => {
    p.box(0, 0, 30, 30, deep)
    p.polygon([[0, 0], [13, 0], [0, 13]], "#302966")
    p.polygon([[30, 30], [17, 30], [30, 17]], "#302966")
    p.spark(7, 6, lilac).spark(23, 24, mint)
    p.polygon([[19, 3], [24, 0], [22, 10], [13, 20], [10, 18]], ink)
    p.polygon([[19, 5], [23, 2], [21, 10], [13, 18], [11, 17]], "#83d8eb")
    p.polygon([[20, 6], [22, 4], [20, 11], [15, 15]], white)
    p.line(20, 7, 13, 17, "#36b8d3")
    p.line(10, 18, 8, 20, ink, 3)
    p.line(6, 15, 13, 22, ink, 3)
    p.line(7, 15, 13, 21, gold, 2)
    p.line(8, 20, 13, 25, ink, 3)
    p.line(9, 20, 12, 24, "#8e5c58", 2)
    p.box(11, 22, 2, 2, "#d7a66c")
    p.polygon([[10, 17], [13, 18], [12, 21], [9, 20]], "#efb947")
    p.dot(11, 19, coral)
    p.spark(22, 13, yellow)
  }),
  createTemplate("Dragon Egg", "🐉", "Fantasy", "Expert", "A faceted dragon egg surrounded by floating embers.", (p) => {
    p.spark(4, 12, gold).spark(26, 7, coral)
    p.oval(15, 19, 12, 10, "#433869")
    p.oval(15, 16, 9, 12, ink)
    p.polygon([[15, 5], [20, 8], [23, 17], [21, 24], [15, 27], [9, 24], [7, 17], [10, 8]], "#397f83")
    p.polygon([[15, 5], [20, 9], [19, 18], [15, 24], [11, 15]], "#46bbba")
    p.polygon([[15, 6], [19, 9], [15, 14], [11, 11]], "#c3e8b2")
    p.polygon([[19, 10], [22, 16], [18, 21], [16, 17]], "#176e85")
    p.polygon([[11, 12], [15, 16], [11, 23], [8, 19]], "#79cdc0")
    p.polygon([[15, 17], [19, 22], [15, 26], [11, 23]], "#2b908d")
    p.line(15, 10, 15, 16, white)
    p.dot(13, 9, white).dot(18, 13, "#f4f0be")
    p.marks([[8, 5], [24, 20], [5, 22], [24, 25]], coral)
    p.line(5, 25, 8, 25, gold).line(22, 27, 25, 27, gold)
  }),
  createTemplate("Mushroom Cottage", "🍄", "Nature", "Expert", "A storybook forest cottage beneath a red mushroom roof.", (p) => {
    p.box(0, 0, 30, 30, "#262c5d")
    p.oval(24, 5, 3, 3, cream)
    p.marks([[3, 4], [7, 8], [19, 4], [26, 11], [23, 14]], "#b9a0df")
    p.box(0, 26, 30, 4, "#356e61")
    p.box(0, 27, 30, 2, "#4a9671")
    p.oval(15, 18, 10, 11, ink)
    p.oval(15, 18, 9, 10, cream)
    p.box(7, 15, 16, 10, "#ffe9bc")
    p.polygon([[3, 14], [5, 7], [11, 4], [19, 4], [25, 7], [27, 14], [24, 16], [6, 16]], ink)
    p.polygon([[4, 13], [7, 8], [12, 6], [18, 6], [23, 8], [26, 13]], "#c84f64")
    p.box(8, 11, 5, 3, "#ef7c73").box(18, 10, 5, 4, coral)
    p.oval(10, 10, 3, 2, cream).oval(20, 10, 3, 2, cream)
    p.box(14, 6, 3, 3, "#ffe9c1")
    p.box(10, 18, 4, 5, ink).box(11, 19, 2, 3, "#e6af5f")
    p.box(17, 18, 4, 5, ink).box(18, 19, 2, 3, "#e6af5f")
    p.box(13, 20, 5, 7, "#825c54").box(15, 22, 1, 2, gold)
    p.box(9, 25, 12, 2, "#ad855a")
    p.line(15, 27, 15, 29, "#d3ac79", 3)
    p.box(3, 23, 3, 4, "#ef7ba3").box(24, 22, 3, 5, "#ffcf69")
    p.dot(4, 22, yellow).dot(25, 21, coral)
  }),
  createTemplate("Cherry Bonsai", "🌸", "Nature", "Expert", "A miniature sakura bonsai with ceramic pot and petals.", (p) => {
    p.spark(25, 7, "#ffc9d8").spark(4, 8, mint)
    p.box(9, 23, 12, 5, ink).box(10, 23, 10, 4, ocean)
    p.box(11, 24, 8, 2, "#65b4ce")
    p.box(7, 22, 16, 2, ink).box(8, 22, 14, 1, "#b5dcdf")
    p.line(15, 23, 15, 11, "#674f4b", 3)
    p.line(14, 16, 7, 10, "#674f4b", 2)
    p.line(15, 15, 23, 8, "#674f4b", 2)
    p.line(13, 11, 13, 7, "#674f4b")
    p.oval(8, 9, 6, 5, "#783c72")
    p.oval(17, 7, 8, 6, "#783c72")
    p.oval(22, 13, 5, 4, "#783c72")
    p.oval(8, 8, 5, 4, pink).oval(17, 7, 7, 5, "#f4a5ca")
    p.oval(22, 13, 4, 3, "#f4a5ca")
    p.oval(10, 6, 3, 2, "#ffd1dc").oval(19, 5, 4, 2, "#ffe4dd")
    p.box(14, 7, 3, 2, coral).box(6, 10, 3, 2, coral)
    p.marks([[23, 6], [25, 17], [5, 16], [8, 19], [22, 21], [4, 22]], pink)
    p.marks([[15, 7], [9, 9], [20, 13], [22, 11]], "#ffedd7")
    p.box(12, 27, 6, 1, ink)
  }),
  createTemplate("Sunflower Glow", "🌻", "Nature", "Advanced", "Layered golden petals, seeded center and leafy stalk.", (p) => {
    p.spark(4, 6, yellow).spark(26, 5, mint)
    p.line(15, 17, 15, 28, "#3c7758", 3)
    p.polygon([[14, 22], [5, 18], [8, 25]], "#4ba66d")
    p.polygon([[16, 23], [25, 18], [22, 26]], "#3c9768")
    p.line(14, 23, 9, 21, "#84d18c")
    p.line(16, 23, 22, 21, "#84d18c")
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI * 2) / 12
      p.oval(Math.round(15 + Math.cos(angle) * 8), Math.round(13 + Math.sin(angle) * 8), 3, 5, gold)
      p.oval(Math.round(15 + Math.cos(angle) * 8), Math.round(13 + Math.sin(angle) * 8), 2, 4, yellow)
    }
    p.oval(15, 13, 6, 6, ink).oval(15, 13, 5, 5, "#81513f")
    p.marks([[13, 11], [16, 11], [12, 14], [15, 15], [18, 13], [16, 17]], "#d99a52")
    p.marks([[14, 10], [18, 15], [11, 12]], cream)
  }),
  createTemplate("Neon Crystal", "💎", "Nature", "Expert", "A faceted crystal cluster with turquoise and lilac light.", (p) => {
    p.box(0, 0, 30, 30, "#211f48")
    p.spark(5, 6, "#9bd7de").spark(24, 5, lilac).spark(25, 25, "#f7abd7")
    p.polygon([[3, 21], [9, 10], [14, 20], [10, 28]], ink)
    p.polygon([[5, 21], [9, 12], [12, 21], [9, 26]], "#8a8edd")
    p.polygon([[17, 22], [23, 11], [28, 21], [22, 28]], ink)
    p.polygon([[19, 22], [23, 13], [26, 21], [22, 26]], "#6ebbd7")
    p.polygon([[9, 12], [15, 3], [22, 12], [21, 23], [15, 29], [8, 22]], ink)
    p.polygon([[11, 12], [15, 5], [20, 12], [19, 22], [15, 27], [10, 22]], "#5baac8")
    p.polygon([[15, 5], [20, 12], [15, 17], [12, 12]], "#c4d4f1")
    p.polygon([[11, 12], [15, 17], [14, 25], [10, 22]], "#917acb")
    p.polygon([[20, 12], [15, 17], [16, 25], [19, 22]], "#3986b8")
    p.line(15, 6, 15, 16, white)
    p.line(12, 12, 18, 12, "#f7ecff")
    p.marks([[4, 24], [26, 8], [4, 14], [24, 24]], pink)
  }),
  createTemplate("Sunset Island", "🏝️", "Scenes", "Expert", "A glowing 16-bit tropical sunset with palm silhouettes.", (p) => {
    p.box(0, 0, 30, 7, "#41396c")
    p.box(0, 7, 30, 5, "#a55889")
    p.box(0, 12, 30, 4, "#ed837e")
    p.box(0, 16, 30, 4, "#f5b167")
    p.oval(18, 15, 6, 6, "#ffdc89")
    p.box(0, 19, 30, 11, "#357fa2")
    p.box(1, 20, 28, 2, "#4298ad")
    p.line(14, 22, 23, 22, "#f8c991")
    p.line(12, 24, 25, 24, "#ebad82")
    p.line(16, 26, 21, 26, "#b8c7a0")
    p.oval(6, 25, 11, 3, "#252a52")
    p.line(6, 24, 9, 10, "#393054", 3)
    p.polygon([[8, 10], [1, 9], [0, 12], [5, 13]], "#272a50")
    p.polygon([[9, 10], [14, 7], [18, 10], [12, 12]], "#272a50")
    p.polygon([[9, 10], [11, 3], [14, 7]], "#272a50")
    p.polygon([[8, 11], [3, 6], [5, 12]], "#272a50")
    p.line(5, 24, 8, 17, "#262747")
    p.marks([[24, 4], [26, 6], [22, 8]], "#ecb7d6")
  }),
  createTemplate("Aurora Peaks", "🏔️", "Scenes", "Expert", "Snowy mountain silhouettes beneath a pixel aurora.", (p) => {
    p.box(0, 0, 30, 30, "#1b284b")
    p.polygon([[0, 8], [8, 0], [20, 0], [9, 13]], "#285775")
    p.polygon([[7, 0], [19, 0], [25, 7], [19, 9]], "#347e94")
    p.polygon([[17, 0], [29, 0], [29, 9], [23, 8]], "#61baa1")
    p.marks([[3, 5], [11, 3], [23, 2], [27, 13], [4, 14]], white)
    p.polygon([[0, 21], [9, 10], [17, 21]], ink)
    p.polygon([[10, 23], [21, 7], [30, 24]], ink)
    p.polygon([[0, 21], [9, 12], [16, 22]], "#4675a0")
    p.polygon([[11, 23], [21, 9], [29, 24]], "#4a7298")
    p.polygon([[6, 15], [9, 12], [12, 16], [10, 16], [9, 17]], white)
    p.polygon([[18, 13], [21, 9], [25, 15], [22, 15], [20, 13]], white)
    p.polygon([[11, 22], [18, 14], [20, 23]], "#7ca7bb")
    p.box(0, 24, 30, 6, "#203d57")
    p.line(0, 26, 29, 26, "#42657a").line(6, 28, 21, 28, "#529091")
    p.box(3, 23, 2, 5, "#1d3a49").box(26, 23, 2, 5, "#1d3a49")
    p.polygon([[1, 23], [4, 18], [7, 23]], "#143b40")
    p.polygon([[24, 22], [27, 16], [29, 22]], "#143b40")
  }),
  createTemplate("Orbit Rocket", "🚀", "Tech", "Expert", "A colorful retro rocket blasting into a starfield.", (p) => {
    p.box(0, 0, 30, 30, deep)
    p.marks([[3, 4], [7, 13], [26, 3], [23, 19], [5, 25], [27, 26]], "#d8bfec")
    p.spark(24, 8, yellow).spark(5, 18, "#73d2df")
    p.oval(6, 7, 3, 3, "#7756ad").oval(6, 7, 2, 2, "#f2b7bd")
    p.polygon([[15, 1], [20, 10], [21, 21], [9, 21], [10, 10]], ink)
    p.polygon([[15, 3], [19, 11], [20, 20], [10, 20], [11, 11]], white)
    p.polygon([[15, 3], [11, 11], [19, 11]], coral)
    p.box(11, 17, 8, 4, "#b6d3d8")
    p.oval(15, 13, 5, 5, ink).oval(15, 13, 4, 4, "#5eb6d1")
    p.oval(15, 13, 2, 2, "#a8e9dc").dot(14, 12, white)
    p.polygon([[10, 16], [5, 23], [10, 24]], ink)
    p.polygon([[20, 16], [25, 23], [20, 24]], ink)
    p.polygon([[9, 19], [7, 22], [10, 22]], coral)
    p.polygon([[21, 19], [23, 22], [20, 22]], coral)
    p.box(12, 21, 6, 2, ink)
    p.polygon([[12, 23], [18, 23], [16, 29], [14, 29]], yellow)
    p.polygon([[13, 23], [17, 23], [15, 28]], coral)
    p.dot(15, 25, white)
  }),
  createTemplate("Arcade Robot", "🤖", "Tech", "Expert", "A retro robot with illuminated eyes and metallic panels.", (p) => {
    p.box(0, 0, 30, 30, "#2b2356")
    p.spark(4, 8, mint).spark(26, 23, lilac)
    p.line(15, 3, 15, 8, "#a0bfcb", 2).oval(15, 3, 2, 2, coral)
    p.box(4, 10, 22, 16, ink).box(6, 9, 18, 16, "#647b9c")
    p.box(7, 10, 16, 13, "#9bb6c2")
    p.box(3, 13, 3, 8, "#4e6686").box(24, 13, 3, 8, "#4e6686")
    p.box(8, 13, 6, 6, ink).box(16, 13, 6, 6, ink)
    p.box(9, 14, 4, 4, "#5ce2df").box(17, 14, 4, 4, "#5ce2df")
    p.box(10, 15, 2, 2, white).box(18, 15, 2, 2, white)
    p.box(12, 20, 6, 2, ink).box(13, 21, 4, 1, coral)
    p.box(8, 24, 14, 2, ink).box(9, 24, 12, 1, "#f1be74")
    p.box(11, 26, 8, 3, ink).box(12, 26, 6, 2, "#6074ad")
    p.box(6, 18, 2, 2, pink).box(22, 18, 2, 2, pink)
    p.box(8, 10, 14, 1, white)
  }),
  createTemplate("Game Controller", "🎮", "Tech", "Advanced", "A glossy gamepad with neon controls and highlights.", (p) => {
    p.spark(6, 5, pink).spark(25, 7, mint)
    p.polygon([[7, 9], [22, 9], [27, 14], [29, 23], [25, 26], [20, 23], [10, 23], [5, 26], [1, 23], [3, 14]], ink)
    p.polygon([[8, 11], [21, 11], [25, 15], [27, 22], [25, 24], [21, 21], [9, 21], [5, 24], [3, 22], [5, 15]], "#8b70c6")
    p.box(8, 10, 14, 2, "#c3a8df")
    p.box(8, 14, 3, 9, ink).box(5, 17, 9, 3, ink)
    p.box(9, 15, 1, 7, "#cbd5ef").box(6, 18, 7, 1, "#cbd5ef")
    p.oval(20, 15, 2, 2, coral).oval(24, 18, 2, 2, "#63cfb1")
    p.oval(19, 21, 2, 2, yellow).oval(16, 18, 2, 2, ocean)
    p.box(13, 12, 4, 2, ink).box(13, 13, 3, 1, white)
    p.box(4, 21, 4, 2, "#604aa7").box(23, 21, 3, 2, "#604aa7")
    p.dot(21, 14, white).dot(24, 17, white)
  }),
  createTemplate("Neon City", "🌆", "Scenes", "Expert", "A rainy neon skyline reflected on a midnight street.", (p) => {
    p.box(0, 0, 30, 30, "#1e2248")
    p.box(0, 22, 30, 8, "#273255")
    p.box(0, 13, 7, 10, "#31295b").box(8, 7, 7, 16, "#343066")
    p.box(16, 12, 6, 11, "#3b2e64").box(23, 5, 7, 18, "#35336b")
    for (let y = 9; y < 22; y += 3) {
      for (const x of [10, 12, 24, 27]) p.dot(x, y, y % 2 ? "#f8c87a" : "#71cbd0")
    }
    for (let y = 15; y < 22; y += 3) {
      for (const x of [2, 4, 18, 20]) p.dot(x, y, "#ed83af")
    }
    p.box(17, 3, 2, 7, "#e76dba").box(18, 3, 1, 5, "#fcc1e1")
    p.box(23, 10, 7, 2, teal).box(24, 10, 5, 1, "#83f5e0")
    p.line(0, 24, 29, 24, "#765594")
    p.line(3, 26, 10, 26, "#de80bf").line(17, 27, 26, 27, "#69ccd7")
    p.line(7, 28, 15, 28, "#a27fc2")
    p.marks([[3, 3], [5, 6], [21, 2]], "#e1c4ed")
    p.line(2, 2, 2, 7, "#536196")
    p.line(21, 7, 21, 11, "#536196")
  }),
]
