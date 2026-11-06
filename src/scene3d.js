import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export function createChessScene3D(host, onSquareClick) {
  host.innerHTML = "";
  host.classList.add("three-board-host");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#050914");
  scene.fog = new THREE.Fog("#050914", 19, 36);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 10.5, 12.8);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.domElement.style.touchAction = "none";
  renderer.domElement.setAttribute("aria-label", "Interactive 3D chessboard. Tap a square to select a piece or destination.");
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.transmissionResolutionScale = 1;
  host.appendChild(renderer.domElement);

  // A real environment map gives the crystal surfaces something to refract
  // and reflect; without it, transmissive pieces can look flat or papery.
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const roomEnvironment = new RoomEnvironment();
  const environmentTarget = pmremGenerator.fromScene(roomEnvironment, 0.04);
  scene.environment = environmentTarget.texture;
  roomEnvironment.dispose();
  pmremGenerator.dispose();

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.minDistance = 9;
  controls.maxDistance = 19;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.target.set(0, 0.25, 0);

  scene.add(new THREE.HemisphereLight(0xf0fbff, 0x111a35, 2.05));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.25);
  keyLight.position.set(-5, 10, 7);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.bias = -0.00018;
  keyLight.shadow.normalBias = 0.025;
  keyLight.shadow.radius = 5;
  keyLight.shadow.camera.left = -7;
  keyLight.shadow.camera.right = 7;
  keyLight.shadow.camera.top = 7;
  keyLight.shadow.camera.bottom = -7;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xb5e8ff, 1.65);
  fillLight.position.set(6, 7, 4);
  scene.add(fillLight);
  const rimLight = new THREE.PointLight(0x8de4ff, 52, 22);
  rimLight.position.set(5, 5, -5);
  scene.add(rimLight);
  const warmLight = new THREE.PointLight(0x9aabff, 30, 20);
  warmLight.position.set(-5, 3, 5);
  scene.add(warmLight);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: "#070d1d", roughness: 0.62, metalness: 0.24 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.34;
  floor.receiveShadow = true;
  scene.add(floor);

  const boardGroup = new THREE.Group();
  const piecesGroup = new THREE.Group();
  const targetsGroup = new THREE.Group();
  scene.add(boardGroup, piecesGroup, targetsGroup);

  const wood = new THREE.MeshPhysicalMaterial({ color: "#102b55", roughness: 0.2, metalness: 0.78, clearcoat: 1, clearcoatRoughness: 0.08 });
  const lightSquare = new THREE.MeshPhysicalMaterial({ color: "#f4fdff", roughness: 0.12, metalness: 0.12, clearcoat: 1, clearcoatRoughness: 0.045 });
  const darkSquare = new THREE.MeshPhysicalMaterial({ color: "#123d78", roughness: 0.105, metalness: 0.38, emissive: "#123b75", emissiveIntensity: 0.16, clearcoat: 1, clearcoatRoughness: 0.035 });
  const highlight = new THREE.MeshStandardMaterial({ color: "#e8fbff", roughness: 0.12, metalness: 0.2, emissive: "#4ebfff", emissiveIntensity: 0.42 });
  const lastHighlight = new THREE.MeshStandardMaterial({ color: "#91e7ff", roughness: 0.14, metalness: 0.24, emissive: "#286caa", emissiveIntensity: 0.34 });
  const targetMat = new THREE.MeshBasicMaterial({ color: "#60d58b", transparent: true, opacity: 0.62, depthWrite: false });
  const checkedSquare = new THREE.MeshStandardMaterial({ color: "#b43a32", emissive: "#8f160d", emissiveIntensity: .55 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(8.55, 0.42, 8.55), wood);
  base.position.y = -0.04;
  base.receiveShadow = true;
  base.castShadow = true;
  boardGroup.add(base);

  const tileGeometry = new THREE.BoxGeometry(0.99, 0.13, 0.99);
  const squareMeshes = new Map();
  const pieceMeshes = [];

  for (let rank = 1; rank <= 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const squareName = "abcdefgh"[file] + rank;
      const tile = new THREE.Mesh(tileGeometry, (file + rank) % 2 === 0 ? lightSquare : darkSquare);
      tile.position.set(file - 3.5, 0.235, 4.5 - rank);
      tile.receiveShadow = true;
      tile.userData.square = squareName;
      boardGroup.add(tile);
      squareMeshes.set(squareName, tile);
    }
  }

  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(8.72, 0.12, 8.72),
    new THREE.MeshStandardMaterial({ color: "#e7faff", metalness: 0.98, roughness: 0.1 })
  );
  edge.position.y = -0.25;
  boardGroup.add(edge);

  // Champagne-gold rails frame the playing surface like a handcrafted
  // royal jewel case. They sit just outside the 8x8 tiles and stay non-interactive.
  const frameMetal = new THREE.MeshStandardMaterial({
    color: "#e7c982",
    metalness: 1,
    roughness: 0.065
  });
  const railLong = new THREE.BoxGeometry(8.22, 0.055, 0.075);
  const railShort = new THREE.BoxGeometry(0.075, 0.055, 8.22);
  for (const z of [-4.12, 4.12]) {
    const rail = new THREE.Mesh(railLong, frameMetal);
    rail.position.set(0, 0.145, z);
    rail.castShadow = true;
    boardGroup.add(rail);
  }
  for (const x of [-4.12, 4.12]) {
    const rail = new THREE.Mesh(railShort, frameMetal);
    rail.position.set(x, 0.145, 0);
    rail.castShadow = true;
    boardGroup.add(rail);
  }

  const profiles = {
    p: [[0,.02],[.28,.02],[.31,.08],[.25,.15],[.17,.2],[.14,.34],[.21,.43],[.24,.49],[.2,.57],[.13,.61],[.1,.72],[.04,.77],[0,.77]],
    r: [[0,.02],[.3,.02],[.32,.1],[.24,.17],[.2,.35],[.26,.4],[.26,.54],[.31,.56],[.31,.65],[.22,.65],[.22,.59],[.14,.59],[.14,.65],[.06,.65],[.06,.59],[0,.59]],
    n: [[0,.02],[.3,.02],[.31,.1],[.22,.16],[.18,.28],[.23,.38],[.2,.48],[.14,.56],[.12,.68],[.05,.73],[0,.73]],
    b: [[0,.02],[.3,.02],[.32,.1],[.23,.17],[.17,.32],[.21,.42],[.15,.52],[.11,.62],[.15,.69],[.09,.78],[0,.8]],
    q: [[0,.02],[.31,.02],[.33,.1],[.23,.17],[.18,.35],[.25,.43],[.21,.51],[.13,.6],[.18,.69],[.1,.77],[0,.77]],
    k: [[0,.02],[.32,.02],[.34,.1],[.24,.17],[.18,.36],[.24,.44],[.2,.53],[.12,.61],[.12,.72],[.06,.78],[0,.78]]
  };

  function makePiece(piece, square) {
    const group = new THREE.Group();
    const isWhite = piece.color === "w";

    // Ice-diamond crystal for the computer (White) and deep sapphire crystal for the player (Black).
    const crystal = new THREE.MeshPhysicalMaterial({
      color: isWhite ? "#f5fdff" : "#174b9b",
      metalness: 0.035,
      roughness: 0.035,
      transmission: 0.94,
      thickness: 5.5,
      ior: 2.25,
      clearcoat: 1,
      clearcoatRoughness: 0.035,
      attenuationColor: isWhite ? "#eafcff" : "#235fc0",
      attenuationDistance: isWhite ? 3.8 : 2.8,
      envMapIntensity: 4.2,
      emissive: isWhite ? "#b7f0ff" : "#123d91",
      emissiveIntensity: 0.13,
      flatShading: true
    });
    const gold = new THREE.MeshStandardMaterial({
      color: "#e7c982",
      metalness: 1,
      roughness: 0.065
    });
    const silver = new THREE.MeshStandardMaterial({
      color: "#f3fcff",
      metalness: 0.98,
      roughness: 0.1
    });
    const darkGold = new THREE.MeshStandardMaterial({
      color: "#16417e",
      metalness: 0.99,
      roughness: 0.075
    });
    const trim = isWhite ? silver : gold;

    // A smooth, readable silhouette with enough facets to catch the light.
    const points = profiles[piece.type].map(([radius, height]) =>
      new THREE.Vector2(radius, height)
    );
    const body = new THREE.Mesh(
      new THREE.LatheGeometry(points, 40),
      crystal
    );
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const addCylinder = (radiusTop, radiusBottom, height, y, material, sides = 32) => {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(radiusTop, radiusBottom, height, sides, 1),
        material
      );
      mesh.position.y = y;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };
    const addRing = (radius, tube, y, material = trim) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, tube, 8, 40),
        material
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      ring.castShadow = true;
      group.add(ring);
      return ring;
    };

    // Distinct stepped foot with bright, narrow metal inlays.
    addCylinder(0.29, 0.325, 0.075, 0.055, gold);
    addCylinder(0.255, 0.29, 0.045, 0.115, darkGold);
    addCylinder(0.215, 0.235, 0.04, 0.17, trim);
    addRing(0.294, 0.018, 0.09, trim);
    addRing(0.238, 0.014, 0.19, gold);
    addRing(0.205, 0.012, 0.235, trim);

    // Fine decorative collars and scroll-like raised detailing make the
    // pieces read as carved glass rather than plain chess tokens.
    const collarY = piece.type === "p" ? 0.48 : piece.type === "n" ? 0.43 : 0.52;
    addRing(piece.type === "p" ? 0.19 : 0.205, 0.014, collarY, gold);
    addRing(piece.type === "p" ? 0.17 : 0.18, 0.009, collarY + 0.035, trim);

    // Small paired scrolls on the front and back of the lower body.
    for (const direction of [-1, 1]) {
      const points = [];
      for (let i = 0; i <= 18; i++) {
        const t = i / 18;
        const angle = t * Math.PI * 1.65;
        const radius = 0.115 + t * 0.055;
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius,
          0.27 + t * 0.22,
          direction * (0.165 + 0.012 * Math.sin(angle))
        ));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const scroll = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 28, 0.009, 5, false),
        trim
      );
      scroll.castShadow = true;
      group.add(scroll);
    }

    // Individual crowns keep every rank instantly recognizable at board scale.
    if (piece.type === "k") {
      addCylinder(0.11, 0.135, 0.07, 0.73, trim);
      const cross = new THREE.Group();
      const vertical = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.27, 0.065), gold);
      vertical.position.y = 0.91;
      const horizontal = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.065, 0.065), gold);
      horizontal.position.y = 0.94;
      cross.add(vertical, horizontal);
      cross.traverse(o => { if (o.isMesh) o.castShadow = true; });
      group.add(cross);
      addRing(0.14, 0.014, 0.79, gold);
    } else if (piece.type === "q") {
      addCylinder(0.135, 0.165, 0.065, 0.74, trim);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), gold);
        gem.position.set(Math.cos(a) * 0.19, 0.84, Math.sin(a) * 0.19);
        gem.castShadow = true;
        group.add(gem);
      }
      const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 1), crystal);
      crown.position.y = 0.9;
      crown.castShadow = true;
      group.add(crown);
    } else if (piece.type === "r") {
      addCylinder(0.22, 0.24, 0.075, 0.66, trim);
      addRing(0.23, 0.014, 0.71, gold);
      const merlons = new THREE.CylinderGeometry(0.055, 0.055, 0.14, 6);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4;
        const tooth = new THREE.Mesh(merlons, gold);
        tooth.position.set(Math.cos(a) * 0.19, 0.77, Math.sin(a) * 0.19);
        tooth.castShadow = true;
        group.add(tooth);
      }
    } else if (piece.type === "b") {
      const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 1), gold);
      tip.position.y = 0.78;
      tip.castShadow = true;
      group.add(tip);
      addRing(0.12, 0.012, 0.69, trim);
    } else if (piece.type === "n") {
      const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 2), crystal);
      head.position.set(0, 0.61, -0.035);
      head.scale.set(0.8, 1.15, 0.72);
      head.rotation.z = -0.22;
      head.castShadow = true;
      group.add(head);
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 6), trim);
      ear.position.set(0.09, 0.78, -0.02);
      ear.castShadow = true;
      group.add(ear);
      const mane = new THREE.Mesh(
        new THREE.TorusGeometry(0.14, 0.025, 7, 24, Math.PI * 1.25),
        gold
      );
      mane.position.set(0, 0.48, 0.035);
      mane.rotation.set(0.3, 0, Math.PI * 0.15);
      group.add(mane);
    } else if (piece.type === "p") {
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 2), crystal);
      orb.position.y = 0.69;
      orb.castShadow = true;
      group.add(orb);
      addRing(0.13, 0.012, 0.56, gold);
    }

    const [file, rank] = ["abcdefgh".indexOf(square[0]), Number(square[1])];
    group.scale.setScalar(1.12);
    group.position.set(file - 3.5, .30, 4.5 - rank);
    group.userData.square = square;
    group.traverse(obj => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.userData.square = square;
      }
    });
    piecesGroup.add(group);
    pieceMeshes.push(group);
  }

  function resize() {
    const width = Math.max(host.clientWidth, 280);
    const height = Math.max(host.clientHeight, 280);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.30);
  const downPoint = { x: 0, y: 0, id: null };

  function pickSquare(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    // Prefer the actual chess piece or tile under the finger.
    const hits = raycaster.intersectObjects(
      [...piecesGroup.children, ...boardGroup.children],
      true
    );
    const hit = hits.find(item => item.object.userData.square);
    if (hit) {
      onSquareClick(hit.object.userData.square);
      return;
    }

    // Fallback: map the touch position onto the board surface.
    const point = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(boardPlane, point)) return;
    const file = Math.floor(point.x + 4);
    const rank = Math.round(4.5 - point.z);
    if (file >= 0 && file < 8 && rank >= 1 && rank <= 8) {
      onSquareClick("abcdefgh"[file] + rank);
    }
  }

  renderer.domElement.addEventListener("pointerdown", event => {
    downPoint.x = event.clientX;
    downPoint.y = event.clientY;
    downPoint.id = event.pointerId;
  }, { passive: true });

  renderer.domElement.addEventListener("pointerup", event => {
    if (downPoint.id !== event.pointerId) return;
    const moved = Math.hypot(
      event.clientX - downPoint.x,
      event.clientY - downPoint.y
    );
    downPoint.id = null;
    // Ignore camera drags; treat a short touch as a square selection.
    if (moved <= 12) pickSquare(event);
  }, { passive: true });

  renderer.domElement.addEventListener("pointercancel", () => {
    downPoint.id = null;
  }, { passive: true });

  let currentFlipped = null;
  function disposeGroup(group) {
    group.traverse(obj => {
      if (!obj.isMesh) return;
      obj.geometry?.dispose();
      if (Array.isArray(obj.material)) obj.material.forEach(material => material.dispose());
      else obj.material?.dispose();
    });
    group.clear();
  }

  function render(game, selectedSquare, legalTargets, lastMove, checkedKing, flipped) {
    disposeGroup(piecesGroup);
    disposeGroup(targetsGroup);
    pieceMeshes.length = 0;
    for (const [name, tile] of squareMeshes) {
      tile.material = (Number(name[1]) + "abcdefgh".indexOf(name[0])) % 2 === 0 ? lightSquare : darkSquare;
      if (lastMove && (lastMove.from === name || lastMove.to === name)) tile.material = lastHighlight;
      if (selectedSquare === name) tile.material = highlight;
      if (checkedKing === name) tile.material = checkedSquare;
    }
    const board = game.board();
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece) {
          const square = "abcdefgh"[col] + (8 - row);
          makePiece(piece, square);
        }
      }
    }
    for (const name of legalTargets) {
      const [file,rank] = ["abcdefgh".indexOf(name[0]),Number(name[1])];
      const dot = new THREE.Mesh(new THREE.CircleGeometry(.14,24), targetMat.clone());
      dot.rotation.x = -Math.PI/2;
      dot.position.set(file-3.5,.315,4.5-rank);
      targetsGroup.add(dot);
    }
    if (currentFlipped !== flipped) {
      camera.position.set(0, 10.5, flipped ? -12.8 : 12.8);
      camera.lookAt(0,.25,0);
      controls.target.set(0,.25,0);
      controls.update();
      currentFlipped = flipped;
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene,camera);
  }
  animate();

  return { render };
}
