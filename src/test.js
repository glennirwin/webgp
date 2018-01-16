const GP = require("./")();
if (!GP) {
  console.error("No GPU context, exiting");
  return;
}

// Note: This test never gets this far because there is no canvas or gl context in Node.js
// but it does confirm that the WebGP.js file is loading and that we can call it

console.log(GP);
// Create a vertex computer with ONE MILLION particles
// this is a very simple example of a WebGP process
 const vc = new GP.VertexComputer({

        // The number of units/elements/objects etc...
        units: 1e6,

        // define the structure of each unit's data
        struct: {
            position: "vec2",
            velocity: "vec2",
            mass: "int",
            color: "vec3"
        },

        // initialize each objects data with a given object.
        // Note: Use the index i passed in to map your data
        initializeObject: (i) => { return {
            position: [Math.random(),Math.random()],
            velocity: [(Math.random() - .25) / 20,(Math.random() - .25) / 20],
            mass: 1 + Math.random() * 4,
            color: [Math.random(),Math.random(),Math.random()] };
        },

        // update each unit using this shader code
        // Note; make sure to assign all the outputs
        updateStep: {
            glsl: `
                void main() {
                    o_position = i_position + i_velocity;
                    o_velocity = i_velocity - 0.001 * i_position / float(i_mass);
                    o_mass = i_mass;
                    o_color = i_color;
                }  `
        },

        // render each unit by setting the gl_Position and the vertexColor
        renderStep: {
            glsl: `
                void main() {
                    gl_Position = vec4(i_position, 0.0, 1.0);
                    vertexColor = vec4(i_color, .5);
                    gl_PointSize = float(i_mass)/2.0;
                }   `
        }
});

vc.run();  // the simplest way to run
