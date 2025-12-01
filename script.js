const initialVertices = [
    [0, 1, 0.05],      
    [0.1, 1, 0.05],    
    [0.1, -1, 0.05],  
    [0, -1, 0.05],     
    
    [0.1, 0.0, 0.05], 
    [0.8, 1, 0.05],    
    [0.9, 1, 0.05],    
    [0.1, 0.0, 0.05],  
    
    [0.1, 0.0, 0.05], 
    [0.8, -1, 0.05],   
    [0.9, -1, 0.05],  
    [0.1, 0.0, 0.05], 
    
    [0, 1, -0.05],     
    [0.1, 1, -0.05],   
    [0.1, -1, -0.05],  
    [0, -1, -0.05],   
    [0.1, 0.2, -0.05], 
    [0.8, 1, -0.05],   
    [0.9, 1, -0.05],   
    [0.2, 0.2, -0.05], 
    [0.1, -0.2, -0.05],
    [0.8, -1, -0.05],  
    [0.9, -1, -0.05],  
    [0.2, -0.2, -0.05] 
];

const edges = [
    [0,1], [1,2], [2,3], [3,0],
    [4,5], [5,6], [6,7], [7,4],
    [8,9], [9,10], [10,11], [11,8],
    
    [12,13], [13,14], [14,15], [15,12],
    [16,17], [17,18], [18,19], [19,16],
    [20,21], [21,22], [22,23], [23,20],
    
    [0,12], [1,13], [2,14], [3,15],
    [4,16], [5,17], [6,18], [7,19],
    [8,20], [9,21], [10,22], [11,23],
    
    [1,4], [13,16],
    [2,8], [14,20]
];

let transformationMatrix = math.identity(4);
let currentVertices = [...initialVertices];
let isProjectionsCollapsed = false;
let originalCamera = { eye: { x: 1.5, y: 1.5, z: 0.8 } };

function initInterface() {
    const sliders = ['rotX', 'rotY', 'rotZ', 'transX', 'transY', 'transZ', 'scaleSlider'];
    
    sliders.forEach(sliderId => {
        const slider = document.getElementById(sliderId);
        const numberInput = document.getElementById(sliderId + 'Num');
        
        if (slider && numberInput) {
            slider.addEventListener('input', function() {
                numberInput.value = this.value;
                updateDisplayValues();
                applyAllTransformations();
            });
            
            numberInput.addEventListener('input', function() {
                if (sliderId.includes('rot')) {
                    let val = parseInt(this.value);
                    if (val < -180) val = -180;
                    if (val > 180) val = 180;
                    this.value = val;
                }
                slider.value = this.value;
                updateDisplayValues();
                applyAllTransformations();
            });
        }
    });
    
    updateDisplayValues();
    updateView();
    setupResponsiveListeners();
}

function setupResponsiveListeners() {
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            handleResize();
        }, 250);
    });
    
    window.addEventListener('orientationchange', function() {
        setTimeout(() => {
            handleResize();
        }, 500);
    });
}

function handleResize() {
    const isMobile = window.innerWidth <= 900;
    const isPortrait = window.innerHeight > window.innerWidth;
    
    if ((isMobile || isPortrait) && !isProjectionsCollapsed) {
        toggleProjections(true);
    }
    
    Plotly.Plots.resize('plot3d');
    updateProjections();
    
    console.log('Resized to:', window.innerWidth, 'x', window.innerHeight);
}

function updateDisplayValues() {
    document.getElementById('rotXVal').textContent = document.getElementById('rotX').value + '°';
    document.getElementById('rotYVal').textContent = document.getElementById('rotY').value + '°';
    document.getElementById('rotZVal').textContent = document.getElementById('rotZ').value + '°';
    document.getElementById('transXVal').textContent = document.getElementById('transX').value;
    document.getElementById('transYVal').textContent = document.getElementById('transY').value;
    document.getElementById('transZVal').textContent = document.getElementById('transZ').value;
    document.getElementById('scaleVal').textContent = document.getElementById('scaleSlider').value;
}

function toggleFullscreen() {
    const elem = document.documentElement;
    
    if (!document.fullscreenElement) {
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
        document.body.classList.add('fullscreen');
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        document.body.classList.remove('fullscreen');
    }
    
    setTimeout(() => {
        handleResize();
    }, 300);
}

function toggleProjections(forceCollapse = null) {
    const container = document.getElementById('projectionsContainer');
    const btn = document.getElementById('toggleProjBtn');
    
    if (forceCollapse !== null) {
        isProjectionsCollapsed = forceCollapse;
    } else {
        isProjectionsCollapsed = !isProjectionsCollapsed;
    }
    
    if (isProjectionsCollapsed) {
        container.classList.add('collapsed');
        btn.innerHTML = '<span class="icon">⬆</span> Развернуть';
    } else {
        container.classList.remove('collapsed');
        btn.innerHTML = '<span class="icon">⬇</span> Свернуть';
        setTimeout(() => {
            updateProjections();
        }, 300);
    }
}

function resetCamera() {
    Plotly.relayout('plot3d', {
        'scene.camera': originalCamera
    });
}

function copyMatrix() {
    const matrixText = document.getElementById('matrixOutput').textContent;
    navigator.clipboard.writeText(matrixText).then(() => {
        const btn = event.target.closest('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="icon">✓</span> Скопировано!';
        btn.style.background = 'var(--success)';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('Ошибка копирования:', err);
        alert('Не удалось скопировать матрицу');
    });
}

function getRotationMatrix(axis, angleDeg) {
    const angle = angleDeg * (Math.PI / 180);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    if (axis === 'x') {
        return math.matrix([
            [1, 0, 0, 0],
            [0, cos, -sin, 0],
            [0, sin, cos, 0],
            [0, 0, 0, 1]
        ]);
    } else if (axis === 'y') {
        return math.matrix([
            [cos, 0, sin, 0],
            [0, 1, 0, 0],
            [-sin, 0, cos, 0],
            [0, 0, 0, 1]
        ]);
    } else { // z
        return math.matrix([
            [cos, -sin, 0, 0],
            [sin, cos, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ]);
    }
}

function getTranslationMatrix(dx, dy, dz) {
    return math.matrix([
        [1, 0, 0, dx],
        [0, 1, 0, dy],
        [0, 0, 1, dz],
        [0, 0, 0, 1]
    ]);
}

function getScaleMatrix(s) {
    return math.matrix([
        [s, 0, 0, 0],
        [0, s, 0, 0],
        [0, 0, s, 0],
        [0, 0, 0, 1]
    ]);
}

function applyAllTransformations() {
    const rx = parseFloat(document.getElementById('rotX').value);
    const ry = parseFloat(document.getElementById('rotY').value);
    const rz = parseFloat(document.getElementById('rotZ').value);
    const tx = parseFloat(document.getElementById('transX').value);
    const ty = parseFloat(document.getElementById('transY').value);
    const tz = parseFloat(document.getElementById('transZ').value);
    const scale = parseFloat(document.getElementById('scaleSlider').value);
    
    let matrix = math.identity(4);
    
    matrix = math.multiply(getScaleMatrix(scale), matrix);
    
    matrix = math.multiply(getRotationMatrix('z', rz), matrix);
    matrix = math.multiply(getRotationMatrix('y', ry), matrix);
    matrix = math.multiply(getRotationMatrix('x', rx), matrix);
    
    matrix = math.multiply(getTranslationMatrix(tx, ty, tz), matrix);
    
    transformationMatrix = matrix;
    updateView();
}

function applyScale() {
    applyAllTransformations();
}

function resetView() {
    document.getElementById('rotX').value = 0;
    document.getElementById('rotY').value = 0;
    document.getElementById('rotZ').value = 0;
    document.getElementById('transX').value = 0;
    document.getElementById('transY').value = 0;
    document.getElementById('transZ').value = 0;
    document.getElementById('scaleSlider').value = 1;
    
    document.getElementById('rotXNum').value = 0;
    document.getElementById('rotYNum').value = 0;
    document.getElementById('rotZNum').value = 0;
    document.getElementById('transXNum').value = 0;
    document.getElementById('transYNum').value = 0;
    document.getElementById('transZNum').value = 0;
    document.getElementById('scaleNum').value = 1;
    
    updateDisplayValues();
    transformationMatrix = math.identity(4);
    updateView();
    resetCamera();
}

function updateView() {
    currentVertices = getTransformedVertices();
    
    update3DPlot();
    
    if (!isProjectionsCollapsed) {
        updateProjections();
    }
    
    updateMatrix();
}

function getTransformedVertices() {
    const verticesHomogeneous = initialVertices.map(v => [...v, 1]);
    const matrixT = math.transpose(transformationMatrix);
    const transformed = math.multiply(verticesHomogeneous, matrixT);
    
    if (transformed.toArray) {
        return transformed.toArray().map(v => [v[0], v[1], v[2]]);
    } else {
        return transformed.map(v => [v[0], v[1], v[2]]);
    }
}

function update3DPlot() {
    const linesX = [], linesY = [], linesZ = [];
    edges.forEach(e => {
        const p1 = currentVertices[e[0]];
        const p2 = currentVertices[e[1]];
        linesX.push(p1[0], p2[0], null);
        linesY.push(p1[1], p2[1], null);
        linesZ.push(p1[2], p2[2], null);
    });

    const verticesX = currentVertices.map(v => v[0]);
    const verticesY = currentVertices.map(v => v[1]);
    const verticesZ = currentVertices.map(v => v[2]);

    const isSmallScreen = window.innerWidth <= 900 || window.innerHeight <= 600;
    const plotHeight = isSmallScreen ? 350 : 500;
    
    Plotly.react('plot3d', [
        {
            type: 'scatter3d',
            mode: 'lines',
            x: linesX,
            y: linesY,
            z: linesZ,
            line: { width: 4, color: '#3498DB' },
            opacity: 0.8,
            name: 'Ребра'
        },
        {
            type: 'scatter3d',
            mode: 'markers',
            x: verticesX,
            y: verticesY,
            z: verticesZ,
            marker: { size: 4, color: '#E74C3C' },
            name: 'Вершины'
        }
    ], {
        paper_bgcolor: '#ECF0F1',
        plot_bgcolor: '#ECF0F1',
        margin: { l: 0, r: 0, t: 0, b: 0 },
        showlegend: false,
        scene: {
            aspectmode: 'data',
            xaxis: { 
                title: 'X', 
                gridcolor: '#BDC3C7', 
                zerolinecolor: '#7F8C8D',
                range: [-1.5, 1.5]
            },
            yaxis: { 
                title: 'Y', 
                gridcolor: '#BDC3C7', 
                zerolinecolor: '#7F8C8D',
                range: [-1.5, 1.5]
            },
            zaxis: { 
                title: 'Z', 
                gridcolor: '#BDC3C7', 
                zerolinecolor: '#7F8C8D',
                range: [-0.5, 0.5]
            },
            camera: originalCamera
        },
        height: plotHeight
    });
}

function updateProjections() {
    const isSmallScreen = window.innerWidth <= 900;
    const isVerySmall = window.innerWidth <= 600;
    const projHeight = isVerySmall ? 180 : isSmallScreen ? 220 : 250;
    
    createProjection('projXY', 0, 1, 'X', 'Y', projHeight);
    
    createProjection('projXZ', 0, 2, 'X', 'Z', projHeight);
    
    createProjection('projYZ', 1, 2, 'Y', 'Z', projHeight);
}

function createProjection(divId, axis1, axis2, axis1Name, axis2Name, height) {
    const linesX = [], linesY = [];
    
    edges.forEach(e => {
        const p1 = currentVertices[e[0]];
        const p2 = currentVertices[e[1]];
        linesX.push(p1[axis1], p2[axis1], null);
        linesY.push(p1[axis2], p2[axis2], null);
    });
    
    const pointsX = currentVertices.map(v => v[axis1]);
    const pointsY = currentVertices.map(v => v[axis2]);
    
    Plotly.react(divId, [
        {
            type: 'scatter',
            mode: 'lines',
            x: linesX,
            y: linesY,
            line: { color: '#3498DB', width: 2 },
            opacity: 0.7,
            showlegend: false
        },
        {
            type: 'scatter',
            mode: 'markers',
            x: pointsX,
            y: pointsY,
            marker: { color: '#E74C3C', size: 4 },
            showlegend: false
        }
    ], {
        margin: { l: 40, r: 20, t: 30, b: 40 },
        xaxis: { 
            title: axis1Name, 
            gridcolor: '#BDC3C7', 
            zerolinecolor: '#7F8C8D',
            range: axis2 === 2 ? [-0.5, 0.5] : [-1.5, 1.5]
        },
        yaxis: { 
            title: axis2Name, 
            gridcolor: '#BDC3C7', 
            zerolinecolor: '#7F8C8D',
            range: axis1 === 2 ? [-0.5, 0.5] : [-1.5, 1.5]
        },
        paper_bgcolor: '#FFFFFF',
        plot_bgcolor: '#FFFFFF',
        height: height
    });
}

function updateMatrix() {
    const matrix = transformationMatrix;
    let matrixStr = '';
    
    if (matrix.toArray) {
        const arr = matrix.toArray();
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                matrixStr += arr[i][j].toFixed(3).padStart(8, ' ');
            }
            matrixStr += '\n';
        }
    } else {
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                matrixStr += matrix[i][j].toFixed(3).padStart(8, ' ');
            }
            matrixStr += '\n';
        }
    }
    
    document.getElementById('matrixOutput').textContent = matrixStr;
}

window.onload = function() {
    try {
        initInterface();
        
        if (window.innerWidth <= 900) {
            toggleProjections(true);
        }
        
        console.log('3D Буква K успешно загружена! Размер экрана:', window.innerWidth, 'x', window.innerHeight);
    } catch (error) {
        console.error('Ошибка при загрузке:', error);
        alert('Ошибка: ' + error.message);
    }
};

document.addEventListener('fullscreenchange', handleResize);
document.addEventListener('webkitfullscreenchange', handleResize);
document.addEventListener('mozfullscreenchange', handleResize);
document.addEventListener('MSFullscreenChange', handleResize);
