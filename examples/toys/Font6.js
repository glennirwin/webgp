if (!Kit) var Kit = {};
Kit.Font6 = {
      model: "QuadShader",
      textures: { iChannel0: "data/font0.png"},
 renderStep: {
        fragment: `// Origin: https://www.shadertoy.com/view/ltcXzs

        // --- access to the image of ascii code
        vec4 sampleCharacterTex( vec2 vCharUV, int iChar ) {
            uvec2 iChPos = uvec2( iChar % 16, iChar / 16 + 1 );
            vec2 vUV = (vec2(iChPos) + vec2(1.,-1.)*vCharUV) / 16.0f;
            return textureLod( u_iChannel0, vUV, 0.0 );
        }

       vec4 char(vec2 p, int C) {
           if (p.x<0.|| p.x>1. || p.y<0.|| p.y>1.) return vec4(0,0,0,1e5);
      //     return sampleCharacterTex(p,C);
      //   return texture   ( u_iChannel0, vec2(1.,-1.)*p/16. + fract( vec2(C, C/16+1) / 16. ) );
         return textureLod( u_iChannel0, vec2(1.,-1.)*p/16. + fract( vec2(C, C/16+1) / 16. ) , log2(length(fwidth(p/16.*u_resolution.xy))) );
    //       return textureGrad( u_iChannel0, vec2(1.,-1.)*p/16. + fract( vec2(C, C/16+1) / 16. ), dFdx(p/16.),dFdy(p/16.) );
           // possible variants: (but better separated in an upper function)
           //     - inout pos and include pos.x -= .5 + linefeed mechanism
           //     - flag for bold and italic
       }


       // --- display int4
       vec4 pInt(vec2 p, float n) {
           vec4 v = vec4(0);
           if (n < 0.)
               v += char(p - vec2(-.5,0), 45 ),
               n = -n;

           for (float i = 3.; i>=0.; i--)
               n /= 10.,
               v += char(p - vec2(.5*i,0), 48+ int(fract(n)*10.) );
           return v;
       }

       void main() {
             vec2 U =  (((inverse(u_projection) * vec4((gl_FragCoord.xy/u_resolution.xy * 2.0 - 1.0),0.0,1.0))).xy + 1.0) / 2.0;  // for full quad (testing)
        //   vec2 uv = (((inverse(newproj) * vec4((gl_FragCoord.xy/u_resolution.xy * 2.0 - 1.0),0.0,1.0))).xy + 1.0) / 2.0;

           float t = 3.*u_time;

        //   vec4 O = char(U,int(t));     // try .xxxx for mask, .wwww for distance field.
           vec4 O = char(U,int(t));     // try .xxxx for mask, .wwww for distance field.
        // return;                 // uncomment to just see the letter count.

  //         vec4 O2 = char(U,int(++t));
  //         O = mix(O,O2,fract(t));             // linear morphing
        // O = sqrt(mix(O*O,O2*O2,fract(t)));  // quadratic morphing


           O =  smoothstep(.5,.49,O.wwww);
    //          * O.yzww;                        // comment for B&W


         U *= 8.; O+=pInt(U,mod(t,255.0)).xxxx;           // ascii code
         if (O.w > 0.0) fragColor = O;
       }
`  }
}
