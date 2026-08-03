import { useLayoutEffect, useEffect, useMemo, useRef } from "react"
import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three"

// Max cubes a single pixel can stack into (height slider ceiling)
const MAX_EXTRUDE = 6

const DEFAULT_CAMERA_POSITION = [13, 9, 13]

// Pastel pixel viewport palette
const VIEW_BG = "#f7f3ff"
const EDGE_COLOR = "#4a3b5c"
const GRID_CENTER = "#d6c8f2"
const GRID_LINE = "#eee6ff"

// Exposes an api to the parent: capture() renders a PNG, reset() returns to default view
function ViewportApi({ apiRef, controlsRef, fileName }) {
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
        camera.position.set(...DEFAULT_CAMERA_POSITION)
        controlsRef.current?.target.set(0, 0, 0)
        controlsRef.current?.update()
      },
      // Straight-on front view so the design reads like a sprite
      front: () => {
        camera.position.set(0, 3, 22)
        controlsRef.current?.target.set(0, 2, 0)
        controlsRef.current?.update()
      },
    }
    return () => {
      apiRef.current = null
    }
  }, [gl, scene, camera, apiRef, controlsRef, fileName])

  return null
}

function VoxelMesh({ grid, size, extrude, showEdges }) {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const scratch = useMemo(() => new THREE.Color(), [])

  // Flatten the 2D slate into positioned cubes (one per pixel, stacked by extrude)
  const instances = useMemo(() => {
    const list = []
    const offset = (size - 1) / 2
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = grid[r][c]
        if (!cell) continue
        for (let y = 0; y < extrude; y++) {
          list.push({
            x: c - offset,
            y: y + 0.5,
            z: r - offset,
            color: cell,
          })
        }
      }
    }
    return list
  }, [grid, size, extrude])

  const maxInstances = size * size * MAX_EXTRUDE

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

function VoxelViewport({ grid, size, extrude, showEdges, showGrid = true, autoRotate, apiRef, fileName }) {
  const controlsRef = useRef(null)

  return (
    <Canvas camera={{ position: DEFAULT_CAMERA_POSITION, fov: 45 }} gl={{ antialias: true }} dpr={[1, 2]}>
      <color attach="background" args={[VIEW_BG]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[12, 14, 8]} intensity={1.6} />
      <directionalLight position={[-8, -4, -10]} intensity={0.4} />
      {showGrid && <gridHelper args={[size, size, GRID_CENTER, GRID_LINE]} position={[0, 0, 0]} />}
      <VoxelMesh grid={grid} size={size} extrude={extrude} showEdges={showEdges} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        autoRotate={autoRotate}
        autoRotateSpeed={2.5}
        minDistance={5}
        maxDistance={50}
      />
      <ViewportApi apiRef={apiRef} controlsRef={controlsRef} fileName={fileName} />
    </Canvas>
  )
}

export default VoxelViewport
