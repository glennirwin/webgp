# [WebGP.js](https://github.com/glennirwin/webgp)

#### "If some things can be made simple, complex things can be possible"

![License MIT](https://img.shields.io/badge/license-MIT-lightgrey.svg?style=flat-square)
![ES6](https://img.shields.io/badge/ES-6-lightgrey.svg?style=flat-square)
![WebGL2](https://img.shields.io/badge/WebGL-2-lightgrey.svg?style=flat-square)
![OpenGL ES 3.0](https://img.shields.io/badge/OpenGL-ES%203.0-lightgrey.svg?style=flat-square)

[WebGP.js](https://github.com/glennirwin/webgp=) is a JavaScript library for GPU computation and visualization using [WebGL2](https://www.khronos.org/registry/webgl/specs/latest/2.0/)

**See [Home Page](https://github.com/glennirwin/webgp) for description and features**

## API Documentation ##

* include the script in your html file or require("webgp")

## Initializing WebGP ##
```javascript
const GP = WebGP();                         // Can Optionally pass a canvas and/or a gl context
```
The object passed back contains the main library objects (VertexComputer, VertexArray, InstanceArray, UniformBlock, Util, canvas, gl) that you will need to use WebGP
A canvas and a WebGL context will be created for you on the document body unless you pass one or both to the WebGP function.

## Logging and debug controls ##
```javascript
let log = GP.Util.initializeHeadsUpLog();  // Comment these to hide the log and controls
GP.Util.createShaderControls("GP");  // Note GP is the name of the global
```

## VertexComputer ##
Here is a blown out example will all the options
```javascript
const vc = new GP.VertexComputer({				// Create a GPU computer
	type: GP.gl.POINTS,  // GL_POINTS is default and good for computation
	units: 2, // number of elements
	struct: {	position: "vec2", mass: "float" },  // define the unit data using GLSL types
	initialize: (i) => { return new Float32Array(3); },   // initialize each object data with a buffer
	initializeObject: (i) => { return { position: [0.5,3.2]; }},   // initialize each object data with a return object
	vertexArray: aVertexArray,   // Optionally uses a VertexArray object in place of units/struct/initialize
	instanceArray: anInstanceArray, // draw this array instanced using the attributes in anInstanceArray (exclusive with instanceComputer)
	instanceComputer: aVertexComputer, // draw this array instanced using the attributes in another VertexComputer
	divisor: 1, // for instanceComputer - divisor for the attributes (default is one if not specified)
	uniforms: { seed: 123.2, tex: null },  // Object of literal values that will be used as values for uniforms (textures will need to be a WebGLTexture)
	uniformBlock: aUniformBlock,  // A single uniform block to attach (should use the array form and deprecate this)
	uniformBlocks: [ub1,ub2,ub3],  // Array of UniformBlock objects
	textureOut: true,   // Capture update output as texture (must set gl_Position and textureColor in the shader)
	textureWidth: 10, textureHeight: 10,  // Optionally set the dimensions of the texture, default dimensions are sqrt(units)+1 (enough to fit)
	textureFeedback: "tex",  // Texture output will be assigned to the uniform with this name so it can be referenced inside the shader
	updateStep: {   // update each unit (Transform feedback is used)
		params: { time: "float", tex: "sampler2D" },  // parameters given to shader as u_<name> can also use sampler2D etc...   
	  	glsl: `void main() {  o_position = i_position + 1.0;}`	// Note; make sure to assign all the outputs
	},
	renderStep: {			// render each unit by setting the gl_Position and the vertexColor
	    params: { tex: "sampler2D" },   // will be u_tex in the shader
	      glsl: `void main() { gl_Position = vec4(i_position, 0.0, 1.0); vertexColor = vec4(1.0); }`,
	   fragmentParams: { tex: "sampler2D" },
			     fragment: `void main() { fragColor = vec4(1.0); }`  // gl_FragCoord is given to this shader
	}
});
```
other options:

### Uniforms ###
### uniformBlocks ###
Uniform block objects passed using this property (in an array) will be attached to the shaders and each attribute will be available in your GLSL code as u_<name>.  Uniform block data elements can be updated and written back to the GPU memory very quickly and many different VertexComputers can share the same uniformBlocks.

## VertexArray ##
For passing a vertex array to initialize with (note: units, struct will be inherited)

## UniformBlock object ##
## InstanceArray object ##
## InstanceComputer object ##
## Util object ##


* Uniform Blocks
* Run the computer

```javascript
vc.run();  // the simplest way to run it forever, use step() to run in your own loop
```


## License ##
[WebGP](https://github.com/glennirwin/webgp/) is released under the [MIT license](http://opensource.org/licenses/mit-license.php). Glenn Irwin, 2018.

WebGP.js started as a fork of:
[WebGPGPU](https://github.com/npny/webgpgpu/) is released under the [MIT license](http://opensource.org/licenses/mit-license.php). Pierre Boyer, 2017.
