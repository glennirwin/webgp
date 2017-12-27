if (!Kit) var Kit = {};
Kit.Water = {
      model: "quad",
 renderStep: {
        fragment: `
                #define MAX_ITER 8

                void main() {

                  vec2 sp = (inverse(u_projection) * vec4((gl_FragCoord.xy/u_resolution.xy * 2.0 - 1.0),1.0,1.0)).xy/2.0;

                  //vec2 sp = surfacePosition;//vec2(.4, .7);
                	vec2 p = sp*8.0- vec2(20.0);
                	vec2 i = p;
                	float c = 0.5;
                	float inten = .01;

                	for (int n = 0; n < MAX_ITER; n++)
                	{
                		float t = u_time / 5.0 * (1.0 - (3.0 / float(n+1)));
                		i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
                		c += 2.0/length(vec2(p.x / (sin(i.x+t)/inten),p.y / (cos(i.y+t)/inten)));
                	}
                	c /= float(MAX_ITER);
                	c = 2.0-sqrt(c);
                	fragColor = vec4(vec3(c*c*c*c), 19.0) + vec4(0.0, 0.0, 0.1, 1.0);


                  //fragColor = vec4(uv,0.5+0.5*sin(u_time),1.0);
              }  `
}
}
