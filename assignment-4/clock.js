"use strict";

var gl;
var vertices;
var circleVertices;	//	number of vertices in circle
var ctMatrices = [];
var colors = [];
var u_vColorLoc;
var ctm;
var u_ctmLoc;
var hourMarkerMats = [];
var minuteMarkerMats = [];
var outerMat;
var innerMat;
var centerMat;
var hourMat;
var minuteMat;
var secondMat;

window.onload = function init()
{

    var canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
	
	var p = vec2(0.0, 0.0); // center of circle
	var r = 1.0; // Radius
	vertices = [p];
	var degInc = 5; // increment theta by
	
	for (var i = 0; i < 370; i += degInc) {
		vertices.push(vec2(r*Math.cos((Math.PI*i)/180), r*Math.sin((Math.PI*i)/180)));
	}
	
	circleVertices = vertices.length;
	
	// 	Add square vertices to buffer
	vertices.push(vec2(-1.0, -1.0 ));
	vertices.push(vec2( 1.0, -1.0 ));
	vertices.push(vec2( 1.0,  1.0 ));
	vertices.push(vec2(-1.0,  1.0 ));
	
	colors = [
        vec3( 1.0, 0.0, 0.0 ),	// 	Clock rim
        vec3( 1.0, 1.0, 1.0 ),	//	Clock face
        vec3( 0.0, 0.0, 0.0 ),	//	Clock center and hands
		vec3( 0.0, 0.0, 1.0 )	// 	Clock tick marks
    ];
	
	ctm = mat4();
	
	outerMat = mult(scalem(0.9, 0.9, 0.9), ctm);
	innerMat = mult(scalem(0.8, 0.8, 0.8), ctm);
	centerMat = mult(scalem(0.05, 0.05, 0.05), ctm);
	

	for ( var i = 0; i < 12; ++i) {
			var sm = scalem (0.05, 0.0125, 1.0);
			var tm = translate(0.75, 0, 0);
			var rm = rotateZ(i * 30);
			hourMarkerMats[i] = mult(sm, ctm);
			hourMarkerMats[i] = mult(tm, hourMarkerMats[i]);
			hourMarkerMats[i] = mult(rm, hourMarkerMats[i]);
	}
	
	for ( var i = 0; i < 60; ++i) {
			var sm = scalem (0.015, 0.005, 1.0);
			var tm = translate(0.785, 0, 0);
			var rm = rotateZ(i * 6);
			minuteMarkerMats[i] = mult(sm, ctm);
			minuteMarkerMats[i] = mult(tm, minuteMarkerMats[i]);
			minuteMarkerMats[i] = mult(rm, minuteMarkerMats[i]);
	}
    
	var sm = scalem (0.025, 0.2, 1.0);
	var tm = translate (0, 0.2, 0);
	
	hourMat = mult( sm, ctm );
	hourMat = mult( tm, hourMat );
	
	sm = scalem (0.0125, 0.3, 1.0);
	tm = translate( 0, 0.3, 0);
	
	minuteMat = mult( sm, ctm );
	minuteMat = mult (tm , minuteMat );
	
	sm = scalem (0.0075, 0.325, 1.0);
	tm = translate( 0, 0.35, 0);
	
	secondMat = mult( sm, ctm );
	secondMat = mult (tm , secondMat );
	
	//  Configure WebGL
    
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.8, 0.8, 0.8, 1.0 );
    
    //  Load shaders and initialize attribute buffers
    
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    // Load the data into the GPU
    
    var bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    
    gl.bufferData( gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW );

    var a_vPositionLoc = gl.getAttribLocation( program, "a_vPosition" );
    gl.vertexAttribPointer( a_vPositionLoc, 2, gl.FLOAT, false, 0, 0 );
	
	u_vColorLoc = gl.getUniformLocation( program, "u_vColor" );
    
	u_ctmLoc = gl.getUniformLocation( program, "u_ctMatrix" );
	
	var u_projMatrixLoc = gl.getUniformLocation( program, "u_projMatrix" );
	var pm = ortho(-1.0, 1.0, -1.0, 1.0, -1.0, 1.0);
	gl.uniformMatrix4fv(u_projMatrixLoc, false, flatten(pm));
	
	// enable the vertex attributes that are in the shader
    gl.enableVertexAttribArray( a_vPositionLoc );

    render();
};


function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
	
	gl.uniform3fv( u_vColorLoc, colors[0]);
	gl.uniformMatrix4fv(u_ctmLoc, false, flatten(outerMat));
    gl.drawArrays( gl.TRIANGLE_FAN, 0, circleVertices );
	
	gl.uniform3fv( u_vColorLoc, colors[1]);
	gl.uniformMatrix4fv(u_ctmLoc, false, flatten(innerMat));
    gl.drawArrays( gl.TRIANGLE_FAN, 0, circleVertices );

	gl.uniform3fv( u_vColorLoc, colors[2]);
	gl.uniformMatrix4fv(u_ctmLoc, false, flatten(centerMat));
    gl.drawArrays( gl.TRIANGLE_FAN, 0, circleVertices );
	
	gl.uniform3fv( u_vColorLoc, colors[3]);
	for (var i = 0; i < 12; i++) {
		gl.uniformMatrix4fv(u_ctmLoc, false, flatten(hourMarkerMats[i]));
		gl.drawArrays( gl.TRIANGLE_FAN, circleVertices, 4);
	}
	
	gl.uniform3fv( u_vColorLoc, colors[3]);
	for (var i = 0; i < 60; i++) {
		gl.uniformMatrix4fv(u_ctmLoc, false, flatten(minuteMarkerMats[i]));
		gl.drawArrays( gl.TRIANGLE_FAN, circleVertices, 4);
	}
	
	//	Draw hour, minute, and second hands
	
	var date = new Date();
	var rm;
	var s = date.getSeconds();
	var m = date.getMinutes();
	var h = date.getHours();
	
	//	Hour hand
	
	rm = rotateZ(-1 * h%12 * 30 - m/60 * 30);
	var hourHandMat = mult( rm, hourMat );
	
	gl.uniform3fv( u_vColorLoc, colors[2]);
	gl.uniformMatrix4fv(u_ctmLoc, false, flatten(hourHandMat));
	gl.drawArrays( gl.TRIANGLE_FAN, circleVertices, 4);
	
	//	Minute hand
	
	rm = rotateZ(-1 * m * 6 - s/60 * 6);
	var minuteHandMat = mult( rm, minuteMat );
	
	gl.uniform3fv( u_vColorLoc, colors[2]);
	gl.uniformMatrix4fv(u_ctmLoc, false, flatten(minuteHandMat));
	gl.drawArrays( gl.TRIANGLE_FAN, circleVertices, 4);
	
	//	Second hand
	
	rm = rotateZ(-1 * s * 6);
	var secondHandMat = mult( rm, secondMat );
	
	gl.uniform3fv( u_vColorLoc, colors[2]);
	gl.uniformMatrix4fv(u_ctmLoc, false, flatten(secondHandMat));
	gl.drawArrays( gl.TRIANGLE_FAN, circleVertices, 4);
	
	//	render next frame
	
	requestAnimFrame(render);

}
