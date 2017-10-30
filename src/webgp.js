// WEBGP - a simple library for WEBGL2 computing, visualization, and interactivity
function WebGP(canvas, context) {
    "use strict";
    
    if (!context) { context = canvas.getContext("webgl2", {antialias: false} );       
        if (!context) throw "Invalid GL context - browser probably doesn't support WebGL2";            
    }
    const gl = context;

    // Extension needed to render to float array textures
    let oes_texture_float_linear = gl.getExtension("OES_texture_float_linear");
    if (!oes_texture_float_linear) console.log("No OES_texture_float_linear support - you may have problems");
    let ext_color_buffer_float = gl.getExtension("EXT_color_buffer_float");
    if (!ext_color_buffer_float) console.log("No EXT_color_buffer_float support - you may have problems");
    //let webgl_debug_shaders = gl.getExtension("WEBGL_debug_shaders");   // Turn on printing of translated shader
    //if (!webgl_debug_shaders) console.log("No WEBGL_debug_shaders support - not a problem");

     class VertexComputer {
        constructor(description) {

            if (description.vertexArray) {  // Use a pre-defined VertexArray object (copies its attributes/structure, shares the buffer)
                this.units = description.vertexArray.units;
                this.struct = { fields: description.vertexArray.struct.fields, layout: description.vertexArray.struct.layout };
                this.struct.byteSize = description.vertexArray.struct.byteSize;
                this.vertexBuffers = description.vertexArray.vertexBuffers;
            } else {
                this.units = description.units;  // Or build an array for this computer
                this.struct = {
                    fields: description.struct,
                    layout: Object.entries(description.struct).map(([field, type], i) => Object.assign({field: field}, Util.glTypes[type])),
                };
                // Fill up byte-wise layout information
                this.bytesSoFar = 0;
                this.struct.layout.forEach(field => {field.offset = this.bytesSoFar; this.bytesSoFar += field.bytes; });
                this.struct.byteSize = this.bytesSoFar;
            }

            // pointer to object containing the values for the uniforms (pulled by name)
            if (description.uniforms) {
                this.uniforms = description.uniforms;
            }

            // pointer to a UniformBuffer object to use for uniforms
            if (description.uniformBlock) {
                this.uniformBlock = description.uniformBlock;
            }

            // If capturing a texture, setup the capture framebuffer
            if (description.textureOut) {
                this.textureOut = description.textureOut;  // something truthy (will create buffers) or an array of textures
                this.frameBuffer = gl.createFramebuffer();
            }  // TODO: allow supplying the texture buffers? not sure it's really needed

            // update step is optional, so just render
            if (description.updateStep) {
                this.updateUniforms = description.updateStep.params;
                let uniformBlocks = "";
                if (this.uniformBlock) {
                    uniformBlocks = "\nlayout(std140) uniform ublock {\n" 
                            + Util.declarationList("", Util.prefixKeys("u_", this.uniformBlock.struct.fields))
                            + "\n}"+(this.uniformBlock.name ? this.uniformBlock.name : "")+";\n";
                }
                this.updateShaderCode = description.updateStep.glsl;
                let ofields = Util.prefixKeys("o_", this.struct.fields);  // so we can add one for texture out if needed
                if (this.textureOut) ofields["textureColor"] = "vec4";  // If capturing a texture with textureOut, must have a textureColor output
                this.updateProgram = Util.buildProgram(
                    // Takes in unit struct and output new values for the unit struct
                    Util.buildShader(
                        gl.VERTEX_SHADER,
                        Util.prefixKeys("u_", this.updateUniforms),
                        Util.prefixKeys("i_", this.struct.fields),
                        ofields,
                        uniformBlocks+this.updateShaderCode
                        ),
                    // Default constant fragment shader (has no effect on the feedback transform) - but may output a texture
                    Util.buildShader(gl.FRAGMENT_SHADER, {}, this.textureOut ? {textureColor: "vec4"} : {}, {fragColor: "vec4"},
                        this.textureOut ? `void main() {  fragColor = textureColor;  }`
                        : `void main() { fragColor = vec4(1.0, 1.0, 1.0, 1.0); }`  // this won't be used because RASTERIZER_DISCARD
                        ));
                if (this.updateProgram) {
                    Object.keys(this.struct.fields).map((name, i) => gl.bindAttribLocation(this.updateProgram, i, "i_" + name));
                    gl.transformFeedbackVaryings(this.updateProgram, Object.keys(this.struct.fields).map(name => "o_" + name), gl.INTERLEAVED_ATTRIBS);                    
                    gl.linkProgram(this.updateProgram);
                    if (!gl.getProgramParameter(this.updateProgram, gl.LINK_STATUS)) {
                        let log = gl.getProgramInfoLog(this.updateProgram);
                        if (log) {
                            let error = "Error linking update program " + log;
                            if (Util.logger) Util.logger(error); else console.error(error);
                            throw error;
                        }
                    }
                    // Get uniform locations (note, if not used in the code, the uniform location will return null but this seems to be ok)
                    if (this.updateUniforms) {
                        this.updateUniformLocations = Object.entries(this.updateUniforms).reduce((o, [k, v]) => (Object.assign(o, {[k]: gl.getUniformLocation(this.updateProgram, "u_" + k)})), {});
                    }
 
                    // If a uniform block is being used, get its index and bind it
                    if (this.uniformBlock) {
                        this.updateUniformBlockIndex = gl.getUniformBlockIndex(this.updateProgram,"ublock");
                        gl.uniformBlockBinding(this.updateProgram, this.updateUniformBlockIndex, 0);
                    }
                    
                    this.transformFeedback = gl.createTransformFeedback();
                }
            }

            // Render step is optional, so just update
            if (description.renderStep) {
                this.renderUniforms = description.renderStep.params;
                this.renderViewport = description.renderStep.viewport;
                this.renderShaderCode = description.renderStep.glsl;
                this.renderProgram = Util.buildProgram(
                    // Takes in unit struct and outputs vertexColor
                    Util.buildShader(
                        gl.VERTEX_SHADER,
                        Util.prefixKeys("u_", this.renderUniforms),
                        Util.prefixKeys("i_", this.struct.fields),
                        {vertexColor: "vec4"},
                        this.renderShaderCode
                    ),
                    // Default pass-through fragment shader (we're simply drawing points, color is set in the vertex shader)
                    Util.buildShader(gl.FRAGMENT_SHADER, {}, {vertexColor: "vec4"}, {fragColor: "vec4"}, `void main() { fragColor = vertexColor;}`)
                );
                if (this.renderProgram) {
                    Object.keys(this.struct.fields).map((name, i) => gl.bindAttribLocation(this.renderProgram, i, "i_" + name));
                    gl.linkProgram(this.renderProgram);
                    if (!gl.getProgramParameter(this.renderProgram, gl.LINK_STATUS)) {
                        let log = gl.getProgramInfoLog(this.renderProgram);
                        if (log) {
                            let error = "Error linking render program " + log;
                            if (Util.logger) Util.logger(error); else console.error(error);
                            throw error;
                        }
                    }
                    // Get uniform locations (note, if not used in the code, the uniform location will return null but this seems to be ok)
                    if (this.renderUniforms) this.renderUniformLocations = Object.entries(this.renderUniforms).reduce((o, [k, v]) => (Object.assign(o, {[k]: gl.getUniformLocation(this.renderProgram, "u_" + k)})), {});
                }
            }

            // if initialize: Call it for every unit sub-buffer
            if (description.initialize) {
                let markTime = Date.now();
                this.initialData = new ArrayBuffer(this.units * this.struct.byteSize);
                for (let i = 0; i < this.units; i++) description.initialize(i, new Uint8Array(this.initialData, i * this.struct.byteSize, this.struct.byteSize));
                if (Util.logger) Util.logger("initialized "+this.units+" objects in "+(Date.now()-markTime)+" ms");
            }

            // Initialize with objects created by a closure given the index that returns an object with properties for each value
            if (description.initializeObject) {
                let markTime = Date.now();
                this.initialData = new ArrayBuffer(this.units * this.struct.byteSize);
                let dataview = new DataView(this.initialData);
                for (let i = 0; i < this.units; i++) {
                    let off = i * this.struct.byteSize;  // Offset to the unit data
                    let newdata = description.initializeObject(i);
                    this.struct.layout.forEach(f => { f.setFunction(dataview, off + f.offset, newdata[f.field]); });
                }
                if (Util.logger) Util.logger("initialized "+this.units+" objects in "+(Date.now()-markTime)+" ms");
            }

            // Setup the double buffers for the vertex arrays
            if (this.initialData) {
                this.vertexBuffers = [Util.buildVertexBuffer(this.struct, this.initialData), Util.buildVertexBuffer(this.struct, this.initialData)];
            }
            // if no initialize in description, assume buffers will be given later (before the first step if you want it to work)

           // Setup the output textures for double buffering,
           if (this.textureOut) {
              this.textureWidth = Util.data2d(this.units);
              this.textureHeight = this.textureWidth;
              if (this.textureOut instanceof Array) {
                  if (Util.logger) Util.logger("using output texture of "+this.textureWidth+" x "+this.textureHeight);
                  this.textureBuffers = this.textureOut;
              } else {
                  if (Util.logger) Util.logger("creating output texture of "+this.textureWidth+" x "+this.textureHeight);
                  this.textureBuffers = [Util.buildFloatTexture(this.textureWidth, this.textureHeight), Util.buildFloatTexture(this.textureWidth, this.textureHeight)];
              }
              this.lastTextureOut = this.textureBuffers[1];
           }
           this.iteration = 0;
        }
        
        update(source, destination, textureBuffers, steps) {
            // Setup context
            gl.useProgram(this.updateProgram);

            // Bind any uniform buffers
            if (this.uniformBlock) {
                gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, this.uniformBlock.buffer);
            }

            // Bind source and destination buffers
            gl.bindVertexArray(source.vertexArray);
            gl.bindBuffer(gl.ARRAY_BUFFER, source.vertexBuffer);
            gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.transformFeedback);
            gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, destination.vertexBuffer);

            
            // Set uniforms
            if (this.updateUniformLocations) { let tc = 0; Object.entries(this.updateUniforms).forEach(([k, v]) => (tc = this.setUniform(tc, k, v, this.updateUniformLocations[k], this.uniforms[k]))); }

            // capture the output texture or discard the pixels
            if (this.textureOut) {
                gl.viewport(0, 0,this.textureWidth, this.textureHeight);
                gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.frameBuffer);
                this.lastTextureOut = textureBuffers[this.iteration % 2];
                gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.lastTextureOut, 0);
            } else {
                gl.enable(gl.RASTERIZER_DISCARD);
            }

            // Run each unit through the Update
            for (let i = 0; i < (steps || 1); i++) {
                gl.beginTransformFeedback(gl.POINTS);
                gl.drawArrays(gl.POINTS, 0, this.units);
                gl.endTransformFeedback();
            }

            // Restore context and cleanup
            if (this.textureOut) {
                gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
                gl.viewport(0, 0, canvas.width, canvas.height);
            } else {
                gl.disable(gl.RASTERIZER_DISCARD);
            }
            gl.useProgram(null);
            if (this.uniformBlock) gl.bindBuffer(gl.UNIFORM_BUFFER, null);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
            gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
        }
        
        render(source) {
            if (this.renderViewport) gl.viewport(this.renderViewport.x, this.renderViewport.y, this.renderViewport.width, this.renderViewport.height);
            
            // Setup context
            gl.useProgram(this.renderProgram);
            gl.bindVertexArray(source.vertexArray);
            gl.bindBuffer(gl.ARRAY_BUFFER, source.vertexBuffer);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

            // Set uniforms
            if (this.renderUniformLocations) { let tc = 0; Object.entries(this.renderUniforms).forEach(([k, v]) => (tc = this.setUniform(tc, k, v, this.renderUniformLocations[k], this.uniforms[k]))); }

            // Render each unit
            gl.drawArrays(gl.POINTS, 0, this.units);

            // Restore context
            gl.useProgram(null);
            gl.disable(gl.BLEND);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            
            if (this.renderViewport) gl.viewport(0, 0, canvas.width, canvas.height);
        }
        
        setUniform(tc, name, type, loc, val) {  // tc = texture count - will increment for each texture
            if (val === undefined) {
                let error = "can't set uniform "+name+" of type " + type + " with value " + val;
                Util.logger(error);
                console.error(new Error(error));
            }
            switch (Util.glTypes[type].constant) {  // Getting the gl constant avoids a bunch of string compares
                // Value types are assumed to match, a vec3 value should be a Float32Array[3] TODO: add more types here
                case gl.FLOAT:
                    gl.uniform1f(loc, val);
                    break;
                case gl.INT:
                    gl.uniform1i(loc, val);
                    break;
                case gl.UINT:
                    gl.uniform1ui(loc, val);
                    break;
                case gl.TEXTURE_2D:  // override from alternate buffer if this is a texture we will be writing to
                    if (this.textureBuffers && val === this.textureBuffers[this.iteration % 2]) {
                        console.error("warning: texture buffer flipped to avoid trying to read and write from same texture - you should look into this (check iterations)");
                        val = this.textureBuffers[(this.iteration - 1) % 2];  // avoid setting up to read from a texture we are about to write to
                    }  // this is because the iterations may have incremented in other steps without texture rewrite
                    gl.activeTexture(gl.TEXTURE0 + tc);
                    gl.bindTexture(gl.TEXTURE_2D, val);
                    gl.uniform1i(loc, tc);
                    tc++;
                    break;
                case gl.FLOAT_VEC2:
                    gl.uniform2fv(loc, val);
                    break;
                case gl.FLOAT_VEC3:
                    gl.uniform3fv(loc, val);
                    break;
                case gl.FLOAT_VEC4:
                    gl.uniform4fv(loc, val);
                    break;
                default:
                  let error = "can't set uniform type " + type + " with value " + val;
                  if (Util.logger) Util.logger(error); else console.error(error);
                  throw error;
            }
            return tc;
        }
        
        run() {  // run in loop forever
            Util.clear();
            this.step();
            Util.GPControls(this.run.bind(this));
        }
        
        step(iteration) {  // run a single step - Use each buffer alternatively on each step (send iteration to coordinate shared buffers)
            if (iteration) this.iteration = iteration;
            if (!this.vertexBuffers) {
                let error = new Error("sorry, no buffers, no step - please initialize the buffers on creation (giving array of two buffers or initialization function) or call setBuffers(array of 2 vertex buffer objects)");
                if (Util.logger) Util.log(error); console.log(error);  // will give us a stack trace
            }
            if (this.iteration % 2 === 0) {
                if (this.updateProgram) this.update(this.vertexBuffers[0], this.vertexBuffers[1], this.textureBuffers);
                if (this.renderProgram) this.render(this.vertexBuffers[1]);
            } else {
                if (this.updateProgram) this.update(this.vertexBuffers[1], this.vertexBuffers[0], this.textureBuffers);
                if (this.renderProgram) this.render(this.vertexBuffers[0]);
            }
            if (!iteration) this.iteration++;  // iteration % 2 = the next buffer index that will be the source
        }

         getResultBuffer() {  // return the buffer from the last iteration (iteration was incremented after step)
             return this.vertexBuffers[this.iteration % 2];
         }
         getNextBuffer() {  // return the buffer the will be used as the source for the next iteration
             return this.vertexBuffers[(this.iteration + 1) % 2];
         }
         getBuffers() { // return an array of the buffers
             return this.vertexBuffers;
         }
         setBuffers(objArray) { // set the next buffer to use
             this.vertexBuffers = objArray;
         }
         getResultTexture() {  // return the output texture from the last iteration
             return this.lastTextureOut;
         }
        getResultDataView() {  // Get the entire result in a data view
            let vb = this.getResultBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vb.vertexBuffer);
            gl.getBufferSubData(gl.ARRAY_BUFFER, 0, new Uint8Array(vb.data));
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            return new DataView(vb.data);
        }
         getResultUnitDataView(index) {  // Copy a unit from the result buffer to a dataview
             let vb = this.getResultBuffer();
             let off = index * this.struct.byteSize;  // Offset to the unit data
             let a = new ArrayBuffer(this.struct.byteSize);
             gl.bindBuffer(gl.ARRAY_BUFFER, vb.vertexBuffer);
             gl.getBufferSubData(gl.ARRAY_BUFFER, off, new Uint8Array(a));
             gl.bindBuffer(gl.ARRAY_BUFFER, null);
             return new DataView(a);
         }
         getResultUnit(index) {  // Copy the unit from the result buffer into an object
             return this.getUnit(this.getResultUnitDataView(index),0);
         }
        getResultUnits() {  // gets all the units as an array of objects
            let out = [];
            let dv = this.getResultDataView();  // Only want to do this once if getting multiple units
            for (let i = 0; i < this.units; i++) {
                out.push(this.getUnit(dv, i));
            }
            return out;
        }
         getUnit(dataview, index) {  // Get a unit as an object
             let off = index * this.struct.byteSize;
             return this.struct.layout.reduce((o, f) => (Object.assign(o, {[f.field]: f.getFunction(dataview,off+f.offset)})), {});
         }

         // Update a set of values for a unit (does not need to update all of them)
         updateUnit(index, newdata) {  // newdata is an object with the properties to be updated
             // Get the last result unit data into a buffer
              let cunit = this.getResultUnitDataView(index);
             // set the specified values
             this.struct.layout.map(f => { if (newdata.hasOwnProperty(f.field)) { f.setFunction(cunit, f.offset, newdata[f.field]); } });
             // write the unit to the next buffer
             let off = index * this.struct.byteSize;  // Offset to the unit data
             gl.bindBuffer(gl.ARRAY_BUFFER, this.getNextBuffer().vertexBuffer);
             gl.bufferSubData(gl.ARRAY_BUFFER, off, cunit);
             gl.bindBuffer(gl.ARRAY_BUFFER, null);
         }

         destroy() {
            gl.deleteTransformFeedback(this.transformFeedback);
            gl.deleteProgram(this.updateProgram);
            gl.deleteProgram(this.renderProgram);
            gl.deleteBuffer(this.vertexBuffers[0].vertexBuffer);
            gl.deleteBuffer(this.vertexBuffers[1].vertexBuffer);
            if (this.textureOut) {
                gl.deleteTexture(this.frontTexture);
                gl.deleteTexture(this.backTexture);
            }
            gl.deleteVertexArray(this.vertexBuffers[0].vertexArray);
            gl.deleteVertexArray(this.vertexBuffers[1].vertexArray);
        }
    }

    // Object to wrap just the VertexArray buffers so we can share them amongst computers
    class VertexArray {
        constructor(description) {
            this.units = description.units;
            this.struct = {
                fields: description.struct,
                layout: Object.entries(description.struct).map(([field, type], i) => Object.assign({field: field}, Util.glTypes[type])),
            };
            // Fill up byte-wise layout information
            this.bytesSoFar = 0;
            this.struct.layout.forEach(field => { field.offset = this.bytesSoFar; this.bytesSoFar += field.bytes; });
            this.struct.byteSize = this.bytesSoFar;

            // if initialize: Call it for every unit sub-buffer
            if (description.initialize) {
                let markTime = Date.now();
                this.initialData = new ArrayBuffer(this.units * this.struct.byteSize);
                for (let i = 0; i < this.units; i++) description.initialize(i, new Uint8Array(this.initialData, i * this.struct.byteSize, this.struct.byteSize));
                if (Util.logger) Util.logger("initialized "+this.units+" unit buffers in "+(Date.now()-markTime)+" ms");
            }
            // or initialize based on objects returned by a closure given the index
            if (description.initializeObject) {
                let markTime = Date.now();
                this.initialData = new ArrayBuffer(this.units * this.struct.byteSize);
                let dataview = new DataView(this.initialData);
                for (let i = 0; i < this.units; i++) {
                    let off = i * this.struct.byteSize;  // Offset to the unit data
                    let newdata = description.initializeObject(i);
                    this.struct.layout.forEach(f => { f.setFunction(dataview, off + f.offset, newdata[f.field]); });
                }
                if (Util.logger) Util.logger("initialized "+this.units+" unit objects in "+(Date.now()-markTime)+" ms");
            }
            // Set up the vertex buffers
            if (this.initialData) {
                this.vertexBuffers = [Util.buildVertexBuffer(this.struct, this.initialData), Util.buildVertexBuffer(this.struct, this.initialData)];
            }
        }
    }

    // Object to wrap a uniform buffer so we can maintain its data and share them amongst computers
    // Be wary of byte packing, 
    class UniformBlock {
        constructor(description) {
            // If name is defined, then shader references to the uniforms must be prefixed by it as in name.x
            if (description.name) this.name = description.name;
            
            this.struct = {
                fields: description.struct,
                layout: Object.entries(description.struct).map(([field, type], i) => Object.assign({field: field}, Util.glTypes[type]))
            };
            // Fill up byte-wise layout information
            this.bytesSoFar = 0;
            this.struct.layout.forEach(field => { field.offset = this.bytesSoFar; this.bytesSoFar += field.bytes; });
            this.struct.byteSize = this.bytesSoFar + (16 % this.bytesSoFar);  // Size must be divisible by 16 so pad it
            //console.log("size="+this.struct.byteSize+" soFar="+this.bytesSoFar);

             // or initialize based on objects returned by a closure given the index
            if (description.initialize) {
                this.data = new ArrayBuffer(this.struct.byteSize);
                this.dataview = new DataView(this.data);
                this.struct.layout.forEach(f => { f.setFunction(this.dataview, f.offset, description.initialize[f.field]); });
            }

            // Set up the buffer
            if (this.data) {
                this.buffer = gl.createBuffer();
                gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);
                gl.bufferData(gl.UNIFORM_BUFFER, this.data, gl.DYNAMIC_DRAW);
                gl.bindBuffer(gl.UNIFORM_BUFFER, null);
            }
            
            // Update one or more values in the buffer (does not need to update all of them and the buffer is not written to the GPU)
            this.set = function(newdata) {  // newdata is an object with the properties to be updated
                this.struct.layout.map(f => { if (newdata.hasOwnProperty(f.field)) { f.setFunction(this.dataview, f.offset, newdata[f.field]); } });
            };

            // Updates each property and write only its data in the buffer 
            // useful if your buffer is really big and you only want to update a single value
            this.setWrite = function(newdata) {  
                gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);
                this.struct.layout.map(f => { 
                    if (newdata.hasOwnProperty(f.field)) { 
                        f.setFunction(this.dataview, f.offset, newdata[f.field]); 
                        gl.bufferSubData(gl.UNIFORM_BUFFER, f.offset, this.dataview, f.offset, f.bytes);
                    } 
                });
                gl.bindBuffer(gl.UNIFORM_BUFFER, null);
            };

            // write all the buffer data to the uniform buffer
            this.write = function() { 
                gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);
                gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this.data);
                gl.bindBuffer(gl.UNIFORM_BUFFER, null);
            };

        }
    }

    // Some helper functions to help manage different data types inside dataviews
    function getLittleEndian() {
        let buffer = new ArrayBuffer(2);
        new DataView(buffer).setInt16(0, 256, true /* littleEndian */);
        return new Int16Array(buffer)[0] === 256; // Int16Array uses the platform's endianness.
    }
    const littleEndian = getLittleEndian();  // Only need to call this once and yes, it actually matters

    // handy functions to get data from a dataview
    function getIntField(dataview, foffset) {
        return dataview.getInt32(foffset, littleEndian);
    }
    function getFloatField(dataview, foffset) {
        return dataview.getFloat32(foffset, littleEndian);
    }
    function getVec2Field(dataview, foffset) {
        return [dataview.getFloat32(foffset, littleEndian)
            , dataview.getFloat32(foffset + 4, littleEndian)];
    }
    function getVec3Field(dataview, foffset) {
        return [dataview.getFloat32(foffset, littleEndian)
            , dataview.getFloat32(foffset + 4, littleEndian)
            , dataview.getFloat32(foffset + 8, littleEndian)];
    }
    function getVec4Field(dataview, foffset) {
        return [dataview.getFloat32(foffset, littleEndian)
            , dataview.getFloat32(foffset + 4, littleEndian)
            , dataview.getFloat32(foffset + 8, littleEndian)
            , dataview.getFloat32(foffset + 12,littleEndian)];
    }

    // Handy functions to set data in a dataview
    function setIntField(dataview, foffset, val) {
        dataview.setInt32(foffset, val, littleEndian);
    }
    function setFloatField(dataview, foffset, val) {
        dataview.setFloat32(foffset, val, littleEndian);
    }
    function setVec2Field(dataview, foffset, val) {
        dataview.setFloat32(foffset, val[0], littleEndian);
        dataview.setFloat32(foffset + 4, val[1], littleEndian);
    }
    function setVec3Field(dataview, foffset, val) {
        dataview.setFloat32(foffset, val[0], littleEndian);
        dataview.setFloat32(foffset + 4, val[1], littleEndian);
        dataview.setFloat32(foffset + 8, val[2], littleEndian);
    }
    function setVec4Field(dataview, foffset, val) {
        dataview.setFloat32(foffset, val[0], littleEndian);
        dataview.setFloat32(foffset + 4, val[1], littleEndian);
        dataview.setFloat32(foffset + 8, val[2], littleEndian);
        dataview.setFloat32(foffset + 12, val[3], littleEndian);
    }

    const Util = {

        // Define types used in VertexArrays and Uniforms  (Note: not all have been tested, only the float vectors, float, int, and sampler2D have been tested)
        glTypes: {
            "vec4": {literal: "vec4", constant: gl.FLOAT_VEC4, slotType: gl.FLOAT, slots: 4, bytes: 16, qualifier: "", getFunction: getVec4Field, setFunction: setVec4Field },
            "vec3": {literal: "vec3", constant: gl.FLOAT_VEC3, slotType: gl.FLOAT, slots: 3, bytes: 12, qualifier: "", getFunction: getVec3Field, setFunction: setVec3Field },
            "vec2": {literal: "vec2", constant: gl.FLOAT_VEC2, slotType: gl.FLOAT, slots: 2, bytes: 8, qualifier: "", getFunction: getVec2Field, setFunction: setVec2Field },
            "float": {literal: "float", constant: gl.FLOAT, slotType: gl.FLOAT, slots: 1, bytes: 4, qualifier: "", getFunction: getFloatField, setFunction: setFloatField },
            "byte": {literal: "byte", constant: gl.BYTE, slotType: gl.BYTE, slots: 1, bytes: 1, qualifier: "", getFunction: getIntField, setFunction: setIntField },
            "ubyte": {literal: "ubyte", constant: gl.UNSIGNED_BYTE, slotType: gl.UNSIGNED_BYTE, slots: 1, bytes: 1, qualifier: "", getFunction: getIntField, setFunction: setIntField },
            "short": {literal: "short", constant: gl.SHORT, slotType: gl.SHORT, slots: 1, bytes: 2, qualifier: "", getFunction: getIntField, setFunction: setIntField },
            "ushort": {literal: "ushort", constant: gl.UNSIGNED_SHORT, slotType: gl.UNSIGNED_SHORT, slots: 1, bytes: 2, qualifier: "", getFunction: getIntField, setFunction: setIntField },
            "int": {literal: "int", constant: gl.INT, slotType: gl.INT, slots: 1, bytes: 4, qualifier: "flat", getFunction: getIntField, setFunction: setIntField },
            "uint": {literal: "uint", constant: gl.UNSIGNED_INT, slotType: gl.UNSIGNED_INT, slots: 1, bytes: 4, qualifier: "", getFunction: getIntField, setFunction: setIntField },
            "sampler2D": {literal: "sampler2D", constant: gl.TEXTURE_2D, slotType: gl.TEXTURE_2D, slots: 1, bytes: 1, qualifier: "", getFunction: null, setFunction: null }
        },

        // Handy macros to include in vertex shaders when using data textures
        dataTextureMacros: `
                    #define TEXTURE_XY(v,w) ivec2(v % w, v / w)
                    #define TEXTURE_XY_POS(c,w) vec4((vec2(c)+0.5) / float(w) * 2.0 - 1.0, 1.0, 1.0)
                    #define TEXTURE_POS(v,w) TEXTURE_XY_POS(TEXTURE_XY(v,w),w)
                    #define TEXTURE_FETCH(t,v,w) texelFetch(t,TEXTURE_XY(v, w), 0)
            `,

        logger: null,   // If set, will be called with messages

        clear() {  // Clear the display
            gl.clear(gl.COLOR_BUFFER_BIT);
        }, 
        
        flush() { gl.flush(); },
        
        data2d(units) {   // calculates the size of a side of a 2d square to hold the units in a texture
            return Math.round(Math.sqrt(units)) + 1;
        }, 

        setLogger(l) { this.logger = l;},  // if set, will be called with messages

        buildDataTexture(width, height, data) {   // Remove once IntTexture is tested - shouldn't be needed
            // Create a texture to hold work data
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
            return texture;
        },

      buildFloatTexture(width, height, data) {
        // Create a texture to hold work data
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, data);  //, new Float32Array(width*height*4)
        return texture;
      },
      buildIntTexture(width, height, data) {  // To be tested
        // Create a texture to hold work data
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32I, width, height, 0, gl.RGBA32I, gl.INT, data);
        return texture;
      },

        buildVertexBuffer(struct, bufferData) {
            if (!bufferData) {
                let error = new Error("call to build vertex buffer with no initial data");
                log(error);
                console.log(error);
                throw error;
            }
            // Create a new VAO (access wrapper) and a new VBO (actual memory region)
            const vertexArray = gl.createVertexArray();
            const vertexBuffer = gl.createBuffer();

            // Associate the VBO with the VAO and fill it with the initial data
            gl.bindVertexArray(vertexArray);
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, bufferData, gl.DYNAMIC_DRAW);

            // Set the VAO to the same bytewise layout as the struct
            struct.layout.map((field, i) => {
                gl.enableVertexAttribArray(i);
                if (field.slotType === gl.INT) {
                  gl.vertexAttribIPointer(i, field.slots, field.slotType, struct.byteSize, field.offset);
                } else {
                  gl.vertexAttribPointer(i, field.slots, field.slotType, false, struct.byteSize, field.offset);
                }
            });
            return {vertexArray: vertexArray, vertexBuffer: vertexBuffer, data: bufferData};
        },

        // Generate a list of customizable GLSL declaration from a Javascript map
        // GJI add qualifier on outs (to support integers in the vertex attribute array)
        declarationList: (scope, map) => Object.entries(map || {}).map(([name, type]) => `${scope===`out` ? Util.glTypes[type].qualifier : ""} ${scope} ${Util.glTypes[type].literal} ${name};`).join("\n"),

        prefixKeys(prefix, map) {
            // Prefix all keys of an object with a given string
            if (map === undefined)
                return {};
            const prefixedMap = {};
            Object.keys(map).map(key => {
                prefixedMap[prefix + key] = map[key];
            });
            return prefixedMap;
        },
    
        buildShader(type, uniforms, inputs, outputs, code) {
            // Merge a GLSL header, declarations, and main code into a single source
            const source = `
                    #version 300 es
                    precision highp float;
                    precision highp int;

                    ${Util.declarationList("uniform", uniforms)}
                    ${Util.declarationList("in", inputs)}
                    ${Util.declarationList("out", outputs)}

                    ${code}
            `.trim();

            // Build
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            //if (webgl_debug_shaders) console.log(webgl_debug_shaders.getTranslatedShaderSource(shader));

            // Check for errors
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                let log = gl.getShaderInfoLog(shader);
                if (log.length > 0) {
                    let error = "buildShader error: \n"+(type === gl.VERTEX_SHADER ? "Vertex" : type === gl.FRAGMENT_SHADER ? "Fragment" : "???") + " shader.COMPILE_STATUS src=\n" + source + "\nError="+log;
                    if (Util.logger) Util.logger(error); else console.error(error);
                    throw error;
                }
            }
            return shader;
        },
        
        buildProgram(vertexShader, fragmentShader) {
            // Merge one vertex shader and one fragment shader into a program
            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);

            // Check for errors
            const log = gl.getProgramInfoLog(program);
            if (log) {
              let error = "Program.PROGRAM_STATUS: " + log;
              if (Util.logger) Util.logger(error); else console.error(error);
              throw error;
            }
            return program;
        },

        // Browser UI Admin stuff - not really GPU specific but it does specifically call the simulation and set parameters
        WINDOW_STOP: false,  // Allows us to cancel all data receipts if something goes wrong
        SHOW_HUL: false,
        LOG_TEXT: ""+String.fromCharCode(13),
        logger(m) { console.log(m); },   // Default console logger

        initializeHeadsUpLog() {
            // Heads up display of logging
            Util.logdiv = document.createElement("div");
            Util.logdiv.setAttribute("style", "position: absolute; top: 0; left: 0;");
            Util.logelement = document.createElement("textarea");
            Util.logelement.setAttribute("readonly", true);
            Util.logelement.setAttribute("rows", "40");
            Util.logelement.setAttribute("cols", "150");
            Util.logelement.setAttribute("width", "100%");
            Util.logelement.setAttribute("height", "100%");
            Util.logelement.setAttribute("style", " white-space: pre-line; background-color: transparent; color: white; font-size: 8pt; border: none; outline: none;");
            Util.logelement.appendChild(document.createTextNode(""));
            Util.logdiv.appendChild(Util.logelement);
            document.body.appendChild(Util.logdiv);
            // setup general error trapping to log
            window.onerror = function (errorMsg, url, lineNumber, column, errorObj) {
                Util.logger('Error: ' + errorMsg + ' Script: ' + url + ' Line: ' + lineNumber + ' Column: ' + column + ' StackTrace: ' +  errorObj);
                Util.WINDOW_STOP=true;
                window.stop();
            }
            Util.SHOW_HUL = true;
            Util.logger = function(t) {
                if (Util.SHOW_HUL) {
                    Util.LOG_TEXT += String.fromCharCode(13)+t;
                    Util.logelement.innerHTML = Util.LOG_TEXT;
                } else {
                    console.log(t);
                }
            };
            return Util.logger;
        },

    // Add Shader controls - call SHADER_CONTROLS(myUpdateFunction) in your update function
    SHADER_STOP: false,
    SHADER_STEP: false,
    SHADER_SLOW: false,
    SHADER_DEFAULT_INTERVAL: 250,
    SHADER_SLOW_INTERVAL: undefined,
    stats: undefined,

    createShaderControls(gp) {  // gp = name of the variable holding the WebGP library object
        if (Util.SHADER_SLOW_INTERVAL === undefined) {
            Util.butdiv = document.createElement("div");
            Util.butdiv.setAttribute("style", "position: absolute; top: 0; color: white;");
            Util.createButton = function createButton(name, code) {
                let but = document.createElement("button");
                but.setAttribute("onClick", code);
                but.appendChild(document.createTextNode(name));
                Util.butdiv.appendChild(but);
            };
            Util.createButton("Stop", gp+".Util.SHADER_STOP = true;");
            Util.createButton("Go", gp+".Util.SHADER_STOP = false;  "+gp+".Util.SHADER_SLOW = false;  "+gp+".Util.SHADER_LOOP_FUNCTION();");
            Util.createButton("Step", gp+".Util.SHADER_SLOW = false; "+gp+".Util.SHADER_STOP = false; "+gp+".Util.SHADER_STEP = true; "+gp+".Util.SHADER_LOOP_FUNCTION();");
            Util.createButton("Slow", gp+".Util.SHADER_SLOW = true; "+gp+".Util.SHADER_SLOW_INTERVAL.value = " + Util.SHADER_DEFAULT_INTERVAL + "; "+gp+".Util.SHADER_STOP = false; "+gp+".Util.SHADER_LOOP_FUNCTION();");
            Util.SHADER_SLOW_INTERVAL = document.createElement("input");
            Util.SHADER_SLOW_INTERVAL.setAttribute("type", "range");
            Util.SHADER_SLOW_INTERVAL.setAttribute("min", 0);
            Util.SHADER_SLOW_INTERVAL.setAttribute("max", 2000);
            Util.SHADER_SLOW_INTERVAL.setAttribute("value", Util.SHADER_DEFAULT_INTERVAL);
            Util.butdiv.appendChild(Util.SHADER_SLOW_INTERVAL);
            document.body.appendChild(Util.butdiv);
        }
    },

    // Call this at the bottom of the render loop passing the loop function (without parenthesis)
    // if no shader controls are activated, will just call the standard requestAnimationFrame() with your function
    GPControls(fun) {
        if (Util.SHADER_SLOW_INTERVAL === undefined) {
            requestAnimationFrame(fun);
        } else {
            Util.SHADER_LOOP_FUNCTION = fun;
            if (!Util.SHADER_STOP)
                if (Util.SHADER_SLOW) {
                    window.setTimeout(function () {requestAnimationFrame(fun); }, Util.SHADER_SLOW_INTERVAL.value);
                } else {
                    if (Util.SHADER_STEP) {
                        Util.SHADER_STOP = true;
                        Util.SHADER_STEP = false;
                        return;
                    }
                    requestAnimationFrame(fun);
                }
        }
    },

    // utility function to return computer that renders a texture
    createTextureDisplay(units, fields, uniforms, texWidth, x, y) {
        return new VertexComputer({
            units: units,
            struct: fields,
            uniforms: uniforms,
            renderStep: {
                viewport: {x: x, y: y, width: texWidth * 3, height: texWidth * 3},
                params: {debugTexture: "sampler2D"},
                glsl: GP.Util.dataTextureMacros+`
                    #define TEX_WIDTH ` +texWidth
                +`
                        void main() {
                            ivec2 texpos = TEXTURE_XY(gl_VertexID, TEX_WIDTH);
                            vertexColor = texelFetch(u_debugTexture, texpos, 0)/1000.0;
                            vertexColor.a += 0.5; // Boost the alpha so we see something
                            gl_Position =  TEXTURE_XY_POS(texpos, TEX_WIDTH);
                            gl_PointSize = 2.0;
                        }
                    `}
        });
    },

    // Utility function to get JSON data from REST service
    getJson(url, callback) {
        let xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                try {
                    let data = JSON.parse(xmlhttp.responseText);
                    callback(null, data);
                } catch(err) {
                    callback(err.message + " in " + xmlhttp.responseText, data);
                }
            } else {
                if (xmlhttp.readyState == 4) {
                    callback("xmlhttp request failed: " + xmlhttp.status + "-"+ xmlhttp.statusText, null);
                }
            }
        };
        xmlhttp.open("GET", url, true);
        xmlhttp.send();
    },

    // A handy object to monitor the time spent doing things
    // call mark() to start timing a cycle, and check() to stop and accumulate time
    // cps() returns cycles/second, mpc() returns milliseconds/cycle
    // 
    stopWatch() {
            return {
                startTime: Date.now(),
                computeTime: 0.0,
                cycleCount: 0,
                lastTime: Date.now(),
                mark: function () { this.cycleCount++; this.lastTime = Date.now(); },
                check: function () { this.computeTime += Date.now() - this.lastTime; return this.cycleCount; },
                cps: function() { return (this.cycleCount/((Date.now()-this.startTime)/1000)); },
                mpc: function() { return (this.computeTime/this.cycleCount); },
                reset: function() { this.startTime = Date.now(); this.computeTime = 0.0; this.cycleCount = 0; },
                stats: function() { return this.cps().toFixed(1)+" cycles/second "+this.mpc().toFixed(3)+" ms/cycle "; }
            };
    }
 
};  // End Util class

 
    return {VertexComputer, VertexArray, UniformBlock, Util};
}
