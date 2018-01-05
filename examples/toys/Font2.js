if (!Kit) var Kit = {};
Kit.Font2 = {
      model: "TextQuadShader",
      text: `The quick brown fox jumped over the lazy dog

    This is an example of simple text output
    using a simple algorithm for positioning (newlines)
    Each character is an instance of a quad drawn
    by a 100% procedural font inside a fragment shader
    01234567890
    !@#$%^&*()-_=+[]{}\\|;:'"/?.>,<~
    ABCDEFGHIJKLMNOPQRSTUVWXYZ
    abcdefghijklmnopqrstuvwxyz`,
      textures: { font0: "data/font0.png"},
 renderStep: {
        fragment: `
                  // by Nikos Papadopoulos, 4rknova / 2014
                  // Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.

                  #define DISCREET_SECONDS
                  #define AA	4.

                  #define PI  3.14159265359
                  #define EPS .01

                  // --- access to the image of ascii code c - from https://www.shadertoy.com/view/MtyXRW
                  #define C(c) T+= U.x<.0||U.x>1.||U.y<0.||U.y>1. ?vec4(0): texture( u_font0, vec2(1.0,-1.0)*(U/16. + fract( floor(vec2(c, 15.999-float((c)/16))) / 16.))); U.x-=.38;

                  // --- display int2
                  float pInt(vec2 U, int n) {
                      vec4 T = vec4(0); U += .5;
                      if (n>9) { U.x+=.15; C(48+ n/10); n -= n/10*10; } // tens
                      C(48+n);                                          // units
                      return  T.x; // length(T.yz)==0. ? -1 : T.x;      // -1 for out of BBox.
                  }

                  float df_disk(in vec2 p, in vec2 c, in float r)
                  {
                      return clamp(length(p - c) - r, 0., 1.);
                  }

                  float df_circ(in vec2 p, in vec2 c, in float r)
                  {
                      return abs(r - length(p - c));
                  }

                  float df_line(in vec2 p, in vec2 a, in vec2 b)
                  {
                      vec2 pa = p - a, ba = b - a;
                  	float h = clamp(dot(pa,ba) / dot(ba,ba), 0., 1.);
                  	return length(pa - ba * h);
                  }

                  float sharpen(in float d, in float w)
                  {
                      float e = 1. / min(u_resolution.y , u_resolution.x);
                      return 1. - smoothstep(-e, e, d - w);
                  }

                  vec2 rotate(in vec2 p, in float t)
                  {
                      t = t * 2. * PI;
                      return vec2(p.x * cos(t) - p.y * sin(t),
                                  p.y * cos(t) + p.x * sin(t));
                  }

                  float df_scene(vec2 uv, vec2 textpos, int v_char)
                  {
                  	  float thrs = trunc(u_date.w / 3600.);
                  	  float tmin = trunc((u_date.w - (thrs * 3600.)) / 60.);
                      float tsec = u_date.w - (thrs * 3600.) - (tmin * 60.0);

                      #ifdef DISCREET_SECONDS
                      	tsec = floor(tsec);
                      #endif

                      float d = 1.5;
//                      float ct1 = .7 * pInt( (uv-d*sin(vec2(-0.5,0.75))) *2./d,   int(u_date.x-2000.0) );
//                      float ct2 = .7 * pInt( (uv-d*sin(vec2(0.0,0.75))) *2./d,   int(u_date.y) );
                      float ct1 = .7 * pInt( (uv-d*sin(vec2(0.0,0.5))) *2./d,   int(textpos.x) );
                      float ct2 = .7 * pInt( (uv-d*sin(vec2(0.0,0.0))) *2./d,   v_char );
                      float ct3 = .7 * pInt( (uv-d*sin(vec2(0.0,-0.5))) *2./d,   int(textpos.y) );
//                      float ct4 = .7 * pInt( (uv-d*sin(vec2(-0.5,-0.75))) *2./d,   int(thrs) );
//                      float ct5 = .7 * pInt( (uv-d*sin(vec2(0.0,-0.75))) *2./d,   int(tmin) );
//                      float ct6 = .7 * pInt( (uv-d*sin(vec2(0.5,-0.75))) *2./d,   int(tsec) );

                      vec2 c = vec2(0), u = vec2(0,1);
//                      float c1 = sharpen(df_circ(uv, c, .90), EPS * 1.5);
//                      float c2 = sharpen(df_circ(uv, c, .04), EPS * 0.5);
//                      float d1 = sharpen(df_disk(uv, c, .01), EPS * 1.5);
//                      float l1 = sharpen(df_line(uv, c, rotate(u,-thrs / 12.) * .60), EPS * 1.7);
                      float l2 = sharpen(df_line(uv, c, rotate(u,-tmin / 60.) * .80), EPS * 1.0);
                      float l3 = sharpen(df_line(uv, c, rotate(u,-tsec / 60.) * .85), EPS * 0.5);
//                        return max(max(max(max(max(max(max(max(max(max(max(l1, l2), l3), c1), c2), d1), ct1), ct2), ct3), ct4), ct5), ct6);
                        return max(max(max(max(l2,l3), ct1), ct2), ct3);
                  }

                  mat4 scale(float x, float y, float z) {	return mat4(vec4(x,   0.0, 0.0, 0.0),
                  																										vec4(0.0, y,   0.0, 0.0),
                  																										vec4(0.0, 0.0, z,   0.0),
                  																										vec4(0.0, 0.0, 0.0, 1.0)); }

                  mat4 translate(float x, float y, float z) { return mat4(vec4(1.0, 0.0, 0.0, 0.0),
                  																												vec4(0.0, 1.0, 0.0, 0.0),
                  																												vec4(0.0, 0.0, 1.0, 0.0),
                  																												vec4(x,   y,   z,   1.0)); }

                  in mat4 newproj;

                  void main( ) {
                      vec2 uv =  ((inverse(newproj) * vec4((gl_FragCoord.xy/u_resolution.xy * 2.0 - 1.0),1.0,1.0))).xy;
                      vec3 col = vec3(0);

                  #ifdef AA
                      // Antialiasing via supersampling
                      float e = 1. / min(u_resolution.y , u_resolution.x);
                      for (float i = -AA; i < AA; ++i) {
                          for (float j = -AA; j < AA; ++j) {
                      		col += df_scene(uv + vec2(i, j) * (e/AA), v_textpos, v_char) / (4.*AA*AA);
                          }
                      }
                  #else
                      col += df_scene(uv, v_textpos);
                  #endif /* AA */


                  	if (col.x > 0.0 && col.y > 0.0 && col.z > 0.0) fragColor = vec4(col, 1);
                  }`  }
}
