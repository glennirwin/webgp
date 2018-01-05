if (!Apps) var Apps = {};

Apps.QuadShader =

function (u, blocks, template, fragparams) {		// A vanilla quad shader that uses the viewports projection
  return new GP.VertexComputer({
      units: 6,
      type: GP.gl.TRIANGLES,
      struct: { position: "vec2" },
      uniforms: u,
      uniformBlocks: blocks,
      initializeBuffer: GP.Util.quadBuffer(),
      renderStep: {  glsl: `void main() {  gl_Position = u_projection * vec4(i_position,0.0,1.0); 	}   `, fragment: template.renderStep.fragment, fragmentParams: fragparams }
  });
}
