// WebGP-vm  a simple viewport manager for GPU applications
const GP = WebGP();

let MIN_ITEM = 4;
let START_ITEM = MIN_ITEM;
const VIEWPORT_MAX = 1000;		// Max number of viewports
const MULTICLICK_MS = 330;	// ms delay to count clicks

const fileTargets = [              // where to send dragged and dropped files
   { type: "image", kit: "Image", uniformName: "image"}
  ,{ type: "text", kit: "TextEdit", uniformName: "text"}
  ,{ type: "audio", kit: "FirstAudio", uniformName: "iChannel0"}
];

var audioCtx;

// Comment this block to hide the log and controls
//let log = GP.Util.initializeHeadsUpLog();
let addNewItem = false;
GP.Util.createShaderControls("GP");
GP.Util.createButton("+", "addSomething();");
let stats = document.createElement("paragraph");
stats.setAttribute("style","font-size: x-small;");
stats.appendChild(document.createTextNode(""));
GP.Util.buttondiv.appendChild(stats);

const inputBlock = new GP.UniformBlock({		// This block is sent to the viewporter to relay to all blocks
    struct: {
				mouse: "vec4"
        ,date: "vec4"
				,resolution: "vec2"
				,delta: "float"
        ,clicks: "int"
        ,wheel: "vec2"
    },
    initialize: {
				 mouse: [0.0,0.0,0.0,0.0]
        ,date: [0.0,0.0,0.0,0.0]  // Date x=year, y=month, z=day, w=seconds in day
        ,resolution: [GP.canvas.clientWidth, GP.canvas.clientHeight]
				,delta: 0.0
        ,clicks: 0
        ,wheel: [0.0,0.0]
    }
});

// Feed mouse events into the inputBlock data
let clickTime = 0.0, clicks = 0, mouse = [0.0, 0.0, 0.0, 0.0], wheel = [0.0, 0.0], drag=false; dragFrom=[0,0];
window.addEventListener('mousemove', e => { mouse[0]=e.clientX; mouse[1]=GP.canvas.clientHeight-e.clientY; });   // if(e.buttons===0) drag=false;
window.addEventListener('mouseup', e => { drag=false; mouse[2]=0.0; mouse[3]=0.0; });
window.addEventListener('mousedown', e => { clicks=(Date.now()-clickTime<=MULTICLICK_MS)?clicks+1:1; clickTime=Date.now(); drag=true; dragFrom=[e.clientX,GP.canvas.clientHeight-e.clientY]});
window.addEventListener('wheel', e => { wheel=[e.deltaX, e.deltaY]; }, { passive: true });

// Resize updates the GL viewport and the resolution in the uniform block
window.addEventListener('resize', event => {
	GP.canvas.width = window.innerWidth - 1;
	GP.canvas.height = window.innerHeight - 1;
	GP.gl.viewport(0, 0, GP.canvas.clientWidth, GP.canvas.clientHeight);
	inputBlock.set({ resolution: [GP.canvas.clientWidth, GP.canvas.clientHeight]});
});

// Feed keyboard events to the keyboardBlock and keybufferBlock
const keybufferBlock = new GP.UniformBlock({		                  // for serialized keyboard actions (will come one at a time)
    struct: {	keyboard: "ivec4" }   // x=down, y=up, z=pressed, w=bits(shift=1,ctrl=2,alt=4)
});
const keyboardBlock = new GP.UniformBlock({		         // for direct keyboard sensing (names must correspond to values returned from keyevent.code)
    struct: {
				ArrowDown: "int", ArrowUp: "int",	ArrowLeft: "int", ArrowRight: "int", Escape: "int", Enter: "int", Minus: "int", Equal: "int", Delete: "int",
        Backslash: "int", Insert: "int", Home: "int", End: "int",  PageUp: "int", PageDown: "int", Space: "int", Backspace: "int", Tab: "int",
        F1: "int", F2: "int", F3: "int", F4: "int", F5: "int", F6: "int", F7: "int", F8: "int", F9: "int", F10: "int", F11: "int", F12: "int",
        ShiftLeft: "int",  ShiftRight: "int", ControlLeft: "int", ControlRight: "int", AltLeft: "int", AltRight: "int",
        Digit1: "int",  Digit2: "int",  Digit3: "int", Digit4: "int", Digit5: "int", Digit6: "int", Digit7: "int", Digit8: "int", Digit9: "int", Digit0: "int",
        KeyA: "int", KeyB: "int", KeyC: "int", KeyD: "int", KeyE: "int", KeyF: "int", KeyG: "int", KeyH: "int", KeyI: "int", KeyJ: "int",
        KeyK: "int", KeyL: "int", KeyM: "int", KeyN: "int", KeyO: "int", KeyP: "int", KeyQ: "int", KeyR: "int", KeyS: "int", KeyT: "int",
        KeyU: "int", KeyV: "int", KeyW: "int", KeyX: "int", KeyY: "int", KeyZ: "int"
    }
});
const LOG_KEYS = false, LOG_BUFFERED_KEYS = false;
const keybuffer = [];  // list of keybufferBlock updates to send one at a time
let keybufferCleared=true, lastModifier=0;   // flag to avoid repeatedly updating the keybufferBlock with zeros, lastModifier does same for shift/ctrl/alt keys while held down
const keysToClear = [];  // to clear code after sending event
const KEYMULT_DOWN = 1, KEYMULT_UP = -1, KEYMULT_PRESS = 2;  // Keymultipliers applied to numbers in keyboardblock to indicate event type
function bufferModifier(e) { return e.shiftKey*1 + e.ctrlKey*2 + e.altKey*4 }
function keyToBuffer(e,t) { if (16<=e.keyCode && e.keyCode<=18 && bufferModifier(e)===lastModifier) return; keybufferCleared=false; lastModifier=bufferModifier(e); keybuffer.push({ keyboard: [ t===KEYMULT_DOWN?e.keyCode:0.0, t===KEYMULT_UP?e.keyCode:0.0, t===KEYMULT_PRESS?e.keyCode:0.0, lastModifier ] }); }
function keyModifier(e) { return e.altKey && e.shiftKey ? 2048 : e.ctrlKey && e.shiftKey ? 4096 : e.ctrlKey && e.altKey ? 8192 :e.altKey ? 256 : e.shiftKey ? 512 : e.ctrlKey ? 1024 : 1; }
function keyEvent(e,km) { keyToBuffer(e,km); keyboardBlock.setWrite( {[e.code]: km * keyModifier(e)} ); keysToClear.push(e.code); }
function logKey(t,e) { console.log("key"+t+" "+(e.altKey?"~":"")+(e.ctrlKey?"^":"")+(e.shiftKey?"_":"")+e.key+"  "+e.key.charCodeAt(0)+"  "+e.keyCode+"  "+e.code); }
function clearKeys() { while (keysToClear.length > 0) { keyboardBlock.setWrite( { [keysToClear[0]]: 0} ); keysToClear.splice(0,1); } }
function nextBufferedKey() { if (keybuffer.length>0) { if (LOG_BUFFERED_KEYS) console.log("BufferedKey:"+keybuffer[0].keyboard); keybufferBlock.setWrite(keybuffer.shift()); } else { if (!keybufferCleared) { keybufferBlock.setWrite({ keyboard: [0.0,0.0,0.0,lastModifier]});  keybufferCleared=true; } } }
function checkBufferedKey() { if (keybuffer.length>0) return keybuffer[0].keyboard; else return undefined; }
window.addEventListener('keydown', e => { keyEvent(e,KEYMULT_DOWN); if (LOG_KEYS) logKey("down:",e); });
window.addEventListener('keyup', e => { keyEvent(e,KEYMULT_UP); if (LOG_KEYS) logKey("up:",e); });
window.addEventListener('keypress', e => { keyEvent(e,KEYMULT_PRESS); if (LOG_KEYS) logKey("pressed:",e); });

// Gamepad support - not complete yet
window.addEventListener("gamepadconnected", function(e) {
  var gp = navigator.getGamepads()[e.gamepad.index];
  console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.", gp.index, gp.id, gp.buttons.length, gp.axes.length);
});
window.addEventListener("gamepaddisconnected", function(e) {
    console.log("Gamepad disconnected from index %d: %s", e.gamepad.index, e.gamepad.id);
});

const resourceBlocks = {   // Resource uniform blocks
   keyboard: keyboardBlock,
  keybuffer: keybufferBlock
  //gamepad: gamepadBlock  // is coming soon
}
function getResourceBlock(r) { if (resourceBlocks[r]) return resourceBlocks[r]; else console.error("Requested Resource "+r+" not found"); }

// common structure used by each viewport  (the viewporter maintains them all as vertex array)
const viewStructure = {
	 viewport: "vec4",
      mouse: "vec4",
       date: "vec4",
 resolution: "vec2",
	 		 time: "float",
	    delta: "float",
      wheel: "vec2",
     clicks: "int",
      state: "int",
      projection: "mat4"
};

const viewInitial = {
    viewport: [-2.0, -2.0, 0.0, 0.0],
       mouse: [0.0, 0.0, 0.0, 0.0],
        date: [0.0, 0.0, 0.0, 0.0],
  resolution: [0.0, 0.0],
  		  time: -1.0,            //  time < 0 means dead
  	   delta: 0.0,
       wheel: [0.0, 0.0],
  	  clicks: 0,
       state: 0,
  projection: [-2.0,-2.0,-2.0,-2.0,-2.0,-2.0,-2.0,-2.0,-2.0,-2.0,-2.0,-2.0,-2.0,-2.0,-2.0,-2.0]  // Should use a default identity matrix here I guess
};

function viewBlock() {							// Each viewbox array will share one of these
  return new GP.UniformBlock({ struct: viewStructure,  initialize: viewInitial });
}

// Maintains viewBlock information, location and size for each component
const VIEWTEXTURE_SIZE = GP.Util.data2d(VIEWPORT_MAX);  // Texture used by viewporter to share viewport locations and sizes
const viewporter = new GP.VertexComputer({
    units: VIEWPORT_MAX,
    struct: viewStructure,
    initializeObject: (i) => { return viewInitial;	},
    uniformBlocks: [inputBlock,keyboardBlock],
    textureOut: true,
    textureFeedback: "viewports",
    updateStep: {
        params: { viewports: "sampler2D" },
		    glsl: GP.Util.cornerVectors + GP.Util.matrixFunctions + GP.Util.dataTextureMacros + `
#define VIEWPORT_MIN 0.07
#define AUTOMOVE_INCREMENT 0.01

void main() {
		if (i_time < 0.0) {  // Inactive or closed - copy everything
      o_viewport = i_viewport;
      o_mouse = i_mouse;
      o_date = i_date;
      o_resolution = u_resolution;
			o_time = i_time;
      o_delta = 0.0;
      o_clicks = i_clicks;
      o_wheel = i_wheel;
      o_state = i_state;
      o_projection = i_projection;

		} else {
      o_date = u_date;
      o_delta = u_delta;
			o_time = i_time + o_delta/1000.0;  // Increment time for this unit
			o_resolution = u_resolution;
      o_mouse = i_mouse;
			o_clicks = i_clicks;

      int newstate = i_state > 0 ? i_state : 0;  // default state to zero if not captured
      vec4 nv = i_viewport;              // new viewport

      if (u_ShiftLeft > 0 || u_ShiftRight > 0) {
        if (u_ArrowUp > 0)  nv.y = nv.y + 0.01;
        if (u_ArrowDown > 0)  nv.y = nv.y - 0.01;
        if (u_ArrowLeft > 0)  nv.x = nv.x - 0.01;
        if (u_ArrowRight > 0)  nv.x = nv.x + 0.01;
        if (u_wheel.x != 0.0) nv.x += u_wheel.x/u_resolution.x;
        if (u_wheel.y != 0.0) nv.y += u_wheel.y/u_resolution.y;
      }

      vec2 drag = 2.0 * u_mouse.zw/u_resolution;  // calculate mouse movement
      vec2 vpmouse = (inverse(i_projection) * vec4(u_mouse.xy / u_resolution * 2.0 - 1.0,0.0,1.0)).xy;  // convert mouse to viewport coord

			if (newstate < 1 && u_clicks > 0) {  // If dragging something or click
        float CLICK_THRESHOLD = 0.1 * 2.0/(i_viewport.z + i_viewport.w)/5.0;
				float distToMover = min(distance(moverTVector, abs(vpmouse)), distance(moverRVector,abs(vpmouse)));
				float distToSizer = distance(sizerVector,abs(vpmouse));
				float distToSizeVH = min(distance(sizeVVector,abs(vpmouse)),distance(sizeHVector,abs(vpmouse)));

				if (distToMover < CLICK_THRESHOLD && u_clicks == 3) {  					// CLOSE viewport on mover TRIPLE click
						o_time = -1.0;
						o_delta = 0.0;
						nv = vec4(-2.0,-2.0,0.0,0.0);
						o_mouse = vec4(0.0,0.0,0.0,0.0);
    //        o_frame = 0;
            o_state = 0;

				} else if (i_state == -1 || (i_state == 0 && distToMover < CLICK_THRESHOLD)) {                // moving
            nv.xy += drag;
            newstate = -1;

				} else if (i_state == -2 || (i_state == 0 && distToSizer < CLICK_THRESHOLD)) {                // Sizing
						if (sign(vpmouse.x) > 0.0 && sign(vpmouse.y) > 0.0) {          // top right
              nv.zw += drag;  // size it
						} else if (sign(vpmouse.x) > 0.0 && sign(vpmouse.y) < 0.0) {   // bottom right
							nv.zw = i_viewport.zw + vec2(drag.x, -drag.y);
							nv.xy = vec2(i_viewport.x, i_viewport.y + drag.y);
						} else if (sign(vpmouse.x) < 0.0 && sign(vpmouse.y) < 0.0) {   // Bottom left
							nv.zw =  i_viewport.zw - drag;
							nv.xy = i_viewport.xy + drag;
						} else {                                                   // Top left
							nv.zw =  i_viewport.zw + vec2(-drag.x, drag.y);
							nv.xy = vec2(i_viewport.x + drag.x,i_viewport.y);
						}
            newstate = -2;

				} else if (i_state == -3 || (i_state == 0 && distToSizeVH < CLICK_THRESHOLD)) {                    // size a side
					if (vpmouse.x > 0.0 && abs(vpmouse.y) < 0.4) {  					// right - horizontal - width
						nv.zw = i_viewport.zw + vec2( drag.x, 0.0);
					} else if (vpmouse.y > 0.0 && abs(vpmouse.x) < 0.4) {  		// top - vertical - height
						nv.zw =  i_viewport.zw + vec2(0.0, drag.y);
					} else if (vpmouse.y < 0.0 && abs(vpmouse.x) < 0.4) {  		// bottom - vertical - height
							nv.zw =  i_viewport.zw + vec2(0.0,-drag.y);
							nv.xy = vec2(i_viewport.x,i_viewport.y + drag.y);
					} else if (vpmouse.x < 0.0 && abs(vpmouse.y) < 0.4) {  			// left - horizontal - width
							nv.zw = i_viewport.zw + vec2(-drag.x,0.0);
							nv.xy = vec2(i_viewport.x + drag.x, i_viewport.y);
					}
          newstate = -3;
				}

	  }  // ends if clicked

    if (newstate == 0 && i_clicks == 0 && u_clicks > 0
      &&  lessThan(vec2(-0.99,-0.99),vpmouse) == lessThan(vpmouse,vec2(0.99,0.99))) {     // just clicked inside viewport
        newstate = 1;                                                                   // set mouse capture state
    }
    if (u_clicks == 0 && i_clicks > 0) {                              // just unclicked, capture off
      newstate = 0;
    }

    if (newstate > 0) {                                             // viewport mouse capture
      o_mouse.xy = vpmouse;
      o_mouse.zw = i_mouse.zw + drag;  // drag accumulates
      o_clicks = u_clicks;
    } else {
      o_clicks = 0;
    }

    if (u_clicks > 0 && newstate == 0 && i_state == 0) {                   // if not clicked on me, watch for others moving
        for (int i=0; i < ${VIEWPORT_MAX}; i++) {
            if (i != gl_VertexID) { // don't look at me
              vec4 ovp = TEXTURE_FETCH(u_viewports,i,${VIEWTEXTURE_SIZE});
              if (ovp.x == -2.0) break;  // reached end
              if (ovp.y < nv.y + nv.w && ovp.y + ovp.w > nv.y) {  // if aligned vertically
                if (nv.x > ovp.x && ovp.x + ovp.z > nv.x) nv.x += AUTOMOVE_INCREMENT;  // I move right if other is overlap from left
                if (nv.x < ovp.x && nv.x + nv.z > ovp.x) nv.x -= AUTOMOVE_INCREMENT;  // I move left if other is overlap from right
              }
              if (ovp.x < nv.x + nv.z && ovp.x + ovp.z > nv.x) {  // if aligned horizontally
                if (nv.y > ovp.y && ovp.y + ovp.w > nv.y) nv.y += AUTOMOVE_INCREMENT;  // I move up
                if (nv.y < ovp.y && nv.y + nv.w > ovp.y) nv.y -= AUTOMOVE_INCREMENT;  // I move down
              }
            }
        }
    }

    // Clamp location and size to GL space - boxes can't leave or be partially off screen
    if (nv.z > 2.0) nv.z = 2.0;
    if (nv.w > 2.0) nv.w = 2.0;
    if (nv.z < VIEWPORT_MIN || nv.w < VIEWPORT_MIN) { nv.zw = vec2(VIEWPORT_MIN,VIEWPORT_MIN); newstate = 0; }
    if (nv.x < -1.0) nv.x += AUTOMOVE_INCREMENT;
    if (nv.x+nv.z > 1.0) nv.x -= AUTOMOVE_INCREMENT;
    if (nv.y < -1.0) nv.y += AUTOMOVE_INCREMENT;
    if (nv.y+nv.w > 1.0) nv.y -= AUTOMOVE_INCREMENT;

    o_state = newstate;
    o_wheel = lessThan(vec2(-0.99,-0.99),u_mouse.xy) == bvec2(true,true) && lessThan(u_mouse.xy,vec2(0.99,0.99)) == bvec2(true,true) ? u_wheel : vec2(0.0, 0.0);   // send wheel data only if mouse inside viewport
    o_projection = projection(nv);
    o_viewport = nv;

	}  // ends if time > 0.0  (if active)

  textureColor = o_viewport;
  gl_Position = TEXTURE_POS(gl_VertexID, ${VIEWTEXTURE_SIZE});
}`    },
		renderStep: {			// Renders nearest appropriate control point for a viewport
						glsl: GP.Util.cornerVectors+`
#define POINTSIZE_MAX 10.0
#define CLICKED_COLOR vec4(1.0,1.0,1.0,0.6)
#define HOVER_COLOR vec4(0.0,1.0,0.0,0.6)
#define TIME_MULT 10.0    // Animation time in ms
#define MOVE_FACTOR 150.0
vec4 jitter() {	return vec4(cos(i_time*TIME_MULT)/MOVE_FACTOR,sin(i_time*TIME_MULT)/MOVE_FACTOR*(i_resolution.x/i_resolution.y),0.,0.);	}

void main() {
    float CLICK_THRESHOLD = 0.1 * 2.0/(i_viewport.z + i_viewport.w)/5.0;
    vec2 vpmouse = (inverse(i_projection) * vec4(u_mouse.xy / u_resolution * 2.0 - 1.0,0.0,1.0)).xy;  // convert mouse to viewport coord
		float distToSizer = distance(sizerVector,abs(vpmouse.xy));
		float distToMover = min(distance(moverTVector, abs(vpmouse.xy)), distance(moverRVector,abs(vpmouse.xy)));
		float distToSizeVH = min(distance(sizeVVector,abs(vpmouse.xy)),distance(sizeHVector,abs(vpmouse.xy)));
		float md = CLICK_THRESHOLD * 25.0;
		float pulse = 0.0;
		float dist;
		if (distToMover < md && distToMover < distToSizer && distToMover < distToSizeVH) {
				dist = distToMover;
        gl_Position =  i_projection * vec4((abs(vpmouse.x) > abs(vpmouse.y) ? moverRVector : moverTVector) * sign(vpmouse.xy),0.0,1.0)
        	+ (dist < CLICK_THRESHOLD ? vec4(0.,0.,0.,0.) : jitter());
		} else if (distToSizer < md && distToSizer < distToMover && distToSizer < distToSizeVH) {
					dist = distToSizer;
					gl_Position =  i_projection * vec4(sizerVector * sign(vpmouse.xy),0.0,1.0)
							+ (dist < CLICK_THRESHOLD ? vec4(0.,0.,0.,0.) : vec4(jitter().x * sign(vpmouse.x), jitter().x * sign(vpmouse.y), 0.,0.));
		} else if (distToSizeVH < md && distToSizeVH < distToSizer && distToSizeVH < distToMover) {
				dist = distToSizeVH;
				gl_Position =  i_projection * vec4( (abs(vpmouse.x) > abs(vpmouse.y) ? sizeHVector : sizeVVector) * sign(vpmouse.xy),0.0,1.0)
						+ (dist < CLICK_THRESHOLD	? vec4(0.,0.,0.,0.)	: abs(vpmouse.x) > abs(vpmouse.y) ? vec4(jitter().x,0.,0.,0.) : vec4(0.,jitter().y,0.,0.));
		}
		gl_PointSize = dist < CLICK_THRESHOLD && u_clicks > 0 ? POINTSIZE_MAX * 1.5 :    // when clicked
										max(0.5, POINTSIZE_MAX - dist/md * POINTSIZE_MAX); // + pulse;
		vertexColor = dist < CLICK_THRESHOLD && u_clicks > 0 ? (u_clicks > 1 ? vec4(1.0,0.0,0.0,1.0) : CLICKED_COLOR) :    // when clicked, white
										 dist < CLICK_THRESHOLD ? HOVER_COLOR : vec4(1.0 - dist/md,0.0,0.0,0.6);
}`}
});

let watch = GP.Util.stopWatch();
const stack = [], newItems = [];   // Viewports to draw, each element is an array of GPU shaders that share a viewport uniformBlock
const activeAudio = [];  // list of audioTexture objects called each cycle to refresh the audio textures
let date = new Date();
let nowTime, lastTime = window.performance.now();
var sync = GP.gl.fenceSync(GP.gl.SYNC_GPU_COMMANDS_COMPLETE, 0);


function loop() {   // The render loop
    watch.mark();
    if (newItems.length > 0 && GP.gl.getSyncParameter(sync,GP.gl.SYNC_STATUS) === GP.gl.SIGNALED) {
      cleanStack();   // something may have been deleted
      for (let item of newItems) {
        for (let layer of item) {
          layer.ready = !layer.uniforms || Object.keys(layer.uniforms).length == 0 ? true : checkUniforms(layer);  // Uniforms must be validated before step if there are textures to load
          if (layer.audio) layer.audio.map(at => getAudioData(at));   // Load audio and start when opening item
        }
        viewporter.updateUnit(stack.length, {
          viewport: [Math.random()-0.5, Math.random()-0.5, 400/GP.canvas.clientWidth, 300/GP.canvas.clientHeight],
          time: 0.0   // starts this item in the viewport engine
        });
        stack.push(item);
      }
      newItems.length = 0;
    }
//        GP.gl.deleteSync(sync);
		GP.Util.clear();
    nextBufferedKey();  // pull the next key from the keybuffer
		clicks = (Date.now()-clickTime <= MULTICLICK_MS) ? clicks : drag ? 1 : 0;   // clear multi-clicks if time has passed
    if (drag) {  // send mouse difference each cycle when dragging
      mouse[2] = mouse[0] - dragFrom[0];  dragFrom[0] = mouse[0];
      mouse[3] = mouse[1] - dragFrom[1];  dragFrom[1] = mouse[1];  // console.log(mouse);  // can be handy
    }
    date.setTime(Date.now());  // update the date
    nowTime = window.performance.now();
		inputBlock.set({
				mouse: mouse,
        date: [date.getFullYear(),date.getMonth(),date.getDate(),date.getHours()*3600+date.getMinutes()*60+date.getSeconds()],
				delta: nowTime - lastTime,
        wheel: wheel,
				clicks: clicks
		}).write();  // Write all at once - other values may have changed via events
    wheel = [0.0,0.0]; // reset wheel
    lastTime = nowTime;

    viewporter.step();  // Update/manipulate the viewports

    activeAudio.map(audioTexture => audioTexture.update());  // update active audio textures
		stack.map((item,index) => {
			viewporter.copyUnitToBlock(index,item[0].uniformBlocks[0]);	// shaders in item must share uniformBlocks, first in array is always the viewblock
			item.map(layer => { if (layer.ready) layer.step(); else layer.ready=checkUniforms(layer);  } );
		});
    sync = GP.gl.fenceSync(GP.gl.SYNC_GPU_COMMANDS_COMPLETE, 0);

    clearKeys();
    if (watch.check() % 100 === 0) {
        stats.innerText = watch.stats();  watch.reset();
    }
    GP.Util.GPControls(loop);
}

//createTextureShader(viewporter.uniforms,"viewports");  // Uncomment to see the viewports texture

// it all starts here, setup an itemlist, and go looping
let itemlist = Object.keys(Kit);
let nextcomp = START_ITEM;
//		addSomething();    // to start with something
loop();

// Utility functions  ==================================
function addSomething() {
	if (nextcomp > itemlist.length-1) nextcomp = MIN_ITEM;    // Update Max here
	addItem(loadItem(itemlist[nextcomp++]));
}

function addItem(item) {
	if (stack.length == VIEWPORT_MAX) { alert("out of viewport slots"); return; }
  newItems.push(item);
}

function cleanStack() {
    let i=0, dead=0, units = viewporter.getResultUnits();  // array of viewport objects
    while (i<stack.length) {
      if (dead > 0) {
        units[i] = units[i+dead];   // advance by the number of dead encountered
        viewporter.updateUnit(i,units[i]);
      }
      if (units[i].time == -1.0) {   // dead unit
        let deaditem = stack[i];
        for (let layer of deaditem) {
          if (layer.audio) layer.audio.map(at => dropAudio(at));  // Stop audio playing and copying
          layer.destroy();
        }
        stack.splice(i,1);  // remove from stack
        dead++;  // will have to copy up from now til end
      } else i++;   // only advance if alive
    }
}

function createTextureShader(u, name) {
  let item = loadItem("Image");           // NOTE: This is specific to the Image.js in toys
  if (item && item.length > 0) {
    item[0].uniforms["image"] = u[name];
    addItem(item);          // Add image viewer
  }
  return item;
}

function loadItem(name) {  return loadTemplate(Kit[name]);  }    // load a kit item by name

function loadTemplate(template) {    // load a kit template  (allows for template adjustments)
  //let vpInfoTemplate = Kit["vpInfo"];
	if (!template || !template.model) {
			console.log("trying to load "+template+" and could not the model to load it with, so sad, all I got was "+template);
	} else {
    if (Apps && Apps.hasOwnProperty(template.model)) {
      let blocks = [viewBlock()],  un = {}, params = {}, aa = [];    // aa=audio attachments
      if (template.resources) template.resources.map(i => blocks.push(getResourceBlock([i])));  // add resources to uniform block array
      if (template.textures) {
        for (i in template.textures) { un[i] = null; params[i] = "sampler2D"; }  // add image sampler to uniforms and frag params
        loadTextures(un,template.textures);  // load the image
      }
      if (template.audio) {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();  // set up an audio context
        for (i in template.audio) {
          let audioTexture = GP.Util.buildAudioTexture(audioCtx,template.audio[i]);
          un[i] = audioTexture.texture;
          params[i] = "sampler2D"; //  add audio sampler to frag params
          aa.push(audioTexture);
        }
      }
      let app = Apps[template.model](un, blocks, template, params);
      if (aa.length > 0) app.audio = aa;  // attach the audio textures to be loaded when item is opened
      return  (app instanceof Array) ? app : [app];
		} else {
			console.log("Don't yet know how to load a model type of "+template.model+" for item, you may have to teach me",template);
		}
	}
}

function checkUniforms(computer) {    // assumes all uniforms are textures
  let result = true;
  for (t in computer.uniforms) {
    if (!computer.uniforms[t] || !(computer.uniforms[t] instanceof WebGLTexture)) {
  //    console.log("uniform "+t+" not ready");   // commented as they can be annoying
      return false;                // returns false if any are not WebGL textures
    }
  }
  return result;
}

function loadTextures(un,textures) {  // load a set of textures defined in a uniform structure with urls
  for (i in textures) if (!(un[i] instanceof WebGLTexture) && textures[i] != "*") loadTexture(textures[i],i,un);
}

function loadTexture(src, name, u) {    // load an image texture
    let xhr = new XMLHttpRequest();
    xhr.open("GET", src, true);
    xhr.responseType = "blob";
    xhr.onload = function(e) {
        let image = new Image();
        image.onload = function() {
            console.log(name+ " loaded from "+src);
            u[name] = GP.Util.buildImageTexture(this);
            window.URL.revokeObjectURL(image.src);  // clean up
        };
        image.src = window.URL.createObjectURL(this.response);
    };
    xhr.send(null);
}

function handleFileSelect(evt) {  // for dragged and dropped files
 evt.stopPropagation();
 evt.preventDefault();
 if (fileTargets.length == 0) console.log("No file target enabled");
 var files = evt.dataTransfer.files; // FileList object.
 var output = [];
 for (var i = 0, f; f = files[i]; i++) {
   if (f.type.match('text.*')) {
     let reader = new FileReader();
     reader.onload = function(data) {
       fileTargets.map(t => {
         if (t.type == "text" && t.kit) {
           console.log("Loading "+t.kit);
           let template = Kit[t.kit];
           template[t.uniformName] = data.target.result;
           let item = loadTemplate(template);
           if (item && item.length > 0) addItem(item);  // Add the text editor
         }
       });
     };
     reader.readAsText(f);
  } else if (f.type.match('image.*')) {
       let image = new Image();
       image.onload = function() {
           fileTargets.map(t => {
             if (t.type == "image" && t.kit) {
               let item = loadItem(t.kit);
               if (item && item.length > 0) {
                 item[0].uniforms[t.uniformName] = GP.Util.buildImageTexture(this);
                 addItem(item);          // Add image viewer
               }
             }
           });
           window.URL.revokeObjectURL(image.src);  // clean up
       };
       image.src = window.URL.createObjectURL(f);
   } else if (f.type.match('audio.*')) {
       fileTargets.map(t => {
         if (t.type == "audio" && t.kit) {
           let item = loadItem(t.kit);
           if (item && item.length > 0) {
              if (item[0].audio && item[0].audio.length > 0) {
                item[0].audio.map(at => {
                   let reader = new FileReader();
                   reader.onload = function(data) { decodeAudio(at, data.target.result); }
                   reader.readAsArrayBuffer(f);
                });
                addItem(item);      // add the audio player
              }
           }
         }
       });
   } else {
     console.error("I do not yet know how to handle file "+escape(f.name), ' (', f.type || 'n/a', ') - ', f.size, ' bytes, last modified: ',f.lastModified );
   }
 }
}

function decodeAudio(at, data) {
   audioCtx.decodeAudioData(data, function(buffer) {
       console.log("Audio received, starting");
       at.song = audioCtx.createBufferSource();
       at.song.buffer = buffer;
       at.song.connect(at.analyser);
       at.analyser.connect(audioCtx.destination);
       activeAudio.push(at);                          // Add this audioTexture to active list
       at.song.addEventListener("ended", function() {
         dropAudio(at);
       });
       at.song.start();
  });
}

function handleDragOver(evt) {
   evt.stopPropagation();
   evt.preventDefault();
   evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

// Setup the dnd listeners.
GP.canvas.addEventListener('dragover', handleDragOver, false);
GP.canvas.addEventListener('drop', handleFileSelect, false);

function dropAudio(texture) {    // called with an audio texture when a window with audio is closed
  if (texture.song) texture.song.stop();
  if (texture.microphone) { texture.microphone.disconnect(); texture.microphone = null; }
  let i = 0;
  while (i < activeAudio.length) {                  // Remove from list
    if (activeAudio[i] == texture) {
      activeAudio.splice(i,1);  // remove it
      console.log("activeAudio "+i+" removed");
      break;
    } else i++;
  }
}

function getAudioData(texture) {
  console.log("getting "+texture.url);
  if (texture.url === "*") {    // file drop or open
  } else if (texture.url === "microphone") {  // microphone needs permission
      navigator.mediaDevices.getUserMedia({audio: true}).then( function(stream) {
        texture.microphone = audioCtx.createMediaStreamSource(stream);
        texture.microphone.connect(texture.analyser);
        texture.analyser.connect(audioCtx.destination);
        activeAudio.push(texture);                          // Add this audioTexture to active list
        console.log("microphone connected");
      }, function(e) { console.log("microphone permission denied: "+e)});
  } else {
      request = new XMLHttpRequest();   // use XHR to load an audio track, and decodeAudioData to decode it to a buffer. Then we put the buffer into the source
      request.open('GET', texture.url, true);
      request.responseType = 'arraybuffer';
      request.onload = function() {
        audioCtx.decodeAudioData(request.response, function(buffer) {
            texture.song = audioCtx.createBufferSource();
            texture.song.buffer = buffer;
            texture.song.connect(texture.analyser);
            texture.analyser.connect(audioCtx.destination);
            activeAudio.push(texture);                          // Add this audioTexture to active list
            texture.song.addEventListener("ended", function() {
              dropAudio(texture);
            });
            texture.song.start();
        });
      }
      request.send();
  }
}

function generateSizingCode(template) {
    if (template.sizing && template.sizing.fixedAspect) {
      if (template.sizing.scalable) {
        return `
          float cw = ${template.sizing.width}.0 * u_viewport.z*2.0/u_resolution.x*${template.sizing.width}.0/2.0;    // for fixed width/height but scalable
          float ch = ${template.sizing.height}.0 * u_viewport.z*2.0/u_resolution.x*${template.sizing.height}.0/2.0;
          float wm = ${template.sizing.widthMultiplier ? template.sizing.widthMultiplier : "1.0"};\n`;
      } else {
        return `
          float cw = ${template.sizing.width}.0/u_resolution.x*2.0;    // for fixed width/height
          float ch = ${template.sizing.height}.0/u_resolution.y*2.0;
          float wm = ${template.sizing.widthMultiplier ? template.sizing.widthMultiplier : "1.0"};\n`;
      }
    }
    if (template.sizing && !template.sizing.fixedAspect) {
        return `
          float cw = ${template.sizing.width}.0 * u_viewport.z*2.0/u_resolution.x*3.0;   // for fonts that can alter aspect
          float ch = ${template.sizing.height}.0 * u_viewport.w*2.0/u_resolution.y*3.0;
          float wm = ${template.sizing.widthMultiplier ? template.sizing.widthMultiplier : "1.0"};\n`;
    }
    return  `
          float cw = u_viewport.z/${tcols}.0;   // for scalable fonts
          float ch = u_viewport.w/${tlines}.0;
          float wm = 1.0;\n`;

}
