import React, { useEffect, useRef, useState } from 'react'

const MODEL_URL = './dcc-crest-3d.glb'
const FALLBACK_URL = './dcc-crest.png'
const SPIN_MS = 1400

// 3D Detroit Catholic Central crest. Sits face-on; a click spins it one full turn.
// three.js is loaded lazily so it never delays the first paint; the flat PNG
// shows until the model is ready (and stays if WebGL is unavailable).
export default function Crest3D() {
  const hostRef = useRef(null)
  const spinRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let disposed = false
    let cleanup = () => {}

    ;(async () => {
      const [THREE, { GLTFLoader }, { RoomEnvironment }] = await Promise.all([
        import('three'),
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('three/examples/jsm/environments/RoomEnvironment.js'),
      ])
      if (disposed || !hostRef.current) return

      let renderer
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      } catch {
        return // no WebGL: keep the PNG
      }
      const host = hostRef.current
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3))
      renderer.toneMapping = THREE.NeutralToneMapping
      renderer.domElement.setAttribute('aria-hidden', 'true')
      host.appendChild(renderer.domElement)

      const scene = new THREE.Scene()
      const pmrem = new THREE.PMREMGenerator(renderer)
      const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
      scene.environment = envTexture
      scene.environmentIntensity = 0.9
      const key = new THREE.DirectionalLight(0xffffff, 1.1)
      key.position.set(-40, 60, 100)
      scene.add(key)

      // Orthographic, face-on: the medallion is 100 mm across, centred on the origin.
      const half = 51
      const camera = new THREE.OrthographicCamera(-half, half, half, -half, 1, 500)
      camera.position.set(0, 0, 200)

      const coin = new THREE.Group()
      scene.add(coin)

      const render = () => renderer.render(scene, camera)
      const resize = () => {
        const size = host.clientWidth || 58
        renderer.setSize(size, size, false)
        render()
      }
      const observer = new ResizeObserver(resize)
      observer.observe(host)

      let frame = 0
      spinRef.current = () => {
        if (frame) return
        const start = performance.now()
        const step = (now) => {
          const t = Math.min(1, (now - start) / SPIN_MS)
          const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
          coin.rotation.y = eased * Math.PI * 2
          render()
          if (t < 1) frame = requestAnimationFrame(step)
          else { coin.rotation.y = 0; render(); frame = 0 }
        }
        frame = requestAnimationFrame(step)
      }

      new GLTFLoader().load(MODEL_URL, (gltf) => {
        if (disposed) return
        gltf.scene.traverse((o) => {
          if (!o.isMesh) return
          o.geometry = o.geometry.toNonIndexed()
          o.geometry.computeVertexNormals()
          o.material.side = THREE.DoubleSide
        })
        // centre the thickness on the spin axis so it turns in place
        gltf.scene.position.z = -2.3
        coin.add(gltf.scene)
        resize()
        setReady(true)
      }, undefined, () => {})

      cleanup = () => {
        cancelAnimationFrame(frame)
        observer.disconnect()
        spinRef.current = null
        scene.traverse((o) => {
          if (o.isMesh) { o.geometry.dispose(); o.material.dispose() }
        })
        envTexture.dispose()
        pmrem.dispose()
        renderer.dispose()
        renderer.domElement.remove()
      }
    })()

    return () => { disposed = true; cleanup() }
  }, [])

  return (
    <button
      type="button"
      className={`crest-3d${ready ? ' is-ready' : ''}`}
      onClick={() => spinRef.current?.()}
      aria-label="Detroit Catholic Central crest (click to spin)"
      title="Click to spin"
    >
      <span ref={hostRef} className="crest-3d-stage" />
      <img src={FALLBACK_URL} alt="" className="crest-3d-fallback" />
    </button>
  )
}
