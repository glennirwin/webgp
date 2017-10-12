// WEBGPGPU - library for WEBGL2 computing and visualizations
function WebGPGPU(canvas, context) {
    "use strict";
    
    if (!context) { context = canvas.getContext("webgl2", {antialias: false} );       
        if (!context) throw "Invalid GL context - browser probably doesn't support WebGL2";            
    }
    const gl = context;

    class VertexFeedbackComputer {
        constructor(description) {
            this.startTime = Date.now();
            this.units = description.units;
            this.struct = {
                fields: description.struct,
                layout: Object.entries(description.struct).map(([field, type], i) => Object.assign({field: field}, Util.glTypes[type])),
            }

            // Fill up byte-wise layout information
            this.bytesSoFar = 0;
            this.struct.layout.forEach(field => {
                field.offset = this.bytesSoFar;
                this.bytesSoFar += field.bytes;
            })
            this.struct.byteSize = this.bytesSoFar;

            // GII add uniforms
            if (description.uniforms) {
                this.uniforms = description.uniforms;
            }

            // If capturing a texture, setup the framebuffer
            if (description.textureOut) {
                this.textureOut = description.textureOut;
                this.frameBuffer = gl.createFramebuffer();
            }

            // GJI make the update step optional, just render
            if (description.updateStep) {
                this.updateUniforms = description.updateStep.params;
                this.updateShaderCode = description.updateStep.glsl;
                let ofields = Util.prefixKeys("o_", this.struct.fields);  // so we can add one for texture out if needed
                if (this.textureOut)
                    ofields["textureColor"] = "vec4";  // If capturing a texture with textureOut, must have a textureColor output

                this.updateProgram = Util.buildProgram(
                    // Takes in unit struct and output new values for the unit struct
                    Util.buildShader(
                        gl.VERTEX_SHADER,
                        Util.prefixKeys("u_", this.updateUniforms),
                        Util.prefixKeys("i_", this.struct.fields),
                        ofields,
                        this.updateShaderCode
                        ),
                    // Default constant fragment shader (has no effect on the feedback transform) - but may output a texture
                    Util.buildShader(gl.FRAGMENT_SHADER, {}, this.textureOut ? {textureColor: "vec4"} : {}, {fragColor: "vec4"},
                        this.textureOut ? `void main() {  fragColor = textureColor;  }`
                        : `void main() { fragColor = vec4(1.0, 1.0, 1.0, 1.0); }`  // this won't be used because RASTERIZER_DISCARD
                        ));
            }

            if (description.textureOut) {
                this.textureOut = description.textureOut;
            }

            // GJI make the render step optional, just update
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
                    Util.buildShader(gl.FRAGMENT_SHADER, {}, {vertexColor: "vec4"}, {fragColor: "vec4"}, `void main() { fragColor = vertexColor;}`));
            }

            // Call initialize for every unit sub-buffer
            this.initialData = new ArrayBuffer(this.units * this.struct.byteSize);
            if (description.initialize)
                for (let i = 0; i < this.units; i++)
                    description.initialize(i, new Uint8Array(this.initialData, i * this.struct.byteSize, this.struct.byteSize));


            // Force location layout on inputs, and setup transform feedback on the outputs
            if (this.updateProgram) {
                Object.keys(this.struct.fields).map((name, i) => gl.bindAttribLocation(this.updateProgram, i, "i_" + name));
                gl.transformFeedbackVaryings(this.updateProgram, Object.keys(this.struct.fields).map(name => "o_" + name), gl.INTERLEAVED_ATTRIBS);
                gl.linkProgram(this.updateProgram);
                if (!gl.getProgramParameter(this.updateProgram, gl.LINK_STATUS)) {
                    let log = gl.getProgramInfoLog(this.updateProgram);
                    if (log) console.warn("Error linking update program " + log);
                }
                // Get uniform locations (note, if not used in the code, the uniform location will return null but this seems to be ok)
                if (this.updateUniforms) this.updateUniformLocations = Object.entries(this.updateUniforms).reduce((o, [k, v]) => (Object.assign(o, {[k]: gl.getUniformLocation(this.updateProgram, "u_" + k)})), {});
                this.transformFeedback = gl.createTransformFeedback();
            }
            
            // Setup render program
            if (this.renderProgram) {
                Object.keys(this.struct.fields).map((name, i) => gl.bindAttribLocation(this.renderProgram, i, "i_" + name));
                gl.linkProgram(this.renderProgram);
                if (!gl.getProgramParameter(this.renderProgram, gl.LINK_STATUS)) {
                    let log = gl.getProgramInfoLog(this.renderProgram);
                    if (log) console.warn("Error linking render program " + log);
                }
                // Get uniform locations (note, if not used in the code, the uniform location will return null but this seems to be ok)
                if (this.renderUniforms) this.renderUniformLocations = Object.entries(this.renderUniforms).reduce((o, [k, v]) => (Object.assign(o, {[k]: gl.getUniformLocation(this.renderProgram, "u_" + k)})), {});
            }

            // Setup double buffering and transform feedback
            this.frontBuffer = Util.buildVertexBuffer(this.struct, this.initialData);
            this.backBuffer = Util.buildVertexBuffer(this.struct, this.initialData);
            this.iteration = 0;
        }
        
        update(source, destination, steps) {
            // Setup context
            gl.useProgram(this.updateProgram);
            if (this.textureOut) {
                let texDim = Util.data2d(this.units);
                gl.viewport(0, 0, texDim, texDim);
                gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.frameBuffer);
                gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.textureOut, 0);
            } else {
                gl.enable(gl.RASTERIZER_DISCARD);
            }

            // Bind source and destination buffers
            gl.bindVertexArray(source.vertexArray);
            gl.bindBuffer(gl.ARRAY_BUFFER, source.vertexBuffer);
            gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.transformFeedback);
            gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, destination.vertexBuffer);

            // Set uniforms
            if (this.updateUniformLocations) { var tc = 0; Object.entries(this.updateUniforms).forEach(([k, v]) => (tc = this.setUniform(tc, v, this.updateUniformLocations[k], this.uniforms[k]))); }

            // Update each unit
            for (let i = 0; i < (steps || 1); i++) {
                gl.beginTransformFeedback(gl.POINTS);
                gl.drawArrays(gl.POINTS, 0, this.units);
                gl.endTransformFeedback();
            }

            // Restore context
            if (this.textureOut) {
                gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
                gl.viewport(0, 0, canvas.width, canvas.height);
            } else {
                gl.disable(gl.RASTERIZER_DISCARD);
            }
            gl.useProgram(null);
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
            if (this.renderUniformLocations) { var tc = 0; Object.entries(this.renderUniforms).forEach(([k, v]) => (tc = this.setUniform(tc, v, this.renderUniformLocations[k], this.uniforms[k]))); }

            // Render each unit
            gl.drawArrays(gl.POINTS, 0, this.units);

            // Restore context
            gl.useProgram(null);
            gl.disable(gl.BLEND);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            
            if (this.renderViewport) gl.viewport(0, 0, canvas.width, canvas.height);
        }
        
        setUniform(tc, type, loc, val) {  // tc = texture count - will increment for each texture
            switch (type) {
                // Value types are assumed to match, a vec3 value should be a Floar32Array[3] TODO: add more types here
                case "float":
                    gl.uniform1f(loc, val);
                    break;
                case "int":
                    gl.uniform1i(loc, val);
                    break;
                case "uint":
                    gl.uniform1ui(loc, val);
                    break;
                case "sampler2D":
                    gl.activeTexture(gl.TEXTURE0 + tc);
                    gl.bindTexture(gl.TEXTURE_2D, val);
                    gl.uniform1i(loc, tc);
                    tc++;
                    break;
                case "vec2":
                    gl.uniform2fv(loc, val);
                    break;
                case "vec3":
                    gl.uniform3fv(loc, val);
                    break;
                case "vec4":
                    gl.uniform4fv(loc, val);
                    break;
                default:
                    console.warn("can't set uniform type " + type + " with value " + val);
            }
            return tc;
        }
        
        run() {  // run in loop forever
            Util.clear();
            this.step();
            requestAnimationFrame(delta => this.run());
        }
        
        step() {  // run a single step - Use each buffer alternatively on each step
            if (this.iteration++ % 2) {
                if (this.updateProgram)
                    this.update(this.frontBuffer, this.backBuffer);
                if (this.renderProgram)
                    this.render(this.backBuffer);
            } else {
                if (this.updateProgram)
                    this.update(this.backBuffer, this.frontBuffer);
                if (this.renderProgram)
                    this.render(this.frontBuffer);
            }
        }
        
        getResultBuffer() {  // return the buffer from the last iteration
            if (this.iteration % 2) {
                return this.frontBuffer;
            } else {
                return this.backBuffer;
            }
        }
        
        setNextBuffer(buffer) { // set the next buffer to use
            if (this.iteration % 2) {
                this.backBuffer = buffer;
            } else {
                this.frontBuffer = buffer;
            }
        }
        
        destroy() {
            gl.deleteTransformFeedback(this.transformFeedback);
            gl.deleteProgram(this.updateProgram);
            gl.deleteProgram(this.renderProgram);
            gl.deleteBuffer(this.frontBuffer.vertexBuffer);
            gl.deleteBuffer(this.backBuffer.vertexBuffer);
            gl.deleteVertexArray(this.frontBuffer.vertexArray);
            gl.deleteVertexArray(this.backBuffer.vertexArray);
        }
    }

    const Util = {
        glTypes: {
            "vec4": {literal: "vec4", constant: gl.FLOAT_VEC4, slotType: gl.FLOAT, slots: 4, bytes: 16},
            "vec3": {literal: "vec3", constant: gl.FLOAT_VEC3, slotType: gl.FLOAT, slots: 3, bytes: 12},
            "vec2": {literal: "vec2", constant: gl.FLOAT_VEC2, slotType: gl.FLOAT, slots: 2, bytes: 8},
            "float": {literal: "float", constant: gl.FLOAT, slotType: gl.FLOAT, slots: 1, bytes: 4},
            "byte": {literal: "byte", constant: gl.BYTE, slotType: gl.BYTE, slots: 1, bytes: 1},
            "ubyte": {literal: "ubyte", constant: gl.UNSIGNED_BYTE, slotType: gl.UNSIGNED_BYTE, slots: 1, bytes: 1},
            "short": {literal: "short", constant: gl.SHORT, slotType: gl.SHORT, slots: 1, bytes: 2},
            "ushort": {literal: "ushort", constant: gl.UNSIGNED_SHORT, slotType: gl.UNSIGNED_SHORT, slots: 1, bytes: 2},
            "int": {literal: "int", constant: gl.INT, slotType: gl.INT, slots: 1, bytes: 4},
            "uint": {literal: "uint", constant: gl.UNSIGNED_INT, slotType: gl.UNSIGNED_INT, slots: 1, bytes: 4},
            "sampler2D": {literal: "sampler2D", constant: gl.TEXTURE_2D, slotType: gl.TEXTURE_2D, slots: 1, bytes: 1}
        },
        
        clear() {  // Clear the display
            gl.clear(gl.COLOR_BUFFER_BIT);
        }, 

        data2d(units) {   // calculates the size of a side of a 2d square to hold the units in a texture
            return Math.round(Math.sqrt(units)) + 1;
        }, 

        buildDataTexture(width, height, data) {
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
        
        buildVertexBuffer(struct, bufferData) {
            // Create a new VAO (access wrapper) and a new VBO (actual memory region)
            const vertexArray = gl.createVertexArray();
            const vertexBuffer = gl.createBuffer();

            // Associate the VBO with the VAO and fill it with the initial data
            gl.bindVertexArray(vertexArray);
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, bufferData, gl.STREAM_COPY);

            // Set the VAO to the same bytewise layout as the struct
            struct.layout.map((field, i) => {
                gl.enableVertexAttribArray(i);
                gl.vertexAttribPointer(i, field.slots, field.slotType, false, struct.byteSize, field.offset);
            });
            return {vertexArray: vertexArray, vertexBuffer: vertexBuffer};
        },
        
        // Generate a list of customizable GLSL declaration from a Javascript map
        declarationList: (scope, map) => Object.entries(map || {}).map(([name, type]) => `${scope} ${type} ${name};`).join("\n"),
        
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

            // Check for errors
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                var log = gl.getShaderInfoLog(shader);
                if (log.length > 0) {
                    console.log("Shader " + (type == gl.VERTEX_SHADER ? "Vertex" : type == gl.FRAGMENT_SHADER ? "Fragment" : "???") + " src=" + source);
                    throw "Shader.COMPILE_STATUS: " + log;
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
            if (log) console.warn(log);

            return program;
        }
    }
    return {VertexFeedbackComputer, Util};
}
