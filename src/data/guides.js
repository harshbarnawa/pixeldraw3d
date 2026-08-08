// Written guides for the /guides section. Each guide is an original,
// step-by-step tutorial that walks through the real UI — these pages give
// the site the "useful, original content" AdSense looks for.

export const GUIDES = [
  {
    slug: "getting-started",
    title: "Getting started with pixeldraw3d",
    emoji: "✏️",
    excerpt:
      "New to the slate? Learn how to draw, erase, fill, pick colors, and undo — everything you need for your first pixel design.",
    sections: [
      {
        heading: "Your canvas: the slate",
        body: [
          "The editor sits right on the home page. The big grid in the middle is your slate — every square is a pixel. Click a cell to fill it with the active color, and pick a new grid size (10, 20, 30, 40, or 50) from the size control to work bigger or smaller.",
          "The grid always opens with the Heart preset so there's something to see immediately — but you can clear it and start from a blank slate whenever you like.",
        ],
      },
      {
        heading: "Drawing tools",
        body: [
          "Three tools live in the left toolbar: draw, erase, and fill. Draw paints individual cells with the active color, erase removes them, and fill flood-fills an enclosed area — great for coloring in a shape you just drew.",
          "Turn on mirror symmetry to paint both sides of the canvas at once. It's the fastest way to make hearts, wings, and anything symmetric.",
        ],
      },
      {
        heading: "Colors",
        body: [
          "The palette below the toolbar holds 30+ ready-made colors, from classic paint colors to the pastel theme palette. Click a swatch to make it active, then start painting.",
          "Want a color that isn't there? Open the color dialog to pick any color, then add it to your palette — custom colors persist across visits.",
        ],
      },
      {
        heading: "Undo & redo",
        body: [
          "Made a mistake? Ctrl/Cmd+Z undoes your last step and Ctrl/Cmd+Shift+Z redoes it. The editor keeps a history of your recent moves, so you can step back and forth while you experiment.",
          "Signed-in PLUS members get a much longer undo history — practically unlimited.",
        ],
      },
      {
        heading: "Presets & templates",
        body: [
          "The emoji buttons at the top of the left toolbar load quick starter shapes (Heart, Smiley, Diamond, and more). When you want something bigger, the Templates page has a full gallery of pixel-art starting points — pick one and it loads straight into the editor.",
        ],
      },
    ],
  },
  {
    slug: "photo-to-pixels",
    title: "Turn any photo into pixel art",
    emoji: "🖼️",
    excerpt:
      "Drop a photo into the image importer and watch it become a pixel grid you can keep editing by hand.",
    sections: [
      {
        heading: "Open the importer",
        body: [
          "Scroll to the image → pixel section just below the editor. Drop any photo (or tap to browse) and the importer will read it as a grid of pixels — no account needed.",
        ],
      },
      {
        heading: "Choose your resolution",
        body: [
          "The snapshot uses your current grid size, so a 10×10 grid turns the photo into a chunky, blocky icon while a 50×50 grid keeps more of the detail. Try a couple of sizes to find the sweet spot for the image you're converting.",
        ],
      },
      {
        heading: "Cube mode",
        body: [
          "Flip on cube mode and the importer snaps every pixel to the six classic cube-art colors (white, yellow, red, orange, blue, green). The result looks like it was built from toy blocks — perfect for the 3D view.",
        ],
      },
      {
        heading: "Send it to the slate",
        body: [
          "Once you're happy with the preview, apply it and the pixel grid lands on your slate, ready to be edited pixel-by-pixel or pushed into 3D.",
        ],
      },
    ],
  },
  {
    slug: "pixels-to-3d",
    title: "From pixels to 3D: extrude, lift, and export",
    emoji: "🧊",
    excerpt:
      "Your 2D pixels pop into cubes automatically. Learn how extrude and random lift shape the 3D view — and how to export your work.",
    sections: [
      {
        heading: "Every pixel becomes a cube",
        body: [
          "pixeldraw3d's signature move: as soon as you draw, every filled pixel is rendered as a 3D cube in the viewport next to the slate. Empty cells stay flat, so your drawing becomes a low-poly sculpture.",
        ],
      },
      {
        heading: "Extrude",
        body: [
          "The extrude control sets how tall each cube is. Low values give a flat, tile-like look; higher values make chunky, bold blocks. Set it once per design to match the mood you're after.",
        ],
      },
      {
        heading: "Random lift",
        body: [
          "Turn on random lift and cube heights get a little variation across the grid. It turns flat pixel art into something that reads like terrain, grass, or a city skyline — a quick way to add depth.",
        ],
      },
      {
        heading: "Exports",
        body: [
          "Save a flat PNG snapshot of your design with one click. For serious use, export as OBJ or GLB 3D models, download an HD render, or even export an animation of your design spinning — the editor builds the file for you.",
        ],
      },
    ],
  },
  {
    slug: "save-share-community",
    title: "Save, share, and remix with the community",
    emoji: "🌐",
    excerpt:
      "Keep your designs, publish them for the world, and let anyone remix your pixel art into something new.",
    sections: [
      {
        heading: "Saving your designs",
        body: [
          "Hit save design to keep what you're working on. Guests store designs right in the browser, while signed-in users get cloud sync — your designs follow you across devices. You can rename, duplicate, delete, and export your whole library anytime.",
        ],
      },
      {
        heading: "Cloud sync & versions",
        body: [
          "Sign in with Google and your designs sync to the cloud automatically. PLUS members get autosave and a deep version history, so every meaningful change is a snapshot you can restore later.",
        ],
      },
      {
        heading: "Publishing to the community",
        body: [
          "Make a design public and it appears in the community feed alongside everyone else's work. You can add a caption and it becomes a post that other people can like and share. Your public profile at /u/yourname collects the designs you've shared.",
        ],
      },
      {
        heading: "Remixing",
        body: [
          "Every public design can be remixed: open it from the feed, and it loads as an editable copy in the editor. The original stays untouched — your remix is a brand-new design that only you own. It's the easiest way to learn from (and riff on) other people's pixel art.",
        ],
      },
    ],
  },
]
