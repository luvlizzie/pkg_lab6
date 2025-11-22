class SolidKMultiCanvas {
    constructor() {
        console.log("SolidKMultiCanvas initializing...");

        this.ids = {
            main: 'mainView',
            xy: 'viewXY',
            xz: 'viewXZ',
            yz: 'viewYZ'
        };

        this.translation = [0, 0, 0];
        this.scaleValue = 1;
        this.rotation = [0, 0, 0];
        this.showProjections = true;

        this.lightDir = vec3.fromValues(0.5, 0.8, 0.6);
        vec3.normalize(this.lightDir, this.lightDir);
        this.ambient = 0.18;

        this.views = {}; 

        this.mesh = this.buildKMesh();

        this.initViews();

        this.setupUI();

        this.renderAll();
    }

   createBox(w, h, d, modelMat, color) {
        const hx = w / 2, hy = h / 2, hz = d / 2;
        const corners = [
            [-hx, -hy, -hz], 
            [ hx, -hy, -hz],
            [ hx,  hy, -hz], 
            [-hx,  hy, -hz], 
            [-hx, -hy,  hz], 
            [ hx, -hy,  hz], 
            [ hx,  hy,  hz], 
            [-hx,  hy,  hz], 
        ];

        const faces = [
            { idx: [0,1,2,3], normal: [0,0,-1] },
            { idx: [4,5,6,7], normal: [0,0,1] },
            { idx: [0,4,7,3], normal: [-1,0,0] },
            { idx: [1,5,6,2], normal: [1,0,0] },
            { idx: [3,2,6,7], normal: [0,1,0] },
            { idx: [0,1,5,4], normal: [0,-1,0] },
        ];

        const positions = [];
        const normals = [];
        const colors = [];
        const indices = [];

        let vertBase = 0;

        for (let f = 0; f < faces.length; f++) {
            const face = faces[f];
            const idx = face.idx;
            const quad = [ idx[0], idx[1], idx[2], idx[3] ];
            const triOrder = [ [quad[0], quad[1], quad[2]], [quad[0], quad[2], quad[3]] ];

            const normalMat3 = mat3.create();
            mat3.fromMat4(normalMat3, modelMat);
            mat3.invert(normalMat3, normalMat3);
            mat3.transpose(normalMat3, normalMat3);
            const faceNormal = vec3.fromValues(face.normal[0], face.normal[1], face.normal[2]);
            const faceNormalT = vec3.create();
            vec3.transformMat3(faceNormalT, faceNormal, normalMat3);
            vec3.normalize(faceNormalT, faceNormalT);

            for (let t = 0; t < 2; t++) {
                let tri = triOrder[t].slice(); 
                const triPos = [];
                for (let vi = 0; vi < 3; vi++) {
                    const c = corners[tri[vi]];
                    const v = vec3.fromValues(c[0], c[1], c[2]);
                    const v4 = vec3.create();
                    vec3.transformMat4(v4, v, modelMat);
                    triPos.push(v4);
                }
                const e1 = vec3.create(), e2 = vec3.create();
                vec3.subtract(e1, triPos[1], triPos[0]);
                vec3.subtract(e2, triPos[2], triPos[0]);
                const cross = vec3.create();
                vec3.cross(cross, e1, e2);
                const dot = vec3.dot(cross, faceNormalT);
                if (dot < 0) {
                    const tmp = tri[1];
                    tri[1] = tri[2];
                    tri[2] = tmp;
                }

                for (let vi = 0; vi < 3; vi++) {
                    const cidx = tri[vi];
                    const c = corners[cidx];
                    const v = vec3.fromValues(c[0], c[1], c[2]);
                    const v4 = vec3.create();
                    vec3.transformMat4(v4, v, modelMat);
                    positions.push(v4[0], v4[1], v4[2]);

                    normals.push(faceNormalT[0], faceNormalT[1], faceNormalT[2]);

                    colors.push(color[0], color[1], color[2], color[3]);

                    indices.push(vertBase);
                    vertBase++;
                }
            }
        }

        return { positions: new Float32Array(positions), normals: new Float32Array(normals),
                 colors: new Float32Array(colors), indices: new Uint16Array(indices) };
    }

    buildKMesh() {
        const thickness = 0.35; 
        const barWidth = 0.35; 
        const verticalHeight = 2.2;
        const armLength = 1.6;
        const armThickness = 0.28;

        let positions = [];
        let normals = [];
        let colors = [];
        let indices = [];
        let idxOffset = 0;

        const appendMesh = (mesh) => {
            for (let i = 0; i < mesh.positions.length; i++) positions.push(mesh.positions[i]);
            for (let i = 0; i < mesh.normals.length; i++) normals.push(mesh.normals[i]);
            for (let i = 0; i < mesh.colors.length; i++) colors.push(mesh.colors[i]);
            for (let i = 0; i < mesh.indices.length; i++) indices.push(mesh.indices[i] + idxOffset);
            idxOffset += mesh.positions.length / 3; 
        };

        const vbMat = mat4.create();
        mat4.translate(vbMat, vbMat, [-0.9, 0.0, 0.0]);
        const colMain = [0.9, 0.92, 0.95, 1.0];
        const boxV = this.createBox(barWidth, verticalHeight, thickness, vbMat, colMain);
        appendMesh(boxV);

        const upperCenter = [ (-0.9 + 0.6)/2, (0 + 0.7)/2, 0 ];
        const angleUpper = Math.atan2(0.7 - 0, 0.6 - (-0.9)); 
        const upperMat = mat4.create();
        mat4.translate(upperMat, upperMat, upperCenter);
        mat4.rotateZ(upperMat, upperMat, angleUpper);
        const boxU = this.createBox(armLength, armThickness, thickness, upperMat, [0.8,0.85,0.95,1.0]);
        appendMesh(boxU);

        const lowerCenter = [ (-0.9 + 0.6)/2, (0 + (-0.7))/2, 0 ];
        const angleLower = Math.atan2(-0.7 - 0, 0.6 - (-0.9));
        const lowerMat = mat4.create();
        mat4.translate(lowerMat, lowerMat, lowerCenter);
        mat4.rotateZ(lowerMat, lowerMat, angleLower);
        const boxL = this.createBox(armLength, armThickness, thickness, lowerMat, [0.8,0.85,0.95,1.0]);
        appendMesh(boxL);

        const posArray = new Float32Array(positions);
        const normArray = new Float32Array(normals);
        const colArray = new Float32Array(colors);
        const idxArray = new Uint16Array(indices);

        return {
            positions: posArray,
            normals: normArray,
            colors: colArray,
            indices: idxArray,
            vertexCount: posArray.length / 3,
            indexCount: idxArray.length
        };
    }

    initViews() {
        for (const key of Object.keys(this.ids)) {
            const id = this.ids[key];
            const canvas = document.getElementById(id);
            if (!canvas) {
                console.warn(`Canvas ${id} missing`);
                continue;
            }
            const gl = canvas.getContext('webgl', {antialias: true});
            if (!gl) {
                console.error(`WebGL not supported for ${id}`);
                continue;
            }
            const program = this.createLambertProgram(gl);

            const attribs = {
                position: gl.getAttribLocation(program, 'aPosition'),
                normal: gl.getAttribLocation(program, 'aNormal'),
                color: gl.getAttribLocation(program, 'aColor')
            };
            const uniforms = {
                projection: gl.getUniformLocation(program, 'uProjectionMatrix'),
                modelView: gl.getUniformLocation(program, 'uModelViewMatrix'),
                normalMat: gl.getUniformLocation(program, 'uNormalMatrix'),
                lightDir: gl.getUniformLocation(program, 'uLightDir'),
                ambient: gl.getUniformLocation(program, 'uAmbient')
            };

            const posBuf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
            gl.bufferData(gl.ARRAY_BUFFER, this.mesh.positions, gl.STATIC_DRAW);

            const normBuf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
            gl.bufferData(gl.ARRAY_BUFFER, this.mesh.normals, gl.STATIC_DRAW);

            const colBuf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
            gl.bufferData(gl.ARRAY_BUFFER, this.mesh.colors, gl.STATIC_DRAW);

            const idxBuf = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.mesh.indices, gl.STATIC_DRAW);

            const coordV = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, coordV);
            gl.bufferData(gl.ARRAY_BUFFER, this.getCoordinateSystemVertices(), gl.STATIC_DRAW);
            const coordC = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, coordC);
            gl.bufferData(gl.ARRAY_BUFFER, this.getCoordinateSystemColors(), gl.STATIC_DRAW);

            this.views[key] = {
                canvas, gl, program, attribs, uniforms,
                buffers: { posBuf, normBuf, colBuf, idxBuf, coordV, coordC },
                counts: { indices: this.mesh.indexCount, vertices: this.mesh.vertexCount }
            };

            gl.enable(gl.DEPTH_TEST);

            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.BACK);
            gl.frontFace(gl.CCW);

            gl.enable(gl.POLYGON_OFFSET_FILL);
            gl.polygonOffset(1.0, 1.0);

            gl.clearColor(0.08, 0.09, 0.12, 1.0);
        }
    }

    createLambertProgram(gl) {
        const vs = `
            attribute vec3 aPosition;
            attribute vec3 aNormal;
            attribute vec4 aColor;
            uniform mat4 uProjectionMatrix;
            uniform mat4 uModelViewMatrix;
            uniform mat3 uNormalMatrix;
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying vec4 vColor;
            void main(void) {
                vPosition = (uModelViewMatrix * vec4(aPosition, 1.0)).xyz;
                vNormal = normalize(uNormalMatrix * aNormal);
                vColor = aColor;
                gl_Position = uProjectionMatrix * vec4(vPosition, 1.0);
            }
        `;
        const fs = `
            precision mediump float;
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying vec4 vColor;
            uniform vec3 uLightDir;
            uniform float uAmbient;
            void main(void) {
                float diff = max(dot(normalize(vNormal), normalize(uLightDir)), 0.0);
                vec3 color = vColor.rgb * (uAmbient + diff * (1.0 - uAmbient));
                gl_FragColor = vec4(color, vColor.a);
            }
        `;

        const vshader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vshader, vs);
        gl.compileShader(vshader);
        if (!gl.getShaderParameter(vshader, gl.COMPILE_STATUS)) {
            console.error("Vertex shader error:", gl.getShaderInfoLog(vshader));
        }

        const fshader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fshader, fs);
        gl.compileShader(fshader);
        if (!gl.getShaderParameter(fshader, gl.COMPILE_STATUS)) {
            console.error("Fragment shader error:", gl.getShaderInfoLog(fshader));
        }

        const program = gl.createProgram();
        gl.attachShader(program, vshader);
        gl.attachShader(program, fshader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Program link error:", gl.getProgramInfoLog(program));
        }
        return program;
    }

    getCoordinateSystemVertices() {
        return new Float32Array([
            -2.0, 0.0, 0.0,   2.0, 0.0, 0.0,
             0.0,-2.0, 0.0,   0.0, 2.0, 0.0,
             0.0, 0.0,-2.0,   0.0, 0.0, 2.0,
        ]);
    }
    getCoordinateSystemColors() {
        return new Float32Array([
            0.8,0.2,0.2,1.0,  0.8,0.2,0.2,1.0,
            0.2,0.8,0.2,1.0,  0.2,0.8,0.2,1.0,
            0.2,0.2,0.8,1.0,  0.2,0.2,0.8,1.0,
        ]);
    }

    setupUI() {
        const setSlider = (id, axis, isRot=false) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', (e) => {
                const v = parseFloat(e.target.value);
                if (isRot) {
                    this.rotation[axis] = v * Math.PI / 180;
                    document.getElementById(id + 'Value').textContent = v + '°';
                } else if (id === 'scale') {
                    this.scaleValue = v;
                    document.getElementById('scaleValue').textContent = v.toFixed(2);
                } else {
                    this.translation[axis] = v;
                    document.getElementById(id + 'Value').textContent = v.toFixed(2);
                }
                this.renderAll();
            });
        };

        setSlider('translateX', 0);
        setSlider('translateY', 1);
        setSlider('translateZ', 2);
        setSlider('scale', 0);
        setSlider('rotateX', 0, true);
        setSlider('rotateY', 1, true);
        setSlider('rotateZ', 2, true);

        const toggleBtn = document.getElementById('toggleProjections');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.showProjections = !this.showProjections;
                toggleBtn.textContent = this.showProjections ? "Скрыть проекции" : "Показать проекции";
                this.renderAll();
            });
        }

        const resetBtn = document.getElementById('resetView');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.translation = [0,0,0];
                this.scaleValue = 1;
                this.rotation = [0,0,0];
                ['translateX','translateY','translateZ'].forEach(id => {
                    const el = document.getElementById(id); if (el) el.value = 0;
                    const val = document.getElementById(id + 'Value'); if (val) val.textContent = '0';
                });
                const s = document.getElementById('scale'); if (s) { s.value = 1; document.getElementById('scaleValue').textContent='1'; }
                ['rotateX','rotateY','rotateZ'].forEach(id => {
                    const el = document.getElementById(id); if (el) el.value = 0;
                    const val = document.getElementById(id + 'Value'); if (val) val.textContent = '0°';
                });
                this.renderAll();
            });
        }
    }

    buildModelMatrix() {
        const m = mat4.create();
        mat4.translate(m, m, this.translation);
        mat4.rotateX(m, m, this.rotation[0]);
        mat4.rotateY(m, m, this.rotation[1]);
        mat4.rotateZ(m, m, this.rotation[2]);
        mat4.scale(m, m, [this.scaleValue, this.scaleValue, this.scaleValue]);
        return m;
    }

    drawView(key, plane=null, tint=null) {
        const view = this.views[key];
        if (!view) return;
        const gl = view.gl;
        const canvas = view.canvas;

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const proj = mat4.create();
        if (plane === null) {
            mat4.perspective(proj, 45 * Math.PI/180, canvas.width / canvas.height, 0.1, 100.0);
        } else {
            mat4.ortho(proj, -2.5, 2.5, -2.5, 2.5, 0.1, 100.0);
        }

        const modelView = mat4.create();
        mat4.translate(modelView, modelView, [0, 0, -6]);

        if (plane === 'xy') {
            mat4.rotateX(modelView, modelView, -Math.PI/2);
        } else if (plane === 'yz') {
            mat4.rotateY(modelView, modelView, Math.PI/2);
        } else if (plane === 'xz') {
        }

        const modelMat = this.buildModelMatrix();
        mat4.multiply(modelView, modelView, modelMat);

        const normalMat = mat3.create();
        mat3.fromMat4(normalMat, modelView);
        mat3.invert(normalMat, normalMat);
        mat3.transpose(normalMat, normalMat);

        gl.useProgram(view.program);
        gl.uniformMatrix4fv(view.uniforms.projection, false, proj);
        gl.uniformMatrix4fv(view.uniforms.modelView, false, modelView);
        gl.uniformMatrix3fv(view.uniforms.normalMat, false, normalMat);

        const viewOnly = mat4.create();
        mat4.translate(viewOnly, viewOnly, [0,0,-6]);
        const lightDirView = vec3.create();
        const viewOnlyMat3 = mat3.create();
        mat3.fromMat4(viewOnlyMat3, viewOnly);
        vec3.transformMat3(lightDirView, this.lightDir, viewOnlyMat3);
        vec3.normalize(lightDirView, lightDirView);
        gl.uniform3fv(view.uniforms.lightDir, lightDirView);
        gl.uniform1f(view.uniforms.ambient, this.ambient);

        gl.bindBuffer(gl.ARRAY_BUFFER, view.buffers.coordV);
        gl.enableVertexAttribArray(view.attribs.position);
        gl.vertexAttribPointer(view.attribs.position, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, view.buffers.coordC);
        gl.enableVertexAttribArray(view.attribs.color);
        gl.vertexAttribPointer(view.attribs.color, 4, gl.FLOAT, false, 0, 0);

        const dummyNormals = new Float32Array(new Array(6*3).fill(0).map((v,i)=> (i%3===2?1:0)));
        const tmpNormBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tmpNormBuf);
        gl.bufferData(gl.ARRAY_BUFFER, dummyNormals, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(view.attribs.normal);
        gl.vertexAttribPointer(view.attribs.normal, 3, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.LINES, 0, 6);

        gl.bindBuffer(gl.ARRAY_BUFFER, view.buffers.posBuf);
        gl.enableVertexAttribArray(view.attribs.position);
        gl.vertexAttribPointer(view.attribs.position, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, view.buffers.normBuf);
        gl.enableVertexAttribArray(view.attribs.normal);
        gl.vertexAttribPointer(view.attribs.normal, 3, gl.FLOAT, false, 0, 0);

        if (plane !== null && tint) {
            const tinted = new Float32Array(this.mesh.vertexCount * 4);
            for (let i = 0; i < this.mesh.vertexCount; i++) {
                tinted[i*4+0] = tint[0];
                tinted[i*4+1] = tint[1];
                tinted[i*4+2] = tint[2];
                tinted[i*4+3] = tint[3];
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, view.buffers.colBuf);
            gl.bufferData(gl.ARRAY_BUFFER, tinted, gl.DYNAMIC_DRAW);
        } else {
            gl.bindBuffer(gl.ARRAY_BUFFER, view.buffers.colBuf);
            gl.bufferData(gl.ARRAY_BUFFER, this.mesh.colors, gl.STATIC_DRAW);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, view.buffers.colBuf);
        gl.enableVertexAttribArray(view.attribs.color);
        gl.vertexAttribPointer(view.attribs.color, 4, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, view.buffers.idxBuf);
        gl.drawElements(gl.TRIANGLES, view.counts.indices, gl.UNSIGNED_SHORT, 0);

        gl.deleteBuffer(tmpNormBuf);
    }

    renderAll() {
        this.drawView('main', null);

        if (this.showProjections) {
            this.drawView('xy', 'xy', [1,1,0,1.0]); 
            this.drawView('xz', 'xz', [1,0,1,1.0]); 
            this.drawView('yz', 'yz', [0,1,1,1.0]); 
        } else {
            ['xy','xz','yz'].forEach(k => {
                const v = this.views[k];
                if (!v) return;
                v.gl.clear(v.gl.COLOR_BUFFER_BIT | v.gl.DEPTH_BUFFER_BIT);
            });
        }

        const model = this.buildModelMatrix();
        this.updateMatrixOutput(model);
    }

    formatMatrix(matrix) {
        let s='';
        for (let r=0; r<4; r++) {
            s+='[';
            for (let c=0; c<4; c++) {
                s += matrix[c*4 + r].toFixed(3);
                if (c<3) s += ', ';
            }
            s+=']\n';
        }
        return s;
    }
    updateMatrixOutput(mat) {
        const el = document.getElementById('matrixOutput');
        if (el) el.textContent = this.formatMatrix(mat);
    }
}

window.addEventListener('load', () => {
    if (typeof mat4 === 'undefined' || typeof vec3 === 'undefined') {
        console.error("gl-matrix not found. Make sure lib/gl-matrix-min.js is loaded before script.js");
        return;
    }
    window.solidKApp = new SolidKMultiCanvas();
});
