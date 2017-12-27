if (!Kit) var Kit = {};
Kit.ClockMin = {
      model: "quad",
 renderStep: {
        fragment: `

                  // by Nikos Papadopoulos, 4rknova / 2014
                  // Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.

                  #define DISCREET_SECONDS
                  #define AA	4.

                  #define PI  3.14159265359
                  #define EPS .01

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

                  float df_scene(vec2 uv)
                  {
                  	float thrs = mod(u_date,1.0) * 24.;
                  	float tmin = mod(u_date, 1.0) * 1440.;
                      float tsec = u_time;

                      #ifdef DISCREET_SECONDS
                      	tsec = floor(tsec);
                      #endif

                      vec2 c = vec2(0), u = vec2(0,1);
                      float c1 = sharpen(df_circ(uv, c, .90), EPS * 1.5);
                      float c2 = sharpen(df_circ(uv, c, .04), EPS * 0.5);
                      float d1 = sharpen(df_disk(uv, c, .01), EPS * 1.5);
                      float l1 = sharpen(df_line(uv, c, rotate(u,-thrs / 12.) * .60), EPS * 1.7);
                      float l2 = sharpen(df_line(uv, c, rotate(u,-tmin / 60.) * .80), EPS * 1.0);
                      float l3 = sharpen(df_line(uv, c, rotate(u,-tsec / 60.) * .85), EPS * 0.5);
                      return max(max(max(max(max(l1, l2), l3), c1), c2), d1);
                  }

                  void main( ) {
                    //                  	vec2 uv = (fragCoord.xy / iResolution.xy * 2. - 1.);
                      vec2 uv = (inverse(u_projection) * vec4((gl_FragCoord.xy/u_resolution.xy * 2.0 - 1.0),1.0,1.0)).xy;
                      //uv.x *= u_resolution.x / u_resolution.y;
                      vec3 col = vec3(0);

                  #ifdef AA
                      // Antialiasing via supersampling
                      float e = 1. / min(u_resolution.y , u_resolution.x);
                      for (float i = -AA; i < AA; ++i) {
                          for (float j = -AA; j < AA; ++j) {
                      		col += df_scene(uv + vec2(i, j) * (e/AA)) / (4.*AA*AA);
                          }
                      }
                  #else
                      col += df_scene(uv);
                  #endif /* AA */

                  	fragColor = vec4(col, 1);
                  }`  }
}
