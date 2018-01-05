if (!Apps) var Apps = {};

Apps.TextEditor =

function (u, blocks, template, fragparams) {		// A text shader that uses GPU to calculate char position and put out texture to be rendered via quad shader
  let line = 0, col = 0, npc = 0, tcols = 30, tlines = 10;
  let text = template.text;
  let units = text.length + 100;
  let texWidth = GP.Util.data2d(units);
  let sizingCode = generateSizingCode(template);
  let instanceComputer = new GP.VertexComputer({   // each character will be handled separately
      units: units,
      struct: { color: "vec4", textpos: "vec2", char: "int",  style: "int", cursor: "int", length: "int", marker: "int"  },
      initializeObject: (i) => {
        if (i < text.length) {  // a simple text layout engine right here
            let r = { color: [0.2,1.0,0.2,1.0], textpos: [col++, line], char: i+npc < text.length ? text.charCodeAt(i+npc) : -1, style: i, cursor: 0, index: i, length: text.length, marker: 0 };
            if (text.charCodeAt(i+npc) === 10 || text.charCodeAt(i+npc) === 13) { line++; col=0; }
            return r;
        } else {
            return { color: [0.2,1.0,0.2,1.0], textpos: [col, line], char: -1, style: 0, cursor: 0, index: i, length: text.length, marker: 0 };
        }
      },
      uniforms: u,
      uniformBlocks: blocks,
      textureOut: true,
      textureFeedback: "feedbackTexture",   // will be added to the uniforms and updated for the params
      updateStep: {  params: { feedbackTexture: "sampler2D" },  // could add automagically but useful to note for glsl usage
        glsl: GP.Util.dataTextureMacros + `
        void main() {
          int newcursor = i_cursor;
          vec2 newpos = i_textpos;
          o_char = i_char;
          o_style = i_style;
          o_color = i_color;
          o_length = i_length;
          o_marker = i_marker;
          ${sizingCode}

          vec4 cc = TEXTURE_FETCH(u_feedbackTexture,newcursor,${texWidth});   // cc = character at cursor position

          bool inserted = false;
          bool deleted = false;

          #define INSERT_LETTER(k,l) o_char = k >= 512 ? l : l + 32;
          #define INSERT_SYMBOL(l) o_char = l;
          #define LETTER(k,l) if (k > 1) { if (gl_VertexID == i_cursor) INSERT_LETTER(k,l); if (i_cursor < gl_VertexID ) inserted=true; o_length = i_length + 1; newcursor++; }
          #define SYMBOL(k,l) if (k == 2) { if (gl_VertexID == i_cursor) INSERT_SYMBOL(l); if (i_cursor < gl_VertexID ) inserted=true; o_length = i_length + 1; newcursor++; }
          #define SHIFT_SYMBOL(k,l) if (k == 512) { if (gl_VertexID == i_cursor) INSERT_SYMBOL(l); if (i_cursor < gl_VertexID ) inserted=true; o_length = i_length + 1; newcursor++; }

          SYMBOL(u_Enter,10)  // Symbol keys

          SYMBOL(u_Space,32)  // Symbol keys
          SYMBOL(u_Digit0,48)
          SYMBOL(u_Digit1,49)
          SYMBOL(u_Digit2,50)
          SYMBOL(u_Digit3,51)
          SYMBOL(u_Digit4,51)
          SYMBOL(u_Digit5,53)
          SYMBOL(u_Digit6,54)
          SYMBOL(u_Digit7,55)
          SYMBOL(u_Digit8,56)
          SYMBOL(u_Digit9,57)

          SHIFT_SYMBOL(u_Digit1,33)  // !
          SHIFT_SYMBOL(u_Digit2,64)  // @

          LETTER(u_KeyA,65)    // Key pressed keys
          LETTER(u_KeyB,66)
          LETTER(u_KeyC,67)
          LETTER(u_KeyD,68)
          LETTER(u_KeyE,69)
          LETTER(u_KeyF,70)
          LETTER(u_KeyG,71)
          LETTER(u_KeyH,72)
          LETTER(u_KeyI,73)
          LETTER(u_KeyJ,74)
          LETTER(u_KeyK,75)
          LETTER(u_KeyL,76)
          LETTER(u_KeyM,77)
          LETTER(u_KeyN,78)
          LETTER(u_KeyO,79)
          LETTER(u_KeyP,80)
          LETTER(u_KeyQ,81)
          LETTER(u_KeyR,82)
          LETTER(u_KeyS,83)
          LETTER(u_KeyT,84)
          LETTER(u_KeyU,85)
          LETTER(u_KeyV,86)
          LETTER(u_KeyW,87)
          LETTER(u_KeyX,88)
          LETTER(u_KeyY,89)
          LETTER(u_KeyZ,90)

          if (u_ArrowRight > 0 && i_cursor < i_length) newcursor++;
          if (u_ArrowLeft > 0 && i_cursor > 0) newcursor--;

          if (u_ArrowUp > 0) {   // scan backward for this x position on the prev line
            vec4 c;
            do {
              newcursor--;
              c = TEXTURE_FETCH(u_feedbackTexture,newcursor,${texWidth});
            } while (c.w > -1.0 && (c.y == cc.y || (c.y == cc.y-1.0 && c.x > cc.x)) && newcursor > 0);
          }

          if (u_ArrowDown > 0 && i_cursor < i_length) {   // scan forward for this x position on the next line
            vec4 c;
            do {
              c = TEXTURE_FETCH(u_feedbackTexture,newcursor+1,${texWidth});
            } while (c.w > -1.0 && (c.y == cc.y || (c.y == cc.y+1.0 && c.x <= cc.x)) && ++newcursor < ${units});
          }

        if (u_Backspace == 1 && i_cursor > 0) { newcursor--; if (newcursor <= gl_VertexID) deleted=true;  o_length = i_length - 1; }  // backspace changes cursor so all must know
        if (u_Delete == 1 && i_cursor < i_length) { if (i_cursor <= gl_VertexID) deleted=true; o_length = i_length - 1; }

        if (inserted) {
          vec4 cb = TEXTURE_FETCH(u_feedbackTexture,gl_VertexID-1,${texWidth});   // cb = character before
          o_char = int(cb.w);  // I become the one before me so shift everything forward
          o_style = int(cb.z);
          newpos = cb.xy;
          if (u_Enter == 2) {                        // inserting a return moves lines down
            if (newpos.y == cc.y) newpos.x -= cc.x;
            newpos.y += 1.0;
          } else {                                  // stuff on same line moves forward
            if (newpos.y == cc.y) newpos.x += 1.0;
          }
        }

        if (deleted && gl_VertexID <= i_length && newcursor <= gl_VertexID) {
          vec4 ca = TEXTURE_FETCH(u_feedbackTexture,gl_VertexID+1,${texWidth});   // ca = character after
          vec4 cur = newcursor==i_cursor ? cc : TEXTURE_FETCH(u_feedbackTexture,newcursor,${texWidth});   // cc = character at cursor position if moved (backspace)
          o_char = int(ca.w);  // I become the one after me to shift everything back
          o_style = int(ca.z);
          newpos = ca.xy;
          if (cur.w == 10.0 || cur.w == 13.0) {
            newpos.y -= 1.0;
            if (newpos.y == cur.y) newpos.x += cur.x;  // position at end of line
          } else {
            if (newpos.y == cur.y) newpos.x -= 1.0;    // stuff on same line moves back
          }
        }

        if (u_clicks == 1) {   // find the closest character on the line - TODO: not very accurate
          vec2 m = (u_mouse.xy + 1.0) / 2.0;
          float line = ((1.0-m.y)/(ch*2.0)) / 2.0;
          float col = m.x/(cw*2.0*wm) /2.0;
          float dist = 2.0;
          int cchar = -1;
          for (int i=0;i<${units};i++) {
            vec4 c = TEXTURE_FETCH(u_feedbackTexture,i,${texWidth});
            float d = distance(c.xy,vec2(col,line));
            if (d < dist) {
              dist = d;
              cchar = i;
            }
          }
          if (cchar > -1) newcursor = cchar;
        }

        o_textpos = newpos;
        o_cursor = newcursor < 0 ? 0 : newcursor >= ${units} ? ${units-1} : newcursor;
        gl_Position = TEXTURE_POS(gl_VertexID,${texWidth});
        textureColor = vec4(newpos,float(o_style),float(o_char));
      }   ` },
        renderStep: {			                                            // Renders the cursor at the insert position
            glsl: GP.Util.matrixFunctions + GP.Util.cornerVectors+`
      #define POINTSIZE_MAX 10.0
      #define CLICKED_COLOR vec4(1.0,1.0,1.0,0.6)
      #define HOVER_COLOR vec4(0.0,1.0,0.0,0.6)
      #define TIME_MULT 30.0    // Animations per second
      vec4 jitterV(float ch) {	return vec4(0.0,sin(u_time*TIME_MULT)*ch/3.0,0.,0.);	}  // only vertically for insert cursor
      void main() {
          ${sizingCode}
          if (i_cursor == gl_VertexID) {
            gl_Position =  projection(vec4(u_viewport.x+cw*i_textpos.x*wm,u_viewport.y+u_viewport.w-((i_textpos.y+1.0)*ch), cw , ch)) * vec4(-1.0*wm,0.0,0.0,1.0) + jitterV(ch);
            gl_PointSize = 4.0;
            vertexColor = vec4(1.0,1.0,1.0,0.9);
          }
      }`}
  });

// addItem([createTextureShader(u,[viewBlock()],"feedbackTexture")],100.0);  // Uncomment to see the texture

  return new GP.VertexComputer({    // Draw/fill a set of quads specified by an array
      units: 6,
      type: GP.gl.TRIANGLES,
      struct: { position: "vec2" },
      initializeBuffer: GP.Util.quadBuffer(),
      uniforms: u,
      uniformBlocks: blocks,
      instanceComputer: instanceComputer,
      renderStep: {  glsl: GP.Util.matrixFunctions + `
        out mat4 newproj;
        void main() {
          v_textpos = i_textpos;
          v_char = i_char;
          v_style = i_style;
          v_cursor = i_cursor;
          v_color = i_color;
          ${sizingCode}
          newproj = projection(vec4(u_viewport.x+cw*i_textpos.x*wm,u_viewport.y+u_viewport.w-((i_textpos.y+1.0)*ch), cw ,ch));
          gl_Position = newproj * vec4(i_position,0.0,1.0) ;
        }   `, fragment: template.renderStep.fragment,
          fragmentParams: fragparams }
  });
}
