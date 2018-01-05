if (!Apps) var Apps = {};
Apps.ImageShader =

function (u, blocks, template, fragparams) {
  let texname = Object.keys(template.textures)[0];
  if (!texname) throw new Error("Must have a texture to load");
  return new GP.VertexComputer({
      units: 6,
      type: GP.gl.TRIANGLES,
      struct: { position: "vec2" },
      uniforms: u,
      uniformBlocks: blocks,
      initializeBuffer: GP.Util.quadBuffer(),
      renderStep: {  glsl: `void main() {  gl_Position = u_projection * vec4(i_position,0.0,1.0); 	}   `,
      fragment: `
              void main() {
                  vec2 uv = ((inverse(u_projection) * vec4((gl_FragCoord.xy/u_resolution.xy * 2.0 - 1.0),0.0,1.0)).xy + 1.0) / 2.0;
                  fragColor = texture(u_`+texname+`, vec2(uv.x,1.0-uv.y));  // needed to invert to get pictures to show right side up
              }`,
      fragmentParams: { [texname]: "sampler2D"} }
  });
}
