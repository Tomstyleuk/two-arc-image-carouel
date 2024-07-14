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
            './1.webp',
            './2.webp',
            './3.webp',
            './4.webp',
        ];
        this.imageUrls2 = [
            './5.webp',
            './6.webp',
            './7.webp',
            './8.webp',
        ];
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
        this.curve1 = new THREE.CubicBezierCurve3(
            new THREE.Vector3(-1.5, 0, -3),
            new THREE.Vector3(-0.5, 0, -1),
            new THREE.Vector3(-0.5, 0, 1),
            new THREE.Vector3(-3.5, 0, 2)
        );

        this.curve2 = new THREE.CubicBezierCurve3(
            new THREE.Vector3(1.5, 0, -3),
            new THREE.Vector3(0.5, 0, -1),
            new THREE.Vector3(0.5, 0, 1),
            new THREE.Vector3(3.5, 0, 2)
        );

        const geometry = new THREE.PlaneGeometry(1.6, 1);
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
        window.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    onWheel(event) {
        this.t += event.deltaY * 0.0002;

        /**
         * loop images
         * this.t value is between 0 - 1
         */
        this.t = (this.t + 1) % 1;

        this.updateMeshPositions();
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.renderer.render(this.scene, this.camera);
    }
}
