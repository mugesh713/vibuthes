import * as THREE from 'three';
import gl from './renderer.js';
import { trackProgress } from './util.js';
import { PRODUCTS } from '../brand.js';

/**
 * Spice Factory Isometric Fulfillment Conveyor
 * Features 6 Indian Spices on a continuous isometric looping track with
 * animated workers, glass jar filling station, dynamic dashboard metrics,
 * and a live spice IMAGE + NAME card that updates as each spice is filled.
 */

const SPICE_CONFIGS = [
  { name: 'Turmeric', color: 0xE8A317, hexStr: '#E8A317', icon: '🟡', shape: 'powder' },
  { name: 'Cumin', color: 0x6B3A2A, hexStr: '#6B3A2A', icon: '🟤', shape: 'seed' },
  { name: 'Coriander', color: 0xC4A882, hexStr: '#C4A882', icon: '⚪', shape: 'sphere' },
  { name: 'Red Chilli', color: 0xCC0000, hexStr: '#CC0000', icon: '🔴', shape: 'flake' },
  { name: 'Black Pepper', color: 0x1A1A1A, hexStr: '#1A1A1A', icon: '⚫', shape: 'sphere' },
  { name: 'Cardamom', color: 0x8FBC8F, hexStr: '#8FBC8F', icon: '🟢', shape: 'pod' }
];

export class Cube {
  constructor(el, track) {
    this.el = el;
    this.track = track || el;
    this.onProduct = null;
    this._current = -1;

    // 1. Scene & Isometric Orthographic Camera Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf4f5f8);

    const aspect = window.innerWidth / window.innerHeight;
    const d = 10;
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);

    // Classic Isometric View Angle
    this.camera.position.set(20, 20, 20);
    this.camera.lookAt(0, 0, 0);

    this.rig = new THREE.Group();
    this.scene.add(this.rig);

    this.conveyorItems = [];
    this.workers = [];
    this.particleSystems = [];

    this._buildLighting();
    this._buildEnvironment();
    this._buildDashboardUI();
    this._buildRawMaterialInput();
    this._buildConveyorSystem();
    this._buildFillingStation();
    this._buildProcessingPortal();
    this._buildWarehouseRacks();
    this._buildDeliveryTrucks();
    this._buildForklift();
    this._buildPalletJack();
    this._buildHandTruckAndBoxes();
    this._buildFloorRobot();
    this._buildDrone();
    this._buildTrafficCones();
    this._buildWorkers();
    this._buildSpiceParticles();
  }

  _buildLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
    dirLight.position.set(15, 25, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    const d = 15;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;

    const fillLight = new THREE.DirectionalLight(0xdbe6ff, 0.4);
    fillLight.position.set(-10, 15, -10);

    this.scene.add(ambient, dirLight, fillLight);
  }

  _buildEnvironment() {
    // Floor Base
    const floorGeo = new THREE.BoxGeometry(22, 0.4, 22);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.4 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.2;
    floor.receiveShadow = true;
    this.rig.add(floor);

    // Floor Markings / Grid Lanes
    const gridGeo = new THREE.PlaneGeometry(21, 21);
    const gridMat = new THREE.MeshBasicMaterial({ color: 0x2f343c, wireframe: true, transparent: true, opacity: 0.3 });
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = 0.01;
    this.rig.add(grid);
  }

  _buildDashboardUI() {
    // Background UI Backdrop Screen
    const screenGeo = new THREE.BoxGeometry(10, 6, 0.2);
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x181a1f, roughness: 0.2 });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(-5, 5, -8);
    screen.rotation.y = Math.PI / 6;
    this.rig.add(screen);

    // Orange Branding Banner
    const bannerGeo = new THREE.BoxGeometry(2.5, 5.8, 0.22);
    const bannerMat = new THREE.MeshStandardMaterial({ color: 0xff6b00, roughness: 0.3 });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(-8.6, 5, -5.9);
    banner.rotation.y = Math.PI / 6;
    this.rig.add(banner);

    // Chart Lines (Simulated Analytics Board)
    const lineGeo = new THREE.BufferGeometry();
    const points = [
      new THREE.Vector3(-8.5, 4, -7.1),
      new THREE.Vector3(-7, 4.5, -6.2),
      new THREE.Vector3(-5.5, 3.8, -5.3),
      new THREE.Vector3(-4, 5.8, -4.5),
      new THREE.Vector3(-2.5, 5.2, -3.6)
    ];
    lineGeo.setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00ff88, linewidth: 3 });
    const chartLine = new THREE.Line(lineGeo, lineMat);
    this.rig.add(chartLine);

    // --- Spice image + name card (canvas texture), cycles with product ---
    this._cardCanvas = document.createElement('canvas');
    this._cardCanvas.width = 512;
    this._cardCanvas.height = 300;
    this._cardCtx = this._cardCanvas.getContext('2d');
    this._cardTexture = new THREE.CanvasTexture(this._cardCanvas);

    const cardMat = new THREE.MeshBasicMaterial({ map: this._cardTexture, transparent: true });
    const cardGeo = new THREE.PlaneGeometry(3.9, 2.3);
    this.dashboardCard = new THREE.Mesh(cardGeo, cardMat);
    this.dashboardCard.position.set(-3.1, 5.7, -4.15);
    this.dashboardCard.rotation.y = Math.PI / 6;
    this.rig.add(this.dashboardCard);

    this._drawSpiceCard(SPICE_CONFIGS[0]);
  }

  _drawSpiceCard(config) {
    const ctx = this._cardCtx;
    const w = this._cardCanvas.width;
    const h = this._cardCanvas.height;
    ctx.clearRect(0, 0, w, h);

    // Card background
    ctx.fillStyle = '#20232a';
    roundRect(ctx, 0, 0, w, h, 24);
    ctx.fill();
    ctx.strokeStyle = '#ff6b00';
    ctx.lineWidth = 6;
    roundRect(ctx, 3, 3, w - 6, h - 6, 22);
    ctx.stroke();

    // Icon (swap for drawImage(bitmap,...) if using real photos)
    ctx.font = '120px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.icon, w / 2, 120);

    // Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px -apple-system, Segoe UI, Roboto, Arial, sans-serif';
    ctx.fillText(config.name, w / 2, 220);

    // Label
    ctx.fillStyle = '#9aa0aa';
    ctx.font = '22px -apple-system, Segoe UI, Roboto, Arial, sans-serif';
    ctx.fillText('NOW FILLING', w / 2, 265);

    this._cardTexture.needsUpdate = true;
  }

  // Raw, unprocessed spice sacks queued at the belt infeed — the
  // "raw product" waiting to enter the processing/filling pipeline.
  _buildRawMaterialInput() {
    const sackMat = new THREE.MeshStandardMaterial({ color: 0xc8a878, roughness: 0.95 });
    const tieMat = new THREE.MeshStandardMaterial({ color: 0x5b4632, roughness: 0.9 });
    this.rawSacks = new THREE.Group();

    const sackPositions = [
      [-7.2, 0.4, -1.6], [-6.9, 0.4, -2.4], [-7.6, 1.0, -2.0], [-7.1, 1.55, -2.0]
    ];
    sackPositions.forEach(([x, y, z], i) => {
      const sack = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), sackMat);
      sack.scale.set(1, 1.15, 1);
      sack.position.set(x, y, z);
      sack.rotation.z = (i % 2 === 0 ? 0.1 : -0.1);
      sack.castShadow = true;

      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 6, 10), tieMat);
      tie.position.set(x, y + 0.42, z);
      tie.rotation.x = Math.PI / 2;

      this.rawSacks.add(sack, tie);
    });
    this.rig.add(this.rawSacks);
  }

  _buildConveyorSystem() {
    this.conveyorGroup = new THREE.Group();

    // Snake Conveyor Path Framework
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x33373e, roughness: 0.5 });
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.8 });

    // Segment 1 (Main Infeed)
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 1.4), pathMat);
    s1.position.set(-1, 0.6, -2);
    s1.castShadow = true;
    s1.receiveShadow = true;

    const b1 = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.42, 1.1), beltMat);
    b1.position.set(-1, 0.6, -2);

    // Segment 2 (Turn & Outfeed)
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 8), pathMat);
    s2.position.set(4.3, 0.6, 1.3);
    s2.castShadow = true;

    const b2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.42, 7.8), beltMat);
    b2.position.set(4.3, 0.6, 1.3);

    this.conveyorGroup.add(s1, b1, s2, b2);
    this.rig.add(this.conveyorGroup);

    // Build Moving Spice Jars on Belt
    this.spiceJarsOnBelt = [];
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.9,
      opacity: 1,
      transparent: true,
      roughness: 0.1,
      ior: 1.4
    });

    for (let i = 0; i < 12; i++) {
      const jarContainer = new THREE.Group();

      // Glass Jar
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 16), glassMat);
      glass.position.y = 0.45;
      glass.castShadow = true;

      // Wooden Lid
      const lidMat = new THREE.MeshStandardMaterial({ color: 0x4a2a18, roughness: 0.6 });
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.15, 16), lidMat);
      lid.position.y = 0.95;

      // Spice Fill Powder Mesh — starts EMPTY/RAW (grey, flat) and fills
      // with real spice color as it passes through the processing portal.
      const config = SPICE_CONFIGS[i % SPICE_CONFIGS.length];
      const spiceMat = new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.9 });
      const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.7, 16), spiceMat);
      fill.scale.y = 0.06;
      fill.position.y = 0.05;

      // Small image+name label plate facing outward on the jar
      const label = this._makeJarLabel(config);
      label.position.set(0, 0.45, 0.36);
      label.visible = false; // revealed once the jar is actually filled

      jarContainer.add(glass, lid, fill, label);
      this.rig.add(jarContainer);

      this.spiceJarsOnBelt.push({
        mesh: jarContainer,
        fillMesh: fill,
        label,
        progress: i / 12,
        spiceIndex: i % SPICE_CONFIGS.length,
        fillLevel: 0,
        filled: false
      });
    }
  }

  _makeJarLabel(config) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fffaf0';
    roundRect(ctx, 2, 2, canvas.width - 4, canvas.height - 4, 10);
    ctx.fill();
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.icon, canvas.width / 2, 22);
    ctx.fillStyle = '#222';
    ctx.font = 'bold 13px -apple-system, Segoe UI, Roboto, Arial, sans-serif';
    ctx.fillText(config.name, canvas.width / 2, 48);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const geo = new THREE.PlaneGeometry(0.5, 0.25);
    return new THREE.Mesh(geo, mat);
  }

  _buildFillingStation() {
    // Automated Spice Dispenser Overhead Machine
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xff6b00, roughness: 0.4 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x88909d, metalness: 0.8, roughness: 0.2 });

    const gantry = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.5, 2.5), frameMat);
    gantry.position.set(-1, 2, -2);
    gantry.castShadow = true;

    const hopper = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.2, 16), metalMat);
    hopper.rotation.x = Math.PI;
    hopper.position.set(-1, 2.8, -2);

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.05, 0.6, 16), metalMat);
    nozzle.position.set(-1, 1.9, -2);

    this.rig.add(gantry, hopper, nozzle);
  }

  // Glowing "processing portal" the belt threads through at the corner turn —
  // visually marks the raw -> processed transition, like a furnace/scanner gate.
  _buildProcessingPortal() {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: 0.6, roughness: 0.4 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xff7a1a, emissive: 0xff5500, emissiveIntensity: 1.4, roughness: 0.3
    });

    const portal = new THREE.Group();

    const frameGeo = new THREE.TorusGeometry(1.15, 0.12, 10, 24);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(2.2, 1.1, -1.3);
    frame.rotation.y = Math.PI / 4;
    frame.castShadow = true;

    const glowPlane = new THREE.Mesh(new THREE.CircleGeometry(1.0, 24), glowMat);
    glowPlane.position.copy(frame.position);
    glowPlane.rotation.y = frame.rotation.y;

    const portalLight = new THREE.PointLight(0xff6a00, 1.5, 5);
    portalLight.position.set(2.2, 1.1, -1.3);

    portal.add(frame, glowPlane, portalLight);
    this.rig.add(portal);

    this.processingPortal = { frame, glowPlane, light: portalLight, glowMat };
  }

  _buildForklift() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff9d1f, roughness: 0.4 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.7 });
    const forkMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.7, roughness: 0.3 });

    const forklift = new THREE.Group();

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 1.2), bodyMat);
    body.position.set(0, 0.6, 0);
    body.castShadow = true;

    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 1.0), darkMat);
    cab.position.set(-0.2, 1.35, 0);

    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.0, 1.0), forkMat);
    mast.position.set(0.85, 1.1, 0);

    const forkL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.18), forkMat);
    forkL.position.set(1.3, 0.35, 0.3);
    const forkR = forkL.clone();
    forkR.position.z = -0.3;

    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.25, 14);
    [[-0.5, -0.55], [-0.5, 0.55], [0.5, -0.55], [0.5, 0.55]].forEach(([x, z]) => {
      const wheel = new THREE.Mesh(wheelGeo, darkMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.32, z);
      forklift.add(wheel);
    });

    forklift.add(body, cab, mast, forkL, forkR);
    forklift.position.set(7.6, 0, 3.2);
    forklift.rotation.y = -Math.PI / 3;
    this.rig.add(forklift);

    this.forklift = { group: forklift, forkL, forkR };
  }

  _buildPalletJack() {
    const jackMat = new THREE.MeshStandardMaterial({ color: 0x1a53ff, roughness: 0.5 });
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xbf8b5e, roughness: 0.8 });

    const group = new THREE.Group();

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.5), jackMat);
    handle.position.set(-0.7, 0.7, 0);
    handle.rotation.z = 0.5;

    const forks = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 0.55), jackMat);
    forks.position.set(0.2, 0.15, 0);

    const pallet = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 1.1), new THREE.MeshStandardMaterial({ color: 0xa9773f, roughness: 0.9 }));
    pallet.position.set(0.4, 0.3, 0);

    for (let i = 0; i < 3; i++) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), boxMat);
      box.position.set(0.2 + (i % 2) * 0.4, 0.55 + Math.floor(i / 2) * 0.42, (i % 2 === 0 ? -0.2 : 0.2));
      box.castShadow = true;
      group.add(box);
    }

    group.add(handle, forks, pallet);
    group.position.set(7.0, 0, -0.4);
    group.rotation.y = Math.PI / 5;
    this.rig.add(group);
  }

  _buildHandTruckAndBoxes() {
    const truckMat = new THREE.MeshStandardMaterial({ color: 0x2b7fff, roughness: 0.4 });
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xc79a63, roughness: 0.85 });
    const tapeMat = new THREE.MeshStandardMaterial({ color: 0x2f6fd6, roughness: 0.5 });

    const group = new THREE.Group();

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.55), truckMat);
    frame.rotation.z = 0.15;
    frame.position.set(0, 0.7, 0);

    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.55), truckMat);
    plate.position.set(0.25, 0.06, 0);

    const wheelGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.08, 12);
    [-0.2, 0.2].forEach((z) => {
      const wheel = new THREE.Mesh(wheelGeo, new THREE.MeshStandardMaterial({ color: 0x111111 }));
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(-0.15, 0.16, z);
      group.add(wheel);
    });

    group.add(frame, plate);

    // Stacked boxes on the dolly
    for (let i = 0; i < 3; i++) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.35, 0.45), boxMat);
      box.position.set(0.25, 0.28 + i * 0.37, 0);
      box.castShadow = true;
      const tape = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.47), tapeMat);
      tape.position.copy(box.position);
      group.add(box, tape);
    }

    group.position.set(-7.3, 0, 4.4);
    group.rotation.y = -Math.PI / 6;
    this.rig.add(group);

    // Loose scattered boxes nearby on the floor
    const scatter = [
      [-6.3, 5.0, 0.15], [-5.6, 4.6, -0.1], [-6.8, 5.6, 0.05], [-5.9, 5.3, 0.2]
    ];
    scatter.forEach(([x, z, rotY]) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.55), boxMat);
      box.position.set(x, 0.23, z);
      box.rotation.y = rotY;
      box.castShadow = true;
      this.rig.add(box);
    });
  }

  _buildFloorRobot() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff6b00, roughness: 0.35 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.6 });
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xc79a63, roughness: 0.85 });

    const robot = new THREE.Group();

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.35, 20), bodyMat);
    base.position.y = 0.2;
    base.castShadow = true;

    const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.15, 20), darkMat);
    dome.position.y = 0.42;

    const cargoBox = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.3, 0.45), boxMat);
    cargoBox.position.y = 0.65;
    cargoBox.castShadow = true;

    robot.add(base, dome, cargoBox);
    robot.position.set(-8.2, 0, 2.2);
    this.rig.add(robot);

    this.floorRobot = { group: robot, startX: -8.2, endX: -6.0, z: 2.2 };
  }

  _buildDrone() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff6b00, roughness: 0.35 });
    const armMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.6 });
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xc79a63, roughness: 0.85 });
    const cableMat = new THREE.MeshBasicMaterial({ color: 0x333333 });

    const drone = new THREE.Group();

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), bodyMat);
    body.castShadow = true;

    const armGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6);
    [0, Math.PI / 2].forEach((rot) => {
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = rot;
      drone.add(arm);
    });

    const propGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.02, 10);
    this.droneProps = [];
    [[0.45, 0.45], [0.45, -0.45], [-0.45, 0.45], [-0.45, -0.45]].forEach(([x, z]) => {
      const prop = new THREE.Mesh(propGeo, armMat);
      prop.position.set(x, 0.05, z);
      drone.add(prop);
      this.droneProps.push(prop);
    });

    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 6), cableMat);
    cable.position.y = -0.5;

    const parcel = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.32), boxMat);
    parcel.position.y = -0.78;
    parcel.castShadow = true;

    drone.add(body, cable, parcel);
    drone.position.set(-8.5, 3.2, 3.5);
    this.rig.add(drone);

    this.drone = { group: drone, center: new THREE.Vector3(-8.5, 3.2, 3.5), radius: 1.3 };
  }

  _buildTrafficCones() {
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xff6b00, roughness: 0.6 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });

    [[6.2, -0.6], [6.9, -1.3]].forEach(([x, z]) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 12), coneMat);
      cone.position.set(x, 0.25, z);
      cone.castShadow = true;

      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.08, 12), stripeMat);
      stripe.position.set(x, 0.3, z);

      this.rig.add(cone, stripe);
    });
  }

  _buildWarehouseRacks() {
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x3d434d, metalness: 0.5 });
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xbf8b5e, roughness: 0.8 });

    const rackGroup = new THREE.Group();

    // Racks Back Right
    for (let col = 0; col < 3; col++) {
      for (let level = 0; level < 3; level++) {
        // Shelf Beam
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 1.2), rackMat);
        shelf.position.set(col * 2.7 - 8, level * 1.5 + 0.5, 7);
        rackGroup.add(shelf);

        // Packed Spice Boxes on Racks
        if (Math.random() > 0.2) {
          const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), boxMat);
          box.position.set(col * 2.7 - 8, level * 1.5 + 0.85, 7);
          box.castShadow = true;
          rackGroup.add(box);
        }
      }
    }
    this.rig.add(rackGroup);
  }

  _buildDeliveryTrucks() {
    const truckGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const cabMat = new THREE.MeshStandardMaterial({ color: 0xff6b00, roughness: 0.4 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    // Truck 1
    const t1 = new THREE.Group();
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(4, 2.2, 1.8), bodyMat);
    cargo.position.set(0, 1.3, 0);
    cargo.castShadow = true;

    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 1.75), cabMat);
    cab.position.set(2.4, 1.0, 0);
    cab.castShadow = true;

    t1.add(cargo, cab);

    // Wheels
    [-1.2, 1.2].forEach(x => {
      [-0.95, 0.95].forEach(z => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16), wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(x, 0.4, z);
        t1.add(wheel);
      });
    });

    t1.position.set(5, 0, 8);
    t1.rotation.y = -Math.PI / 4;
    truckGroup.add(t1);

    this.rig.add(truckGroup);
  }

  _buildWorkers() {
    // Stylized Low-Poly Miniature Workers — fully rigged with arms/legs
    // so they can walk, bend to pick items up, carry them, and place
    // ("take and keep") them at a destination.
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a53ff, roughness: 0.5 }); // Blue uniforms
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xffa500, roughness: 0.4 });  // Safety helmets
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.6 });
    const limbMat = new THREE.MeshStandardMaterial({ color: 0x14224d, roughness: 0.5 });

    const createWorker = (start, end, pauseSeconds, legDuration) => {
      const worker = new THREE.Group();

      // Torso (raised slightly so legs have room beneath)
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.55, 8), bodyMat);
      torso.position.y = 0.85;
      torso.castShadow = true;

      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), skinMat);
      head.position.y = 1.28;

      // Hard Hat
      const hat = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), hatMat);
      hat.position.y = 1.33;

      // Legs (pivoted at hip so they can swing)
      const legGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.55, 8);
      const legL = new THREE.Group();
      const legLMesh = new THREE.Mesh(legGeo, limbMat);
      legLMesh.position.y = -0.28;
      legL.add(legLMesh);
      legL.position.set(-0.1, 0.58, 0);

      const legR = new THREE.Group();
      const legRMesh = new THREE.Mesh(legGeo, limbMat);
      legRMesh.position.y = -0.28;
      legR.add(legRMesh);
      legR.position.set(0.1, 0.58, 0);

      // Arms (pivoted at shoulder), right arm ends in a hand slot for carrying
      const armGeo = new THREE.CylinderGeometry(0.055, 0.05, 0.48, 8);
      const armL = new THREE.Group();
      const armLMesh = new THREE.Mesh(armGeo, bodyMat);
      armLMesh.position.y = -0.24;
      armL.add(armLMesh);
      armL.position.set(-0.24, 1.05, 0);

      const armR = new THREE.Group();
      const armRMesh = new THREE.Mesh(armGeo, bodyMat);
      armRMesh.position.y = -0.24;
      armR.add(armRMesh);
      armR.position.set(0.24, 1.05, 0);

      const handSlot = new THREE.Group();
      handSlot.position.y = -0.46;
      armR.add(handSlot);

      worker.add(torso, head, hat, legL, legR, armL, armR);
      worker.position.copy(start);

      this.rig.add(worker);

      // Carried item — a small jar the worker physically holds and places
      const carried = this._makeCarryItem(SPICE_CONFIGS[0]);
      carried.visible = false;
      handSlot.add(carried);

      const rec = {
        group: worker, legL, legR, armL, armR, handSlot, carried,
        start: start.clone(), end: end.clone(),
        state: 'atStart', // atStart -> toEnd -> atEnd -> toStart -> ...
        legT: 0,
        pauseTimer: pauseSeconds,
        legDuration,
        pauseSeconds,
        deposits: [],
        depositIndex: 0,
        tripIndex: 0
      };

      // Pre-build a small stack of deposit markers (hidden) at the end point
      for (let i = 0; i < 4; i++) {
        const marker = this._makeCarryItem(SPICE_CONFIGS[0]);
        marker.visible = false;
        marker.position.set(end.x + (i % 2) * 0.35 - 0.17, 0.15 + Math.floor(i / 2) * 0.3, end.z + (i % 2 === 0 ? -0.15 : 0.15));
        this.rig.add(marker);
        rec.deposits.push(marker);
      }

      this.workers.push(rec);
    };

    // Worker 1: fills at the processing/filling station -> stocks the rack
    createWorker(new THREE.Vector3(-1, 0, -0.9), new THREE.Vector3(-7.2, 0, 6.6), 0.7, 2.6);
    // Worker 2: takes packed jars off the belt end -> loads the truck
    createWorker(new THREE.Vector3(3.6, 0, 4.6), new THREE.Vector3(5.1, 0, 6.9), 0.6, 1.6);
    // Worker 3: ferries loose boxes from the scatter/dolly zone -> pallet jack area
    createWorker(new THREE.Vector3(-6.2, 0, 4.6), new THREE.Vector3(-1.4, 0, 0.9), 0.6, 2.8);
  }

  _makeCarryItem(config) {
    const group = new THREE.Group();
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, transmission: 0.85, opacity: 1, transparent: true, roughness: 0.15, ior: 1.4
    });
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.32, 12), glassMat);
    const fillMat = new THREE.MeshStandardMaterial({ color: config.color, roughness: 0.9 });
    const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.24, 12), fillMat);
    fill.position.y = -0.03;
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 12), new THREE.MeshStandardMaterial({ color: 0x4a2a18, roughness: 0.6 }));
    lid.position.y = 0.19;
    group.add(glass, fill, lid);
    group.userData.fillMat = fillMat;
    return group;
  }

  _buildSpiceParticles() {
    // Dynamic Particle Stream for the Dispenser Nozzle
    const count = 300;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = -1 + (Math.random() - 0.5) * 0.15;
      pos[i * 3 + 1] = 1.9 - Math.random() * 0.9;
      pos[i * 3 + 2] = -2 + (Math.random() - 0.5) * 0.15;

      colors[i * 3] = 0.91;
      colors[i * 3 + 1] = 0.64;
      colors[i * 3 + 2] = 0.09;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });

    this.dispenserParticles = new THREE.Points(geo, pMat);
    this.rig.add(this.dispenserParticles);
  }

  update(dt, t) {
    const p = trackProgress ? trackProgress(this.track) : 0;
    const n = SPICE_CONFIGS.length;
    const scaled = THREE.MathUtils.clamp(p, 0, 0.9999) * n;
    const idx = Math.min(n - 1, Math.floor(scaled));

    // 1. Animate Conveyor Belt Items Along Path (raw -> processed)
    this.spiceJarsOnBelt.forEach((item) => {
      const prevProgress = item.progress;
      item.progress = (item.progress + dt * 0.08) % 1.0;

      // Wrapped back to the start: reset to raw/unfilled state
      if (item.progress < prevProgress) {
        item.filled = false;
        item.fillLevel = 0;
        item.fillMesh.scale.y = 0.06;
        item.fillMesh.position.y = 0.05;
        item.fillMesh.material.color.set(0xd8d4cc);
        item.label.visible = false;
      }

      // Linear Path logic along conveyer legs
      if (item.progress < 0.6) {
        // Moving along Segment 1 (X Axis)
        const tSegment = item.progress / 0.6;
        item.mesh.position.x = THREE.MathUtils.lerp(-6, 4.3, tSegment);
        item.mesh.position.z = -2;
      } else {
        // Moving along Segment 2 (Z Axis)
        const tSegment = (item.progress - 0.6) / 0.4;
        item.mesh.position.x = 4.3;
        item.mesh.position.z = THREE.MathUtils.lerp(-2, 5.2, tSegment);
      }

      // Fill the jar as it passes the filling station / processing portal
      const nearStation = Math.abs(item.mesh.position.x - (-1)) < 0.6 && item.mesh.position.z < -1;
      if (nearStation && !item.filled) {
        item.fillLevel = Math.min(1, item.fillLevel + dt * 1.6);
        const targetColor = SPICE_CONFIGS[item.spiceIndex].color;
        item.fillMesh.scale.y = THREE.MathUtils.lerp(0.06, 1, item.fillLevel);
        item.fillMesh.position.y = THREE.MathUtils.lerp(0.05, 0.38, item.fillLevel);
        item.fillMesh.material.color.lerp(new THREE.Color(targetColor), dt * 3);
        if (item.fillLevel >= 1) {
          item.filled = true;
          item.label.visible = true;
        }
      }
    });

    // 1b. Pulse the processing portal glow
    if (this.processingPortal) {
      const pulse = 1.0 + Math.sin(t * 4) * 0.4;
      this.processingPortal.glowMat.emissiveIntensity = 1.4 * pulse;
      this.processingPortal.light.intensity = 1.2 * pulse;
    }

    // 1c. Forklift fork bob (loading motion)
    if (this.forklift) {
      const bob = 0.35 + Math.sin(t * 1.2) * 0.15;
      this.forklift.forkL.position.y = bob;
      this.forklift.forkR.position.y = bob;
    }

    // 1d. Autonomous floor robot shuttling back and forth
    if (this.floorRobot) {
      const r = this.floorRobot;
      const s = (Math.sin(t * 0.6) + 1) / 2;
      r.group.position.x = THREE.MathUtils.lerp(r.startX, r.endX, s);
      r.group.position.y = Math.abs(Math.sin(t * 6)) * 0.03;
      r.group.rotation.y = Math.cos(t * 0.6) < 0 ? Math.PI : 0;
    }

    // 1e. Delivery drone hovering/orbiting with parcel
    if (this.drone) {
      const d = this.drone;
      d.group.position.x = d.center.x + Math.cos(t * 0.5) * d.radius;
      d.group.position.z = d.center.z + Math.sin(t * 0.5) * d.radius;
      d.group.position.y = d.center.y + Math.sin(t * 2.5) * 0.15;
      d.group.rotation.y = -t * 0.5 + Math.PI / 2;
      this.droneProps.forEach((p) => { p.rotation.y += dt * 40; });
    }

    // 2. Animate Dispenser Particles Flowing into Jars
    const positions = this.dispenserParticles.geometry.attributes.position.array;
    const currentSpice = SPICE_CONFIGS[idx];
    const c = new THREE.Color(currentSpice.color);
    const colors = this.dispenserParticles.geometry.attributes.color.array;

    for (let i = 0; i < positions.length / 3; i++) {
      positions[i * 3 + 1] -= dt * 2.5;

      // Reset to top nozzle
      if (positions[i * 3 + 1] < 1.0) {
        positions[i * 3] = -1 + (Math.random() - 0.5) * 0.15;
        positions[i * 3 + 1] = 1.9;
        positions[i * 3 + 2] = -2 + (Math.random() - 0.5) * 0.15;
      }

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    this.dispenserParticles.geometry.attributes.position.needsUpdate = true;
    this.dispenserParticles.geometry.attributes.color.needsUpdate = true;

    // 3. Worker walk / take / carry / place ("keep") cycle
    this.workers.forEach((w) => {
      const walking = (w.state === 'toEnd' || w.state === 'toStart');

      if (w.state === 'toEnd' || w.state === 'toStart') {
        w.legT += dt / w.legDuration;
        const from = w.state === 'toEnd' ? w.start : w.end;
        const to = w.state === 'toEnd' ? w.end : w.start;
        const tt = Math.min(1, w.legT);
        w.group.position.lerpVectors(from, to, tt);

        const dir = new THREE.Vector3().subVectors(to, from);
        if (dir.lengthSq() > 0.0001) {
          w.group.rotation.y = Math.atan2(dir.x, dir.z);
        }

        if (w.legT >= 1) {
          if (w.state === 'toEnd') {
            w.state = 'atEnd';
            w.pauseTimer = w.pauseSeconds;
          } else {
            w.state = 'atStart';
            w.pauseTimer = w.pauseSeconds;
          }
          w.legT = 0;
        }
      } else {
        // atStart or atEnd — bend to pick up / place the item
        w.pauseTimer -= dt;
        const bendPhase = 1 - Math.abs(w.pauseTimer / w.pauseSeconds - 0.5) * 2; // 0..1..0
        const bend = bendPhase * 0.9;
        w.armL.rotation.x = bend;
        w.armR.rotation.x = bend;

        const midpoint = w.pauseSeconds / 2;
        if (w.state === 'atStart') {
          // Picking a fresh item up at the start of the trip
          if (w.pauseTimer <= midpoint && !w.carried.visible) {
            w.carried.visible = true;
            const spice = SPICE_CONFIGS[w.tripIndex % SPICE_CONFIGS.length];
            w.carried.userData.fillMat.color.set(spice.color);
          }
        } else {
          // Placing ("keeping") the item at the destination stack
          if (w.pauseTimer <= midpoint && w.carried.visible) {
            w.carried.visible = false;
            const marker = w.deposits[w.depositIndex % w.deposits.length];
            const spice = SPICE_CONFIGS[w.tripIndex % SPICE_CONFIGS.length];
            marker.userData.fillMat.color.set(spice.color);
            marker.visible = true;
            w.depositIndex++;
            w.tripIndex++;
          }
        }

        if (w.pauseTimer <= 0) {
          w.state = w.state === 'atStart' ? 'toEnd' : 'toStart';
          w.legT = 0;
          w.armL.rotation.x = 0;
          w.armR.rotation.x = 0;
        }
      }

      // Leg swing while walking, neutral while paused
      if (walking) {
        const swing = Math.sin(w.legT * Math.PI * 6) * 0.55;
        w.legL.rotation.x = swing;
        w.legR.rotation.x = -swing;
        w.armL.rotation.x = -swing * 0.6;
        // armR stays available for the carry pose set above when not walking;
        // while walking it swings gently too unless carrying
        if (!w.carried.visible) w.armR.rotation.x = swing * 0.6;
      } else {
        w.legL.rotation.x = 0;
        w.legR.rotation.x = 0;
      }

      w.group.position.y = walking ? Math.abs(Math.sin(w.legT * Math.PI * 6)) * 0.02 : 0;
    });

    // 4. Subtle Isometric Camera Breathing Motion
    const pointerX = (gl && gl.pointer) ? gl.pointer.x : 0;
    const pointerY = (gl && gl.pointer) ? gl.pointer.y : 0;
    this.rig.rotation.y = pointerX * 0.05 + Math.sin(t * 0.2) * 0.02;
    this.rig.rotation.x = pointerY * 0.03;

    // 5. Trigger product change event — updates dashboard card image + name
    if (idx !== this._current) {
      this._current = idx;
      this._drawSpiceCard(currentSpice);
      if (this.onProduct && PRODUCTS && PRODUCTS[idx]) {
        this.onProduct(idx, PRODUCTS[idx]);
      }
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createCube(el, track) {
  return gl.add(new Cube(el, track));
}