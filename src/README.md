# [WebGP.js](https://github.com/glennirwin/webgp)

#### "If some things can be made simple, complex things can be possible"

![License MIT](https://img.shields.io/badge/license-MIT-lightgrey.svg?style=flat-square)
![ES6](https://img.shields.io/badge/ES-6-lightgrey.svg?style=flat-square)
![WebGL2](https://img.shields.io/badge/WebGL-2-lightgrey.svg?style=flat-square)
![OpenGL ES 3.0](https://img.shields.io/badge/OpenGL-ES%203.0-lightgrey.svg?style=flat-square)

[WebGP.js](https://github.com/glennirwin/webgp=) is a JavaScript library that uses [WebGL2](https://www.khronos.org/registry/webgl/specs/latest/2.0/) to enable general purpose computation and visualization using your GPU (Graphics Card) in a web browser (latest Chrome/Firefox, Safari soon).  All the ugly GL calls are handled by the library so you can focus on GLSL code for your calculations and graphics.  While some libraries are focused on graphics and others are focused on computation, this library allows you to create very fast applications with both GPU computation AND graphics in a simple declarative way with minimal abstractions.

## Features:
* Simple declarative creation of a VertexComputer. Just define its attributes, the data, and the GLSL code to use.
* WebGP will create the buffers, uniforms, vertex arrays and textures for you.  
* Call step() to cycle once in your own loop, or call run() and it will run forever.
* uniforms of float and int types now supported, other types not fully tested yet
* full control of update steps and iteration counters or just call run()
* VertexComputer updateStep and renderStep in constructor are optional, can use one or both
* can now share vertex arrays between multiple VertexComputer instances using a VertexArray object, or setBuffers()
* UniformBlocks can now be created and assigned to a VertexComputer on creation
* update step can capture output into textures and they can be fed back in as uniforms for texture data lookups
* Vertex unit data can now be initialized using a closure returning an object that resembles the structure
* Vertex unit data can be pulled as objects for inspection and easily updated back to the GPU buffer using updateUnit()
* Debug controls for Stop, Go, Step, Slow can be added with Util.createShaderControls("GP") and calling Util.GPControls(loop) in your render loop
* enable simple heads up logging with const log = Util.initializeHeadsUpLog()  - will show on a textarea overlay, a function is returned to allow you to pass messages to the log as in log("Hello World")
* Both controls and heads up logging can be left out for silent production operation (log goes to console)
* Fragment shaders can now be attached to the renderStep to a more rendering capability.  See the Shadertoy examples.
* A VertexComputer can be assigned as the instanceComputer of another Vertex computer, the instanceComputer will share its VertexArray as vertex instance attributes (useful for projecting array elements as instances of a Quad)

**[Demo gallery](https://glennirwin.github.io/webgp/examples/index.html)**

```html
<!DOCTYPE html>
<html><head><title>WebGP - Rainbow Fountain</title><meta charset="utf-8"></head>
<body style="margin: 0; background-color: black;">
<script src="https://rawgit.com/glennirwin/webgp/master/src/webgp.js"></script>
<script>

const GP = WebGP();                         // Can Optionally pass a canvas and/or a gl context

let log = GP.Util.initializeHeadsUpLog();  // Comment these to hide the log and controls
GP.Util.createShaderControls("GP");

const vc = new GP.VertexComputer({				// Create a GPU computer
    units: 1e6, // number of elements
    struct: {								  						// define the unit data
        position: "vec2",
        velocity: "vec2",    // define attributes using GLSL types
            mass: "int",
           color: "vec3"
    },
    initializeObject: (i) => { return {           // initialize each object data with a return object
        position: [Math.random(),Math.random()],
        velocity: [(Math.random() - .25) / 20,(Math.random() - .25) / 20],  // a vec2 is an array of 2 numbers
        mass: 1 + Math.random() * 4,
        color: [Math.random(),Math.random(),Math.random()] };  // Note: Use the index i to map your data
    },
    updateStep: {     // update each unit (Transform feedback is used)
        glsl: `
            void main() {
                o_position = i_position + i_velocity;
                o_velocity = i_velocity - 0.001 * i_position / float(i_mass);
                o_mass = i_mass;
                o_color = i_color;
            }  `										// Note; make sure to assign all the outputs
    },
    renderStep: {			// render each unit by setting the gl_Position and the vertexColor
        glsl: `
            void main() {      // This is a vertex shader to position the points on the display
                gl_Position = vec4(i_position, 0.0, 1.0);
                vertexColor = vec4(i_color, .5);
                gl_PointSize = float(i_mass)/2.0;
            }   `     // default fragment shader will be used to show the points
    }
});

vc.run();  // the simplest way to run it forever, use step() to run in your own loop

</script>
</body></html>
```
**[Run this example in your browser](https://glennirwin.github.io/webgp/examples/rainbow-fountain.html)**

## Download ##

Include the library from [rawgit.com](https://rawgit.com/glennirwin/webgp/master/src/webgp.js)
```html
<script src="https://rawgit.com/glennirwin/webgp/master/src/webgp.js"></script>
```
or download and locally include it [Download](https://rawgit.com/glennirwin/webgp/master/src/webgp.js)
or see the [source](https://github.com/glennirwin/webgp) on Github

## License ##
[WebGP](https://github.com/glennirwin/webgp/) is released under the [MIT license](http://opensource.org/licenses/mit-license.php). Glenn Irwin, 2018.

WebGP.js started as a fork of:
[WebGPGPU](https://github.com/npny/webgpgpu/) is released under the [MIT license](http://opensource.org/licenses/mit-license.php). Pierre Boyer, 2017.
