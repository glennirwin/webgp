# [WebGP.js](https://github.com/glennirwin/webgp)
### Forked from: [WebGPGPU](https://github.com/npny/webgpgpu)

![License MIT](https://img.shields.io/badge/license-MIT-lightgrey.svg?style=flat-square)
![ES6](https://img.shields.io/badge/ES-6-lightgrey.svg?style=flat-square)
![WebGL2](https://img.shields.io/badge/WebGL-2-lightgrey.svg?style=flat-square)
![OpenGL ES 3.0](https://img.shields.io/badge/OpenGL-ES%203.0-lightgrey.svg?style=flat-square)

[WebGP](https://github.com/glennirwin/webgp=) is a library that uses [WebGL2](https://www.khronos.org/registry/webgl/specs/latest/2.0/) to enable general purpose computation, visualization, and more using the GPU in your computer right in your web browser (current Chrome and Firefox browsers have WebGL2 support built-in).  All the GL calls are handled by the library for you.  Just get some data, add shader code for your calculation, and hit Go.  This library will let you visit, evaluate, calculate, display, and even update an array of a million or more items in a fraction of a millisecond and your CPU won't even warm up (your GPU will - you have been warned).

WebGP goes beyond WebGPGPU by allowing:
* uniforms of float and int types now supported, other types not fully tested yet
* full control of update steps and iteration counters or just call run()
* VertexComputer updateStep and renderStep in constructor are optional, can use one or both
* can now share vertex arrays between multiple VertexComputer instances using a VertexArray object, or setBuffers()
* update step can capture output into textures and they can be fed back in as uniforms for texture data lookups
* Vertex unit data can now be initialized using a closure returning an object that resembles the structure
* Vertex unit data can be pulled as objects for inspection and easily updated back to the GPU buffer using updateUnit()
* Debug controls for Stop, Go, Step, Slow can be added with Util.createShaderControls("GP") and calling Util.GPControls(loop) in your render loop
* enable simple heads up logging with const log = Util.initializeHeadsUpLog()  - will show on a textarea overlay, a function is returned to allow you to pass messages to the log as in log("Hello World")
* Both controls and heads up logging can be left out for silent production operation (log goes to console)
* Fragment shaders can now be attached to the renderStep to a more rendering capability.  See the Shadertoy examples.

* **[Example using new features](https://glennirwin.github.io/webgp/examples/index.html)**


* **[WebGPGPU Documentation](https://npny.github.io/webgpgpu/docs)**
WebGP documentation coming soon once things settle down a bit

* **[Download](https://rawgit.com/glennirwin/webgp/master/src/webgp.js)**

* **[WebGL2 API](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API#WebGL_2)**

## Examples ##

```javascript
const GP = WebGP(canvas);
const vc = new GP.VertexComputer({

	units: 1e6,
	struct: {
		position: "vec2",
		velocity: "vec2",
		mass: "float",
		color: "vec3"
	},

	initialize: (i, buffer) => {...}

	updateStep: {
		glsl: `
			void main() {
				o_position = i_position + i_velocity;
				o_velocity = i_velocity - 0.001 * i_position / i_mass;
				o_mass = i_mass;
				o_color = i_color;
			}
		`
	},

	renderStep: {
		glsl: `
			void main() {
				gl_Position = vec4(i_position, 0.0, 1.0);
				vertexColor = vec4(i_color, .5);
				gl_PointSize = i_mass/2.0;
			}
		`
	}
	
});
vc.run();
```

[See this example in action here](https://glennirwin.github.io/webgp/examples/rainbow-fountain.html)

The code above creates a `VertexComputer` where many elements can be evaluated and updated very quickly.  The library, relying on Vertex Buffers and OpenGL ES 3.0's Transform Feedback can simulate a simple 1,000,000 particle system. Each particle has its own position, velocity, mass, and color, initially random, and is represented by a coloured point as it falls toward the origin.

## Documentation ##

Documentation is available online [here](https://npny.github.io/webgpgpu/docs) or in markdown form at [master/build/docs](https://github.com/npny/webgpgpu/blob/master/build/docs/index.md)

## Download ##

Include the library from [rawgit.com](https://rawgit.com/glennirwin/webgp/master/src/webgp.js) or download it locally
```html
<script src="https://rawgit.com/glennirwin/webgp/master/src/webgp.js"></script>
<script src="webgp.js"></script>
```

In order to use WebGP in your page, you then need to initialize it with a canvas element and the WebGL2 context will be created automatically:
```html
<canvas id="canvas"></canvas>
<script>
	const canvas = document.getElementById("canvas");
	const GP = WebGP(canvas);

	// Let's get rolling
	new GP.VertexComputer({ units: 1, .... }).run();
</script>
```


## License ##
[WebGP](https://github.com/glennirwin/webgp/) is released under the [MIT license](http://opensource.org/licenses/mit-license.php). Glenn Irwin, 2017.
[WebGPGPU](https://github.com/npny/webgpgpu/) is released under the [MIT license](http://opensource.org/licenses/mit-license.php). Pierre Boyer, 2017.
