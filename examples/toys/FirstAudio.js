if (!Kit) var Kit = {};
Kit.FirstAudio = {
      model: "QuadShader",
      audio: { iChannel0: "*"},
 renderStep: {
        fragment: `
// Created by inigo quilez - iq/2013
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
void main() {
    vec2 uv = (((inverse(u_projection) * vec4(gl_FragCoord.xy/u_resolution * 2.0 - 1.0,0.0,1.0)) ).xy + 1.0)/2.0;     //was vec2 uv = fragCoord.xy / iResolution.xy;
    int tx = int(uv.x*1024.0);                                 // the sound texture is 1024x2
  	float fft  = texelFetch( u_iChannel0, ivec2(tx,0), 0 ).x;  // first row is frequency data (48Khz/4 in 512 texels, meaning 23 Hz per texel)
    float wave = texelFetch( u_iChannel0, ivec2(tx,1), 0 ).x;  // second row is the sound wave, one texel is one mono sample
  	vec3 col = vec3( fft, 4.0*fft*(1.0-fft), 1.0-fft ) * fft;  // convert frequency to colors
	  col += 1.0 -  smoothstep( 0.0, 0.15, abs(wave - uv.y) );   // add wave form on top
  	fragColor = vec4(col,1.0);                                 // output final color
} `}

}
