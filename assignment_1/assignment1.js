/* 	assignment1.js
	Jeff Klouda
	CSE 40166
	Assignment 1
	Code based on Prof. Wang's multi-triangle-uni-fcolor-v2.js example
*/
"use strict";

var gl;
var vertices;
var colors;
var u_ColorLoc;

window.onload = function init()
{
    //	Select canvas element from HTML
    var canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    //	Triangle vertices
    
    vertices = [
		vec2 (-0.75, 0.15),
		vec2 (0.25, 0.15),
		vec2 (-0.25, 0.65),
		vec2 (0.0, 0.4),
		vec2 (0.5, 0.4),
		vec2 (0.25, 0.65),
		vec2 (0.0, 0.4),
		vec2 (0.5, 0.4),
		vec2 (0.25, 0.15),
		vec2 (0.25, 0.15),
		vec2 (0.75, 0.15),
		vec2 (0.5, 0.4),
		vec2 (-0.75, 0.15),
		vec2 (-0.25, 0.15),
		vec2 (-0.25, -0.4),
		vec2 (-0.25, 0.15),
		vec2 (0.0, -0.125),
		vec2 (-0.25, -0.4),
		vec2 (-0.25, 0.15),
		vec2 (0.75, 0.15),
		vec2 (0.25, -0.4),
		vec2 (-0.25, -0.4),
		vec2 (0.25, -0.4),
		vec2 (0.0, -0.125),
		vec2 (-0.25, -0.4),
		vec2 (0.25, -0.4),
		vec2 (0.0, -0.65)
	];

	//	Triangle colors
	
    colors = [
		vec3 (0.0, 0.0, 0.0),
		vec3 (0.0, 0.623, 0.992),
		vec3 (0.671, 0.153, 0.843),
		vec3 (0.996, 0.992, 0.196),
		vec3 (0.0, 0.988, 1.0),
		vec3 (1.0, 0.631, 0.749),
		vec3 (1.0, 0.169, 0.024),
		vec3 (1.0, 0.627, 0.110),
		vec3 (0.0, 0.980, 0.188),
		vec3 (0.631, 0.349, 0.114)
    ];
    
    
    //  Configure WebGL
    
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.917, 0.917, 0.917, 1.0 );
	
    //  Load shaders and initialize attribute buffers
    
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    // Load the data into the GPU
    
    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    
    gl.bufferData( gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW );

    // Associate out shader variables with our data buffer
    
    var a_vPositionLoc = gl.getAttribLocation( program, "a_vPosition" );
    
	// describe the form of the data in the vertex array
    gl.vertexAttribPointer( a_vPositionLoc, 2, gl.FLOAT, false, 0, 0 );
    
	// enable the vertex attributes that are in the shader
    gl.enableVertexAttribArray( a_vPositionLoc );

	//	Get uniform color location from fragment shader
    u_ColorLoc = gl.getUniformLocation(program, "u_Color");
    
	render();
};


function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
    
    for (var i=0; i<vertices.length/3; i++)
    {
        // draw triangle with corresponing color
		gl.uniform3fv(u_ColorLoc, colors[i+1]);
        gl.drawArrays( gl.TRIANGLES, i*3, 3 );
		
		// draw black line loop around triangle
		gl.uniform3fv(u_ColorLoc, colors[0]);
		gl.drawArrays( gl.LINE_LOOP, i*3, 3 );
    
    }
}
