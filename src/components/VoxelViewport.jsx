import { useLayoutEffect, useEffect, useMemo, useRef } from "react"
import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three"

// Hard ceiling for how many cubes a single pixel column can hold
// (the height slider is the only thing that changes the count)
const MAX_STACK = 6

// Frame the whole grid in view: distance grows with grid size so large
// slates stay fully visible without the user having to zoom out by hand.
const fitDistance = (size) => size * 1.5 + 14

function defaultCamera(size) {
  const d = fitDistance(size)
  return [d * 0.68, d * 0.5, d * 0.68]
}

// Deterministic per-cell pseudo-random so random heights stay stable for a
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

// Exposes an api to the parent: capture() renders a PNG, reset() reframes
// the whole grid, top() looks straight down so the image reads as a flat sprite.
function ViewportApi({ apiRef, controlsRef, fileName, size }) {
  const { gl, scene, camera } = useThree()

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
        camera.position.set(...defaultCamera(size))
        controlsRef.current?.target.set(0, 0, 0)
        controlsRef.current?.update()
      },
      // Straight-on top view so the pixel image shows flat; the random-height
      // columns only peek out when you look from the sides.
      top: () => {
        const y = size * 1.6 + 8
        camera.position.set(0.001, y, 0.001)
        controlsRef.current?.target.set(0, 0, 0)
        controlsRef.current?.update()
      },
    }
    return () => {
      apiRef.current = null
    }
  }, [gl, scene, camera, apiRef, controlsRef, fileName, size])

  return null
}

function VoxelMesh({ grid, size, extrude, randomLift, showEdges }) {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const scratch = useMemo(() => new THREE.Color(), [])

  // Flatten the 2D slate into positioned cubes. The height slider decides how
  // many cubes a column has (extrude). The random lift only TRANSLATES each
  // column up by a random amount (deterministic per cell) — it never adds or
  // removes cubes. Top view still shows the flat image; the sides show columns
  // floating at different heights.
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

  // Sync matrices + per-instance colors whenever the grid changes (realtime)
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

  // Free the replaced edge geometry when it changes/unmounts
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
  const cameraPosition = useMemo(() => defaultCamera(size), [size])

  return (
    <Canvas camera={{ position: cameraPosition, fov: 45 }} gl={{ antialias: true }} dpr={[1, 2]}>
      <color attach="background" args={[VIEW_BG]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[12, 14, 8]} intensity={1.6} />
      <directionalLight position={[-8, -4, -10]} intensity={0.4} />
      {showGrid && <gridHelper args={[size, size, GRID_CENTER, GRID_LINE]} position={[0, 0, 0]} />}
      <VoxelMesh grid={grid} size={size} extrude={extrude} randomLift={randomLift} showEdges={showEdges} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        autoRotate={autoRotate}
        autoRotateSpeed={2.5}
        minDistance={5}
        maxDistance={200}
      />
      <ViewportApi apiRef={apiRef} controlsRef={controlsRef} fileName={fileName} size={size} />
    </Canvas>
  )
}

export default VoxelViewport
