if (!Apps) var Apps = {};

Apps.Console =

// Return a simple text console that uses GPU to update and calculate char position and renders characters via quad shader instances
function (u, blocks, template, fragparams) {
  let line = 0, col = 0, npc = 0, tcols = 30, tlines = 10;
  let text = template.text+template.prompt;
  let PROMPT = ">".charCodeAt(0);
  let COMMAND_BUFSIZE = 1024;
  let TEXT_BUFSIZE = 10000;   // Character buffer limit
  let COMMAND_TEXWIDTH = GP.Util.data2d(COMMAND_BUFSIZE);
  let TEXT_TEXWIDTH = GP.Util.data2d(TEXT_BUFSIZE);
  let sizingCode = generateSizingCode(template);

  const retBuf = new Int32Array(64*64);
  const retTex = GP.Util.build1IntTexture(64,64,retBuf);
  const retEmpty = retTex;  // to be able to flip back to empty texture
  u.retTex = retTex;

  // edit command line (with command buffer)
  let CTRL_PIX = 1;
  let commandComputer = new GP.VertexComputer({   // command and command history buffer
      units: COMMAND_BUFSIZE,
      struct:                   {         color: "vec4",              textpos: "vec2",     char: "int",  style: "int", cursor: "int", length: "int", line: "int" },
      initializeObject: (i) => { return { color: [1.0,0.0,0.0,1.0], textpos: [0, 0], char: -1,     style: 0,     cursor: CTRL_PIX,     length: 0,      line: 0 }; },
      uniforms: u,
      uniformBlocks: blocks,
      textureOut: true,
      textureFeedback: "commandTexture",   // will be added to the uniforms and updated for the params
      preStep: function() {
        let k = checkBufferedKey();
        if (k && (k[2]==10 || k[2]==13)) {
          if (!this.requestId) {
            this.requestId = 0;
            this.commandHistory = [];
            this.commandLine = 0;
          }
          let tex = this.getTextureData();  // Capture the active command
          let len = tex[3];  // this is the length of the command in the texture
          let str = [];
          for (let i=0; i<len; i++) str.push(tex[(1+i)*4+3]);  // get the chars
          let cmd = str.map(c => String.fromCharCode(c)).join("").trim();  // assemble to string
          this.commandHistory.push(cmd);
          let resp = "This is a response";
          let ret = [];
          ret.push(resp.length);
          for (let i=0; i<resp.length; i++) ret.push(resp.charCodeAt(i));
          retBuf.set(ret);
          if (this.uniforms.retTex != retEmpty) GP.Util.deleteTexture(this.uniforms.retTex);  // delete the old one
          this.uniforms.retTex = GP.Util.build1IntTexture(64,64,retBuf);  // should update? or replace?
          console.log("Command is "+len+" characters: '"+cmd+"' response=",retBuf);
        } else {
          if (this.uniforms.retTex != retEmpty) {
              GP.Util.deleteTexture(this.uniforms.retTex);  // delete the old one
              this.uniforms.retTex = retEmpty;
          }
        }

      },
      updateStep: {  params: { commandTexture: "sampler2D" },  // could add automagically but useful to note for glsl usage
        glsl: GP.Util.dataTextureMacros + `
        #define NORMAL vec4(0.0,1.0,0.0,1.0)
        #define SELECTED vec4(1.0,1.0,1.0,1.0)

        bool getBit(int value, int location) { if ((value & (1 << location))==0) return false; else return true; }
        vec4 characterAt(int pos) { return TEXTURE_FETCH(u_commandTexture,pos,${COMMAND_TEXWIDTH}); }

        void main() {
          int newcursor = i_cursor;
          vec2 newpos = i_textpos;
          o_char = i_char;
          o_style = i_style;
          o_color = i_color;
          o_length = i_length;
          o_line = i_line;

          bool inserted = false;    // Does insert concern me?
          bool deleted = false;     // Does delete concern me?
          bool execute = false;

          int last = int(characterAt(i_length).w);
          if (last == 10 || last == 13) {                         // executed command
              execute = true;
              o_length = 0;
              newcursor = 1;  // should save the command in buffer here

              if (gl_VertexID >= ${CTRL_PIX} && gl_VertexID <= i_length + ${CTRL_PIX}) {
                o_char = -1;
                o_style = -1;
              }
          }

          // key pressed
          if (u_keyboard.z > 0) {
              if (u_keyboard.z == 10 || u_keyboard.z == 13) {
                newcursor = i_length+${CTRL_PIX};   // return always at end no matter the position
              }
              if (gl_VertexID == newcursor) o_char=u_keyboard.z;
              if (newcursor < gl_VertexID ) inserted=true;
              o_length++;
              newcursor++;
          }

          // home/end keys
          if (u_keyboard.x==36) newcursor=0;           // Home
          if (u_keyboard.x==35) newcursor=o_length+${CTRL_PIX};    // End

          // Arrow keys
          if (u_keyboard.x==39 && newcursor < i_length+${CTRL_PIX})  newcursor++;        // ArrowRight
          if (u_keyboard.x==37 && newcursor > ${CTRL_PIX}) newcursor--;      // ArrowLeft
          if (u_keyboard.x==38) {                                                                                               // ArrowUp scan backward for prev line
//            vec4 cc = characterAt(i_cursor);   // cc = character at cursor position
//            vec4 c;
//            do {
//              newcursor--;
//              c = characterAt(newcursor);
//            } while (c.w > -1.0 && (c.y == cc.y || (c.y == cc.y-1.0 && c.x > cc.x)) && newcursor > 0);
          }
          if (u_keyboard.x==40 && i_cursor < i_length) {                                                                      // ArrowDown scan forward for next line
//            vec4 cc = characterAt(i_cursor);   // cc = character at cursor position
//            vec4 c;
//            do {
//              c = characterAt(newcursor+1);
//            } while (c.w > -1.0 && (c.y == cc.y || (c.y == cc.y+1.0 && c.x <= cc.x)) && ++newcursor < i_length);
          }

          // Backspace/delete
          if (u_keyboard.x==8 && newcursor > ${CTRL_PIX}) { newcursor--; if (newcursor <= gl_VertexID) deleted=true;  o_length--; }  // backspace changes cursor so all must know
          if (u_keyboard.x==46 && newcursor <= i_length) { if (newcursor <= gl_VertexID) deleted=true; o_length--; }        // delete

          if (inserted) {
            vec4 cc = characterAt(newcursor);
            vec4 cb = characterAt(gl_VertexID-1);   // cb = character before
            o_char = int(cb.w);  // I become the one before me so shift everything forward
            o_style = int(cb.z);
            newpos = cb.xy;
            if (newpos.y == cc.y) newpos.x += 1.0;
          }

          if (deleted && gl_VertexID <= i_length) {
            vec4 ca = characterAt(gl_VertexID+1);   // ca = character after
            vec4 cur =  characterAt(newcursor);
            o_char = int(ca.w);  // I become the one after me so shift everything back
            o_style = int(ca.z);
            newpos = ca.xy;
            if (newpos.y == cur.y) newpos.x -= 1.0;    // stuff on same line moves back
          }

          if(gl_VertexID == o_length + 1) {        // position character at end (for the cursor)
            newpos = vec2(o_length,0);
          }

          // Save the attributes
          gl_Position = TEXTURE_POS(gl_VertexID,${COMMAND_TEXWIDTH});
          o_textpos = newpos;
          o_cursor = newcursor < 0 ? 0 : newcursor >= ${COMMAND_BUFSIZE} ? ${COMMAND_BUFSIZE-1} : newcursor;

          if (gl_VertexID < ${CTRL_PIX}) {                                  // Pixel 0 is command summary info
              textureColor = vec4(float(o_cursor),0.0,0.0,float(o_length));
          } else {
              textureColor = vec4(newpos,float(o_style),float(o_char));
          }

      }   ` }
  });

  let instanceComputer = new GP.VertexComputer({   // each character will be defined and maintained by this
      units: TEXT_BUFSIZE,
      struct: { color: "vec4", textpos: "vec2", char: "int",  style: "int", cursor: "int", length: "int", marker: "int", paste: "int"  },
      initializeObject: (i) => {
        if (i < text.length) {  // a simple text layout engine right here
            let r = { color: [0.0,1.0,0.0,1.0], textpos: [col++, line], char: i+npc < text.length ? text.charCodeAt(i+npc) : -1, style: i, cursor: text.length, paste: i, length: text.length, marker: -1 };
            if (text.charCodeAt(i+npc) === 10 || text.charCodeAt(i+npc) === 13) { line++; col=0; }
            return r;
        } else {
            return { color: [0.0,1.0,0.0,1.0], textpos: [col, line], char: -1, style: 0, cursor: text.length, paste: i, length: text.length, marker: -1 };
        }
      },
      uniforms: u,
      uniformBlocks: blocks,
      textureOut: true,
      textureFeedback: "feedbackTexture",   // will be added to the uniforms and updated for the params
      updateStep: {  params: { feedbackTexture: "sampler2D", commandTexture: "sampler2D", retTex: "isampler2D" },  // could add automagically but useful to note for glsl usage
        glsl: GP.Util.dataTextureMacros + `
        #define NORMAL vec4(0.0,1.0,0.0,1.0)
        #define SELECTED vec4(1.0,1.0,1.0,1.0)

        bool getBit(int value, int location) { if ((value & (1 << location))==0) return false; else return true; }
        vec4 characterAt(int pos) { return TEXTURE_FETCH(u_feedbackTexture,pos,${TEXT_TEXWIDTH}); }
        vec4 commandAt(int pos) { return TEXTURE_FETCH(u_commandTexture,pos,${COMMAND_TEXWIDTH}); }

        int responseAt(int pos) { return int(TEXTURE_FETCH(u_retTex,pos,64).x); }

        void main() {
          vec2 newpos = i_textpos;
          o_char = i_char;
          o_style = i_style;
          o_color = i_color;
          o_length = i_length;
          o_marker = i_marker;
          o_paste = i_paste;
          ${sizingCode}

          vec4 commandPix = commandAt(0);
          int commandCursor = int(commandPix.x);
          int commandLength = int(commandPix.w);

          int last = int(commandAt(commandLength).w);
          if (last == 10 || last == 13) {                         // execute command
    //          vec4 cc = characterAt(o_length-1);
              o_length = o_length + commandLength;
    //          if (gl_VertexID==o_length) {                // return
    //            o_char = 10; newpos=vec2(cc.x+1.0,cc.y);
    //          }
    //          if (gl_VertexID==o_length+1) { o_char = -1; newpos=vec2(0.0,cc.y+1.0); } // start of new line for response
    //          o_length += 2;
              o_cursor = o_length;
          } else {
            o_cursor = o_length + commandCursor - 1;
          }

          // insert response
          int resplen = responseAt(0);
          if (resplen > 0 && gl_VertexID >= o_length && gl_VertexID < ${TEXT_BUFSIZE}) {
              vec4 cc = characterAt(o_length);
              int rc = responseAt(gl_VertexID-o_length+1);
              o_char = rc;
              o_style = 0;
              newpos=vec2(float(gl_VertexID-o_length) , cc.y+1.0);
              o_length = o_length + resplen;
          }

          // put current command line at end
          if (commandLength > 0 && gl_VertexID >= o_length && gl_VertexID < o_length + commandLength) {
              vec4 cc = characterAt(o_length);
              vec4 cmd = commandAt(gl_VertexID-o_length+1);
              o_char=int(cmd.w);
              o_style=int(cmd.z);
              newpos=vec2(cc.x+cmd.x , cc.y);
          }

          // clear last char (if command is shortened)
          if (gl_VertexID == o_length + commandLength) {
              o_char = -1;
              o_style = 0;
          }

          if (o_char == -1) {
            vec4 cb = characterAt(gl_VertexID-1);
            newpos = vec2(cb.x+1.0,cb.y);
          }

          // Save the attributes
          o_textpos = newpos;
          gl_Position = TEXTURE_POS(gl_VertexID,${TEXT_TEXWIDTH});
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
  let textQuadComputer = new GP.VertexComputer({    // Draw/fill a set of quads specified by an array
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

  return [commandComputer,textQuadComputer];  // computers returned in an array are processed in order
}
