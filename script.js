import * as THREE from './lib/three.module.js';

document.addEventListener('DOMContentLoaded', () => {
    const carousel = new Carousel();
    carousel.init();
});

class Carousel {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.curve1 = null;
        this.curve2 = null;
        this.meshes1 = [];
        this.meshes2 = [];
        this.t = 0;
        this.numMeshes = 4; // number of images for each lines
        this.meshSpacing = 1 / this.numMeshes;
        this.imageUrls1 = [
            './images/1.webp',
            './images/2.webp',
            './images/3.webp',
            './images/4.webp',
        ];
        this.imageUrls2 = [
            './images/5.webp',
            './images/6.webp',
            './images/7.webp',
            './images/8.webp',
        ];


        this.targetT = 0;
        this.lerpFactor = 0.05;
        this.scrollSpeed = 0.0002;
        this.mobileScrollSpeed = 0.0006;
        this.isScrolling = false;
        this.touchStartY = 0;
        this.lastFrameTime = 0;
        this.sensitivityThreshold = 0.00001;

        this.isMobile = this.detectMobile();
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    async init() {
        this.createScene();
        this.createCamera();
        this.createRenderer();
        this.addLights();
        await this.createCurves();
        this.createAxisHelpers();
        this.addEventListeners();
        this.animate();
    }

    createScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x000000, 1, 5);
    }

    createCamera() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 2);
    }

    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
    }

    addLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(0, 1, 0.5);
        this.scene.add(directionalLight);
    }

    async loadTexture(url) {
        return new Promise((resolve) => {
            new THREE.TextureLoader().load(url, resolve);
        });
    }

    async createCurves() {
        // Creating Arc
        this.curve1 = this.isMobile ? new THREE.CubicBezierCurve3(
            new THREE.Vector3(-1.0, 0, -3),
            new THREE.Vector3(-0.0, 0, -1),
            new THREE.Vector3(-0.0, 0, 1),
            new THREE.Vector3(-3.0, 0, 2)
        )
            : new THREE.CubicBezierCurve3(
                new THREE.Vector3(-1.5, 0, -3),
                new THREE.Vector3(-0.5, 0, -1),
                new THREE.Vector3(-0.5, 0, 1),
                new THREE.Vector3(-3.5, 0, 2)
            );

        this.curve2 = this.isMobile ? new THREE.CubicBezierCurve3(
            new THREE.Vector3(1.2, 0, -3),
            new THREE.Vector3(0.2, 0, -1),
            new THREE.Vector3(0.2, 0, 1),
            new THREE.Vector3(3.2, 0, 2)
        )
            : new THREE.CubicBezierCurve3(
                new THREE.Vector3(1.5, 0, -3),
                new THREE.Vector3(0.5, 0, -1),
                new THREE.Vector3(0.5, 0, 1),
                new THREE.Vector3(3.5, 0, 2)
            );


        const geometryWidth = this.isMobile ? 1 : 1.6;
        const geometryHeight = this.isMobile ? 0.5 : 1;
        const geometry = new THREE.PlaneGeometry(geometryWidth, geometryHeight);
        const textures1 = await Promise.all(this.imageUrls1.map(url => this.loadTexture(url)));
        const textures2 = await Promise.all(this.imageUrls2.map(url => this.loadTexture(url)));

        for (let i = 0; i < this.numMeshes; i++) {
            const material1 = new THREE.MeshStandardMaterial({
                map: textures1[i % textures1.length],
            });
            const material2 = new THREE.MeshStandardMaterial({
                map: textures2[i % textures2.length],
            });

            const mesh1 = new THREE.Mesh(geometry, material1);
            const mesh2 = new THREE.Mesh(geometry, material2);
            this.scene.add(mesh1);
            this.scene.add(mesh2);
            this.meshes1.push(mesh1);
            this.meshes2.push(mesh2);
        }

        this.updateMeshPositions();

        const curveGeometry1 = new THREE.BufferGeometry().setFromPoints(this.curve1.getPoints(50));
        const curveMaterial = new THREE.LineBasicMaterial({
            transparent: true,
            opacity: 0
        });
        const curveLine1 = new THREE.Line(curveGeometry1, curveMaterial);
        this.scene.add(curveLine1);

        const curveGeometry2 = new THREE.BufferGeometry().setFromPoints(this.curve2.getPoints(50));
        const curveLine2 = new THREE.Line(curveGeometry2, curveMaterial);
        this.scene.add(curveLine2);
    }

    updateMeshPositions() {
        const cameraPosition = this.camera.position;
        for (let i = 0; i < this.numMeshes; i++) {
            const t_offset = (this.t + i * this.meshSpacing) % 1;

            const position1 = this.curve1.getPoint(t_offset);
            const position2 = this.curve2.getPoint(t_offset);

            this.meshes1[i].position.copy(position1);
            this.meshes2[i].position.copy(position2);

            this.meshes1[i].lookAt(this.camera.position);
            this.meshes2[i].lookAt(this.camera.position);
        }
    }

    createAxisHelpers() {
        const axesHelper = new THREE.AxesHelper(5);
        // this.scene.add(axesHelper);
    }

    addEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        // @@@ Updated wheel event listener with passive option
        window.addEventListener('wheel', this.onWheel.bind(this), { passive: true });

        // @@@ Touch events for mobile
        window.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
        window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true });
        window.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: true });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    onWheel(event) {
        this.targetT -= event.deltaY * this.scrollSpeed; // Reversed direction for natural scrolling
        this.targetT = ((this.targetT % 1) + 1) % 1;  // targetT is always between 0 and 1
        this.startScrolling();
    }

    onTouchStart(event) {
        this.touchStartY = event.touches[0].clientY;
    }

    onTouchMove(event) {
        if (!this.touchStartY) return;
        const touchY = event.touches[0].clientY;
        const deltaY = this.touchStartY - touchY;
        this.targetT += deltaY * this.mobileScrollSpeed;
        this.targetT = ((this.targetT % 1) + 1) % 1;  // targetT is always between 0 and 1
        this.touchStartY = touchY;
        this.startScrolling();
    }

    startScrolling() {
        if (!this.isScrolling) {
            this.isScrolling = true;
            this.lastFrameTime = performance.now();
            this.updateCarousel();
        }
    }

    onTouchEnd() {
        this.touchStartY = null;
    }

    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    updateCarousel() {
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastFrameTime) / 16.67; // Normalize to 60fps
        this.lastFrameTime = currentTime;

        // Calculate the shortest distance between t and targetT considering the circular nature
        let diff = this.targetT - this.t;
        diff = ((diff % 1) + 1.5) % 1 - 0.5;  // Normalize difference to range -0.5 to 0.5

        // Apply lerp with delta time
        this.t += diff * this.lerpFactor * deltaTime;

        // t stays within [0, 1) range
        this.t = ((this.t % 1) + 1) % 1;

        this.updateMeshPositions();

        if (Math.abs(diff) > this.sensitivityThreshold) {
            requestAnimationFrame(this.updateCarousel.bind(this));
        } else {
            this.isScrolling = false;
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.renderer.render(this.scene, this.camera);
    }
}
