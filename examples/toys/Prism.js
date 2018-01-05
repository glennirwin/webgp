if (!Kit) var Kit = {};
Kit.Prism = {
      model: "QuadShader",
 renderStep: {
        fragment: `
          // Author: Rigel rui@gil.com
          // licence: https://creativecommons.org/licenses/by/4.0/
          // link: https://www.shadertoy.com/view/MlsBWj

          /*
          I decided to start learning about the raymarching algorithm with the most basic
          setup possible. A ray and a triangle in 2D. The goal was to shoot some rays,
          kick in some tires and get a feel on how the algorithm works. :)
          */

          // fills a function near its boundary f(x) = 0, d = f(x), s = size, i = inverse
          float fill(float d, float s, float i) { return abs(smoothstep(s,.0,d) - i); }

          // a signed fistance function for a line segment
          float sdfSegment(vec2 uv, vec2 a, vec2 b) {
            uv-= a; b -= a;
            return length(uv - b * clamp(dot(uv,b)/dot(b,b), 0.0, 1.0));
          }

          // a signed distance function for an equilateral triangle
          // from iq -> https://www.shadertoy.com/view/Xl2yDW
          float sdfEqTri(  in vec2 p ) {
              const float k = sqrt(3.0);

              p.x = abs(p.x) - 1.0;
              p.y = p.y + 1.0/k;

              if( p.x + k*p.y > 0.0 ) p = vec2( p.x - k*p.y, -k*p.x - p.y )/2.0;

              p.x -= clamp( p.x, -2.0, 0.0 );

              return -length(p)*sign(p.y);
          }

          // the signed distance function for the scene. it's just a triangle.
          float sdfMap(vec2 uv) { return sdfEqTri(uv); }

          // to shoot a ray in a distance field, we need: ro = ray origin and
          // rd = ray direction. I use s = the sign of the distance function, because
          // I need it to make it work in positive space (outside the prism)
          // and negative space inside the prism
          vec2 shootRay(vec2 ro,vec2 rd, float s) {
              // i need this "nudge" to escape the boundary, when I switch between
              // positive and negative :/
            ro += rd*0.01;
            for (int i=0; i<20; i++) {
              float dis = s*sdfMap(ro);
              if (dis < .0) break;
              ro += rd*dis;
            }
            return ro;
          }

          // to calculate the normal we "sample" the signed distance function in
          // 2 directions (2D). the difference will make the normal point away where
          // the function grows.
          vec2 normal(vec2 uv) {
            vec2 eps = vec2( 0.0005, 0.0 );
            return normalize(
              vec2(sdfMap(uv+eps.xy) - sdfMap(uv-eps.xy),
                   sdfMap(uv+eps.yx) - sdfMap(uv-eps.yx)));
          }


          // https://en.wikipedia.org/wiki/Snell%27s_law
          // n1.sin(a1) = n2.sin(a2)
          // I ripped off the refraction formula from wikipedia. Thanks Wikipedia! :)
          // the refracted vector is a function of n = normal, d = the light direction
          // and r = the ratio of refractive indices (n1/n2), so for a light ray travelling
          // from vacuum (n1=1) to glass (n2=1.52) you get r = 1./1.52, and the inverse if
          // the light ray is travelling from glass to vacuum (1.52/1.).
          // note: this formula is incomplete ! For a certain critical angle, there is no
          // refraction but only reflection, so the returned vector is invalid. use at
          // your own risk :)
          vec2 refraction(vec2 n, vec2 d, float r ) {
            // well I just realised after I posted this, that GLSL already has a
              // refract function. :P. That will teach me to RTFM first...
              // I will just leave this here for reference...

              //float c = dot(-n, d);
            //return r*d + (r*c - sqrt(1.-(r*r) * (1.-(c*c)))) * n;
              return refract(d,n,r);
          }

          // from Alan Zuconni -> https://www.shadertoy.com/view/ls2Bz1
          // a palette that simulates the light spectrum
          // w: wavelength [400, 700]	nm
          vec3 spectrum (float w) {
            float x = clamp((w - 400.0)/ 300.0, 0., 1.);

            const vec3 cs = vec3(3.54541723, 2.86670055, 2.29421995);
            const vec3 xs = vec3(0.69548916, 0.49416934, 0.28269708);
            const vec3 ys = vec3(0.02320775, 0.15936245, 0.53520021);

            vec3 xx = cs * (x - xs);
            return clamp((vec3(1.) - xx * xx)-ys, 0., 1.);
          }

          // setting up the scene
          vec3 scene(vec2 uv, vec2 ms) {

              // the ray origin will be the mouse position
            vec2 ro = ms;
            // and the ray direction will point a coordinate (.0,.5)
              float a = atan(ro.y-.5,ro.x)+radians(180.);
            vec2 rd = vec2(cos(a),sin(a));

              // setting the color of the background
            vec3 color = vec3(.0,.0,.3)*fill(abs(-uv.y+uv.x),4.,1.);

              // a few variables to set up the triangular prism
            float triSdf = sdfMap(uv);
            float triMsk = fill(triSdf,.05,1.);
            float prism = (1.-abs(triSdf)*10.)*(1.-triMsk);

              // shooting the ray in positive space until it hits the prism.
            vec2 hit = shootRay(ro,rd,1.);
              // coloring the initial white light ray
            color = mix(color,vec3(1.),fill(sdfSegment(uv,ro,hit),.05,.0));

              // when the ray hits the prism it will get refracted.
              // each wavelength of light has a different refractive indice
              // so I shoot 9 rays, each with a different indice and wavelength
            for (int i=1; i<10; i++) {

                  // calculate the refractive indice.
                  // I just spread light around 1.52 the value for common glass.
              float f = float(i) * 0.05;
              float ridx = 1.30 + f;
              vec2 rdir = rd;

                  // calculate the direction of the refraction
              rdir = refraction(normal(hit), rdir, 1./ridx);
                  // and use it to shoot a ray in negative space inside the prism
              vec2 hit2 = shootRay(hit,rdir,-1.);

                  // when the ray hits the other side of the prism, it will get refracted
                  // again, but this time I invert the normal, because I'm in negative space
                  // an invert the indice because the light is going from glass to vacuum.
              rdir = refraction(-normal(hit2), rdir, ridx/1.);
                  // for the last part I don't need to shoot a ray, because it will
                  // not hit anything, so I just send away it far enough...
              vec2 hit3 = hit2+rdir*5.;//shootRay(hit2,rdir,1.);

                  // coloring the ray inside the prism with it's pectrum
              float glassRay = (1.-triMsk)*fill(sdfSegment(uv,hit,hit2),.1,.0);
              color = clamp(color+spectrum(700.-f*600.)*glassRay*.5 ,.0,1.);

                  // coloring the ray outside the prism with it's spectrum
              float lightRay = triMsk*fill(sdfSegment(uv,hit2,hit3),.15,.0);
              color = clamp(color+spectrum(700.-f*600.)*lightRay,.0,1.);
            }

            // the prism
              color = mix(color,vec3(.7,.7,.9),prism);

            return color;
          }

          void main() {
            //vec2 uv = (fragCoord.xy - iResolution.xy *.5)/ iResolution.y;
            vec2 uv = (inverse(u_projection) * vec4((gl_FragCoord.xy/u_resolution.xy * 2.0 - 1.0),1.0,1.0)).xy;

              vec2 ms = u_mouse.xy;
            fragColor = vec4( scene(uv * 4., ms * 4.), 1.0 );
          }
          `
}
}
