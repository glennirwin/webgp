if (!Apps) var Apps = {};

Apps.TextQuadShader =

function (u, blocks, template, fragparams) {		// A text shader that uses GPU to calculate char position and put out texture to be rendered via quad shader
  let line = 0, col = 0, npc = 0; tcols = 30, tlines = 10;
  let text = template.text;
  let instanceArray = new GP.InstanceArray({
      units: text.length,
      divisor: 1,
      struct: { textpos: "vec2", char: "int",  style: "int"  },
      initializeObject: (i) => {
        if (text.charCodeAt(i+npc) === 10 || text.charCodeAt(i+npc) === 13) { line++; col=0; npc++;}
        return { textpos: [col++, line], char: i+npc < text.length ? text.charCodeAt(i+npc) : 0, style: i };
      }
  });
  return new GP.VertexComputer({    // Draw/fill a set of quads specified by an array
      units: 6,
      type: GP.gl.TRIANGLES,
      struct: { position: "vec2" },
      initializeBuffer: GP.Util.quadBuffer(),
      uniforms: u,
      uniformBlocks: blocks,
      instanceArray: instanceArray,
      renderStep: {  glsl: GP.Util.matrixFunctions + `
        out mat4 newproj;

        void main() {
          v_textpos = i_textpos;
          v_char = i_char;
          v_style = i_style;

          ${generateSizingCode(template)}
          newproj = projection(vec4(u_viewport.x+cw*i_textpos.x*wm,u_viewport.y+u_viewport.w-((i_textpos.y+1.0)*ch), cw ,ch));
          gl_Position = newproj * vec4(i_position,0.0,1.0) ;
        }   `, fragment: template.renderStep.fragment,
          fragmentParams: fragparams }
  });
}
