if (!Kit) var Kit = {};
Kit.FirstAudio = {
      model: "quad",
      audio: { iChannel0: "data/mzk00.ogg"},
 renderStep: {
        fragment: `
// Created by inigo quilez - iq/2013
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.

void main()
{
    // create pixel coordinates
	//vec2 uv = fragCoord.xy / iResolution.xy;
  vec2 uv = (((inverse(u_projection) * vec4(gl_FragCoord.xy/u_resolution * 2.0 - 1.0,0.0,1.0)) ).xy + 1.0)/2.0;

    // the sound texture is 512x2
    int tx = int(uv.x*1024.0);

	// first row is frequency data (48Khz/4 in 512 texels, meaning 23 Hz per texel)
	float fft  = texelFetch( u_iChannel0, ivec2(tx,0), 0 ).x;

    // second row is the sound wave, one texel is one mono sample
    float wave = texelFetch( u_iChannel0, ivec2(tx,1), 0 ).x;

	// convert frequency to colors
	vec3 col = vec3( fft, 4.0*fft*(1.0-fft), 1.0-fft ) * fft;

    // add wave form on top
	col += 1.0 -  smoothstep( 0.0, 0.15, abs(wave - uv.y) );

	// output final color
	fragColor = vec4(col,1.0);
} `}

}
