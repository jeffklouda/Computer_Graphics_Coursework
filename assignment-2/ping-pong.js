"use strict";

var gl;
var vertices;
var colors;
var xVelocity, yVelocity;
var paddleX, paddleY;
var ballX, ballY;
var ballRadius = 0.05;
var degInc = 10;
var u_vCenterLoc;
var u_ColorLoc;
var bounces;
var running;

window.onload = function init()
{
    var canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    setup();

    //
    //  Configure WebGL
    //
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.8, 0.8, 0.8, 1.0 );
    
    //  Load shaders and initialize attribute buffers
    
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    // Load the data into the GPU
    
    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW );

    // Associate out shader variables with our data buffer
    
    var a_vPositionLoc = gl.getAttribLocation( program, "a_vPosition" );
    gl.vertexAttribPointer( a_vPositionLoc, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( a_vPositionLoc );
    
    // associate the center with uniform shader variable
    // write your code here
	u_vCenterLoc = gl.getUniformLocation( program, "u_vCenter");
	
	u_ColorLoc = gl.getUniformLocation(program, "u_Color");
	
	// Add listeners for buttons
	document.getElementById("speedUp").onclick = function () {
		xVelocity *= 1.2;
		yVelocity *= 1.2;
	}
	
	document.getElementById("speedDown").onclick = function () {
		xVelocity *= 0.8;
		yVelocity *= 0.8;
	}
	document.getElementById("paddleLeft").onclick = function () {
		if (running)
			paddleX -= 0.1;
		if (paddleX < -1)
			paddleX = -1;
	}
	
	document.getElementById("paddleRight").onclick = function () {
		if (running)
			paddleX += 0.1;
		if (paddleX > 1)
			paddleX = 1;
	}
    
	
	render();
    
};

function setup() {
	
	running = true;
    
	// create vertices for paddle
	vertices = [
				vec2( -0.25, -0.025 ),
                vec2( -0.25, 0.025 ),
				vec2 (0.25, 0.025 ),
				vec2 (0.25, -0.025)
    ];
		
	// create vertices for circle
	vertices.push(vec2(0.0, 0.0));
	for (var i = 0; i < 370; i += degInc) {
		vertices.push(vec2(ballRadius*Math.cos((Math.PI*i)/180), ballRadius*Math.sin((Math.PI*i)/180)));
	}
	
	colors = [
		vec3(0.4, 0.4, 1.0),	// ball
		vec3(1.0, 0.4, 0.4)		// paddle
	];
	
	// set paddle position to bottom of canvas
	paddleX = 0;
	paddleY = -0.975;
	
	// set ball position to top of canvas
    ballX = 0;
    ballY = 1 - ballRadius;

	// set ball velocity (numbers specified in assignment)
    xVelocity = 0.005;
    yVelocity = -0.005;
    
	//	initialize number of bounces to 0
	bounces = 0;
}

function animate () {
    
	ballX += xVelocity;
	ballY += yVelocity;
	
    // 	check if ball is out of bounds x
	if (ballX <= -1 + ballRadius || ballX >= 1 - ballRadius) {
		xVelocity = -xVelocity;
	}
	//	check if ball is out of bounds +y
	if (ballY >= 1 - ballRadius) {
		yVelocity = -yVelocity;
	}
	
	// 	check if ball hits paddle
	if (ballY <= -1 + ballRadius - yVelocity + 0.05 && ballX >= paddleX - 0.25 && ballX <= paddleX + 0.25 && yVelocity < 0) {
		yVelocity = -yVelocity;
		bounces += 1;
	}
	
	//	check if ball hits bottom edge of canvas (game over)
	else if (ballY <= -1 + ballRadius) {
		xVelocity = 0;
		yVelocity = 0;
		running = false;
		alert("Game over!");
		ballY = -1 + ballRadius + 0.01;
	}
}

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );

    animate();
	
	//	Show bounce counter
	document.getElementById("bounceCounter").innerHTML="Bounces: " + bounces;
    
    // 	update ball center as uniform to shader
    gl.uniform2fv(u_vCenterLoc, vec2(ballX, ballY));
	// 	update color as uniform to shader
	gl.uniform3fv(u_ColorLoc, colors[0]);
	// 	draw ball
    gl.drawArrays( gl.TRIANGLE_FAN, 4, vertices.length - 4 );
	
	//	update paddle center as uniform to shader
	gl.uniform2fv(u_vCenterLoc, vec2(paddleX, paddleY));
	//	update color as uniform to shader
	gl.uniform3fv(u_ColorLoc, colors[1]);
	//	draw paddle
	gl.drawArrays( gl.TRIANGLE_FAN, 0, 4 );

    requestAnimFrame(render);
}
