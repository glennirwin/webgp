if (!Apps) var Apps = {};

Apps.TextEditor =

// Return a simple text editor/shader that uses GPU to update and calculate char position and renders characters via quad shader instances
function (u, blocks, template, fragparams) {
  let line = 0, col = 0, npc = 0, tcols = 30, tlines = 10;
  let text = template.text;
  let units = text.length * 2;   // Double the space should give room for inserting
  let texWidth = GP.Util.data2d(units);
  let sizingCode = generateSizingCode(template);
  let instanceComputer = new GP.VertexComputer({   // each character will be handled separately
      units: units,
      struct: { color: "vec4", textpos: "vec2", char: "int",  style: "int", cursor: "int", length: "int", marker: "int", paste: "int"  },
      initializeObject: (i) => {
        if (i < text.length) {  // a simple text layout engine right here
            let r = { color: [1.0,1.0,1.0,1.0], textpos: [col++, line], char: i+npc < text.length ? text.charCodeAt(i+npc) : -1, style: i, cursor: 0, paste: i, length: text.length, marker: -1 };
            if (text.charCodeAt(i+npc) === 10 || text.charCodeAt(i+npc) === 13) { line++; col=0; }
            return r;
        } else {
            return { color: [1.0,1.0,1.0,1.0], textpos: [col, line], char: -1, style: 0, cursor: 0, paste: i, length: text.length, marker: -1 };
        }
      },
      uniforms: u,
      uniformBlocks: blocks,
      textureOut: true,
      textureFeedback: "feedbackTexture",   // will be added to the uniforms and updated for the params
      updateStep: {  params: { feedbackTexture: "sampler2D" },  // could add automagically but useful to note for glsl usage
        glsl: GP.Util.dataTextureMacros + `
        #define NORMAL vec4(1.0,1.0,1.0,1.0)
        #define SELECTED vec4(0.0,0.0,1.0,1.0)

        bool getBit(int value, int location) { if ((value & (1 << location))==0) return false; else return true; }
        vec4 characterAt(int pos) { return TEXTURE_FETCH(u_feedbackTexture,pos,${texWidth}); }

        void main() {
          int newcursor = i_cursor;
          vec2 newpos = i_textpos;
          o_char = i_char;
          o_style = i_style;
          o_color = i_color;
          o_length = i_length;
          o_marker = i_marker;
          o_paste = i_paste;
          ${sizingCode}

          bool inserted = false;    // Does insert concern me?
          bool deleted = false;     // Does delete concern me?

          bool shiftdown = getBit(u_keyboard.w,0);
          bool ctrldown = getBit(u_keyboard.w,1);
          bool altdown = getBit(u_keyboard.w,2);

          // Shift/Control modes
          if (u_keyboard.x == 16) { if (i_marker == -1) { o_marker=i_cursor; }  }
          if (u_keyboard.y == 16) { if (i_marker == i_cursor) { o_marker=-1; } }

          // key pressed
          if (u_keyboard.z > 0) { if (gl_VertexID == i_cursor) o_char=u_keyboard.z; if (i_cursor < gl_VertexID ) inserted=true; o_length=i_length+1; newcursor++; }

          // home/end keys
          if (u_keyboard.x==36 && ctrldown) newcursor=0;           // Home NOTE: Home-sol Ctrl-Home-sod shift-Home select
          if (u_keyboard.x==36 && !ctrldown && newcursor > 0) {           // Home - no ctrl - beginning of line
            vec4 cc = characterAt(i_cursor);
            if (cc.x > 0.0) {  // do nothing if at start
                vec4 c;   do {
                  newcursor--;
                  c = characterAt(newcursor);
                } while ((c.y == cc.y && c.x > 0.0) && newcursor > 0);
            }
          }
          if (u_keyboard.x==35 && ctrldown) newcursor=i_length;    // End
          if (u_keyboard.x==35 && !ctrldown && newcursor < i_length) {           // End - no ctrl - end of line
            vec4 cc = characterAt(i_cursor);
            if (!(cc.w==10.0||cc.w==13.0)) {   // no advance on a return
                vec4 c;   do {
                  newcursor++;
                  c = characterAt(newcursor);
                } while (c.y == cc.y && !(c.w==10.0||c.w==13.0) && newcursor < i_length);
            }
          }

          // Arrow keys
          if (u_keyboard.x==39 && i_cursor < i_length)  newcursor++;  // ArrowRight
          if (u_keyboard.x==37 && i_cursor > 0) newcursor--;          // ArrowLeft
          if (u_keyboard.x==38) {                                                                                               // ArrowUp scan backward for this x position on the prev line
            vec4 cc = characterAt(i_cursor);   // cc = character at cursor position
            vec4 c;
            do {
              newcursor--;
              c = characterAt(newcursor);
            } while (c.w > -1.0 && (c.y == cc.y || (c.y == cc.y-1.0 && c.x > cc.x)) && newcursor > 0);
          }
          if (u_keyboard.x==40 && i_cursor < i_length) {                                                                      // ArrowDown scan forward for this x position on the next line
            vec4 cc = characterAt(i_cursor);   // cc = character at cursor position
            vec4 c;
            do {
              c = characterAt(newcursor+1);
            } while (c.w > -1.0 && (c.y == cc.y || (c.y == cc.y+1.0 && c.x <= cc.x)) && ++newcursor < i_length);
          }

        // marker logic
        if (!shiftdown && o_marker > -1 && newcursor != i_cursor) o_marker = -1;  // cancel marker if cursor moved without shiftdown
        if (o_marker == -1) o_color=NORMAL;
        if (o_marker > -1 && o_marker < newcursor) o_color=(gl_VertexID >= o_marker && gl_VertexID < newcursor) ? SELECTED : NORMAL;
        if (o_marker > -1 && o_marker > newcursor) o_color=(gl_VertexID <= o_marker && gl_VertexID > newcursor) ? SELECTED : NORMAL;

        // backspace/delete with marker
        if ((u_keyboard.x==8 || u_keyboard.x==46) && o_marker > -1 && o_marker != i_cursor) {  // backspace and delete are same when there is a selection i_marker
            int frv = min(i_cursor,i_marker);
            int tov = max(i_cursor,i_marker)-1;
            vec4 fr = characterAt(frv);
            vec4 to = characterAt(tov);

            if (shiftdown) {    // Cut operation (copy to end of buffer)
              int cut = tov - frv;
              o_paste = cut;
              if (gl_VertexID > ${units}- cut) {
                int ccv = frv + cut - (${units} - gl_VertexID);
                vec4 cc =  characterAt(ccv);
                o_char = int(cc.w);
                o_style = int(cc.z);
                newpos = vec2(-100.0+cc.x,cc.y);
              } else if (gl_VertexID > i_length) {    // clear space between buffers
                o_char = -1;
                o_style = -1;
                newpos = vec2(-1.0,-1.0);
              }
            }
            // delete marked text
            if (gl_VertexID >= i_cursor || gl_VertexID >= i_marker) {
                int cav = gl_VertexID+abs(i_cursor-i_marker);
                if (cav < ${units}) {  // can't pull from past the buffer
                  vec4 ca =  characterAt(cav);
                  o_char = int(ca.w);
                  o_style = int(ca.z);
                  newpos = ca.xy;
                  newpos.y -= abs(fr.y-to.y);
                  if (newpos.y == fr.y) newpos.x = newpos.x - to.x + fr.x - 1.0;  // position at end of line
                }
            }
            newcursor = min(i_cursor,i_marker);
            o_marker = -1;
        } else {          // single backspace/delete (no marker)
            if (u_keyboard.x==8 && i_cursor > 0) { newcursor--; if (newcursor <= gl_VertexID) deleted=true;  o_length = i_length - 1; }  // backspace changes cursor so all must know
            if (u_keyboard.x==46 && i_cursor < i_length) { if (i_cursor <= gl_VertexID) deleted=true; o_length = i_length - 1; }        // delete

            if (inserted) {
              vec4 cc = characterAt(i_cursor);
              vec4 cb = characterAt(gl_VertexID-1);   // cb = character before
              o_char = int(cb.w);  // I become the one before me so shift everything forward
              o_style = int(cb.z);
              newpos = cb.xy;
              if (u_keyboard.z==13 || u_keyboard.z==10) {                        // inserting a return moves lines down
                if (newpos.y == cc.y) newpos.x -= cc.x;
                newpos.y += 1.0;
              } else {                                  // stuff on same line moves forward
                if (newpos.y == cc.y) newpos.x += 1.0;
              }
            }

            if (deleted && gl_VertexID <= i_length && newcursor <= gl_VertexID) {
              vec4 ca = characterAt(gl_VertexID+1);   // ca = character after
              vec4 cur =  characterAt(newcursor);
              o_char = int(ca.w);  // I become the one after me so shift everything back
              o_style = int(ca.z);
              newpos = ca.xy;
              if (cur.w == 10.0 || cur.w == 13.0) {
                newpos.y -= 1.0;
                if (newpos.y == cur.y) newpos.x += cur.x;  // position at end of line
              } else {
                if (newpos.y == cur.y) newpos.x -= 1.0;    // stuff on same line moves back
              }
            }
        }


        // mouse click to locate cursor and selection (incomplete)
        if (u_clicks == 1) {   // find the closest character on the line - TODO: not very accurate
          vec2 m = (u_mouse.xy + 1.0) / 2.0;
          float line = ((1.0-m.y)/(ch*2.0)) / 2.0;
          float col = m.x/(cw*2.0*wm) /2.0;
          float dist = 2.0;
          int cchar = -1;
          for (int i=0;i<${units};i++) {
            vec4 c = characterAt(i);
            float d = distance(c.xy,vec2(col,line));
            if (d < dist) {
              dist = d;
              cchar = i;
            }
          }
          if (cchar > -1) newcursor = cchar;
        }

        // Save the attributes
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
      bool getBit(int value, int location) { if ((value & (1 << location))==0) return false; else return true; }
      void main() {
          ${sizingCode}
          if (i_cursor == gl_VertexID) {
            gl_Position =  projection(vec4(u_viewport.x+cw*i_textpos.x*wm,u_viewport.y+u_viewport.w-((i_textpos.y+1.0)*ch), cw , ch)) * vec4(-1.0*wm,0.0,0.0,1.0) + jitterV(ch);
            gl_PointSize = getBit(u_keyboard.w, 0) || getBit(u_keyboard.w, 1) || getBit(u_keyboard.w, 3) ? 8.0 : 4.0;
            vertexColor = getBit(u_keyboard.w, 0) ? vec4(1.0,0.0,0.0,0.9) : getBit(u_keyboard.w, 1) ? vec4(0.0,1.0,0.0,0.9) : getBit(u_keyboard.w, 2) ? vec4(0.0,0.0,1.0,0.9) : vec4(1.0,1.0,1.0,0.9);
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
