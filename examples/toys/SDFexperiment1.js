if (!Kit) var Kit = {};
Kit.SDFexperiment1 = {
      model: "quad",
 renderStep: {
        fragment: `
                void main() {
                  vec2 st = (inverse(u_projection) * vec4((gl_FragCoord.xy/u_resolution.xy * 2.0 - 1.0),1.0,1.0)).xy;

                  vec3 color = vec3(0.0);

                  // bottom-left
                  vec2 bl = smoothstep(vec2(-1.0),vec2(0.2),st);
                  float pct = bl.x * bl.y;

                  // top-right
                   vec2 tr = smoothstep(vec2(-1.0),vec2(0.2),1.0-st);
                   pct *= tr.x * tr.y;

                  color = vec3(pct); // + vec3(0.1,0.1,0.2);
                  if (pct > 0.2) {
                    fragColor = vec4(color,0.7);
                  }
              }
                `
}
}
