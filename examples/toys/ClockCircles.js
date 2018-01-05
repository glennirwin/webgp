if (!Kit) var Kit = {};
Kit.ClockCircles = {
      model: "QuadShader",
      resources: ["keyboard"],
      renderStep: {
        fragment: `
        float rnd(float s) { return mod(10E6*sin(s*2526.2352+6532.235),1.); }

        // for rotations
        void setPos(float r, vec2 pos, out float ang, out float radius) {
        	float dt = r; // rnd(floor(.5+r*10.))*3.;
            pos.x /= sin(6.283*u_time/10.*dt);
        	ang = mod(.5-atan(pos.y,pos.x)/6.283,1.); radius = length(pos);
        }

        void main()
        {
          vec2 R = u_resolution.xy;
          vec2 pos = (inverse(u_projection) * vec4((gl_FragCoord.xy/R * 2.0 - 1.0),1.0,1.0)).xy;
        	float ang = mod(.5-atan(pos.y,pos.x)/6.283,1.), radius = length(pos);

        	// tunings
        	float MY = 2.5/R.y,    MA = .5/R.y,
        		  MR = 64./R.y,   MR2 = 410./R.y;
        	float AI = (1.+sin(6.283*u_time/100.))/2.;

          int dayint;
          float year = u_date.x, month = u_date.y, day = u_date.z, seconds = u_date.w;
        	float v,I; 	vec3 col = vec3(0.);

        	v = mod(year/1000.,10.)/10.;
        	if (u_Space > 0) setPos(.15, pos,ang,radius);
        	I = smoothstep(0.,1.,ang/v/AI);
        	col.r  += smoothstep(MY,-MY,ang-v) *I *smoothstep(MR,-MR,abs(radius-.15)/.025-1.);
        	v = mod(year/100.,10.)/10.;
        	if (u_Space > 0)setPos(.2, pos,ang,radius);
        	I = smoothstep(0.,1.,ang/v/AI);
        	col.r  += smoothstep(MY,-MY,ang-v) *I *smoothstep(MR,-MR,abs(radius-.2)/.025-1.);
        	v = mod(year/10.,10.)/10.;
        	if (u_Space > 0)setPos(.25, pos,ang,radius);
        	I = smoothstep(0.,1.,ang/v/AI);
        	col.r  += smoothstep(MY,-MY,ang-v) *I *smoothstep(MR,-MR,abs(radius-.25)/.025-1.);
        	v = mod(year,10.)/10.;
        	if (u_Space > 0)setPos(.3, pos,ang,radius);
        	I = smoothstep(0.,1.,ang/v/AI);
        	col.r  += smoothstep(MY,-MY,ang-v) *I *smoothstep(MR,-MR,abs(radius-.3)/.025-1.);
        	v = month/12.;
        	if (u_Space > 0)setPos(.4, pos,ang,radius);
        	I = smoothstep(0.,1.,ang/v/AI);
        	col.g  += smoothstep(MA,-MA,ang-v) *I *smoothstep(MR,-MR,abs(radius-.4)/.04-1.);
        	v = day/31.;
        	if (u_Space > 0)setPos(.5, pos,ang,radius);
        	I = smoothstep(0.,1.,ang/v/AI);
        	col.b  += smoothstep(MA,-MA,ang-v)* I  *smoothstep(MR,-MR,abs(radius-.5)/.04-1.);
          v = floor(seconds/3600./12.);
        	if (u_Space > 0) setPos(.56, pos,ang,radius);
        	I = smoothstep(0.,1.,ang/v/AI);
        	col.rg += vec2(smoothstep(MA,-MA,ang-v)) *I *smoothstep(MR2,-MR2,abs(radius-.56)/.005-1.);
            v = floor(mod(seconds/3600.,12.))/12.;
        	if (u_Space > 0) setPos(.6, pos,ang,radius);
        	I = smoothstep(0.,1.,ang/v/AI);
        	col.rg += vec2(smoothstep(MA,-MA,ang-v)) *I *smoothstep(MR,-MR,abs(radius-.61)/.035-1.);
        	v = mod(seconds,3600.)/3600.;
        	if (u_Space > 0) setPos(.7, pos,ang,radius);
        	 I = smoothstep(0.,1.,ang/v/AI);
        	col.gb += vec2(smoothstep(MA,-MA,ang-v)) *I *smoothstep(MR,-MR,abs(radius-.7)/.04-1.);
            v = mod(u_time,60.)/60.;
        	if (u_Space > 0) setPos(.8, pos,ang,radius);
        	I = smoothstep(0.,1.,ang/v/AI);
        	col.rb += vec2(smoothstep(MA,-MA,ang-v)) *I *smoothstep(MR,-MR,abs(radius-.8)/.04-1.);
        	v = mod(u_time,1.);
        	if (u_Space > 0) setPos(.9, pos,ang,radius);
        	I = smoothstep(0.,1.,ang/v/AI);
        	col.rgb += vec3(smoothstep(MA,-MA,ang-v))*I *smoothstep(MR,-MR,abs(radius-.9)/.04-1.);
        	//v = mod(u_time*10.,1.);
        	//I = smoothstep(0.,1.,ang/v/AI);
        	//col.rgb += vec3(smoothstep(MA,-MA,ang-v))*I *smoothstep(MR2,-MR2,abs(radius-.97)/.005-1.);

        #if 0 // for those who dislike coder colors :-D
        	col += vec3(.1,.2,.3); col.xyz += col.zxy*.5; col*=.5;
        #endif

        	fragColor = vec4(col,1.0);
              }  ` }
}
