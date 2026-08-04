import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three"

// Max cubes a single pixel column can hold (height slider ceiling; the random
// lift only translates columns, it never adds cubes)
const MAX_STACK = 6

// Deterministic per-cell pseudo-random so random lifts stay stable for a
// given (row, col, slider) and don't flicker between renders.
function randomUnit(r, c, salt) {
  let h = (r * 374761393 + c * 668265263 + salt * 2654435761) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

// Pastel pixel viewport palette
const VIEW_BG = "#f7f3ff"
const EDGE_COLOR = "#4a3b5c"
const GRID_CENTER = "#d6c8f2"
const GRID_LINE = "#eee6ff"

// Camera tuned for a 10×10 grid: FOV 1° telephoto from a fixed 3/4 angle. Both
// FOV and distance are pure functions of grid size, so the 10×10 view is
// reproduced exactly while every larger grid is framed the same way — whole
// model visible, model filling the same portion of the viewport, no manual
// zoom. (The rendered 10×10 view sits at distance 800: the [600,550,650] start
// position was always pulled in to maxDistance=800 by OrbitControls.)
const BASE_GRID_SIZE = 10
const BASE_CAMERA_POSITION = [600, 550, 650]
const BASE_CAMERA_DISTANCE = Math.hypot(...BASE_CAMERA_POSITION) // ≈1041.6 — length of the view direction
const BASE_FOV = 1 // degrees — exact reference look for 10×10
const REF_DISTANCE = 800 // effective framing distance for 10×10 (=== BASE_MAX_DISTANCE)
const BASE_MIN_DISTANCE = 5
const BASE_MAX_DISTANCE = 800
const NEAR_PLANE = 0.1
const FAR_PLANE = BASE_MAX_DISTANCE * 2
const MAX_FOV = 90 // degrees — smooth ceiling for very large grids
const SAFETY_MARGIN = 0.2 // extra view margin so wide-FOV perspective never crops near corners

// FOV widens quickly with grid size: it grows like (size/10)^2 near the
// reference (1° at 10×10, ~24° at 50×50, ~72° at 100×100) and levels off near
// MAX_FOV so 1000×1000 grids don't go fisheye. tanh is smooth and saturating —
// a continuous curve, no jumps, no lookup tables.
function adaptiveFov(size) {
  const s = size / BASE_GRID_SIZE
  return MAX_FOV * Math.tanh(Math.pow(s, 2) / MAX_FOV)
}

// Framing distance for a grid size. A perspective camera sees a vertical slice
// of height 2·D·tan(FOV/2) at its target; keeping that height a fixed multiple
// of the grid size makes every grid fill the viewport identically:
//   D(S) = REF_DISTANCE · (S/10)^(1+SAFETY_MARGIN) · tan(0.5°) / tan(FOV(S)/2)
// At 10×10 both the size and FOV factors are 1, so D = REF_DISTANCE (the tuned
// view). As FOV grows, the needed distance actually stays modest — the wider
// frustum does the work, which is what keeps huge models fully on screen.
function framingDistance(size) {
  const baseHalf = Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2))
  const fovHalf = Math.tan(THREE.MathUtils.degToRad(adaptiveFov(size) / 2))
  return REF_DISTANCE * Math.pow(size / BASE_GRID_SIZE, 1 + SAFETY_MARGIN) * (baseHalf / fovHalf)
}

// Exposes an api to the parent: capture() saves a PNG, reset() returns to the
// default 3D framing. Movement is free orbit in every direction.
function ViewportApi({ apiRef, controlsRef, fileName, defaultPosition, fov, near, far }) {
  const { gl, scene, camera } = useThree()

  // Drive the live camera directly. React Three Fiber only reads the <Canvas
  // camera> prop on mount and does NOT re-apply it when the prop changes at
  // runtime, so without this the FOV would stay frozen at the initial value
  // (1° for a 10×10 load). That is what made larger grids vanish: a camera at
  // ~330 units distance with a stale 1° FOV sees only a ~5-unit sliver — almost
  // nothing of a 30+ unit model.
  //
  // Everything is set in absolute terms (not scaled), so this is idempotent and
  // safe to run on mount and on every grid-size change.
  useEffect(() => {
    camera.fov = fov
    camera.near = near
    camera.far = far
    camera.updateProjectionMatrix()
    camera.position.set(...defaultPosition)
    controlsRef.current?.target.set(0, 0, 0)
    controlsRef.current?.update()
  }, [camera, controlsRef, defaultPosition, fov, near, far])

  useEffect(() => {
    apiRef.current = {
      capture: () => {
        gl.render(scene, camera)
        const url = gl.domElement.toDataURL("image/png")
        const a = document.createElement("a")
        a.href = url
        a.download = fileName || "voxel-art.png"
        a.click()
      },
      reset: () => {
        camera.fov = fov
        camera.near = near
        camera.far = far
        camera.updateProjectionMatrix()
        camera.position.set(...defaultPosition)
        controlsRef.current?.target.set(0, 0, 0)
        controlsRef.current?.update()
      },
    }
    return () => {
      apiRef.current = null
    }
  }, [gl, scene, camera, apiRef, controlsRef, fileName, defaultPosition, fov, near, far])

  return null
}

function VoxelMesh({ grid, size, extrude, randomLift, showEdges }) {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const scratch = useMemo(() => new THREE.Color(), [])

  // Flatten the 2D slate into positioned cubes. Height slider decides how many
  // cubes a column has (extrude); random lift only translates the column up.
  const instances = useMemo(() => {
    const list = []
    const offset = (size - 1) / 2
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = grid[r][c]
        if (!cell) continue
        const lift =
          randomLift > 0 ? Math.floor(randomUnit(r, c, randomLift) * (randomLift + 1)) : 0
        for (let y = 0; y < extrude; y++) {
          list.push({
            x: c - offset,
            y: y + 0.5 + lift,
            z: r - offset,
            color: cell,
          })
        }
      }
    }
    return list
  }, [grid, size, extrude, randomLift])

  const maxInstances = size * size * MAX_STACK

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    if (!mesh.instanceColor || mesh.instanceColor.array.length < maxInstances * 3) {
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(maxInstances * 3), 3)
    }

    mesh.count = instances.length
    instances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      scratch.set(inst.color)
      mesh.setColorAt(i, scratch)
    })

    mesh.instanceMatrix.needsUpdate = true
    mesh.instanceColor.needsUpdate = true
  }, [instances, maxInstances, dummy, scratch])

  // Merged line segments for every cube edge (shown when the Edges toggle is on)
  const edgeGeometry = useMemo(() => {
    if (!showEdges || instances.length === 0) return null
    const half = 0.5
    const positions = []
    const EDGES = [
      [0,0,0,1,0,0],[1,0,0,1,1,0],[1,1,0,0,1,0],[0,1,0,0,0,0],
      [0,0,1,1,0,1],[1,0,1,1,1,1],[1,1,1,0,1,1],[0,1,1,0,0,1],
      [0,0,0,0,0,1],[1,0,0,1,0,1],[1,1,0,1,1,1],[0,1,0,0,1,1],
    ]
    instances.forEach((inst) => {
      EDGES.forEach(([ax, ay, az, bx, by, bz]) => {
        positions.push(inst.x + ax - half, inst.y + ay - half, inst.z + az - half)
        positions.push(inst.x + bx - half, inst.y + by - half, inst.z + bz - half)
      })
    })
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
    return geo
  }, [instances, showEdges])

  useEffect(() => {
    return () => edgeGeometry && edgeGeometry.dispose()
  }, [edgeGeometry])

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, maxInstances]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.4} metalness={0.05} />
      </instancedMesh>
      {edgeGeometry && (
        <lineSegments geometry={edgeGeometry}>
          <lineBasicMaterial color={EDGE_COLOR} transparent opacity={0.7} />
        </lineSegments>
      )}
    </group>
  )
}

function VoxelViewport({ grid, size, extrude, randomLift, showEdges, showGrid = true, autoRotate, apiRef, fileName }) {
  const controlsRef = useRef(null)

  // Adaptive camera: distance and FOV both derive from grid size so every grid
  // is framed identically — same 3/4 angle, model filling the same portion of
  // the viewport — regardless of grid size.
  const scale = size / BASE_GRID_SIZE
  const fov = adaptiveFov(size)
  const cameraDistance = framingDistance(size)
  const defaultPosition = useMemo(
    () => BASE_CAMERA_POSITION.map((v) => v * (cameraDistance / BASE_CAMERA_DISTANCE)),
    [cameraDistance]
  )
  const near = NEAR_PLANE * scale
  const far = FAR_PLANE * scale

  return (
    <Canvas
      camera={{
        position: defaultPosition,
        fov,
        near: NEAR_PLANE * scale,
        far: FAR_PLANE * scale,
      }}
      gl={{ antialias: true }}
      dpr={[1, 2]}
    >
      <color attach="background" args={[VIEW_BG]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[12, 14, 8]} intensity={1.6} />
      <directionalLight position={[-8, -4, -10]} intensity={0.4} />
      {showGrid && <gridHelper args={[size, size, GRID_CENTER, GRID_LINE]} position={[0, 0, 0]} />}
      <VoxelMesh grid={grid} size={size} extrude={extrude} randomLift={randomLift} showEdges={showEdges} />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        autoRotate={autoRotate}
        autoRotateSpeed={2.5}
        minDistance={BASE_MIN_DISTANCE * scale}
        maxDistance={BASE_MAX_DISTANCE * scale}
      />

      <ViewportApi
        apiRef={apiRef}
        controlsRef={controlsRef}
        fileName={fileName}
        defaultPosition={defaultPosition}
        fov={fov}
        near={near}
        far={far}
      />
    </Canvas>
  )
}

export default VoxelViewport