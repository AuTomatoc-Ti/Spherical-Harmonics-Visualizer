import * as THREE from "three";
import { clamp, realSphericalHarmonic } from "../math/sphericalHarmonics.js";
import { normalizedToRgb } from "../utils/colors.js";

export function create3DRenderer(container, onHoverSample) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#080f1b");

  const camera = new THREE.PerspectiveCamera(42, 2, 0.1, 100);
  const defaultPosition = new THREE.Vector3(0, 0, 3.4);
  camera.position.copy(defaultPosition);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.58));

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
  keyLight.position.set(2.2, 1.8, 3.2);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x7ea3ff, 0.44);
  fillLight.position.set(-3.1, -1.1, -2.3);
  scene.add(fillLight);

  const geometry = new THREE.SphereGeometry(1, 180, 120);
  const basePositions = geometry.attributes.position.array.slice();

  const colorArray = new Float32Array(geometry.attributes.position.count * 3);
  geometry.setAttribute("color", new THREE.BufferAttribute(colorArray, 3));

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.32,
    metalness: 0.1
  });

  const sphereMesh = new THREE.Mesh(geometry, material);
  scene.add(sphereMesh);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const tempForward = new THREE.Vector3();
  const tempRight = new THREE.Vector3();
  const tempMove = new THREE.Vector3();
  const clock = new THREE.Clock();
  const sphereQuaternion = new THREE.Quaternion();
  const inverseQuaternion = new THREE.Quaternion();

  let l = 2;
  let m = 1;
  let radiusMode = "color";
  let moveSpeed = 2;
  let isActive = false;
  let isRightDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let sphereRotX = 0;
  let sphereRotY = 0;
  const rotationSensitivity = 0.005;
  const keysPressed = new Set();

  function updateCameraDirection() {
    camera.lookAt(0, 0, 0);
  }

  function updateSphereRotation() {
    sphereQuaternion.setFromEuler(new THREE.Euler(sphereRotX, sphereRotY, 0, 'YXZ'));
    sphereMesh.quaternion.copy(sphereQuaternion);
  }

  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function renderGeometry() {
    const positions = geometry.attributes.position;
    const colors = geometry.attributes.color;
    const values = new Float64Array(positions.count);

    let maxAbs = 0;

    for (let i = 0; i < positions.count; i += 1) {
      const x = basePositions[i * 3];
      const y = basePositions[i * 3 + 1];
      const z = basePositions[i * 3 + 2];
      const r = Math.sqrt(x * x + y * y + z * z);

      const nx = x / r;
      const ny = y / r;
      const nz = z / r;

      const theta = Math.acos(clamp(ny, -1, 1));
      let phi = Math.atan2(nz, nx);
      if (phi < 0) phi += 2 * Math.PI;

      const { y: value } = realSphericalHarmonic(l, m, theta, phi);
      values[i] = value;
      maxAbs = Math.max(maxAbs, Math.abs(value));
    }

    for (let i = 0; i < positions.count; i += 1) {
      const x = basePositions[i * 3];
      const y = basePositions[i * 3 + 1];
      const z = basePositions[i * 3 + 2];
      const r = Math.sqrt(x * x + y * y + z * z);
      const nx = x / r;
      const ny = y / r;
      const nz = z / r;

      const normalized = maxAbs === 0 ? 0 : values[i] / maxAbs;
      const radius =
        radiusMode === "magnitude"
          ? 0.62 + Math.abs(normalized) * 0.8
          : 1;
      positions.setXYZ(i, nx * radius, ny * radius, nz * radius);

      const [red, green, blue] = normalizedToRgb(normalized);
      colors.setXYZ(i, red / 255, green / 255, blue / 255);
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  function setLm(nextL, nextM) {
    l = nextL;
    m = nextM;
    renderGeometry();
  }

  function setRadiusMode(nextMode) {
    radiusMode = nextMode;
    renderGeometry();
  }

  function setMoveSpeed(nextSpeed) {
    moveSpeed = nextSpeed;
  }

  function setActive(nextActive) {
    isActive = nextActive;
    if (!nextActive) {
      isRightDragging = false;
      onHoverSample(null);
    }
  }

  function resetCamera() {
    camera.position.copy(defaultPosition);
    sphereRotX = 0;
    sphereRotY = 0;
    updateSphereRotation();
    updateCameraDirection();
  }

  function updateMovement(delta) {
    if (!isActive || delta <= 0) return;

    const movementAmount = moveSpeed * delta;
    tempMove.set(0, 0, 0);

    const FORWARD = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const RIGHT = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);

    if (keysPressed.has("KeyW")) tempMove.addScaledVector(FORWARD, movementAmount);
    if (keysPressed.has("KeyS")) tempMove.addScaledVector(FORWARD, -movementAmount);
    if (keysPressed.has("KeyA")) tempMove.addScaledVector(RIGHT, -movementAmount);
    if (keysPressed.has("KeyD")) tempMove.addScaledVector(RIGHT, movementAmount);
    if (keysPressed.has("KeyQ")) tempMove.y -= movementAmount;
    if (keysPressed.has("KeyE")) tempMove.y += movementAmount;

    camera.position.add(tempMove);
  }

  function onMouseMove(event) {
    if (!isActive) return;

    const rect = renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    if (isRightDragging) {
      const deltaX = event.clientX - lastMouseX;
      const deltaY = event.clientY - lastMouseY;
      sphereRotY += deltaX * rotationSensitivity;
      sphereRotX = clamp(sphereRotX - deltaY * rotationSensitivity, -1.5, 1.5);
      updateSphereRotation();
      event.preventDefault();
    }

    lastMouseX = event.clientX;
    lastMouseY = event.clientY;

    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersections = raycaster.intersectObject(sphereMesh, false);
    if (!intersections.length) return;

    const point = intersections[0].point.clone();
    inverseQuaternion.copy(sphereQuaternion).invert();
    point.applyQuaternion(inverseQuaternion).normalize();
    const theta = Math.acos(clamp(point.y, -1, 1));
    let phi = Math.atan2(point.z, point.x);
    if (phi < 0) phi += 2 * Math.PI;

    const sample = realSphericalHarmonic(l, m, theta, phi);
    onHoverSample({ theta, phi, y: sample.y, p: sample.p });
  }

  function onMouseLeave() {
    isRightDragging = false;
    onHoverSample(null);
  }

  function onMouseDown(event) {
    if (!isActive) return;
    if (event.button === 0) {
      isRightDragging = true;
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      event.preventDefault();
    }
  }

  function onMouseUp(event) {
    if (event.button === 0) {
      isRightDragging = false;
    }
  }

  function onContextMenu(event) {
    event.preventDefault();
  }

  function onKeyDown(event) {
    if (!isActive) return;
    if (["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE"].includes(event.code)) {
      keysPressed.add(event.code);
    }
  }

  function onKeyUp(event) {
    keysPressed.delete(event.code);
  }

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    updateMovement(delta);
    updateCameraDirection();
    renderer.render(scene, camera);
  }

  renderer.domElement.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  renderer.domElement.addEventListener("mousemove", onMouseMove);
  renderer.domElement.addEventListener("mouseleave", onMouseLeave);
  renderer.domElement.addEventListener("contextmenu", onContextMenu);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  resize();
  renderGeometry();
  updateSphereRotation();
  updateCameraDirection();
  animate();

  return {
    resize,
    setLm,
    setRadiusMode,
    setMoveSpeed,
    setActive,
    resetCamera
  };
}
