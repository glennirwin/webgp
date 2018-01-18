# [WebGP.js](https://github.com/glennirwin/webgp) API Documentation

#### "If some things can be made simple, complex things can be possible" ####

![License MIT](https://img.shields.io/badge/license-MIT-lightgrey.svg?style=flat-square)
![ES6](https://img.shields.io/badge/ES-6-lightgrey.svg?style=flat-square)
![WebGL2](https://img.shields.io/badge/WebGL-2-lightgrey.svg?style=flat-square)
![OpenGL ES 3.0](https://img.shields.io/badge/OpenGL-ES%203.0-lightgrey.svg?style=flat-square)

[WebGP.js](https://github.com/glennirwin/webgp=) is a JavaScript library for GPU computation and visualization using [WebGL2](https://www.khronos.org/registry/webgl/specs/latest/2.0/)

**See [Home Page](https://github.com/glennirwin/webgp) for description and features**

## Initializing WebGP ##
Include the script in your html file or require("webgp")
```javascript
const GP = WebGP();                         // Can Optionally pass a canvas and/or a gl context
```
The object passed back contains the main library objects (VertexComputer, VertexArray, InstanceArray, UniformBlock, Util, canvas, gl) that you will need to use WebGP
A canvas and a WebGL context will be created for you on the document body unless you pass one or both to the WebGP function.

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
  divisor: 1, // instanceComputer divisor (default is 1 if not specified)
  uniforms: { seed: 123.2, tex: null },  // Object of literal values that will be used as values for uniforms (textures will need to be a WebGLTexture)
  uniformBlock: aUniformBlock,  // A single uniform block to attach (should use the array form and deprecate this)
  uniformBlocks: [ub1,ub2,ub3],  // Array of UniformBlock objects to attach
  textureOut: true,   // Capture update output as texture (must set gl_Position and textureColor in the shader)
  textureWidth: 10, textureHeight: 10,  // Optionally set the dimensions of the texture, default dimensions are sqrt(units)+1 (enough to fit)
  textureFeedback: "tex",  // Texture output will be assigned to the uniform with this name so it can be referenced inside the shader
  updateStep: {   // update each unit using i_<var> and o_<var> (Transform feedback is used)
  	params: { time: "float", tex: "sampler2D" },  // parameters given to shader as u_<name> can also use sampler2D etc...   
    	glsl: `void main() {  o_position = i_position + 1.0;}`	// Note: make sure to assign all the outputs
  },
  renderStep: {	 // optionally render each unit by setting the gl_Position and the vertexColor
      params: { tex: "sampler2D" },   // will be i_tex in the shader, other attribute are i_<var>
        glsl: `void main() { gl_Position = vec4(i_position, 0.0, 1.0); vertexColor = vec4(1.0); }`,
     fragmentParams: { tex: "sampler2D" },
  		     fragment: `void main() { fragColor = vec4(1.0); }`  // gl_FragCoord is input to this shader
  }
});
```
#### VertexComputer methods ####
Some methods are not listed and some methods may have arguments that are not shown here.  This means it is only needed internally, not normally used, or should not be used as it may not have an example to confirm its value and may be removed in a future release - if you do choose to use them, make an example and submit it.  If you want more details, please see the [code](https://github.com/glennirwin/webgp/blob/master/src/WebGP.js), its only 1200 lines of simple Javascript.  Ok, as simple as possible, but not simpler.  The goal is awesome fast GPU applications with minimal fluff code.
|**run()** |   runs the VertexComputer in a loop (Stop/Go controls will be shown by default)          |
|**step()**|   calls one update() and/or one render() as needed (based on what steps are configured)  |
|**{}=getResultUnit(index)**|  creates and returns an object with the unit data copied from the GPU buffer    |
|**[{},{}...]=getResultUnits()** | returns all the units from the GPU as objects in an array (you can call this from the console)  |
|**updateUnit(index,{ prop: val,.. })** | update a unit's GPU data with data given in the object (will match names)   |
|**copyUnitToBlock(index,uniformBlock)** | copy the data block of a single unit to a uniformBlock (they must match in structure)  |
|**getResultTexture()** | returns the latest textureOut WebGLTexture object for assigning to uniforms or getting pixel output  |
|**getTextureData()** | return the latest texture as a long array of floats (4 floats for each pixel)  |
|**destroy()** | Not really necessary to call unless you are invoking and destroying VertexComputers dynamically  |

#### Uniforms ####
When a shader has params defined, they are pulled from the given object during each cycle.  This can be used for floating point numbers, integers, and most importantly textures.  Because each uniform must be set for each cycle, many uniforms can slow things down.  It is generally better to put values into a uniformBlock object which can be bound to the shaders directly and you can change and write values as needed, instead of every cycle.  This uniforms object should be mostly used for textures. (mainly because it is the only way to give textures to the GPU shaders in WebGL2)
```JavaScript
const uniforms = {   // Simple uniform definition example (can name it anything)
	time: Date.now(),
	mousePos: [0.0, 0.0]   // Shader params is a vec2
};
```

#### uniformBlocks ####
Uniform block objects passed using this property (in an array) will be attached to the shaders and each attribute will be available in your GLSL code as u_<name>.  Uniform block data elements can be updated and written back to the GPU memory very quickly and many different VertexComputers can share the same UniformBlocks.  The order of uniformBlocks in the array are not important but it is important that every name in every uniformblock be unique for a shader. The uniformBlock attributes are give as u_<var> to both the vertex and fragment shaders.
```JavaScript
// Set up a uniform block that we can update as we need
// they will be available in the updateStep shader as u_name
const uniformBlock = new GP.UniformBlock({
		struct: {
				touchXY: "vec2",
				mouseXY: "vec2",
				time: "float"
		},
		initialize: {
				touchXY: [0.0,0.0],
				mouseXY: [0.0,0.0],
				time: Date.now()
		}
});
```
Values in a uniform block can be updated with the ```set({ time: Date.now() })```, or ```setWrite({ time: Date.now() })``` functions. The parameter is an object with matching property names to the values you want to update (and corresponding data types as well - vec4 is an array of 4 numbers, mat4 is an array of 16 numbers). The ```set()``` method will only set the value in CPU memory while ```setWrite()``` will set the value and write that value to the GPU memory.  If you have many values that are changing every cycle in a uniformBlock, it is better to use the ```set()``` function as needed and then call ```write()``` every cycle to write the whole block in one operation.
```JavaScript
// This is an example of updating the uniformBlock data in an event and writing it to the GPU with setWrite()
window.addEventListener('mousemove', event => {
  uniformBlock.setWrite({ mouseXY: [event.clientX / canvas.width * 2.0 - 1.0, (event.clientY / canvas.height * 2.0 - 1.0) * -1.0 ] });
});
```
Here is an example that sets a number of values and then makes one call to update the GPU buffer which is faster than individual calls for each value.  This is generally a good way to do it if you are updating every cycle
```JavaScript
inputBlock.set({
		mouse: mouse,
		date: [date.getFullYear(),date.getMonth(),date.getDate(),date.getHours()*3600+date.getMinutes()*60+date.getSeconds()],
		now: window.performance.now(),     
		wheel: wheel,
		clicks: clicks
}).write();  // Write all at once - other values may have changed via events
```

## VertexArray ##
For passing a pre-built vertex array for a VertexComputer to use (note: units, struct, and data will be inherited).  It is created similar to the VertexComputer. Creating a VertexArray object is similar to the creating a VertexComputer without the shader stuff.  Here is an example:
```javascript
const va = new GP.VertexArray({
   units: 1000,
  struct: {
	  position: "vec2",
	  velocity: "vec2",
	      mass: "int",
	     color: "vec3"
  },
  initializeObject: (i) => { return {
	     position: [Math.random()*2-1,Math.random()*2-1],
	     velocity: [(Math.random() - .25) / 20,(Math.random() - .25) / 20],
	         mass: 1 + Math.random() * 2,
	        color: [0.0,Math.random(),Math.random()* 0.5]
    };
  },
});
```
Note: Because of the internal flip-flop of read/write transform feedback buffers, having two VertexComputers share the same vertexArray assumes that only one will be updating the values and the other will use it to render a texture or something else.  It is generally better to pass information with textures so this capability does not have a good use-case at this time and may be deprecated.

## InstanceArray concept ##
When creating a VertexComputer, you can give it an InstanceArray object which will cause it to render instances of the main VertexComputer object for each unit in the instance array.  WebGP-vm.js has an example of this but a better much simpler example should be made for this concept because it is very powerful.

## InstanceComputer concept ##
Multiple instances of VertexComputer objects is great, but what if each instance's data needs to change?  Do I have to iterate through them?  Yuch, that would be messy and slow so why not use a VertexComputer as the maintainer of that instance data?  When a VertexComputer has an instanceComputer configured, it will first call the InstanceComputer's step() function when it is stepped, to let you do those updates using shader code.

## Util ##
The Util object returned by WebGP contains a number of useful functions used by the library. Some of them will be useful to you:
| **Util.glTypes** | This is an object with properties for each data type as they are used by WebGL.  Recommended types to use are float, vec2, vec3, vec4, int, ivec2, ivec3, ivec4, sampler2D (avoid the short and byte types as they can easily cause packing problems and scramble your data)  |
|**Util.dataTextureMacros** | A set of handy GLSL macros for mapping data into and out of texture locations by gl_VertexID  |
|**Util.matrixFunctions** | A set of handy GLSL functions for creating matrix objects for projections  |
|**clear()** |  clears the display, not always necessary depending on how you are drawing into the whole viewport  |
|**data2d(units)** | Calculates one dimension of a square (texture) big enough to hold a pixel for each unit (texture width/height needed for all units) |
|**quadBuffer()** | returns a float buffer containing [-1,-1,1,-1,-1,1,-1,1,1,-1,1,1], a standard GL Quad using 2 triangles (6 x/y points)|
|**buildTextureOut(width,height,data)** |  for if you want to create a WebGLTexture yourself (data can be omitted for a blank one)  |
|**buildFloatTexture(width,height,data)** | build a WebGLTexture for float data (4 x 32-bit floats per pixel, RGBA) |
|**build1IntTexture(width,height,data)** | build a WebGLTexture to hold RED values as a 32-bit int.   See the code for more variations  |
|**buildImageTexture(image)** | build an image texture using a given image  |
|**buildAudioTexture(audioContext,url)** | builds a texture suitable for passing audio data.  See WebGP-vm.js for example of how it is used.  |
|**copyBufferToBuffer(buffera,bufferb)** | copy buffers in the GPU, buffera will be copied onto bufferb, buffer types can vary  |  
|**getJson(url,function(err,data))**  | Gets the json data from the given url and calls you back with a json object (or err)   |

## Logging and debug controls ##
```javascript
let log = GP.Util.initializeHeadsUpLog();  // Comment these to hide the log and controls
GP.Util.createShaderControls("GP");  // Note GP is the name of the global
```

## Performance monitoring ##
The Util object can return a simple stopwatch object that lets you monitor and report the time spent in each cycle and the frame per second (Note: A browser will normally try to hold it to 60 frames/second).  Here is an example of how it is used to report some statistics to the display every 100 cycles (updating the display or writing to the console every cycle slows things down dramatically)
```javascript
let watch = GP.Util.stopWatch();

function loop() {
  watch.mark();  // mark time the loop starts

  snowballs.step();
  particles.step();
  tinyReds.step();

  if (watch.check() % 100 === 0) {    // check() will return the number of times it has been called
		if (stats) stats.innerText = watch.stats()+"\nsteps="+cyclesPerLoop;
		watch.reset();
  }
  GP.Util.GPControls(loop);
}
```

## Run the computer ##
The easiest way to run is:
```javascript
vc.run();  // the simplest way to run it forever, use step() to run in your own loop
```

## Multiple VertexComputers and the render loop ##
If you need to run multiple vertex computers or alter uniform values and inputs while running, you will need a loop function like this:
```JavaScript
function loop() {
  GP.Util.clear();
  uniforms.time = Date.now() - watch.lastTime;
  snowballs.step();
  particles.step();
  tinyReds.step();
  GP.Util.GPControls(loop);
}
loop();  // Start the loop running
```
* This example alters the time uniform every cycle and runs three VertexComputer processes one step each.
* Normally, in any WebGL program, you would use window.requestAnimationFrame(loop) but we are using GP.Util.GPControls(loop) so that WebGL will display a controls UI with Stop, Go, Step, and Slow buttons (You can also add your own buttons to this control panel).

Depending on the problem you are trying to solve, It is possible that you may need a number of VertexComputers and that your render loop can become complex with values that need to be checked and passed around.  While you can do this in the loop using JavaScript, it is better if you can keep the data in the GPU as much as possible.  In general, it is best to avoid interrupting the cycle and getting/changing values in the GPU arrays which will force a CPU-GPU synchronization.  You can use textureOut to pass information to other shaders or even back to the shader that generated the texture for feedback.   

## License ##
[WebGP](https://github.com/glennirwin/webgp/) is released under the [MIT license](http://opensource.org/licenses/mit-license.php). Glenn Irwin, 2018.

WebGP.js started as a fork of:
[WebGPGPU](https://github.com/npny/webgpgpu/) released under the [MIT license](http://opensource.org/licenses/mit-license.php). Pierre Boyer, 2017.
