 "use strict";

var gl;
var canvas;

var printDay;

// modelview matrix
var mvMatrix;

// projection matrix
var projMatrix;

// common modelview matrix
var commonMVMatrix;

var nMatrix;

// matrix stack
var stack = [];

var a_positionLoc;
var a_normalLoc;
var a_textureCoordLoc;
var u_colorLoc;
var u_mvMatrixLoc;
var u_projMatrixLoc;
var u_trckMatrixLoc;
var u_normalMatrixLoc;
var u_lightLoc;
var u_textureSamplerLoc;
var u_orbitLoc;

// Last time that this function was called
var g_last = Date.now();
var elapsed = 0;
var mspf = 1000/30.0;  // ms per frame

// Light location
var light;

// scale factors
var rSunMult = 45;      // keep sun's size manageable
var rPlanetMult = 2000;  // scale planet sizes to be more visible

// surface radii (km)
var rSun = 696000;
var rMercury = 2440;
var rVenus = 6052;
var rEarth = 6371;
var rMoon = 1737;

// orbital radii (km)
var orMercury = 57909050;
var orVenus = 108208000;
var orEarth = 149598261;
var orMoon = 384399;

// orbital periods (Earth days)
var pMercury = 88;
var pVenus = 225;
var pEarth = 365;
var pMoon = 27;

// time
var currentDay;
var daysPerFrame;

var globalScale;

// vertices
var circleVertexPositionData = []; // for orbit
var sphereVertexPositionData = []; // for planet
var sphereVertexIndexData = []; // for planet
var sphereVertexNormalData = []; // for vertex normals
var sphereVertexTextureCoordinates = [];

var circleVertexPositionBuffer;
var sphereVertexPositionBuffer;
var sphereVertexNormalBuffer;
var sphereVertexIndexBuffer;
var sphereVertexTextureBuffer;

// for trackball
var m_inc;
var m_curquat;
var m_mousex = 1;
var m_mousey = 1;
var trackballMove = false;

var lightPosition = vec4(0.0, 1.0, 3.0, 1.0 );

var lightAmbient = vec4(1.0, 1.0, 1.0, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 0.3, 0.3, 0.3, 1.0 );
var materialDiffuse = vec4( 0.7, 0.7, 0.7, 1.0 );
var materialSpecular = vec4( 0.25, 0.25, 0.25, 1.0 );
var materialShininess = 10.0;

var sunTexture;
var mercuryTexture;
var venusTexture;
var earthTexture;
var moonTexture;

function loadTexture(texture, imgSource) {
	texture.image = new Image();
	texture.image.onload = function () {
		handleLoadedTexture(texture);
	}
	texture.image.src = (imgSource);
}

function handleLoadedTexture(texture) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
}

// for trackball
function mouseMotion( x,  y)
{
        var lastquat;
        if (m_mousex != x || m_mousey != y)
        {
            lastquat = trackball(
                  (2.0*m_mousex - canvas.width) / canvas.width,
                  (canvas.height - 2.0*m_mousey) / canvas.height,
                  (2.0*x - canvas.width) / canvas.width,
                  (canvas.height - 2.0*y) / canvas.height);
            m_curquat = add_quats(lastquat, m_curquat);
            m_mousex = x;
            m_mousey = y;
        }
}

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );
    printDay = document.getElementById("printDay");
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    //
    //  Configure WebGL
    //
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);
 
    currentDay = 0;
    daysPerFrame = 1.0;
    
    // global scaling for the entire orrery
    globalScale = 1.0 / ( orEarth + orMoon + ( rEarth + 2 * rMoon ) * rPlanetMult );
    
    setupCircle();

    setupSphere();
    
    //  Load shaders and initialize attribute buffers
    
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
	
	var ambientProduct = mult(lightAmbient, materialAmbient);
    var diffuseProduct = mult(lightDiffuse, materialDiffuse);
    var specularProduct = mult(lightSpecular, materialSpecular);
	
	// Load in textures
	sunTexture = gl.createTexture();
	mercuryTexture = gl.createTexture();
	venusTexture = gl.createTexture();
	earthTexture = gl.createTexture();
	moonTexture = gl.createTexture();
	loadTexture(sunTexture, "sun.jpg");
	loadTexture(mercuryTexture, "mercury.jpg");
	loadTexture(venusTexture, "venus.jpg");
	loadTexture(earthTexture, "earth.jpg");
	loadTexture(moonTexture, "moon.jpg");
    
    // Load the data into the GPU
    
    circleVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, circleVertexPositionBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(circleVertexPositionData), gl.STATIC_DRAW );

    sphereVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereVertexPositionData), gl.STATIC_DRAW);

	sphereVertexNormalBuffer = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, sphereVertexNormalBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, flatten(sphereVertexNormalData), gl.STATIC_DRAW);
    
    sphereVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sphereVertexIndexData), gl.STATIC_DRAW);
	
    
	a_textureCoordLoc = gl.getAttribLocation( program, "a_vTexture");
	gl.enableVertexAttribArray( a_textureCoordLoc );
	gl.vertexAttribPointer(a_textureCoordLoc, 2, gl.FLOAT, false, 0, 0);
	
    // Associate out shader variables with our data buffer
	
	sphereVertexTextureBuffer = gl.createBuffer();
	
	gl.uniform4fv( gl.getUniformLocation(program,
       "u_ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
       "u_diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
       "u_specularProduct"),flatten(specularProduct) );
    gl.uniform1f( gl.getUniformLocation(program,
       "u_shininess"),materialShininess );
    
    a_positionLoc = gl.getAttribLocation( program, "a_vPosition" );
	
	a_normalLoc = gl.getAttribLocation( program, "a_vNormal" );
	gl.enableVertexAttribArray( a_normalLoc);
	gl.vertexAttribPointer( a_normalLoc, 4, gl.FLOAT, false, 0, 0 );
	
	u_textureSamplerLoc = gl.getUniformLocation( program, "u_textureSampler" );
	
    u_colorLoc = gl.getUniformLocation( program, "u_color" );

    u_mvMatrixLoc = gl.getUniformLocation( program, "u_mvMatrix" );
    
	u_trckMatrixLoc = gl.getUniformLocation( program, "u_trckMatrix" );
	
    u_projMatrixLoc = gl.getUniformLocation( program, "u_projMatrix" );
    projMatrix = ortho(-1.0, 1.0, -0.5, 0.5, -2.0, 2.0);
	projMatrix = mult(rotateX(-30), projMatrix);
    gl.uniformMatrix4fv(u_projMatrixLoc, false, flatten(projMatrix) );
	
	u_normalMatrixLoc = gl.getUniformLocation( program, "u_normalMatrix" );
		
	u_orbitLoc = gl.getUniformLocation( program, "u_orbit");	
	
	u_lightLoc = gl.getUniformLocation( program, "u_lightPosition" );

	gl.uniform4fv(u_lightLoc,flatten(lightPosition) );
	
	// for trackball
    m_curquat = trackball(0, 0, 0, 0);
	
	// for trackball
    canvas.addEventListener("mousedown", function(event){
        m_mousex = event.clientX - event.target.getBoundingClientRect().left;
        m_mousey = event.clientY - event.target.getBoundingClientRect().top;
        trackballMove = true;
    });

    // for trackball
    canvas.addEventListener("mouseup", function(event){
        trackballMove = false;
    });

    // for trackball
    canvas.addEventListener("mousemove", function(event){
      if (trackballMove) {
        var x = event.clientX - event.target.getBoundingClientRect().left;
        var y = event.clientY - event.target.getBoundingClientRect().top;
        mouseMotion(x, y);
      }
    } );

	document.getElementById("slider").onchange = function(event) {
        // Update color of light
		lightAmbient = vec4(	
			document.getElementById("redSlider").value,
			document.getElementById("greenSlider").value,
			document.getElementById("blueSlider").value,
			1.0	);
		lightDiffuse = lightAmbient;
		lightSpecular = lightAmbient;
		
		ambientProduct = mult(lightAmbient, materialAmbient);
		diffuseProduct = mult(lightDiffuse, materialDiffuse);
		specularProduct = mult(lightSpecular, materialSpecular);
	
		gl.uniform4fv( gl.getUniformLocation(program,
       "u_ambientProduct"),flatten(ambientProduct) );
		gl.uniform4fv( gl.getUniformLocation(program,
       "u_diffuseProduct"),flatten(diffuseProduct) );
		gl.uniform4fv( gl.getUniformLocation(program,
       "u_specularProduct"),flatten(specularProduct) );
		gl.uniform1f( gl.getUniformLocation(program,
       "u_shininess"),materialShininess );
	
    };
	
	orMoon = Math.max (orMoon, (rEarth+rMoon) * rPlanetMult);
	
	document.getElementById("incDPF").onclick = function() {
		daysPerFrame *= 2;
	};
	
	document.getElementById("decDPF").onclick = function() {
		daysPerFrame /= 2;
	};
	
    render();
    
};

function setupCircle() {
    var increment = 0.1;
    for (var theta=0.0; theta < Math.PI*2; theta+=increment) {
        circleVertexPositionData.push(vec3(Math.cos(theta+increment), 0.0, Math.sin(theta+increment)));
    }
}

function setupSphere() {
    var latitudeBands = 50;
    var longitudeBands = 50;
    var radius = 1.0;
    
    // compute sampled vertex positions
    for (var latNumber=0; latNumber <= latitudeBands; latNumber++) {
        var theta = latNumber * Math.PI / latitudeBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);
        
        for (var longNumber=0; longNumber <= longitudeBands; longNumber++) {
            var phi = longNumber * 2 * Math.PI / longitudeBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);
            
            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;
            
            sphereVertexPositionData.push(radius * x);
            sphereVertexPositionData.push(radius * y);
            sphereVertexPositionData.push(radius * z);
			//	compute vertex normals for lighting
			sphereVertexNormalData.push(x, y, z, 0.0)
			
			//	compute texture coordinates
			var u = 1 - (longNumber / longitudeBands);
			var v = 1 - (latNumber / latitudeBands);
			sphereVertexTextureCoordinates.push(vec2(u,v));
        }
    }
    
    // create the actual mesh, each quad is represented by two triangles
    for (var latNumber=0; latNumber < latitudeBands; latNumber++) {
        for (var longNumber=0; longNumber < longitudeBands; longNumber++) {
            var first = (latNumber * (longitudeBands + 1)) + longNumber;
            var second = first + longitudeBands + 1;
            // the three vertices of the 1st triangle
            sphereVertexIndexData.push(first);
            sphereVertexIndexData.push(second);
            sphereVertexIndexData.push(first + 1);
            // the three vertices of the 2nd triangle
            sphereVertexIndexData.push(second);
            sphereVertexIndexData.push(second + 1);
            sphereVertexIndexData.push(first + 1);
        }
    }
}

function drawCircle(color, size) {
    // set uniforms
    gl.uniform3fv( u_colorLoc, color );
    
    var topm = stack[stack.length-1]; // get the matrix at the top of stack
    mvMatrix = mult(topm, scalem(size, size, size));
    mvMatrix = mult(commonMVMatrix, mvMatrix);
    gl.uniformMatrix4fv(u_mvMatrixLoc, false, flatten(mvMatrix) );
   
	// render without lighing or texture
	gl.uniform1i(u_orbitLoc, 1);

	// Send vertex postion
    gl.enableVertexAttribArray( a_positionLoc );
    gl.bindBuffer(gl.ARRAY_BUFFER, circleVertexPositionBuffer);
    gl.vertexAttribPointer( a_positionLoc, 3, gl.FLOAT, false, 0, 0 );
	
    gl.drawArrays( gl.LINE_LOOP, 0, circleVertexPositionData.length );
}

function drawSphere(color, size, texture) {
    // set uniforms
    gl.uniform3fv( u_colorLoc, color );
    
    var topm = stack[stack.length-1]; // get the matrix at the top of stack
    mvMatrix = mult(topm, scalem(size, size, size));
    mvMatrix = mult(commonMVMatrix, mvMatrix);
    gl.uniformMatrix4fv(u_mvMatrixLoc, false, flatten(mvMatrix) );
    
	nMatrix = normalMatrix(mvMatrix, true);
	
	gl.uniformMatrix3fv(u_normalMatrixLoc, false, flatten(nMatrix) );
	
    // Send texture coordinates
	gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexTextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(sphereVertexTextureCoordinates), gl.STATIC_DRAW);
	gl.enableVertexAttribArray( a_textureCoordLoc );
	gl.vertexAttribPointer(a_textureCoordLoc, 2, gl.FLOAT, false, 0, 0);
	
	// Send vector position coordinates
    gl.enableVertexAttribArray( a_positionLoc );
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
    gl.vertexAttribPointer(a_positionLoc, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereVertexIndexBuffer);
	
	// Set active textures
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.uniform1i(u_textureSamplerLoc, 0);
	
	// Render with texture and lighting
	gl.uniform1i(u_orbitLoc, 0);
	
    gl.drawElements(gl.TRIANGLES, sphereVertexIndexData.length, gl.UNSIGNED_SHORT, 0);
}

function drawOrbits() {
    var gray = vec3( 0.5, 0.5, 0.5 );
    
    // Mercury, Venus, Earth
    stack.push(mat4());
    drawCircle( gray, orVenus );
	drawCircle( gray, orEarth );
	drawCircle( gray, orMercury );
    stack.pop();
	
}

function drawBodies() {
    var size;
    var angleOffset = currentDay * 360.0;  // days * degrees
    
    // Sun
    size = rSun * rSunMult;
    stack.push(mat4());
    drawSphere( vec3( 1.0, 1.0, 0.0 ), size, sunTexture );
    stack.pop();

	// Mercury
	size = rMercury * rPlanetMult;
	stack.push(mult(rotateY(angleOffset/pMercury), translate(orMercury, 0.0, 0.0)));
	drawSphere( vec3( 1.0, 0.5, 0.5), size, mercuryTexture );
	stack.pop();
	
    // Venus
    size = rVenus * rPlanetMult;
    stack.push(mult(rotateY(angleOffset/pVenus), translate(orVenus, 0.0, 0.0)));
    drawSphere( vec3( 0.5, 1.0, 0.5 ), size, venusTexture );
    stack.pop();
	
	// Earth
	size = rEarth * rPlanetMult;
	stack.push(mult(rotateY(angleOffset/pEarth), translate(orEarth, 0.0, 0.0)));
	drawSphere( vec3( 0.5, 0.5, 1.0 ), size, earthTexture );
	var earthM = stack.pop();
	
	// Moon
	size = rMoon * rPlanetMult;
	var moonM = mult(rotateY(angleOffset/pMoon), translate(orMoon, 0.0, 0.0));
	moonM = mult(earthM, moonM);
	stack.push(moonM);
	drawSphere( vec3( 1.0, 1.0, 1.0 ), size, moonTexture );
	stack.pop();
	if (document.getElementById("orbon").checked == true) {
		stack.push(earthM);
		drawCircle( vec3(0.5, 0.5, 0.5), orMoon );
		stack.pop();
	}
	
}

function drawDay() {
	if (document.getElementById("dayOn").checked == true) {
		var string = 'Day ' + currentDay.toString();
		printDay.innerHTML = string;
	}
	else
		printDay.innerHTML = "";
}

function drawAll()
{
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
    
    // all planets and orbits will take the following transformation
    
    // global scaling
    commonMVMatrix = scalem(globalScale, globalScale, globalScale);
    
    if (document.getElementById("orbon").checked == true)
        drawOrbits();
    
    drawBodies();
    drawDay();
}

var render = function() {
	
	// for trackball
    m_inc = build_rotmatrix(m_curquat);
    
	gl.uniformMatrix4fv(u_trckMatrixLoc, false, flatten(m_inc) );
	
	// Calculate the elapsed time
    var now = Date.now(); // time in ms
    elapsed += now - g_last;
    g_last = now;
    if (elapsed >= mspf && document.getElementById("animOn").checked == true) {
        currentDay += daysPerFrame;
        elapsed = 0;
    }
	
    requestAnimFrame(render);
    drawAll();
};
