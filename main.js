const revealItems = document.querySelectorAll(".reveal");
const year = document.querySelector("#year");

if (year) {
  year.textContent = new Date().getFullYear();
}

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index * 70, 280)}ms`;
});

function revealOnScroll() {
  revealItems.forEach((item) => {
    if (item.classList.contains("is-visible")) return;

    const rect = item.getBoundingClientRect();
    if (rect.top < window.innerHeight - 90) {
      item.classList.add("is-visible");
    }
  });
}

revealOnScroll();
window.addEventListener("scroll", revealOnScroll, { passive: true });
window.addEventListener("resize", revealOnScroll);

const hero = document.querySelector(".hero");
const heroMedia = document.querySelector(".hero-media");
const heroCard = document.querySelector(".hero-card");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (hero && heroMedia && !reduceMotion) {
  let ticking = false;

  const updateHero = () => {
    const offset = Math.min(window.scrollY * 0.12, 70);
    heroMedia.style.transform = `scale(1.05) translate3d(0, ${offset}px, 0)`;
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(updateHero);
      ticking = true;
    }
  }, { passive: true });
}

if (hero && heroCard && !reduceMotion && window.matchMedia("(pointer: fine)").matches) {
  hero.addEventListener("pointermove", (event) => {
    const bounds = hero.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    heroCard.style.transform = `perspective(900px) rotateY(${x * 3}deg) rotateX(${y * -3}deg) translateY(-4px)`;
  });

  hero.addEventListener("pointerleave", () => {
    heroCard.style.transform = "";
  });
}

function initBeforeAfterReveal() {
  const sections = [...document.querySelectorAll("[data-before-after]")];
  if (!sections.length) return;

  let ticking = false;

  const updateReveal = () => {
    sections.forEach((section) => {
      const sticky = section.querySelector(".before-after-scroll__sticky");
      const after = section.querySelector(".before-after-scroll__after");
      const progressBar = section.querySelector("[data-before-after-progress]");
      if (!sticky || !after) return;

      const bounds = section.getBoundingClientRect();
      const stickyTop = parseFloat(getComputedStyle(sticky).top) || 0;
      const travel = Math.max(1, section.offsetHeight - sticky.offsetHeight);
      const progress = Math.min(1, Math.max(0, (stickyTop - bounds.top) / travel));

      const beforeProgress = Math.min(1, progress / 0.48);
      const afterProgress = Math.min(1, Math.max(0, (progress - 0.48) / 0.52));
      const easeOut = (value) => 1 - ((1 - value) ** 3);
      const before = section.querySelector(".before-after-scroll__before");

      if (before) {
        before.style.opacity = `${easeOut(beforeProgress)}`;
        before.style.transform = `translateX(${(1 - easeOut(beforeProgress)) * -38}px)`;
      }
      after.style.opacity = `${easeOut(afterProgress)}`;
      after.style.transform = `translateX(${(1 - easeOut(afterProgress)) * 38}px)`;
      if (progressBar) {
        progressBar.style.setProperty("--reveal-progress", `${progress * 100}%`);
      }
    });
    ticking = false;
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateReveal);
  };

  updateReveal();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate, { passive: true });
}

initBeforeAfterReveal();

const masonryCanvas = document.querySelector("#masonry-canvas");
const masonryStage = document.querySelector("#masonry-stage");
const masonryProgress = document.querySelector("#masonry-progress");

if (masonryCanvas && masonryStage) {
  initMasonryScene(masonryCanvas, masonryStage, masonryProgress).catch((error) => {
    masonryStage.classList.add("masonry-fallback");
    console.warn("De interactieve metselmuur kon niet laden.", error);
  });
}

async function initMasonryScene(canvas, stage, progressLabel) {
  const [THREE, gsapModule, scrollTriggerModule, rapierModule] = await Promise.all([
    import("https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js"),
    import("https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js"),
    import("https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js"),
    import("https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.14.0/+esm")
  ]);

  const gsap = gsapModule.gsap || gsapModule.default;
  const ScrollTrigger = scrollTriggerModule.ScrollTrigger || scrollTriggerModule.default;
  const RAPIER = rapierModule.default || rapierModule;

  if (!gsap || !ScrollTrigger || !RAPIER) {
    throw new Error("3D dependencies konden niet worden geïnitialiseerd.");
  }

  gsap.registerPlugin(ScrollTrigger);
  await RAPIER.init();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 2.25, 10.5);
  camera.lookAt(0, 2.05, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  canvas.replaceWith(renderer.domElement);
  renderer.domElement.id = "masonry-canvas";
  renderer.domElement.setAttribute("aria-label", "Interactieve 3D-muur die laag voor laag wordt gemetseld");

  const ambient = new THREE.HemisphereLight(0xfff7ee, 0x69574a, 2.4);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xfff4df, 4.2);
  keyLight.position.set(-4, 9, 7);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -10;
  keyLight.shadow.camera.right = 10;
  keyLight.shadow.camera.top = 9;
  keyLight.shadow.camera.bottom = -3;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xc8d9ff, 1.25);
  fillLight.position.set(5, 4, 4);
  scene.add(fillLight);

  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 128;
  const textureContext = textureCanvas.getContext("2d");
  textureContext.fillStyle = "#9d4d42";
  textureContext.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
  for (let i = 0; i < 2600; i += 1) {
    const shade = 105 + Math.floor(Math.random() * 65);
    textureContext.fillStyle = `rgb(${shade + 38}, ${Math.max(36, shade - 28)}, ${Math.max(30, shade - 40)})`;
    textureContext.globalAlpha = 0.18 + Math.random() * 0.32;
    textureContext.fillRect(Math.random() * 256, Math.random() * 128, 1 + Math.random() * 3, 1 + Math.random() * 2);
  }
  textureContext.globalAlpha = 1;
  const brickTexture = new THREE.CanvasTexture(textureCanvas);
  brickTexture.colorSpace = THREE.SRGBColorSpace;
  brickTexture.wrapS = THREE.RepeatWrapping;
  brickTexture.wrapT = THREE.RepeatWrapping;
  brickTexture.repeat.set(1.5, 1);

  const brickMaterial = new THREE.MeshStandardMaterial({
    map: brickTexture,
    color: 0xc26a5d,
    roughness: 0.88,
    metalness: 0.02
  });
  const mortarMaterial = new THREE.MeshStandardMaterial({ color: 0xeadfd2, roughness: 1 });
  const columns = window.innerWidth < 560 ? 9 : 18;
  const brickGeometry = new THREE.BoxGeometry(0.95, 0.5, 0.72);
  const brickWidth = 0.95;
  const brickHeight = 0.5;
  const rows = 5;
  const wallWidth = columns * brickWidth;
  const wallHeight = rows * brickHeight;

  const world = new RAPIER.World({ x: 0, y: -14, z: 0 });
  const floorBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.3, 0));
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(wallWidth / 2 + 1.2, 0.3, 2.6).setRestitution(0.08).setFriction(0.9),
    floorBody
  );

  const backBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 3.4, -0.55));
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(wallWidth / 2 + 1.2, 3.6, 0.15).setRestitution(0.04).setFriction(0.8),
    backBody
  );

  const sideGuideHeight = 2.7;
  const leftGuide = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(-(wallWidth / 2 + 0.24), sideGuideHeight, 0));
  const rightGuide = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(wallWidth / 2 + 0.24, sideGuideHeight, 0));
  const guideCollider = (body) => world.createCollider(
    RAPIER.ColliderDesc.cuboid(0.14, sideGuideHeight, 0.58).setRestitution(0.02).setFriction(0.95),
    body
  );
  guideCollider(leftGuide);
  guideCollider(rightGuide);

  const bricks = [];
  for (let row = 0; row < rows; row += 1) {
    const rowOffset = 0;
    const rowColumns = columns;
    for (let column = 0; column < rowColumns; column += 1) {
      const targetX = -wallWidth / 2 + brickWidth / 2 + column * brickWidth + rowOffset;
      const targetY = 0.25 + row * brickHeight;
      const targetZ = 0;
      const startY = 4.6 + row * 0.05;
      const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(targetX, startY, targetZ)
          .setRotation({ x: 0, y: 0, z: 0, w: 1 })
          .setGravityScale(0)
          .setLinearDamping(0.68)
          .setAngularDamping(0.84)
      );
      const collider = world.createCollider(
        RAPIER.ColliderDesc.cuboid(0.56, 0.25, 0.36).setRestitution(0.02).setFriction(0.95),
        body
      );
      const mesh = new THREE.Mesh(brickGeometry, brickMaterial.clone());
      mesh.visible = false;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.material.color.offsetHSL(0, (Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.1);
      scene.add(mesh);
      bricks.push({ body, collider, mesh, targetX, targetY, targetZ, row, column, released: false });
    }
  }

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), mortarMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  floor.position.z = 0.1;
  floor.receiveShadow = true;
  floor.visible = false;

  const wallShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(wallWidth + 0.6, wallHeight + 0.4),
    new THREE.MeshBasicMaterial({ color: 0x8b6f62, transparent: true, opacity: 0.06 })
  );
  wallShadow.position.set(0, wallHeight / 2, -0.48);
  wallShadow.visible = false;

  let lastTime = performance.now();
  let physicsAccumulator = 0;
  let rafId;

  const releaseBrick = (brick) => {
    if (brick.released) return;
    brick.released = true;
    brick.mesh.visible = true;
    const start = brick.body.translation();
    const progress = { value: 0 };
    brick.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    gsap.to(progress, {
      value: 1,
      duration: 0.62,
      ease: "power2.in",
      onUpdate: () => {
        const t = progress.value;
        brick.body.setNextKinematicTranslation({
          x: start.x + (brick.targetX - start.x) * t,
          y: start.y + (brick.targetY - start.y) * t,
          z: start.z + (brick.targetZ - start.z) * t
        });
        brick.body.setNextKinematicRotation({ x: 0, y: 0, z: 0, w: 1 });
      }
    });
  };

  const update = (now) => {
    const delta = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    physicsAccumulator += delta;
    let physicsSteps = 0;
    while (physicsAccumulator >= 1 / 60 && physicsSteps < 3) {
      world.timestep = 1 / 60;
      world.step();
      physicsAccumulator -= 1 / 60;
      physicsSteps += 1;
    }
    bricks.forEach(({ body, mesh }) => {
      const position = body.translation();
      const rotation = body.rotation();
      mesh.position.set(position.x, position.y, position.z);
      mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    });
    renderer.render(scene, camera);
    rafId = window.requestAnimationFrame(update);
  };

  const resize = () => {
    const bounds = stage.getBoundingClientRect();
    const width = Math.max(1, bounds.width);
    const height = Math.max(1, bounds.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = width < 560 ? 10.5 : 9.6;
    camera.updateProjectionMatrix();
  };

  const buildWall = () => {
    if (progressLabel) progressLabel.textContent = "100%";
    const rowDelay = window.innerWidth < 560 ? 0.2 : 0.23;
    const brickDelay = window.innerWidth < 560 ? 0.028 : 0.034;
    const releaseQueue = [...bricks].sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.column - b.column;
    });
    const rowPositions = new Map();
    releaseQueue.forEach((brick) => {
      const positionInRow = rowPositions.get(brick.row) || 0;
      rowPositions.set(brick.row, positionInRow + 1);
      gsap.delayedCall(brick.row * rowDelay + positionInRow * brickDelay, () => releaseBrick(brick));
    });
  };

  const trigger = ScrollTrigger.create({
    trigger: stage.closest(".masonry-scroll-space"),
    start: "top 72%",
    once: true,
    onEnter: buildWall
  });

  camera.position.y = wallHeight * 0.42;
  camera.lookAt(0, wallHeight * 0.42, 0);

  resize();
  window.addEventListener("resize", resize, { passive: true });
  rafId = window.requestAnimationFrame(update);

  window.addEventListener("pagehide", () => {
    window.cancelAnimationFrame(rafId);
    trigger.kill();
    renderer.dispose();
    brickGeometry.dispose();
    brickTexture.dispose();
  }, { once: true });
}
