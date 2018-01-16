if (!Kit) var Kit = {};
Kit.TextEdit = {
      model: "TextEditor",
      text: `This is a simple character based text editor
The quick brown fox jumped over the lazy dog
01234567890!@#$%^&*()-_=+[]{}\\|;:'"/?.>,<~
ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz`,
      resources: ["keybuffer"],
      sizing: { positioning: "autochar", fixedAspect: false, width: 17, height: 17, widthMultiplier: 0.5 },
      styles: [{ name: "normal" }, { name: "bold" }, { name: "italic"} ],
      textures: { iChannel0: "data/font0.png"},
      renderStep: { fragment: `
        // Origin: https://www.shadertoy.com/view/ltcXzs

       vec4 char(vec2 p, int C) {   // --- access to the image of ascii code
           if (p.x<0.|| p.x>1. || p.y<0.|| p.y>1.) return vec4(0,0,0,1e5);
           return textureGrad( u_iChannel0, vec2(1.,-1.)*p/16. + fract( vec2(C, C/16+1) / 16. ), dFdx(p/16.),dFdy(p/16.) );
               // return texture   ( u_iChannel0, vec2(1.,-1.)*p/16. + fract( vec2(C, C/16+1) / 16. ) );
               // return textureLod( u_iChannel0, vec2(1.,-1.)*p/16. + fract( vec2(C, C/16+1) / 16. ) , log2(length(fwidth(p/16.*u_resolution.xy))) );
       }

       vec4 pInt(vec2 p, float n) {              // --- display int4
           vec4 v = vec4(0);
           if (n < 0.)  v += char(p - vec2(-.5,0), 45 ),  n = -n;
           for (float i = 3.; i>=0.; i--) n /= 10.,  v += char(p - vec2(.5*i,0), 48+ int(fract(n)*10.) );
           return v;
       }

       in mat4 newproj;

       void main() {
         if (v_char < 0) discard;
           vec2 U = (((inverse(newproj) * vec4((gl_FragCoord.xy/u_resolution.xy * 2.0 - 1.0),0.0,1.0))).xy + 1.0) / 2.0;
           vec4 O = char(U,v_char);     // try .xxxx for mask, .wwww for distance field.
           O =  smoothstep(.5,.49,O.wwww) * v_color;   //          * O.yzww; // comment for B&W
//         U *= 4.; O+=pInt(U,float(v_char % 255)).xxxx;           // to display ascii code (very tiny)
           if (O.w > 0.0) fragColor = O;
       }
`  }
}
