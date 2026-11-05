import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function createChessScene3D(host, onSquareClick) {
  host.innerHTML = "";
  host.classList.add("three-board-host");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#090a0e");
  scene.fog = new THREE.Fog("#090a0e", 17, 32);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 10.5, -12.8);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  host.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.minDistance = 9;
  controls.maxDistance = 19;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.target.set(0, 0.25, 0);

  scene.add(new THREE.HemisphereLight(0xffe8c4, 0x21130c, 2.25));
  const keyLight = new THREE.DirectionalLight(0xffdfaa, 3.8);
  keyLight.position.set(-5, 10, 7);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.bias = -0.00018;
  keyLight.shadow.normalBias = 0.025;
  keyLight.shadow.radius = 5;
  keyLight.shadow.camera.left = -7;
  keyLight.shadow.camera.right = 7;
  keyLight.shadow.camera.top = 7;
  keyLight.shadow.camera.bottom = -7;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xfff1d6, 1.35);
  fillLight.position.set(6, 7, 4);
  scene.add(fillLight);
  const rimLight = new THREE.PointLight(0xffd58a, 58, 19);
  rimLight.position.set(5, 5, -5);
  scene.add(rimLight);
  const warmLight = new THREE.PointLight(0xc58a45, 52, 18);
  warmLight.position.set(-5, 3, 5);
  scene.add(warmLight);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: "#0b0b0e", roughness: 0.78, metalness: 0.12 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.34;
  floor.receiveShadow = true;
  scene.add(floor);

  const boardGroup = new THREE.Group();
  const piecesGroup = new THREE.Group();
  const targetsGroup = new THREE.Group();
  scene.add(boardGroup, piecesGroup, targetsGroup);

  const wood = new THREE.MeshStandardMaterial({ color: "#24170f", roughness: 0.24, metalness: 0.28 });
  const lightSquare = new THREE.MeshStandardMaterial({ color: "#f0dfbd", roughness: 0.24, metalness: 0.08 });
  const darkSquare = new THREE.MeshStandardMaterial({ color: "#49301f", roughness: 0.23, metalness: 0.16 });
  const highlight = new THREE.MeshStandardMaterial({ color: "#e8bd55", roughness: 0.28, emissive: "#8a5a12", emissiveIntensity: 0.3 });
  const lastHighlight = new THREE.MeshStandardMaterial({ color: "#bda04f", roughness: 0.32, emissive: "#6e5217", emissiveIntensity: 0.22 });
  const targetMat = new THREE.MeshBasicMaterial({ color: "#60d58b", transparent: true, opacity: 0.62, depthWrite: false });
  const captureMat = new THREE.MeshBasicMaterial({ color: "#f06b55", transparent: true, opacity: 0.75, side: THREE.DoubleSide });

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
      const tile = new THREE.Mesh(tileGeometry, (file + rank) % 2 ? lightSquare : darkSquare);
      tile.position.set(file - 3.5, 0.235, 4.5 - rank);
      tile.receiveShadow = true;
      tile.userData.square = squareName;
      boardGroup.add(tile);
      squareMeshes.set(squareName, tile);
    }
  }

  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(8.72, 0.12, 8.72),
    new THREE.MeshStandardMaterial({ color: "#d6ad67", metalness: 0.82, roughness: 0.19 })
  );
  edge.position.y = -0.25;
  boardGroup.add(edge);

  // Four champagne-gold rails frame the playing surface like a handcrafted
  // luxury table. They sit just outside the 8x8 tiles and stay non-interactive.
  const frameMetal = new THREE.MeshStandardMaterial({
    color: "#e5c27d",
    metalness: 0.86,
    roughness: 0.18
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
    // Opaque, solid materials: avoid the glass-like look that made pieces
    // appear thin or transparent on some mobile GPUs.
    const glass = new THREE.MeshPhysicalMaterial({
      color: isWhite ? "#f4e2bd" : "#211712",
      metalness: isWhite ? 0.12 : 0.2,
      roughness: isWhite ? 0.22 : 0.2,
      transmission: 0,
      transparent: false,
      opacity: 1,
      clearcoat: 1,
      clearcoatRoughness: 0.08
    });
    const metal = new THREE.MeshStandardMaterial({
      color: "#e7c477",
      metalness: 0.78,
      roughness: 0.2
    });
    const stem = new THREE.Mesh(new THREE.LatheGeometry(
      profiles[piece.type].map(([r,y]) => new THREE.Vector2(r,y)), 48
    ), glass);
    stem.castShadow = true;
    stem.receiveShadow = true;
    group.add(stem);

    const foot = new THREE.Mesh(new THREE.CylinderGeometry(.29,.32,.09,48), metal);
    foot.position.y = .065;
    foot.castShadow = true;
    group.add(foot);
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(.235,.025,12,48),
      metal
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.y = .19;
    collar.castShadow = true;
    group.add(collar);

    // Fine gold inlay bands add a turned-wood, handcrafted finish.
    for (const [radius, tube, y] of [[.255,.012,.115],[.205,.009,.285]]) {
      const inlay = new THREE.Mesh(new THREE.TorusGeometry(radius,tube,10,48), metal);
      inlay.rotation.x = Math.PI / 2;
      inlay.position.y = y;
      inlay.castShadow = true;
      inlay.receiveShadow = true;
      group.add(inlay);
    }

    if (piece.type === "p") {
      const head = new THREE.Mesh(new THREE.SphereGeometry(.105, 32, 24), glass);
      head.position.y = .79;
      head.castShadow = true;
      group.add(head);
    } else if (piece.type === "n") {
      const horse = new THREE.Group();
      const neck = new THREE.Mesh(new THREE.CapsuleGeometry(.12,.28,6,16), glass);
      neck.position.set(0,.72,0);
      neck.rotation.z = -.32;
      horse.add(neck);
      const head = new THREE.Mesh(new THREE.SphereGeometry(.15,24,18), glass);
      head.position.set(.02,.91,.01);
      horse.add(head);
      const muzzle = new THREE.Mesh(new THREE.ConeGeometry(.09,.22,20), glass);
      muzzle.position.set(.12,.91,.02);
      muzzle.rotation.z = -Math.PI/2;
      horse.add(muzzle);
      const ear = new THREE.Mesh(new THREE.ConeGeometry(.055,.2,16), glass);
      ear.position.set(-.06,1.08,0);
      horse.add(ear);
      horse.rotation.y = Math.PI / 2;
      group.add(horse);
    } else if (piece.type === "b") {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(.12,28,20), glass);
      orb.position.y = .82;
      group.add(orb);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(.09,.2,24), metal);
      tip.position.y = .98;
      group.add(tip);
      const cut = new THREE.Mesh(new THREE.BoxGeometry(.025,.22,.28), metal);
      cut.position.set(0,.78,0);
      cut.rotation.z = .55;
      group.add(cut);
    } else if (piece.type === "q") {
      const crown = new THREE.Mesh(new THREE.SphereGeometry(.16,28,20), glass);
      crown.position.y = .84;
      group.add(crown);
      for (let i=0;i<5;i++) {
        const a = i * Math.PI * 2 / 5;
        const jewel = new THREE.Mesh(new THREE.SphereGeometry(.055,18,14), metal);
        jewel.position.set(Math.cos(a)*.19, .91, Math.sin(a)*.19);
        group.add(jewel);
      }
    } else if (piece.type === "k") {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(.12,28,20), glass);
      orb.position.y = .86;
      group.add(orb);
      const vertical = new THREE.Mesh(new THREE.BoxGeometry(.075,.34,.075), metal);
      vertical.position.y = 1.08;
      group.add(vertical);
      const cross = new THREE.Mesh(new THREE.BoxGeometry(.25,.07,.075), metal);
      cross.position.y = 1.13;
      group.add(cross);
    } else if (piece.type === "r") {
      for (let i=0;i<4;i++) {
        const crenel = new THREE.Mesh(new THREE.BoxGeometry(.12,.13,.12), metal);
        const a = i * Math.PI/2;
        crenel.position.set(Math.cos(a)*.19,.68,Math.sin(a)*.19);
        group.add(crenel);
      }
    }

    const [file, rank] = ["abcdefgh".indexOf(square[0]), Number(square[1])];
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
  renderer.domElement.addEventListener("pointerdown", (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects([...piecesGroup.children, ...boardGroup.children], true);
    const hit = hits.find(item => item.object.userData.square);
    if (hit) onSquareClick(hit.object.userData.square);
  });

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
      tile.material = (Number(name[1]) + "abcdefgh".indexOf(name[0])) % 2 ? lightSquare : darkSquare;
      if (lastMove && (lastMove.from === name || lastMove.to === name)) tile.material = lastHighlight;
      if (selectedSquare === name) tile.material = highlight;
      if (checkedKing === name) tile.material = new THREE.MeshStandardMaterial({ color: "#b43a32", emissive: "#8f160d", emissiveIntensity: .55 });
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
      const dot = new THREE.Mesh(new THREE.CircleGeometry(.14,24), targetMat);
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
