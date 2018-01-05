if (!Kit) var Kit = {};
Kit.Simplest = {
      model: "QuadShader",
 renderStep: {
        fragment: `
                void main() {
                  vec2 uv = (inverse(u_projection) * vec4((gl_FragCoord.xy/u_resolution.xy * 2.0 - 1.0),1.0,1.0)).xy;
                  fragColor = vec4(uv,0.5+0.5*sin(u_time),1.0);
              }  `
}
}
