import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export function createChessScene3D(host, onSquareClick) {
  host.innerHTML = "";
  host.classList.add("three-board-host");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#111116");
  // Keep the studio surroundings crisp: no distance fog or smoky haze.

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 10.5, 12.8);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.domElement.style.touchAction = "none";
  renderer.domElement.setAttribute("aria-label", "Interactive 3D chessboard. Tap a square to select a piece or destination.");
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.transmissionResolutionScale = 1;
  host.appendChild(renderer.domElement);

  // A compact studio environment gives the crystal surfaces real reflected highlights
  // on Android WebView as well as desktop browsers.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studioEnvironment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = studioEnvironment;
  pmrem.dispose();

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.minDistance = 9;
  controls.maxDistance = 19;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.target.set(0, 0.25, 0);

  scene.add(new THREE.HemisphereLight(0xfff0d8, 0x17131b, 1.35));
  const keyLight = new THREE.DirectionalLight(0xffdfad, 2.25);
  keyLight.position.set(-5, 10, 7);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(512, 512);
  keyLight.shadow.bias = -0.00018;
  keyLight.shadow.normalBias = 0.025;
  keyLight.shadow.radius = 5;
  keyLight.shadow.camera.left = -7;
  keyLight.shadow.camera.right = 7;
  keyLight.shadow.camera.top = 7;
  keyLight.shadow.camera.bottom = -7;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xc7d5e8, 0.95);
  fillLight.position.set(6, 7, 4);
  scene.add(fillLight);
  const rimLight = new THREE.PointLight(0xdce8f5, 14, 22);
  rimLight.position.set(5, 5, -5);
  scene.add(rimLight);
  const warmLight = new THREE.PointLight(0xf2c878, 16, 22);
  warmLight.position.set(-5, 3, 5);
  scene.add(warmLight);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: "#111216", roughness: 0.82, metalness: 0.04 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.34;
  floor.receiveShadow = true;
  scene.add(floor);

  const boardGroup = new THREE.Group();
  const piecesGroup = new THREE.Group();
  const targetsGroup = new THREE.Group();
  scene.add(boardGroup, piecesGroup, targetsGroup);

  // Procedural nacre and obsidian surface maps: subtle mineral veining prevents
  // the board from reading as flat, glossy plastic under the studio lights.
  function makeSurfaceTexture(kind) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    const pearlMode = kind === "pearl";
    const gradient = ctx.createRadialGradient(245, 190, 24, 520, 520, 760);
    if (pearlMode) {
      gradient.addColorStop(0, "#fffef9");
      gradient.addColorStop(.24, "#f5eddf");
      gradient.addColorStop(.55, "#ddd0bd");
      gradient.addColorStop(.82, "#c8c1b8");
      gradient.addColorStop(1, "#a9a6a2");
    } else {
      gradient.addColorStop(0, "#173c2b");
      gradient.addColorStop(.22, "#0b2118");
      gradient.addColorStop(.58, "#050f0b");
      gradient.addColorStop(1, "#010503");
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1024);

    // Real mineral character: flowing nacre ribbons on ivory, fractured
    // blue-silver veins on obsidian, plus fine grain to break the flat surface.
    ctx.save();
    for (let i = 0; i < 92; i++) {
      const x = (i * 173 + 61) % 1024;
      const y = (i * 293 + 37) % 1024;
      ctx.beginPath();
      if (pearlMode) {
        ctx.ellipse(x, y, 150 + (i % 7) * 27, 15 + (i % 5) * 8, (i % 11) * .19, 0, Math.PI * 2);
        const colors = ["rgba(255,255,255,.34)","rgba(179,159,190,.23)","rgba(205,179,132,.24)","rgba(134,174,181,.15)"];
        ctx.strokeStyle = colors[i % colors.length];
        ctx.lineWidth = 2 + (i % 3);
      } else {
        ctx.moveTo(x - 180, y - 70);
        ctx.lineTo(x - 48, y - 18);
        ctx.lineTo(x + 15, y + 5);
        ctx.lineTo(x + 76, y + 2);
        ctx.lineTo(x + 175, y + 84);
        const colors = ["rgba(220,190,135,.24)","rgba(190,190,205,.15)","rgba(255,255,255,.12)","rgba(125,105,85,.20)"];
        ctx.strokeStyle = colors[i % colors.length];
        ctx.lineWidth = 1.2 + (i % 3) * .7;
      }
      ctx.stroke();
    }
    ctx.restore();

    // Broad silky iridescence, strongest at grazing angles.
    if (pearlMode) {
      const sheen = ctx.createLinearGradient(0, 90, 1024, 900);
      sheen.addColorStop(0, "rgba(255,255,255,.24)");
      sheen.addColorStop(.28, "rgba(193,180,207,.08)");
      sheen.addColorStop(.52, "rgba(255,255,255,.20)");
      sheen.addColorStop(.76, "rgba(180,205,204,.07)");
      sheen.addColorStop(1, "rgba(255,255,255,.17)");
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, 1024, 1024);
    }

    // Deterministic micro-grain; fine enough to read as stone, not noise.
    let seed = pearlMode ? 7193 : 3817;
    for (let i = 0; i < 14500; i++) {
      seed = (seed * 16807) % 2147483647;
      const x = seed % 1024;
      seed = (seed * 16807) % 2147483647;
      const y = seed % 1024;
      const alpha = .025 + (seed % 30) / 1000;
      ctx.fillStyle = pearlMode ? `rgba(255,255,255,${alpha})` : `rgba(205,195,180,${alpha})`;
      ctx.fillRect(x, y, 1 + (seed % 2), 1 + (seed % 2));
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    texture.needsUpdate = true;
    return texture;
  }
  const pearlMap = makeSurfaceTexture("pearl");
  const obsidianMap = makeSurfaceTexture("obsidian");
  const wood = new THREE.MeshPhysicalMaterial({ color: "#a77b3d", roughness: 0.32, metalness: 0.72, clearcoat: 0.62, clearcoatRoughness: 0.18 });
  const lightSquare = new THREE.MeshPhysicalMaterial({
    color: "#fff2d9", map: pearlMap, roughness: 0.24, metalness: 0.03,
    clearcoat: 0.62, clearcoatRoughness: 0.18, iridescence: 0,
    iridescenceIOR: 1.42, iridescenceThicknessRange: [360, 820],
    specularIntensity: 0.8, envMapIntensity: 0
  });
  const darkSquare = new THREE.MeshPhysicalMaterial({
    color: "#17151b", map: obsidianMap, roughness: 0.25, metalness: 0.12,
    emissive: "#171018", emissiveIntensity: 0.055,
    clearcoat: 0.62, clearcoatRoughness: 0.18, envMapIntensity: 0
  });
  const highlight = new THREE.MeshStandardMaterial({ color: "#e8c77f", roughness: 0.1, metalness: 0.18, emissive: "#b77a24", emissiveIntensity: 0.48 });
  const lastHighlight = new THREE.MeshStandardMaterial({ color: "#d8b5a0", roughness: 0.34, metalness: 0.2, emissive: "#80522d", emissiveIntensity: 0.38 });
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

  // Layered white-gold / champagne-gold plinth with a visible polished bevel.
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(8.78, 0.16, 8.78),
    new THREE.MeshPhysicalMaterial({ color: "#d7b46c", metalness: 1, roughness: 0.16, clearcoat: 0.62, clearcoatRoughness: 0.1 })
  );
  edge.position.y = -0.25;
  edge.castShadow = true;
  boardGroup.add(edge);
  const lowerLip = new THREE.Mesh(
    new THREE.BoxGeometry(8.9, 0.075, 8.9),
    new THREE.MeshStandardMaterial({ color: "#72502b", metalness: 1, roughness: 0.2 })
  );
  lowerLip.position.y = -0.355;
  boardGroup.add(lowerLip);

  // Double gold inlay rails create a real jeweller's frame around the board.
  const frameMetal = new THREE.MeshPhysicalMaterial({
    color: "#f2d28c", metalness: 1, roughness: 0.13,
    clearcoat: 0.62, clearcoatRoughness: 0.18
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

  // Ceylon-blue sapphire cabochons are bezel-set into all four frame corners.
  // Opaque decorative stones avoid costly transmission rendering and milky highlights on mobile.
  const cornerSapphire = new THREE.MeshPhysicalMaterial({
    color: "#315c9a", metalness: .12, roughness: .2,
    ior: 1.76, clearcoat: 0.58, clearcoatRoughness: .08,
    envMapIntensity: 0, flatShading: true
  });
  const cornerDiamond = new THREE.MeshPhysicalMaterial({
    color: "#ffffff", roughness: .12, metalness: .04,
    ior: 1.8, clearcoat: 0.62, clearcoatRoughness: .08,
    flatShading: true
  });
  for (const x of [-4.02, 4.02]) for (const z of [-4.02, 4.02]) {
    const mount = new THREE.Mesh(new THREE.CylinderGeometry(.18,.21,.075,48), frameMetal);
    mount.position.set(x,.22,z);
    mount.castShadow = true;
    boardGroup.add(mount);
    const bezel = new THREE.Mesh(new THREE.CylinderGeometry(.115,.13,.045,48), new THREE.MeshStandardMaterial({color:"#8d672e",metalness:1,roughness:.12}));
    bezel.position.set(x,.278,z);
    boardGroup.add(bezel);
    const sapphire = new THREE.Mesh(new THREE.OctahedronGeometry(.105,1), cornerSapphire);
    sapphire.scale.set(.9,.72,.9);
    sapphire.position.set(x,.326,z);
    sapphire.castShadow = true;
    boardGroup.add(sapphire);
    for (const dx of [-.13,.13]) {
      const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(.026,0), cornerDiamond);
      diamond.position.set(x+dx,.29,z);
      boardGroup.add(diamond);
    }
  }
  // Small sapphire studs repeat along the gold rails like a fine jewellery setting.
  for (const z of [-4.12,4.12]) for (const x of [-2.75,-1.85,-.95,0,.95,1.85,2.75]) {
    const stud = new THREE.Mesh(new THREE.OctahedronGeometry(.038,1), cornerSapphire);
    stud.position.set(x,.19,z);
    stud.castShadow = true;
    boardGroup.add(stud);
  }
  for (const x of [-4.12,4.12]) for (const z of [-2.75,-1.85,-.95,0,.95,1.85,2.75]) {
    const stud = new THREE.Mesh(new THREE.OctahedronGeometry(.038,1), cornerSapphire);
    stud.position.set(x,.19,z);
    stud.castShadow = true;
    boardGroup.add(stud);
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

    // Pearl Royale armies: champagne-gold diamond regalia versus polished obsidian-black.
    // High-clearcoat jewel surfaces keep the silhouettes vivid on Android WebView.
    const crystalColor = isWhite ? "#f2c66d" : "#17171e";
    const crystalGlow = isWhite ? "#5a3510" : "#08080d";
    // Opaque, optically clear jewel finish: transmission is deliberately disabled
    // because mobile WebGL transmission can create a milky/plastic haze.
    // Faceted normals and restrained clearcoat create readable gemstone planes.
    const bodyMetal = new THREE.MeshPhysicalMaterial({
      color: isWhite ? "#d6a447" : "#171820",
      metalness: 0.08,
      roughness: 0.19,
      ior: 1.72,
      clearcoat: 0.52,
      clearcoatRoughness: 0.12,
      iridescence: 0.22,
      iridescenceIOR: 1.42,
      iridescenceThicknessRange: [280, 620],
      emissive: crystalGlow,
      emissiveIntensity: 0.035,
      envMapIntensity: 1.05,
      flatShading: true
    });
    const brightGold = new THREE.MeshStandardMaterial({ color: "#f2ca70", metalness: 1, roughness: 0.09 });
    const whiteGold = new THREE.MeshStandardMaterial({ color: "#fff5d9", metalness: 1, roughness: 0.055 });
    const shadowMetal = new THREE.MeshStandardMaterial({ color: "#6e5738", metalness: 0.88, roughness: 0.16 });
    const sapphire = new THREE.MeshPhysicalMaterial({
      color: isWhite ? "#e6bd67" : "#b8a06a",
      metalness: 0.06, roughness: 0.11,
      ior: 1.72, clearcoat: 0.62, clearcoatRoughness: 0.09,
      iridescence: 0.28, iridescenceIOR: 1.45,
      iridescenceThicknessRange: [300, 680],
      emissive: crystalGlow, emissiveIntensity: 0.025,
      envMapIntensity: 1.1
    });
    const diamond = new THREE.MeshPhysicalMaterial({
      color: "#fffdf5", metalness: 0.04, roughness: 0.085,
      ior: 1.8, clearcoat: 0.72, clearcoatRoughness: 0.08,
      envMapIntensity: 1.25
    });
    const pearl = new THREE.MeshPhysicalMaterial({
      color: isWhite ? "#ffe4a8" : "#77727d",
      metalness: 0.03, roughness: 0.065,
      clearcoat: 1, clearcoatRoughness: 0.025,
      iridescence: 0.35, iridescenceIOR: 1.48,
      iridescenceThicknessRange: [320, 780],
      envMapIntensity: 0
    });
    // UNITY AS ONE: both armies share champagne-gold and diamond regalia;
    // only the body finish changes: radiant gold for White, deep obsidian for Black.
    const trim = brightGold;

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
      addMesh(new THREE.IcosahedronGeometry(radius, 2), material, 0, y, 0);
    const addPave = (radius, y, count=16, gemMaterial=diamond, size=0.026) => {
      const geometry = new THREE.OctahedronGeometry(size,0);
      const stones = new THREE.InstancedMesh(geometry,gemMaterial,count);
      const dummy = new THREE.Object3D();
      for(let i=0;i<count;i++){
        const a=(i/count)*Math.PI*2;
        dummy.position.set(Math.cos(a)*radius,y,Math.sin(a)*radius);
        dummy.rotation.set(0,a,Math.PI/4);
        dummy.updateMatrix();
        stones.setMatrixAt(i,dummy.matrix);
      }
      stones.instanceMatrix.needsUpdate=true;
      stones.castShadow=true;
      group.add(stones);
    };
    const addSapphireBand = (radius,y,count=8) => {
      const stones = new THREE.InstancedMesh(new THREE.OctahedronGeometry(.035,0),sapphire,count);
      const dummy = new THREE.Object3D();
      for(let i=0;i<count;i++){
        const a=(i/count)*Math.PI*2;
        dummy.position.set(Math.cos(a)*radius,y,Math.sin(a)*radius);
        dummy.rotation.set(0,a,Math.PI/4);
        dummy.updateMatrix();
        stones.setMatrixAt(i,dummy.matrix);
      }
      stones.instanceMatrix.needsUpdate=true;
      stones.castShadow=true;
      group.add(stones);
    };

    // Sculpted royal turned body, rendered in precious gold and obsidian finishes.
    // Six deliberately different royal silhouettes. The shared design language is
    // faceted crystal, stepped gold bases and matching gem settings—not classic
    // turned Staunton profiles.
    const profiles = {
      p: [[0,.02],[.27,.02],[.31,.08],[.29,.13],[.20,.18],[.13,.28],[.12,.43],[.17,.51],[.13,.57],[.08,.60],[0,.60]],
      r: [[0,.02],[.30,.02],[.34,.08],[.31,.15],[.24,.20],[.23,.48],[.29,.53],[.29,.63],[.23,.63],[.23,.57],[.15,.57],[.15,.63],[.07,.63],[.07,.57],[0,.57]],
      n: [[0,.02],[.30,.02],[.34,.08],[.28,.15],[.19,.22],[.15,.34],[.20,.43],[.16,.52],[.10,.60],[.04,.66],[0,.66]],
      b: [[0,.02],[.30,.02],[.34,.08],[.27,.15],[.18,.24],[.13,.39],[.16,.52],[.11,.62],[.07,.71],[.04,.76],[0,.76]],
      q: [[0,.02],[.31,.02],[.35,.08],[.29,.15],[.20,.23],[.17,.40],[.23,.49],[.20,.58],[.15,.67],[.20,.73],[.13,.79],[0,.79]],
      k: [[0,.02],[.32,.02],[.36,.08],[.30,.15],[.21,.23],[.17,.42],[.23,.51],[.19,.61],[.14,.71],[.19,.77],[.13,.83],[0,.83]]
    };
    const profile = profiles[piece.type].map(([r,h])=>new THREE.Vector2(r,h));
    // Faceted body creates broad, legible polished planes at phone size.
    const turned = addMesh(new THREE.LatheGeometry(profile,10),bodyMetal);
    turned.geometry.computeVertexNormals();
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
    const collarY = piece.type === "p" ? 0.43 : piece.type === "n" ? 0.43 : 0.49;
    addRing(.19,.018,collarY,brightGold);
    addPave(.19,collarY,16,diamond,.021);
    addSapphireBand(.176,collarY+.035,8);

    if (piece.type === "k") {
      addCylinder(.13,.16,.07,.72,brightGold);
      addRing(.145,.018,.77,whiteGold);
      addPave(.145,.77,16,diamond,.022);
      addPearl(.145,.91);
      // A fine white-gold cross crowns the king's pearl.
      addMesh(new THREE.BoxGeometry(.055,.20,.055),whiteGold,0,1.15,0);
      addMesh(new THREE.BoxGeometry(.20,.055,.055),brightGold,0,1.18,0);
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
      const horse=addMesh(new THREE.ExtrudeGeometry(shape,{depth:.13,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:.035,bevelThickness:.035,curveSegments:8}),bodyMetal,0,.70,-.065);
      horse.rotation.y=Math.PI;
      addMesh(new THREE.OctahedronGeometry(.035,0),diamond,.045,.91,.015);
      addMesh(new THREE.ConeGeometry(.055,.14,8),brightGold,-.09,1.01,-.03);
      // Diamond-set mane follows the horse neck, making the knight silhouette
      // read as a jewelled chess horse rather than a flat token.
      for (let i=0;i<4;i++) addMesh(new THREE.OctahedronGeometry(.026,0),diamond,-.12+i*.055,.91-i*.075,-.005);
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
    group.scale.setScalar(1.18);
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
  let currentPositionKey = null;
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
    // A camera flip or selection change does not alter the chess position.
    // Keep the expensive 3D pieces alive until the actual position changes.
    disposeGroup(targetsGroup);
    for (const [name, tile] of squareMeshes) {
      tile.material = (Number(name[1]) + "abcdefgh".indexOf(name[0])) % 2 === 0 ? lightSquare : darkSquare;
      if (lastMove && (lastMove.from === name || lastMove.to === name)) tile.material = lastHighlight;
      if (selectedSquare === name) tile.material = highlight;
      if (checkedKing === name) tile.material = checkedSquare;
    }
    const positionKey = game.fen();
    if (currentPositionKey !== positionKey) {
      disposeGroup(piecesGroup);
      pieceMeshes.length = 0;
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
      currentPositionKey = positionKey;
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
