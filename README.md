# [WebGP](https://github.com/glennirwin/webgp)
## Forked from: [WebGPGPU](https://github.com/npny/webgpgpu)

![License MIT](https://img.shields.io/badge/license-MIT-lightgrey.svg?style=flat-square)
![ES6](https://img.shields.io/badge/ES-6-lightgrey.svg?style=flat-square)
![WebGL2](https://img.shields.io/badge/WebGL-2-lightgrey.svg?style=flat-square)
![OpenGL ES 3.0](https://img.shields.io/badge/OpenGL-ES%203.0-lightgrey.svg?style=flat-square)

[WebGP](https://github.com/glennirwin/webgp=) is a [WebGL2](https://www.khronos.org/registry/webgl/specs/latest/2.0/) based library enabling general purpose computation and visualization using the GPU in your computer.

* **[Examples](https://npny.github.io/webgpgpu/examples)**
* **[Documentation](https://npny.github.io/webgpgpu/docs)**
* **[Download](https://rawgit.com/npny/webgpgpu/master/src/webgpgpu.js)**
* **[Technology](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API#WebGL_2)**

## Examples ##

```javascript
const GP = WebGP(context);
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

[See this example in action here](https://glennirwin.github.io/webgp/examples/rainbow-fountain)

The code above uses a `VertexComputer` (a particular way of computing stuff provided by the library, relying on Vertex Buffers and OpenGL ES 3.0's Transform Feedback) to simulate a simple 800,000 particle system. Each particle has its own position, velocity, mass, and color, initially random, and is represented by a coloured point as it falls toward the origin.

## Documentation ##

Documentation is available online [here](https://npny.github.io/webgpgpu/docs) or in markdown form at [master/build/docs](https://github.com/npny/webgpgpu/blob/master/build/docs/index.md)

## Download ##

Include the library from [rawgit.com](https://rawgit.com/glennirwin/webgp/master/src/webgp.js) or download it locally
```html
<script src="https://rawgit.com/glennirwin/webgp/master/src/webgp.js"></script>
<script src="src/webgp.js"></script>
```

In order to use WebGPGPU in your page, you then need to initialize it with an existing, valid WebGL2 context:
```html
<canvas id="canvas"></canvas>
<script>
	const canvas = document.getElementById("canvas");
	const context = canvas.getContext("webgl2");
	const WGU = WebGPGPU(context);

	// Let's get rolling
	new WGU.VertexFeedbackComputer();
</script>
```


## License ##

[WebGPGPU](https://github.com/npny/webgpgpu/) is released under the [MIT license](http://opensource.org/licenses/mit-license.php). Pierre Boyer, 2017.
