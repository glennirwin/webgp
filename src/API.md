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
const GP = WebGP(); // Can Optionally pass a canvas and/or a gl context
```
The object passed back contains the main library objects (VertexComputer, VertexArray, InstanceArray, UniformBlock, Util, canvas, gl) that you will need to use WebGP.  A canvas and/or a WebGL2 context will be created for you on the document body unless you pass one or both to the WebGP function.

## VertexComputer ##
A VertexComputer is the central building block of a GPU process in WebGP.  In normal WebGL/OpenGLES development, data values along with vertex and fragment shader programs are compiled, linked, and bound to the given data arrays and uniforms.  With direct WebGL API calls, this is usually a lot of code that is easy to break and difficult to maintain as your program evolves.  WebGP is factored to allow you to describe the data and write the important GLSL code while the fiddly bits are dynamically handled for you by the library.  The dynamic parts are almost all dealt with at compile time so there is surprisingly little overhead.  

Cycle times are usually less than a millisecond on even an Intel HD5500 laptop graphics chip. Note: The GPU may still be processing data after you are finished the cycle, if you request data during a cycle, you will likely see the cycle time jump to a few milliseconds to reveal the actual time spent in the GPU.  It is best to do any updates to the GPU buffer data at the beginning of a cycle to reduce the possibility of CPU to GPU synchronization delays.

Note: your array (and textureOut textures) will actually have two copies internally to allow for transformFeedback updates to the data - read/write buffers and textures are flipped every cycle.  This will affect your total memory footprint on the GPU but most modern hardware has plenty of room for a lot of data.

Here is an example with all the options described:
```javascript
const vc = new GP.VertexComputer({				// Create a GPU computer
  type: GP.gl.POINTS,  // GL_POINTS is default and good for computation
  units: 2, // number of elements (not dynamic, although you are free to allocate more than you really need)
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
  textureFeedback: "tex",  // Texture output will be assigned to the uniform with this name so it can be referenced inside the shader using params
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
#### GLSL code ####
You can assemble your GLSL code however you want, feel free to 'bake-in' as many values as you can into the code to make it faster.  All code will automatically be wrapped with:
* ```#version 300 es``` on the first line. Sorry, WebGP does not support WebGL1 or OpenGL ES 2.0 GLSL code.  Update your browser, it's hard not to.
* in/out variables are added as defined in the struct (Note: render step will only see i_var)
* uniform definitions will be added as required by `params:` alongside the `glsl:` code. Extra properties in the uniforms are ignored.
* uniformBlock definitions will be added. If uniformBlock has a `name:` defined, your vars will be name.u_var

#### VertexComputer methods ####
Some methods are not listed and some methods may have arguments that are not shown here.  This means it is only needed internally, not normally used, or should not be used as it may not have an example to confirm its value and may be removed in a future release - if you do choose to use them, make an example and submit it.  If you want more details, please see the [code](https://github.com/glennirwin/webgp/blob/master/src/webgp.js), its only 1200 lines of simple Javascript.  Ok, as simple as possible, but not simpler.  The goal is awesome fast GPU applications with minimal fluff code.

|Name  | Description |
|------|-------------|
|**run()** |   runs the VertexComputer in a loop (Stop/Go controls will be shown by default)          |
|**step()**|   calls one update() and/or one render() as needed (based on what steps are configured)  |
|**{}=getResultUnit(index)**|  creates and returns an object with the unit data copied from the GPU buffer    |
|**[{},{}...]=getResultUnits()** | returns all the units from the GPU as objects in an array (you can call this from the console)  |
|**updateUnit(index,{ prop: val,.. })** | update a unit's GPU data with data given in the object (will match names)   |
|**copyUnitToBlock(index,uniformBlock)** | copy the data block of a single unit to a uniformBlock (they must match in structure)  |
|**getResultTexture()** | returns the latest textureOut WebGLTexture object for assigning to uniforms or getting pixel output  |
|**getTextureData()** | return the latest texture as a long array of floats (4 floats for each pixel)  |
|**destroy()** | Not really necessary to call unless you are invoking and destroying VertexComputers dynamically  |


#### Structure definition ####
This is a description of the piece of state stored in each unit. `Structs` are stored together on the GPU as a single `VertexBuffer`, and while modern cards can go a very long way, asking for too many units can still hit either the `GL_MAX_ELEMENT_VERTICES` or `GL_OUT_OF_MEMORY` limit.
You specify each field name (warning: order matters) and its type as follows :
```javascript
 struct: {
	"position": "vec2",
	"velocity": "vec2",
	"mass": "float",
	"color": "vec3",
}
```
This then gets mapped into native types as defined in Util.glTypes

Note:
	Keep in mind [the peculiar way](https://www.khronos.org/opengl/wiki/Interface_Block_(GLSL)#Buffer_backed) in which OpenGL packs `attributes` and `uniforms` on the card.  Attributes use up `slots`, `slots` have different `types`, each `type` uses up a specific amount of `bytes`, there are composite types (e.g. `mat3`) that use up several `blocks`, `blocks` line up into `rows` (usually 4-`block` wide), and there is an overall `block` limit of `gl.MAX_VARYING_VECTORS`, which is usually 16.  Because of that, it might be advantageous to pay attention to how your fields are getting packed `byte`- and `block`-wise, and to reorder fields so that they fall on a 4-`block` boundary, or to pack multiple related fields into a single `vec4`.  Because of this complexity, it is recommended to use just float, int, and their vector types to keep each component at 4 bytes long - I haven't had much luck trying to use smaller types as they tend to use 4 bytes at a minimum in a uniformBlock for each component.  A single boolean takes up 4 bytes in a uniformBlock, so we might as well use an int and have 32 booleans. (The WebGL2 version of GLSL now has functions to work with ints to extract booleans)

#### uniforms ####
When a shader has params defined, they are pulled from the given object during each cycle.  This can be used for floating point numbers, integers, and most importantly textures.  Because each uniform must be set for each cycle, many uniforms can slow things down.  It is generally better to put values into a uniformBlock object which can be bound to the shaders directly and you can change and write values as needed, instead of every cycle.  This uniforms object should be mostly used for textures. (mainly because it is the only way to give textures to the GPU shaders in WebGL2)
```JavaScript
const uniforms = {   // Simple uniform definition example (can name it anything)
	time: Date.now(),
	mousePos: [0.0, 0.0]   // Shader params is a vec2
};
```

#### uniformBlocks ####
Uniform block objects passed using this property (in an array) will be attached to the shaders and each attribute will be available in your GLSL code as u_name.  Uniform block data elements can be updated and written back to the GPU memory very quickly and many different VertexComputers can share the same UniformBlocks.  The order of uniformBlocks in the array are not important but it is important that every name in every uniformblock be unique for a shader. The uniformBlock attributes are give as u_var to both the vertex and fragment shaders.

Note: If uniformBlock has a `name:` defined, your vars will be name.u_var instead of u_var to allow non-unique names if needed.
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

## InstanceArray ##
When creating a VertexComputer, you can give it an InstanceArray object which will cause it to render instances of the main VertexComputer object for each unit in the instance array.  WebGP-vm.js has an example of this but a better much simpler example should be made for this concept because it is very powerful.

## InstanceComputer usage ##
Multiple instances of VertexComputer objects is great, but what if each instance's data needs to change?  Do I have to iterate through them?  Yuch, that would be messy and slow so why not use a VertexComputer as the maintainer of that instance data?  When a VertexComputer has an instanceComputer configured, it will first call the InstanceComputer's step() function when it is stepped, to let you do those updates using shader code.

## Util ##
The Util object returned by WebGP contains a number of useful functions used by the library. Some of them will also be useful to you:

|Name  | Description |
|------|-------------|
|**Util.glTypes**| This is an object with properties for each data type as they are used by WebGL.  Recommended types to use are float, vec2, vec3, vec4, int, ivec2, ivec3, ivec4, sampler2D (avoid the short and byte types as they can easily cause packing problems and scramble your data)  |
|**Util.dataTextureMacros** | A set of handy GLSL macros for mapping data into and out of texture locations by gl_VertexID  |
|**Util.matrixFunctions** | A set of handy GLSL functions for creating matrix objects for projections  |
|**Util.clear()** |  clears the display, not always necessary depending on how you are drawing into the whole viewport  |
|**Util.data2d(units)** | Calculates one side of a square (texture) big enough to hold a pixel for each unit (texture width/height needed for all units)=sqrt(units)+1 |
|**Util.quadBuffer()** | returns a float buffer containing [-1,-1,1,-1,-1,1,-1,1,1,-1,1,1], a standard GL Quad using 2 triangles (6 x/y points)|
|**Util.buildTextureOut(width,height,data)** |  for if you want to create a WebGLTexture yourself (data can be omitted for a blank one)  |
|**Util.buildFloatTexture(width,height,data)** | returns a WebGLTexture for float data (4 x 32-bit floats per pixel, RGBA) |
|**Util.build1IntTexture(width,height,data)** | returns a WebGLTexture to hold RED values as a 32-bit int.   See the code for more variations  |
|**Util.buildImageTexture(image)** | return an image texture using a given Image() object or image element  |
|**Util.buildAudioTexture(audioContext,url)** | returns a texture suitable for passing audio data.  See WebGP-vm.js for example of how it is used.  |
|**Util.copyBufferToBuffer(buffera,bufferb)** | copy buffers in the GPU, buffera will be copied onto bufferb, buffer types can vary  |  
|**Util.getJson(url,function(err,data))**  | Gets the json data from the given url and calls you back with a json object (or err)   |

## Logging and debug controls ##
```javascript
let log = GP.Util.initializeHeadsUpLog();  // Comment these to hide the log and controls
GP.Util.createShaderControls("GP");  // Note GP is the name of the global
```

## Performance monitoring ##
The Util object can return a simple stopwatch object that lets you monitor and report the time spent in each cycle and the frame per second (Note: A browser will normally try to hold it to 60 frames/second).  Call `Util.stopWatch()` to create it, `mark()` when you begin a cycle, and `check()` at the end which returns the cycle number so you can calculate a modulus and occasionally update a display or write to a log.  Here is an example of how it is used to report some statistics to the display every 100 cycles (updating the display or writing to the console every cycle slows things down dramatically)
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
* The example above alters the time uniform every cycle and runs three VertexComputer processes one step each.
* Normally, in any WebGL program, you would use window.requestAnimationFrame(loop) but we are using GP.Util.GPControls(loop) so that WebGP will display a controls UI with Stop, Go, Step, and Slow buttons (You can also add your own buttons to this control panel).

Depending on the problem you are trying to solve, It is possible that you may need a number of VertexComputers and that your render loop can become complex with values that need to be checked and passed around.  While you can do this in the loop using JavaScript, it is better if you can keep the data in the GPU as much as possible.  In general, it is best to avoid interrupting the cycle and getting/changing values from the GPU arrays which will force a CPU-GPU synchronization.  If possible, use a textureOut to pass information to other shaders or even back to the shader that generated the texture for feedback.   

## Tips and other notes ##
If you find that your initial data seems to get scrambled in the VertexArrays or UniformBuffers, you may need to reorder your attributes to align them with the 4 and 16 byte memory block sizes that GPU's like to work with.  A general rule of thumb is to put the vec4's at the beginning, then fit smaller values so that they would align with vec4's.  mat4 types should be at the end of the structure as it is 4 x vec4's or 16 floats, you may need to add a dummy attribute to get the beginning of the mat4 to line up with the boundary.  Some trial and error may be required here.

If you are struggling and trying to figure out how to do something in GPU land, you may have to turn your mind around to a parallel way of doing it. While in most linear single-threaded code, we expend a lot of effort to hold calculated values and only maintain them at the levels where they change so we can avoid looping over large arrays repetitively.  This is not an issue for the GPU as it is designed to continuously and repetitively visit every single element in an array at once (depending on the number of elements and the architecture of the GPU)  This ability allows you to frame the problem in a smaller simpler context that many times is actually simpler and more closely fits the real world situation you are modeling.

Use Math over logic when possible.  In a GPU, math is almost always faster than logic.  In an inventory system, for example, you may have a flag to indicate whether a transaction adds or reduces local inventory.  While the logic is simple enough ```if (flag==receipt) inventory += quantity; else inventory -= quantity;``` but it will run faster on the GPU if given in a way that can be used mathematically like a +1 and -1 factor so your code becomes simply ```inventory += quantity * factor``` which will take less operations.  If some transaction do not affect inventory, the factor can be given as zero which will not affect the inventory because the transaction quantity will be multiplied by zero before being applied to the inventory.  Yes, it seems wrong to calculate an inventory adjustment of zero but the logic to decide the calculation is much slower than just doing the math.  If you do it this way, you will likely find that your code actually becomes simpler and more straightforward, and faster too.  If you like advanced math, the GLSL language is also full of all the functions you need accelerated by hardware.

GLSL code may get translated for your GPU into something else (specifically D3D11 HLSL shader code on a windows computer), if the `WEBGL_debug_shaders` extension is supported, the translated code will be written back to a property in your VertexComputer object.  You can access the this local translation by pulling up your VertexComputer object in the developer console of your browser. Note that there can be differences in GLSL and WebGL implementations between browsers and operating systems.  I have found that switch/case statements do not work in Google Chrome on windows while they compile and run fine in Google Chrome on a Mac, so I recommend using ```if then else if``` instead of switch/case until that works consistently everywhere.  Test in as many places as you can, get both FireFox and Chrome for your development, if you have problems, you may find one to give a different error or behaviour than another.  Although this may sound troubling, once things run smoothly, the result tends to be quite reliable and consistent across both browsers that support WebGL2 at this time.

## Future development plans ##
While there are still fiddly bits in WebGL that have not been directly enabled with WebGP (multiple draw framebuffers, 3D textures, sync/fence objects, query objects, and sampler objects) They have not yet been required in my current development using this library. While they may find their way into this library in the future, it will only be if WebGP can provide added value since you are still free to call any WebGL API function using the GP.gl reference to the gl context object.  Custom calls to GL API functions should not generally affect the VertexComputer step functions. (but WebGL is a really complex API and there is lots to go wrong and deep errors at runtime don't reveal many details about what went wrong)

If you would like to add a feature or enhancement, please fork this repository and submit a pull request that includes an example using the feature. Note: This library is meant to be as simple as possible as well as powerful and fast as possible, maintaining a balance between raw performance and simplicity of use will be favored over completeness of implementation.  

## Documentation notes ##
The goal of this document is to give you as much detail as possible on one page that you can skim quickly or read completely in a reasonable time. If you are unfamiliar with WebGL/OpenGL concepts, you may find some terms and concepts to be strange but they are the terms used by the OpenGL API and common to mathematics and graphics programming. No attempt has been made to hide these concepts behind abstractions or object models SO most everything you learn using this library will still be relevant and applicable to general WebGL and/or OpenGL ES programming.

* Please log an issue on Github or contact me by email if you find any errors, have any suggestions, or even reasonable questions.

## License ##
[WebGP](https://github.com/glennirwin/webgp/) is released under the [MIT license](http://opensource.org/licenses/mit-license.php). Glenn Irwin, 2018.

WebGP.js started as a fork of:
[WebGPGPU](https://github.com/npny/webgpgpu/) released under the [MIT license](http://opensource.org/licenses/mit-license.php). Pierre Boyer, 2017.
