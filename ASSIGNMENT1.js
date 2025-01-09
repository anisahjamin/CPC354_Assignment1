//-----------------------------------------------------------------------------------/
// Variable Declaration
//-----------------------------------------------------------------------------------/

// Common variables
var canvas, gl, program;
var posBuffer, colBuffer, vPosition, vColor;
var modelViewMatrixLoc, projectionMatrixLoc;
var modelViewMatrix, projectionMatrix;
var backgroundMusic;
// Variables referencing HTML elements
// theta = [x, y, z]
var subdivSlider, subdivText, speedSlider, speedText, iterSlider, iterText, startBtn, speed1Btn, speed2Btn, speed3Btn;
var colorPicker,colorPicker1,colorPicker2,colorPicker3;
var theta = [0, 0, 0], move = [0, 0, 0];
var subdivNum = 1, iterNum = 1, scaleNum = 1 , scaleSize = 1, scaleMin = 0.5, scaleMax = 4, scaleSign = 1;;
var iterTemp = 0, animSeq = 0, animFrame = 0, animFlag = false;
var speedFactor = 1.0 ;
var sizeMenu;
// Variables for the 3D Sierpinski gasket

var points = [], colors = [];

// Vertices for the 3D Sierpinski gasket (X-axis, Y-axis, Z-axis, W)
// For 3D, you need to set the z-axis to create the perception of depth
var vertices = [
    vec4( 0.0000,  0.0000, -1.0000, 1.0000),
    vec4( 0.0000,  0.9428,  0.3333, 1.0000),
    vec4(-0.8165, -0.4714,  0.3333, 1.0000),
    vec4( 0.8165, -0.4714,  0.3333, 1.0000)
];

// Different colors for a tetrahedron (RGBA)
var baseColors = [
    vec4(1.0, 0.2, 0.4, 1.0),
    vec4(0.0, 0.9, 1.0, 1.0),
    vec4(0.2, 0.2, 0.5, 1.0),
    vec4(0.0, 0.0, 0.0, 1.0)
];

//-----------------------------------------------------------------------------------/
// WebGL Utilities
//-----------------------------------------------------------------------------------/

// Execute the init() function when the web page has fully loaded
window.onload = function init()
{
    // Primitive (geometric shape) initialization
    divideTetra(vertices[0], vertices[1], vertices[2], vertices[3], subdivNum);

    // WebGL setups
    getUIElement();
    configWebGL();
    render();
}

// Retrieve all elements from HTML and store in the corresponding variables
function getUIElement()
{
    canvas = document.getElementById("gl-canvas");
    subdivSlider = document.getElementById("subdiv-slider");
    subdivText = document.getElementById("subdiv-text");
    speedSlider = document.getElementById("speed-slider");
    sizeMenu = document.getElementById("size-menu"); // New size menu
    speedText = document.getElementById("speed-text");
    iterSlider = document.getElementById("iter-slider");
    iterText = document.getElementById("iter-text");
    // shadowToggle = document.getElementById('shadow-toggle');
    startBtn = document.getElementById("start-btn");
    colorPicker = document.getElementById("color-picker");
    colorPicker1 = document.getElementById("color-picker1");
    colorPicker2 = document.getElementById("color-picker2");
    colorPicker3 = document.getElementById("color-picker3");
    backgroundMusic = document.getElementById("background-music");

    subdivSlider.onchange = function(event) 
	{
		subdivNum = event.target.value;
		subdivText.innerHTML = subdivNum;
        recompute();
    };

    iterSlider.onchange = function(event) 
	{
		iterNum = event.target.value;
		iterText.innerHTML = iterNum;
        recompute();
    };

    speedSlider.onchange = function(event) 
    {
        speedFactor = parseFloat(event.target.value);
        speedText.innerHTML = speedFactor;
    };

    // Event listener for size menu 
    sizeMenu.onchange = function(event) {
        
        sizeValue = parseInt(event.target.value);
        setInitialSize(sizeValue);
    };
                
    startBtn.onclick = function()
	{
		animFlag = true;
        disableUI();
        resetValue();
        backgroundMusic.play();
        animUpdate();
	};
    colorPicker.addEventListener("input", function(event) {
        var colorValue = event.target.value;
        baseColors[0] = hexToVec4(colorValue);
        updateGasket();
        render();
    });

    colorPicker1.addEventListener("input", function(event) {
        var colorValue = event.target.value;
        baseColors[1] = hexToVec4(colorValue);
        updateGasket();
        render();
    });

    colorPicker2.addEventListener("input", function(event) {
        var colorValue = event.target.value;
        baseColors[2] = hexToVec4(colorValue);
        updateGasket();
        render();
    });

    colorPicker3.addEventListener("input", function(event) {
        var colorValue = event.target.value;
        baseColors[3] = hexToVec4(colorValue);
        updateGasket();
        render();
    });
    

    //     // Add event listener to the checkbox
    // shadowToggle.addEventListener('change', () => {
    //     if (shadowToggle.checked) {
    //         // Apply shadow when the checkbox is checked
    //         canvas.style.boxShadow = '10px 10px 30px rgba(0, 0, 0, 0.5)';
    //         console.log('Shadow effect enabled');
    //     } else {
    //         // Remove shadow when unchecked
    //         canvas.style.boxShadow = 'none';
    //         console.log('Shadow effect disabled');
    //     }
    // });

}

// Configure WebGL Settings
function configWebGL()
{
    // Initialize the WebGL context
    gl = WebGLUtils.setupWebGL(canvas);
    
    if(!gl)
    {
        alert("WebGL isn't available");
    }

    // Set the viewport and clear the color
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // Enable hidden-surface removal
    gl.enable(gl.DEPTH_TEST);

    // Compile the vertex and fragment shaders and link to WebGL
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Create buffers and link them to the corresponding attribute variables in vertex and fragment shaders
    // Buffer for positions
    posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Buffer for colors
    colBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    
    vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    // Get the location of the uniform variables within a compiled shader program
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
}
function updateGasket() {
    points = [];
    colors = [];
    divideTetra(vertices[0], vertices[1], vertices[2], vertices[3], subdivNum);

    // Update position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Update color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
}


// Render the graphics for viewing
function render()
{
    // Cancel the animation frame before performing any graphic rendering
    if(animFlag)
    {
        animFlag = false;
        window.cancelAnimationFrame(animFrame);
    }
    
    // Clear the color buffer and the depth buffer before rendering a new frame
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Pass a 4x4 projection matrix from JavaScript to the GPU for use in shader
    // ortho(left, right, bottom, top, near, far)
    projectionMatrix = ortho(-4, 4, -2.25, 2.25, 2, -2);
	gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    // Pass a 4x4 model view matrix from JavaScript to the GPU for use in shader
    // Use translation to readjust the position of the primitive (if needed)
    modelViewMatrix = mat4();
    modelViewMatrix = mult(modelViewMatrix, scale(scaleSize, scaleSize, scaleSize)); // Apply scale
    modelViewMatrix = mult(modelViewMatrix, translate(0, -0.2357, 0));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    // Draw the primitive / geometric shape
    gl.drawArrays(gl.TRIANGLES, 0, points.length);
}

// Recompute points and colors, followed by reconfiguring WebGL for rendering
function recompute()
{
    // Reset points and colors for render update
    points = [];
	colors = [];
    scaleSign = 1;
    
    const scaledVertices = vertices.map(vertex => vertex.map(coord => coord * scaleSize));
    
    // Call divideTetra with scaled vertices
    divideTetra(scaledVertices[0], scaledVertices[1], scaledVertices[2], scaledVertices[3], subdivNum);

    configWebGL();
    render();
}

// Update the animation frame
function animUpdate()
{
    // Stop the animation frame and return upon completing all sequences
    if(iterTemp == iterNum)
    {
        window.cancelAnimationFrame(animFrame);
        enableUI();
        animFlag = false;
        backgroundMusic.pause();                // Stop music playback
        backgroundMusic.currentTime = 0;
        return;                                // break the self-repeating loop
    }
    // Clear the color buffer and the depth buffer before rendering a new frame
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // scaleNum += (0.01 * scaleSign);
    // if(scaleNum >= scaleMax || scaleNum <= scaleMin) scaleSign = -scaleSign;
    

    // Set the model view matrix for vertex transformation
    // Use translation to readjust the position of the primitive (if needed)
    modelViewMatrix = mat4();
    modelViewMatrix = mult(modelViewMatrix, scale(scaleSize, scaleSize, 1));
    modelViewMatrix = mult(modelViewMatrix, translate(0, -0.2357, 0));
// modelViewMatrix = mult(modelViewMatrix, rotateZ(theta[2]));
    // Switch case to handle the ongoing animation sequence
    // The animation is executed sequentially from case 0 to case n
    switch(animSeq)
    {
            case 0: // Rotate clockwise 180 degrees
            theta[2] -= 1* speedFactor;  // Decrement to rotate clockwise
    
                if (theta[2] <= -180) {  // Stop at -180
                theta[2] = -180;          // Clamp to -180
                animSeq++;
                }
            break;
    
            case 1:                      // Rotate back to the original position (anticlockwise)
            theta[2] += 1* speedFactor;  // Increment to rotate back to 0
    
                if (theta[2] >= 0) {    // Stop at 0
                theta[2] = 0;           // Clamp to 0
                animSeq++;
            }
            break;
    
            case 2:                      // Rotate counterclockwise 180 degrees
            theta[2] += 1* speedFactor;  // Increment to rotate counterclockwise
    
                if (theta[2] >= 180) {  // Stop at 180
                theta[2] = 180;         // Clamp to 180
                animSeq++;
            }
            break;
    
            case 3:                      // Rotate back to the original position (clockwise)
            theta[2] -= 1* speedFactor;  // Decrement to rotate back to 0
    
                if (theta[2] <= 0) {    // Stop at 0
                theta[2] = 0;           // Clamp to 0
                animSeq++;
            }
            break;
    
            case 4:                        // Animation 3
                scaleNum += 0.1* speedFactor;
                
                if(scaleNum >= 4)
                {
                    scaleNum = 4;
                    animSeq++;
                }
    
                break;
    
            case 5: // Animation 4
                scaleNum -= 0.1* speedFactor;
    
                if(scaleNum <= 1)
                {
                    scaleNum = 1;
                    animSeq++;
                }
    
                break;
    
            case 6: // Animation 5
                move[0] += 0.0125* speedFactor;
                move[1] += 0.005* speedFactor;
    
                if(move[0] >= 3.0 && move[1] >= 1.2)
                {
                    move[0] = 3.0;
                    move[1] = 1.2;
                    animSeq++;
                }
                break;
    
            case 7: // Animation 6
                move[0] -= 0.0125* speedFactor;
                move[1] -= 0.005* speedFactor;
    
                if(move[0] <= -3.0 && move[1] <= -1.2)
                {
                    move[0] = -3.0;
                    move[1] = -1.2;
                    animSeq++;
                }
                break;
    
            case 8: // Animation 7
                move[0] += 0.0125* speedFactor;
                move[1] += 0.005* speedFactor;
    
                if(move[0] >= 0 && move[1] >= 0)
                {
                    move[0] = 0;
                    move[1] = 0;
                    animSeq++;
                }
                break;
            
        default: // Reset animation sequence
            animSeq = 0;
            iterTemp++;
            break;
    }

    // Perform vertex transformation
    modelViewMatrix = mult(modelViewMatrix, rotateZ(theta[2]));
    modelViewMatrix = mult(modelViewMatrix, scale(scaleNum, scaleNum, 1));
    modelViewMatrix = mult(modelViewMatrix, translate(move[0], move[1], move[2]));

    // Pass the matrix to the GPU for use in shader
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    // Draw the primitive / geometric shape
    gl.drawArrays(gl.TRIANGLES, 0, points.length);

    // Schedule the next frame for a looped animation (60fps)
    animFrame = window.requestAnimationFrame(animUpdate);
}

// Function to set the initial size based on the selection
function setInitialSize(sizeValue) {
    // Map size values to scale factors
    var sizeMap = {
        1: 0.5, // Small
        2: 1.0, // Medium (default)
        3: 2.0  // Large
    };

    scaleSize = sizeMap[sizeValue];
    recompute(); // Update the gasket with the new scale
}

function hexToVec4(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = ((bigint >> 16) & 255) / 255;
    const g = ((bigint >> 8) & 255) / 255;
    const b = (bigint & 255) / 255;
    return vec4(r, g, b, 1.0);
}

// Disable the UI elements when the animation is ongoing
function disableUI()
{
    subdivSlider.disabled = true;
    iterSlider.disabled = true;
    startBtn.disabled = true;
    speedSlider.disabled = true;
    sizeMenu.disabled = true;
    colorPicker.disabled = true;
    colorPicker1.disabled = true;
    colorPicker2.disabled = true;
    colorPicker3.disabled = true;
}

// Enable the UI elements after the animation is completed
function enableUI()
{
    subdivSlider.disabled = false;
    iterSlider.disabled = false;
    startBtn.disabled = false;
    speedSlider.disabled = false;
    sizeMenu.disabled = false;
    colorPicker.disabled = false;
    colorPicker1.disabled = false;
    colorPicker2.disabled = false;
    colorPicker3.disabled = false;
}

// Reset all necessary variables to their default values
function resetValue()
{
    theta = [0, 0, 0];
    move = [0, 0, 0];
    // setInitialSize(sizeValue);
    animSeq = 0;
    iterTemp = 0;
}

//-----------------------------------------------------------------------------------/
// 3D Sierpinski Gasket
//-----------------------------------------------------------------------------------/

// Form a triangle
function triangle(a, b, c, color)
{
    colors.push(baseColors[color]);
    points.push(a);
    colors.push(baseColors[color]);
    points.push(b);
    colors.push(baseColors[color]);
    points.push(c);
}

// Form a tetrahedron with different color for each side
function tetra(a, b, c, d)
{
    triangle(a, c, b, 0);
    triangle(a, c, d, 1);
    triangle(a, b, d, 2);
    triangle(b, c, d, 3);
}


function divideTetra(a, b, c, d, count)
{
    if(count === 0)
    {
        tetra(a, b, c, d);
    }
    else
    {
        var ab = mix(a, b, 0.5);
        var ac = mix(a, c, 0.5);
        var ad = mix(a, d, 0.5);
        var bc = mix(b, c, 0.5);
        var bd = mix(b, d, 0.5);
        var cd = mix(c, d, 0.5);
        --count;
        divideTetra(a, ab, ac, ad, count);
        divideTetra(ab, b, bc, bd, count);
        divideTetra(ac, bc, c, cd, count);
        divideTetra(ad, bd, cd, d, count);
    }
}