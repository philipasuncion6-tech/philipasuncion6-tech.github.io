import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export function createChessScene3D(host, onSquareClick) {
  host.innerHTML = "";
  host.classList.add("three-board-host");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#030817");
  scene.fog = new THREE.Fog("#030817", 20, 38);

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

  scene.add(new THREE.HemisphereLight(0xfff8ed, 0x111827, 2.0));
  const keyLight = new THREE.DirectionalLight(0xffffff, 4.4);
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
  const fillLight = new THREE.DirectionalLight(0xd9e8ff, 2.3);
  fillLight.position.set(6, 7, 4);
  scene.add(fillLight);
  const rimLight = new THREE.PointLight(0xffffff, 72, 24);
  rimLight.position.set(5, 5, -5);
  scene.add(rimLight);
  const warmLight = new THREE.PointLight(0xd7b36b, 46, 22);
  warmLight.position.set(-5, 3, 5);
  scene.add(warmLight);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: "#050b1c", roughness: 0.38, metalness: 0.42 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.34;
  floor.receiveShadow = true;
  scene.add(floor);

  const boardGroup = new THREE.Group();
  const piecesGroup = new THREE.Group();
  const targetsGroup = new THREE.Group();
  scene.add(boardGroup, piecesGroup, targetsGroup);

  const wood = new THREE.MeshPhysicalMaterial({ color: "#11151d", roughness: 0.2, metalness: 0.88, clearcoat: 1, clearcoatRoughness: 0.08 });
  const lightSquare = new THREE.MeshPhysicalMaterial({ color: "#f4f1e9", roughness: 0.16, metalness: 0.12, clearcoat: 1, clearcoatRoughness: 0.06, iridescence: 0.12, iridescenceIOR: 1.3, iridescenceThicknessRange: [220, 420] });
  const darkSquare = new THREE.MeshPhysicalMaterial({ color: "#111a2a", roughness: 0.13, metalness: 0.72, emissive: "#071326", emissiveIntensity: 0.05, clearcoat: 1, clearcoatRoughness: 0.04 });
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
    new THREE.MeshStandardMaterial({ color: "#e8e3d8", metalness: 1, roughness: 0.12 })
  );
  edge.position.y = -0.25;
  boardGroup.add(edge);

  // Champagne-gold rails frame the playing surface like a handcrafted
  // royal jewel case. They sit just outside the 8x8 tiles and stay non-interactive.
  const frameMetal = new THREE.MeshStandardMaterial({
    color: "#f0e6d2",
    metalness: 1,
    roughness: 0.09
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

  // Four jeweller-set corner ornaments echo the Pearl Royale crystal-glass board.
  const cornerPearl = new THREE.MeshPhysicalMaterial({ color: "#fff8e9", roughness: .18, metalness: .1, clearcoat: 1, iridescence: .25 });
  const cornerDiamond = new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: .025, metalness: .02, transmission: .2, ior: 2.2, clearcoat: 1 });
  for (const x of [-4.02, 4.02]) for (const z of [-4.02, 4.02]) {
    const mount = new THREE.Mesh(new THREE.CylinderGeometry(.16,.19,.07,48), frameMetal);
    mount.position.set(x,.22,z);
    mount.castShadow = true;
    boardGroup.add(mount);
    const pearl = new THREE.Mesh(new THREE.SphereGeometry(.095,24,18), cornerPearl);
    pearl.position.set(x,.31,z);
    boardGroup.add(pearl);
    const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(.055,1), cornerDiamond);
    jewel.position.set(x+.12,.31,z+.02);
    boardGroup.add(jewel);
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

    // Pearl Royale interpretation: rhodium-finished white gold, pavé diamonds,
    // white/black South-Sea-style pearl heads and restrained Ceylon sapphire accents.
    const bodyMetal = new THREE.MeshPhysicalMaterial({
      color: isWhite ? "#f4f1e9" : "#667184",
      metalness: 1,
      roughness: 0.145,
      clearcoat: 1,
      clearcoatRoughness: 0.055,
      envMapIntensity: 2.2
    });
    const brightGold = new THREE.MeshStandardMaterial({ color: "#e6c27a", metalness: 1, roughness: 0.16 });
    const whiteGold = new THREE.MeshStandardMaterial({ color: "#f1eee7", metalness: 1, roughness: 0.12 });
    const shadowMetal = new THREE.MeshStandardMaterial({ color: "#39475c", metalness: 1, roughness: 0.18 });
    const sapphire = new THREE.MeshPhysicalMaterial({
      color: "#164b9a", metalness: 0.12, roughness: 0.08,
      transmission: 0.18, thickness: 1.2, ior: 1.76,
      clearcoat: 1, clearcoatRoughness: 0.025,
      envMapIntensity: 2.4
    });
    const diamond = new THREE.MeshPhysicalMaterial({
      color: "#ffffff", metalness: 0.02, roughness: 0.035,
      transmission: 0.28, thickness: 0.7, ior: 2.35,
      clearcoat: 1, clearcoatRoughness: 0.015,
      envMapIntensity: 3
    });
    const pearl = new THREE.MeshPhysicalMaterial({
      color: isWhite ? "#fff9ec" : "#20242d",
      metalness: 0.12, roughness: 0.19,
      clearcoat: 1, clearcoatRoughness: 0.08,
      iridescence: 0.32, iridescenceIOR: 1.45,
      iridescenceThicknessRange: [260, 520],
      envMapIntensity: 2.1
    });
    const trim = isWhite ? whiteGold : shadowMetal;

    const addMesh = (geometry, material, x=0, y=0, z=0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x,y,z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };
    const addCylinder = (rt, rb, h, y, material, sides=48) =>
      addMesh(new THREE.CylinderGeometry(rt, rb, h, sides, 1), material, 0, y, 0);
    const addRing = (radius, tube, y, material=brightGold) => {
      const ring = addMesh(new THREE.TorusGeometry(radius, tube, 10, 56), material, 0, y, 0);
      ring.rotation.x = Math.PI / 2;
      return ring;
    };
    const addPearl = (radius, y, material=pearl) =>
      addMesh(new THREE.SphereGeometry(radius, 32, 24), material, 0, y, 0);
    const addPave = (radius, y, count=16, gemMaterial=diamond, size=0.026) => {
      for (let i=0;i<count;i++) {
        const a=(i/count)*Math.PI*2;
        const gem=addMesh(new THREE.OctahedronGeometry(size,0),gemMaterial,Math.cos(a)*radius,y,Math.sin(a)*radius);
        gem.rotation.set(0,a,Math.PI/4);
      }
    };
    const addSapphireBand = (radius,y,count=8) => {
      for(let i=0;i<count;i++){
        const a=(i/count)*Math.PI*2;
        addMesh(new THREE.OctahedronGeometry(0.035,0),sapphire,Math.cos(a)*radius,y,Math.sin(a)*radius);
      }
    };

    // Sculpted Staunton-inspired turned body, now rendered as precious metal.
    const profiles = {
      p: [[0,.02],[.27,.02],[.31,.07],[.29,.12],[.22,.17],[.17,.24],[.15,.36],[.19,.43],[.16,.49],[.11,.55],[0,.57]],
      r: [[0,.02],[.30,.02],[.33,.08],[.29,.14],[.22,.19],[.19,.31],[.23,.39],[.24,.48],[.28,.53],[.28,.62],[.20,.62],[.20,.57],[.13,.57],[.13,.62],[.06,.62],[.06,.57],[0,.57]],
      n: [[0,.02],[.30,.02],[.32,.08],[.27,.14],[.20,.20],[.17,.31],[.22,.39],[.18,.48],[.12,.56],[.05,.62],[0,.62]],
      b: [[0,.02],[.30,.02],[.33,.08],[.28,.14],[.20,.20],[.16,.34],[.20,.43],[.13,.52],[.10,.63],[.05,.70],[0,.72]],
      q: [[0,.02],[.31,.02],[.34,.08],[.29,.14],[.21,.20],[.18,.35],[.22,.44],[.17,.53],[.12,.63],[.07,.68],[0,.68]],
      k: [[0,.02],[.32,.02],[.35,.08],[.29,.14],[.21,.20],[.18,.37],[.23,.46],[.17,.55],[.12,.66],[.06,.72],[0,.72]]
    };
    const profile = profiles[piece.type].map(([r,h])=>new THREE.Vector2(r,h));
    const turned = addMesh(new THREE.LatheGeometry(profile,64),bodyMetal);
    turned.castShadow = true;

    // Weighted, stepped foot with a fine gold signature line and pavé edge.
    addCylinder(.31,.34,.075,.055,trim);
    addCylinder(.285,.31,.045,.112,brightGold);
    addCylinder(.245,.275,.055,.16,bodyMetal);
    addRing(.302,.014,.09,brightGold);
    addRing(.25,.012,.19,whiteGold);
    addPave(.298,.094,24,diamond,.022);
    addPave(.248,.195,20,diamond,.018);

    // Jewelled collar: small stones are individually set, not painted on.
    const collarY = piece.type==="p"?.43:piece.type==="n"?.43:.49;
    addRing(.19,.018,collarY,brightGold);
    addPave(.19,collarY,16,diamond,.021);
    addSapphireBand(.176,collarY+.035,8);

    if (piece.type === "k") {
      addCylinder(.13,.16,.07,.72,brightGold);
      addRing(.145,.018,.77,whiteGold);
      addPave(.145,.77,16,diamond,.022);
      addPearl(.145,.91);
      // A fine white-gold cross crowns the king's pearl.
      addMesh(new THREE.BoxGeometry(.055,.24,.055),whiteGold,0,1.105,0);
      addMesh(new THREE.BoxGeometry(.20,.055,.055),brightGold,0,1.13,0);
      addSapphireBand(.14,.79,8);
    } else if (piece.type === "q") {
      addCylinder(.145,.18,.065,.70,brightGold);
      addRing(.17,.018,.75,whiteGold);
      addPave(.17,.75,18,diamond,.023);
      // Queen's pearl sits inside an open, diamond-set coronet.
      addPearl(.132,.91);
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;
        const prong=addMesh(new THREE.ConeGeometry(.025,.18,8),brightGold,Math.cos(a)*.12,.91,Math.sin(a)*.12);
        prong.rotation.z=Math.cos(a)*.45;
        prong.rotation.x=Math.sin(a)*.45;
        addMesh(new THREE.OctahedronGeometry(.035,0),diamond,Math.cos(a)*.13,.99,Math.sin(a)*.13);
      }
      addSapphireBand(.16,.77,10);
    } else if (piece.type === "r") {
      addCylinder(.235,.255,.075,.65,trim);
      addRing(.24,.018,.70,brightGold);
      addPave(.235,.70,20,diamond,.022);
      const merlonGeo=new THREE.BoxGeometry(.105,.16,.11);
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;
        addMesh(merlonGeo,bodyMetal,Math.cos(a)*.19,.77,Math.sin(a)*.19);
        addMesh(new THREE.OctahedronGeometry(.028,0),diamond,Math.cos(a)*.19,.86,Math.sin(a)*.19);
      }
      addCylinder(.13,.16,.06,.78,sapphire);
    } else if (piece.type === "b") {
      addCylinder(.13,.17,.06,.70,brightGold);
      const mitre=addMesh(new THREE.OctahedronGeometry(.13,1),sapphire,0,.82,0);
      mitre.scale.set(.72,1.45,.72);
      addRing(.12,.014,.72,whiteGold);
      addPave(.13,.82,8,diamond,.022);
      addPearl(.075,1.00);
    } else if (piece.type === "n") {
      // Raised horse-head silhouette, extruded like a small jeweller's carving.
      const shape=new THREE.Shape();
      shape.moveTo(-.16,-.12); shape.lineTo(-.19,.02); shape.lineTo(-.12,.13);
      shape.lineTo(-.16,.28); shape.lineTo(-.05,.24); shape.lineTo(.04,.34);
      shape.lineTo(.14,.29); shape.lineTo(.10,.18); shape.lineTo(.20,.09);
      shape.lineTo(.15,-.04); shape.lineTo(.06,-.13); shape.closePath();
      const horse=addMesh(new THREE.ExtrudeGeometry(shape,{depth:.10,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.025,bevelThickness:.025}),bodyMetal,0,.70,-.05);
      horse.rotation.y=Math.PI;
      addMesh(new THREE.SphereGeometry(.025,16,12),diamond,.045,.91,.015);
      addMesh(new THREE.ConeGeometry(.055,.14,8),brightGold,-.09,1.01,-.03);
      addRing(.16,.018,.53,brightGold);
      addPave(.16,.53,14,diamond,.02);
    } else if (piece.type === "p") {
      addPearl(.135,.66);
      addRing(.14,.014,.55,brightGold);
      addPave(.14,.55,12,diamond,.018);
    }

    // Tiny Ceylon-blue stones punctuate the white-gold regalia.
    if (piece.type !== "k" && piece.type !== "q") addSapphireBand(.205,.235,8);
    const [file, rank] = ["abcdefgh".indexOf(square[0]), Number(square[1])];
    group.scale.setScalar(1.12);
    group.position.set(file - 3.5, .30, 4.5 - rank);
    group.userData.square = square;
    group.traverse(obj => {
      if (obj.isMesh) { obj.castShadow=true; obj.userData.square=square; }
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
