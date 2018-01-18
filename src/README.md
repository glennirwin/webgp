# [WebGP.js](https://github.com/glennirwin/webgp)

#### "If some things can be made simple, complex things can be possible"

![License MIT](https://img.shields.io/badge/license-MIT-lightgrey.svg?style=flat-square)
![ES6](https://img.shields.io/badge/ES-6-lightgrey.svg?style=flat-square)
![WebGL2](https://img.shields.io/badge/WebGL-2-lightgrey.svg?style=flat-square)
![OpenGL ES 3.0](https://img.shields.io/badge/OpenGL-ES%203.0-lightgrey.svg?style=flat-square)

[WebGP.js](https://github.com/glennirwin/webgp=) is a JavaScript library for GPU computation and visualization using [WebGL2](https://www.khronos.org/registry/webgl/specs/latest/2.0/)

**See [Home Page](https://github.com/glennirwin/webgp) for description and features**

**[Demo gallery](https://glennirwin.github.io/webgp/examples/index.html)**

## Instructions ##

* Include the library from [rawgit.com](https://rawgit.com/glennirwin/webgp/master/src/webgp.js)
```html
<script src="https://rawgit.com/glennirwin/webgp/master/src/webgp.js"></script>
```
or [download](https://rawgit.com/glennirwin/webgp/master/src/webgp.js) and locally include it
or copy/clone the [source](https://github.com/glennirwin/webgp) on Github.  
Only the one file is needed and there are no dependencies other than WebGL2 support in the browser

* Read the sample code below and try it out locally
* Check out the other code [examples](https://glennirwin.github.io/webgp/examples)
* Read the [API documentation](https://github.com/glennirwin/webgp/src/API.md)

## Example Code ##

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

## License ##
[WebGP](https://github.com/glennirwin/webgp/) is released under the [MIT license](http://opensource.org/licenses/mit-license.php). Glenn Irwin, 2018.

WebGP.js started as a fork of:
[WebGPGPU](https://github.com/npny/webgpgpu/) is released under the [MIT license](http://opensource.org/licenses/mit-license.php). Pierre Boyer, 2017.
