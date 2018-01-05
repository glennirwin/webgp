if (!Kit) var Kit = {};
Kit.Font3 = {
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
  sizing: { positioning: "character", fixedAspect: true, width: 13, height: 13, widthMultiplier: 0.45, scalable: true  },
 renderStep: {
        fragment: `// Functional Font code from: https://www.shadertoy.com/view/XdtSD4

        // line function, used in k, v, w, x, y, z, 1, 2, 4, 7 and ,
        // rest is drawn using (stretched) circle(g)
        // todo: distance fields of s,S, J { and }
        // todo before we can show shaders :)
        //
        float line(vec2 p, vec2 a, vec2 b)
        {
        	vec2 pa = p - a;
        	vec2 ba = b - a;
        	float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
            return length(pa - ba * h);
        }

        //These functions are re-used by multiple letters
        float _u(vec2 uv, float w, float v) {
            return length(vec2(
                        abs(length(vec2(uv.x,
                                        max(0.0,-(.4-v)-uv.y) ))-w)
                       ,max(0.,uv.y-.4)));
        }
        float _i(vec2 uv) {
            return length(vec2(uv.x,max(0.,abs(uv.y)-.4)));
        }
        float _j(vec2 uv) {
            uv.x+=.2;
            uv.y+=.55;
            float x = uv.x>0.&&uv.y<0.?
                        abs(length(uv)-.25)
                       :min(length(uv+vec2(0.,.25)),
                            length(vec2(uv.x-.25,max(0.,abs(uv.y-.475)-.475))));
            return x;
        }
        float _l(vec2 uv) {
            uv.y -= .2;
            return length(vec2(uv.x,max(0.,abs(uv.y)-.6)));
        }
        float _o(vec2 uv) {
            return abs(length(vec2(uv.x,max(0.,abs(uv.y)-.15)))-.25);
        }

        // Here is the alphabet
        float aa(vec2 uv) {
            uv = -uv;
            float x = abs(length(vec2(max(0.,abs(uv.x)-.05),uv.y-.2))-.2);
            x = min(x,length(vec2(uv.x+.25,max(0.,abs(uv.y-.2)-.2))));
            return min(x,(uv.x<0.?uv.y<0.:atan(uv.x,uv.y+0.15)>2.)?_o(uv):length(vec2(uv.x-.22734,uv.y+.254)));
        }
        float bb(vec2 uv) {
            float x = _o(uv);
            uv.x += .25;
            return min(x,_l(uv));
        }
        float cc(vec2 uv) {
            float x = _o(uv);
            uv.y= abs(uv.y);
            return uv.x<0.||atan(uv.x,uv.y-0.15)<1.14?x:
                            min(length(vec2(uv.x+.25,max(0.0,abs(uv.y)-.15))),//makes df right
                                length(uv+vec2(-.22734,-.254)));
        }
        float dd(vec2 uv) {
            uv.x *= -1.;
            return bb(uv);
        }
        float ee(vec2 uv) {
            float x = _o(uv);
            return min(uv.x<0.||uv.y>.05||atan(uv.x,uv.y+0.15)>2.?x:length(vec2(uv.x-.22734,uv.y+.254)),
                       length(vec2(max(0.,abs(uv.x)-.25),uv.y-.05)));
        }
        float ff(vec2 uv) {
            uv.x *= -1.;
            uv.x += .05;
            float x = _j(vec2(uv.x,-uv.y));
            uv.y -= .4;
            x = min(x,length(vec2(max(0.,abs(uv.x-.05)-.25),uv.y)));
            return x;
        }
        float gg(vec2 uv) {
            float x = _o(uv);
            return min(x,uv.x>0.||atan(uv.x,uv.y+.6)<-2.?
                       _u(uv,0.25,-0.2):
                       length(uv+vec2(.23,.7)));
        }
        float hh(vec2 uv) {
            uv.y *= -1.;
            float x = _u(uv,.25,.25);
            uv.x += .25;
            uv.y *= -1.;
            return min(x,_l(uv));
        }
        float ii(vec2 uv) {
            return min(_i(uv),length(vec2(uv.x,uv.y-.7)));
        }
        float jj(vec2 uv) {
            uv.x+=.05;
            return min(_j(uv),length(vec2(uv.x-.05,uv.y-.7)));
        }
        float kk(vec2 uv) {
            float x = line(uv,vec2(-.25,-.1), vec2(0.25,0.4));
            x = min(x,line(uv,vec2(-.15,.0), vec2(0.25,-0.4)));
            uv.x+=.25;
            return min(x,_l(uv));
        }
        float ll(vec2 uv) {
            return _l(uv);
        }
        float mm(vec2 uv) {
            //uv.x *= 1.4;
            uv.y *= -1.;
            uv.x-=.175;
            float x = _u(uv,.175,.175);
            uv.x+=.35;
            x = min(x,_u(uv,.175,.175));
            uv.x+=.175;
            return min(x,_i(uv));
        }
        float nn(vec2 uv) {
            uv.y *= -1.;
            float x = _u(uv,.25,.25);
            uv.x+=.25;
            return min(x,_i(uv));
        }
        float oo(vec2 uv) {
            return _o(uv);
        }
        float pp(vec2 uv) {
            float x = _o(uv);
            uv.x += .25;
            uv.y += .4;
            return min(x,_l(uv));
        }
        float qq(vec2 uv) {
            uv.x = -uv.x;
            return pp(uv);
        }
        float rr(vec2 uv) {
            uv.x -= .05;
            float x =atan(uv.x,uv.y-0.15)<1.14&&uv.y>0.?_o(uv):length(vec2(uv.x-.22734,uv.y-.254));

            //)?_o(uv):length(vec2(uv.x-.22734,uv.y+.254))+.4);

            uv.x+=.25;
            return min(x,_i(uv));
        }
        float ss(vec2 uv) {
            if (uv.y <.225-uv.x*.5 && uv.x>0. || uv.y<-.225-uv.x*.5)
                uv = -uv;
            float a = abs(length(vec2(max(0.,abs(uv.x)-.05),uv.y-.2))-.2);
            float b = length(vec2(uv.x-.231505,uv.y-.284));
            float x = atan(uv.x-.05,uv.y-0.2)<1.14?a:b;
            return x;
        }
        float tt(vec2 uv) {
            uv.x *= -1.;
            uv.y -= .4;
            uv.x += .05;
            float x = min(_j(uv),length(vec2(max(0.,abs(uv.x-.05)-.25),uv.y)));
            return x;
        }
        float uu(vec2 uv) {
            return _u(uv,.25,.25);
        }
        float vv(vec2 uv) {
            uv.x=abs(uv.x);
            return line(uv,vec2(0.25,0.4), vec2(0.,-0.4));
        }
        float ww(vec2 uv) {
            uv.x=abs(uv.x);
            return min(line(uv,vec2(0.3,0.4), vec2(.2,-0.4)),
                       line(uv,vec2(0.2,-0.4), vec2(0.,0.1)));
        }
        float xx(vec2 uv) {
            uv=abs(uv);
            return line(uv,vec2(0.,0.), vec2(.3,0.4));
        }
        float yy(vec2 uv) {
            return min(line(uv,vec2(.0,-.2), vec2(-.3,0.4)),
                       line(uv,vec2(.3,.4), vec2(-.3,-0.8)));
        }
        float zz(vec2 uv) {
            float l = line(uv,vec2(0.25,0.4), vec2(-0.25,-0.4));
            uv.y=abs(uv.y);
            float x = length(vec2(max(0.,abs(uv.x)-.25),uv.y-.4));
            return min(x,l);
        }

        // Capitals
        float AA(vec2 uv) {
            float x = length(vec2(
                        abs(length(vec2(uv.x,
                                        max(0.0,uv.y-.35) ))-0.25)
                       ,min(0.,uv.y+.4)));
            return min(x,length(vec2(max(0.,abs(uv.x)-.25),uv.y-.1) ));
        }

        float BB(vec2 uv) {
            uv.y -=.1;
            uv.y = abs(uv.y);
            float x = length(vec2(
                        abs(length(vec2(max(0.0,uv.x),
                                         uv.y-.25))-0.25)
                       ,min(0.,uv.x+.25)));
            return min(x,length(vec2(uv.x+.25,max(0.,abs(uv.y)-.5)) ));
        }
        float CC(vec2 uv) {
            float x = abs(length(vec2(uv.x,max(0.,abs(uv.y-.1)-.25)))-.25);
            uv.y -= .1;
            uv.y= abs(uv.y);
            return uv.x<0.||atan(uv.x,uv.y-0.25)<1.14?x:
                            min(length(vec2(uv.x+.25,max(0.0,abs(uv.y)-.25))),//makes df right
                                length(uv+vec2(-.22734,-.354)));
        }
        float DD(vec2 uv) {
            uv.y -=.1;
            //uv.y = abs(uv.y);
            float x = length(vec2(
                        abs(length(vec2(max(0.0,uv.x),
                                        max(0.0,abs(uv.y)-.25)))-0.25)
                       ,min(0.,uv.x+.25)));
            return min(x,length(vec2(uv.x+.25,max(0.,abs(uv.y)-.5)) ));
        }
        float EE(vec2 uv) {
            uv.y -=.1;
            uv.y = abs(uv.y);
            float x = min(length(vec2(max(0.,abs(uv.x)-.25),uv.y)),
                          length(vec2(max(0.,abs(uv.x)-.25),uv.y-.5)));
            return min(x,length(vec2(uv.x+.25,max(0.,abs(uv.y)-.5))));
        }
        float FF(vec2 uv) {
            uv.y -=.1;
            float x = min(length(vec2(max(0.,abs(uv.x)-.25),uv.y)),
                          length(vec2(max(0.,abs(uv.x)-.25),uv.y-.5)));
            return min(x,length(vec2(uv.x+.25,max(0.,abs(uv.y)-.5))));
        }
        float GG(vec2 uv) {
            float x = abs(length(vec2(uv.x,max(0.,abs(uv.y-.1)-.25)))-.25);
            uv.y -= .1;
            float a = atan(uv.x,max(0.,abs(uv.y)-0.25));
            x = uv.x<0.||a<1.14 || a>3.?x:
                            min(length(vec2(uv.x+.25,max(0.0,abs(uv.y)-.25))),//makes df right
                                length(uv+vec2(-.22734,-.354)));
            x = min(x,line(uv,vec2(.22734,-.1),vec2(.22734,-.354)));
            return min(x,line(uv,vec2(.22734,-.1),vec2(.05,-.1)));
        }
        float HH(vec2 uv) {
            uv.y -=.1;
            uv.x = abs(uv.x);
            float x = length(vec2(max(0.,abs(uv.x)-.25),uv.y));
            return min(x,length(vec2(uv.x-.25,max(0.,abs(uv.y)-.5))));
        }
        float II(vec2 uv) {
            uv.y -= .1;
            float x = length(vec2(uv.x,max(0.,abs(uv.y)-.5)));
            uv.y = abs(uv.y);
            return min(x,length(vec2(max(0.,abs(uv.x)-.1),uv.y-.5)));
        }
        float JJ(vec2 uv) {
            uv.x += .125;
            float x = length(vec2(
                        abs(length(vec2(uv.x,
                                        min(0.0,uv.y+.15) ))-0.25)
                       ,max(0.,max(-uv.x,uv.y-.6))));
            return min(x,length(vec2(max(0.,abs(uv.x-.125)-.125),uv.y-.6)));
        }
        float KK(vec2 uv) {
            float x = line(uv,vec2(-.25,-.1), vec2(0.25,0.6));
            x = min(x,line(uv,vec2(-.1, .1), vec2(0.25,-0.4)));
        //    uv.x+=.25;
            return min(x,length(vec2(uv.x+.25,max(0.,abs(uv.y-.1)-.5))));
        }
        float LL(vec2 uv) {
            uv.y -=.1;
            float x = length(vec2(max(0.,abs(uv.x)-.2),uv.y+.5));
            return min(x,length(vec2(uv.x+.2,max(0.,abs(uv.y)-.5))));
        }
        float MM(vec2 uv) {
            uv.y-=.1;
            float x = min(length(vec2(uv.x-.35,max(0.,abs(uv.y)-.5))),
                          line(uv,vec2(-.35,.5),vec2(.0,-.1)));
            x = min(x,line(uv,vec2(.0,-.1),vec2(.35,.5)));
            return min(x,length(vec2(uv.x+.35,max(0.,abs(uv.y)-.5))));
        }
        float NN(vec2 uv) {
            uv.y-=.1;
            float x = min(length(vec2(uv.x-.25,max(0.,abs(uv.y)-.5))),
                          line(uv,vec2(-.25,.5),vec2(.25,-.5)));
            return min(x,length(vec2(uv.x+.25,max(0.,abs(uv.y)-.5))));
        }
        float OO(vec2 uv) {
            return abs(length(vec2(uv.x,max(0.,abs(uv.y-.1)-.25)))-.25);
        }
        float PP(vec2 uv) {
            float x = length(vec2(
                        abs(length(vec2(max(0.0,uv.x),
                                         uv.y-.35))-0.25)
                       ,min(0.,uv.x+.25)));
            return min(x,length(vec2(uv.x+.25,max(0.,abs(uv.y-.1)-.5)) ));
        }
        float QQ(vec2 uv) {
            float x = abs(length(vec2(uv.x,max(0.,abs(uv.y-.1)-.25)))-.25);
            uv.y += .3;
            uv.x -= .2;
            return min(x,length(vec2(abs(uv.x+uv.y),max(0.,abs(uv.x-uv.y)-.2)))/sqrt(2.));
        }
        float RR(vec2 uv) {
            float x = length(vec2(
                        abs(length(vec2(max(0.0,uv.x),
                                         uv.y-.35))-0.25)
                       ,min(0.,uv.x+.25)));
            x = min(x,length(vec2(uv.x+.25,max(0.,abs(uv.y-.1)-.5)) ));
            return min(x,line(uv,vec2(0.0,0.1),vec2(0.25,-0.4)));
        }
        float SS(vec2 uv) {
            uv.y -= .1;
            if (uv.y <.275-uv.x*.5 && uv.x>0. || uv.y<-.275-uv.x*.5)
                uv = -uv;
            float a = abs(length(vec2(max(0.,abs(uv.x)),uv.y-.25))-.25);
            float b = length(vec2(uv.x-.236,uv.y-.332));
            float x = atan(uv.x-.05,uv.y-0.25)<1.14?a:b;
            return x;
        }
        float TT(vec2 uv) {
            uv.y -= .1;
            float x = length(vec2(uv.x,max(0.,abs(uv.y)-.5)));
            return min(x,length(vec2(max(0.,abs(uv.x)-.25),uv.y-.5)));
        }
        float UU(vec2 uv) {
            float x = length(vec2(
                        abs(length(vec2(uv.x,
                                        min(0.0,uv.y+.15) ))-0.25)
                       ,max(0.,uv.y-.6)));
            return x;
        }
        float VV(vec2 uv) {
            uv.x=abs(uv.x);
            return line(uv,vec2(0.25,0.6), vec2(0.,-0.4));
        }
        float WW(vec2 uv) {
            uv.x=abs(uv.x);
            return min(line(uv,vec2(0.3,0.6), vec2(.2,-0.4)),
                       line(uv,vec2(0.2,-0.4), vec2(0.,0.2)));
        }
        float XX(vec2 uv) {
            uv.y -= .1;
            uv=abs(uv);
            return line(uv,vec2(0.,0.), vec2(.3,0.5));
        }
        float YY(vec2 uv) {
            return min(min(line(uv,vec2(.0, .1), vec2(-.3, 0.6)),
                           line(uv,vec2(.0, .1), vec2( .3, 0.6))),
                           length(vec2(uv.x,max(0.,abs(uv.y+.15)-.25))));
        }
        float ZZ(vec2 uv) {
            float l = line(uv,vec2(0.25,0.6), vec2(-0.25,-0.4));
            uv.y-=.1;
            uv.y=abs(uv.y);
            float x = length(vec2(max(0.,abs(uv.x)-.25),uv.y-.5));
            return min(x,l);
        }

        //Numbers
        float _11(vec2 uv) {
            return min(min(
                     line(uv,vec2(-0.2,0.45),vec2(0.,0.6)),
                     length(vec2(uv.x,max(0.,abs(uv.y-.1)-.5)))),
                     length(vec2(max(0.,abs(uv.x)-.2),uv.y+.4)));

        }
        float _22(vec2 uv) {
            float x = min(line(uv,vec2(0.185,0.17),vec2(-.25,-.4)),
                          length(vec2(max(0.,abs(uv.x)-.25),uv.y+.4)));
            uv.y-=.35;
            uv.x += 0.025;
            return min(x,abs(atan(uv.x,uv.y)-0.63)<1.64?abs(length(uv)-.275):
                       length(uv+vec2(.23,-.15)));
        }
        float _33(vec2 uv) {
            uv.y-=.1;
            uv.y = abs(uv.y);
            uv.y-=.25;
            return atan(uv.x,uv.y)>-1.?abs(length(uv)-.25):
                   min(length(uv+vec2(.211,-.134)),length(uv+vec2(.0,.25)));
        }
        float _44(vec2 uv) {
            float x = min(length(vec2(uv.x-.15,max(0.,abs(uv.y-.1)-.5))),
                          line(uv,vec2(0.15,0.6),vec2(-.25,-.1)));
            return min(x,length(vec2(max(0.,abs(uv.x)-.25),uv.y+.1)));
        }
        float _55(vec2 uv) {
            float b = min(length(vec2(max(0.,abs(uv.x)-.25),uv.y-.6)),
                          length(vec2(uv.x+.25,max(0.,abs(uv.y-.36)-.236))));
            uv.y += 0.1;
            uv.x += 0.05;
            float c = abs(length(vec2(uv.x,max(0.,abs(uv.y)-.0)))-.3);
            return min(b,abs(atan(uv.x,uv.y)+1.57)<.86 && uv.x<0.?
                       length(uv+vec2(.2,.224))
                       :c);
        }
        float _66(vec2 uv) {
            uv.y-=.075;
            uv = -uv;
            float b = abs(length(vec2(uv.x,max(0.,abs(uv.y)-.275)))-.25);
            uv.y-=.175;
            float c = abs(length(vec2(uv.x,max(0.,abs(uv.y)-.05)))-.25);
            return min(c,cos(atan(uv.x,uv.y+.45)+0.65)<0.||(uv.x>0.&& uv.y<0.)?b:
                       length(uv+vec2(0.2,0.6)));
        }
        float _77(vec2 uv) {
            return min(length(vec2(max(0.,abs(uv.x)-.25),uv.y-.6)),
                       line(uv,vec2(-0.25,-0.39),vec2(0.25,0.6)));
        }
        float _88(vec2 uv) {
            float l = length(vec2(max(0.,abs(uv.x)-.08),uv.y-.1+uv.x*.07));
            uv.y-=.1;
            uv.y = abs(uv.y);
            uv.y-=.245;
            return min(abs(length(uv)-.255),l);
        }
        float _99(vec2 uv) {
            uv.y-=.125;
            float b = abs(length(vec2(uv.x,max(0.,abs(uv.y)-.275)))-.25);
            uv.y-=.175;
            float c = abs(length(vec2(uv.x,max(0.,abs(uv.y)-.05)))-.25);
            return min(c,cos(atan(uv.x,uv.y+.45)+0.65)<0.||(uv.x>0.&& uv.y<0.)?b:
                       length(uv+vec2(0.2,0.6)));
        }
        float _00(vec2 uv) {
            uv.y-=.1;
            return abs(length(vec2(uv.x,max(0.,abs(uv.y)-.25)))-.25);
        }

        //Symbols
        float ddot(vec2 uv) {
            uv.y+=.4;
            return length(uv)*0.8-.05;
        }
        float comma(vec2 uv) {
            return min(ddot(uv),line(uv,vec2(.031,-.405),vec2(-.029,-.52)));
        }
        float exclam(vec2 uv) {
            return min(ddot(uv),length(vec2(uv.x,max(0.,abs(uv.y-.2)-.4)))-uv.y*.06);
        }
        float question(vec2 uv) {
            float x = min(ddot(uv),length(vec2(uv.x,max(0.,abs(uv.y+.035)-.1125))));
            uv.y-=.35;
            uv.x += 0.025;
            return min(x,abs(atan(uv.x,uv.y)-1.05)<2.?abs(length(uv)-.275):
                       length(uv+vec2(.225,-.16))-.0);
        }
        float open1(vec2 uv) {
            uv.x-=.62;
            return abs(atan(uv.x,uv.y)+1.57)<1.?
                    abs(length(uv)-.8)
                   :length(vec2(uv.x+.435,abs(uv.y)-.672));
        }
        float close1(vec2 uv) {
            uv.x = -uv.x;
            return open1(uv);
        }
        float dotdot(vec2 uv) {
            uv.y -= .1;
            uv.y = abs(uv.y);
            uv.y-=.25;
            return length(uv);
        }
        float dotcomma(vec2 uv) {
            uv.y -= .1;
            float x = line(uv,vec2(.0,-.28),vec2(-.029,-.32));
            uv.y = abs(uv.y);
            uv.y-=.25;
            return min(length(uv),x);
        }
        float eequal(vec2 uv) {
            uv.y -= .1;
            uv.y = abs(uv.y);
            return length(vec2(max(0.,abs(uv.x)-.25),uv.y-.15));
        }
        float aadd(vec2 uv) {
            uv.y -= .1;
            return min(length(vec2(max(0.,abs(uv.x)-.25),uv.y)),
                       length(vec2(uv.x,max(0.,abs(uv.y)-.25))));
        }
        float ssub(vec2 uv) {
            return length(vec2(max(0.,abs(uv.x)-.25),uv.y-.1));
        }
        float mmul(vec2 uv) {
            uv.y -= .1;
            uv = abs(uv);
            return min(line(uv,vec2(0.866*.25,0.5*.25),vec2(0.))
                      ,length(vec2(uv.x,max(0.,abs(uv.y)-.25))));
        }
        float ddiv(vec2 uv) {
            return line(uv,vec2(-0.25,-0.4),vec2(0.25,0.6));
        }
        float backslash(vec2 uv) {
            return line(uv,vec2(0.25,-0.4),vec2(-0.25,0.6));
        }
        float lt(vec2 uv) {
            uv.y-=.1;
            uv.y = abs(uv.y);
            return line(uv,vec2(0.25,0.25),vec2(-0.25,0.));
        }
        float gt(vec2 uv) {
            uv.x=-uv.x;
            return lt(uv);
        }
        float hash(vec2 uv) {
            uv.y-=.1;
            uv.x -= uv.y*.1;
            uv = abs(uv);
            return min(length(vec2(uv.x-.125,max(0.,abs(uv.y)-.25))),
                       length(vec2(max(0.,abs(uv.x)-.25),uv.y-.125)));
        }
        float and(vec2 uv) {
            uv.y-=.44;
            uv.x+=.05;
            float x = abs(atan(uv.x,uv.y))<2.356?abs(length(uv)-.15):1.0;
            x = min(x,line(uv,vec2(-0.106,-0.106),vec2(0.4,-0.712)));
            x = min(x,line(uv,vec2( 0.106,-0.106),vec2(-0.116,-0.397)));
            uv.x-=.025;
            uv.y+=.54;
            x = min(x,abs(atan(uv.x,uv.y)-.785)>1.57?abs(length(uv)-.2):1.0);
            return min(x,line(uv,vec2( 0.141,-0.141),vec2( 0.377,0.177)));
        }
        float or(vec2 uv) {
            uv.y -= .1;
            return length(vec2(uv.x,max(0.,abs(uv.y)-.5)));
        }
        float und(vec2 uv) {
            return length(vec2(max(0.,abs(uv.x)-.25),uv.y+.4));
        }
        float open2(vec2 uv) {
            uv.y -= .1;
            uv.y = abs(uv.y);
            return min(length(vec2(uv.x+.125,max(0.,abs(uv.y)-.5))),
                       length(vec2(max(0.,abs(uv.x)-.125),uv.y-.5)));
        }
        float close2(vec2 uv) {
            uv.x=-uv.x;
            return open2(uv);
        }
        float open3(vec2 uv) {
            uv.y -= .1;
            uv.y = abs(uv.y);
            float x = length(vec2(
                        abs(length(vec2((uv.x*sign(uv.y-.25)-.2),
                                    max(0.0,abs(uv.y-.25)-.05) ))-0.2)
                       ,max(0.,abs(uv.x)-.2)));
            return  x;
        }
        float close3(vec2 uv) {
            uv.x=-uv.x;
            return open3(uv);
        }

        //Make it a bit easier to type text
        #define a_ ch(aa,0.7);
        #define b_ ch(bb,0.7);
        #define c_ ch(cc,0.7);
        #define d_ ch(dd,0.7);
        #define e_ ch(ee,0.7);
        #define f_ ch(ff,0.6);
        #define g_ ch(gg,0.7);
        #define h_ ch(hh,0.7);
        #define i_ ch(ii,0.3);
        #define j_ ch(jj,0.3);
        #define k_ ch(kk,0.7);
        #define l_ ch(ll,0.3);
        #define m_ ch(mm,0.9);
        #define n_ ch(nn,0.7);
        #define o_ ch(oo,0.7);
        #define p_ ch(pp,0.7);
        #define q_ ch(qq,0.7);
        #define r_ ch(rr,0.7);
        #define s_ ch(ss,0.7);
        #define t_ ch(tt,0.7);
        #define u_ ch(uu,0.7);
        #define v_ ch(vv,0.7);
        #define w_ ch(ww,0.9);
        #define x_ ch(xx,0.8);
        #define y_ ch(yy,0.8);
        #define z_ ch(zz,0.7);
        #define A_ ch(AA,0.7);
        #define B_ ch(BB,0.7);
        #define C_ ch(CC,0.7);
        #define D_ ch(DD,0.7);
        #define E_ ch(EE,0.7);
        #define F_ ch(FF,0.7);
        #define G_ ch(GG,0.7);
        #define H_ ch(HH,0.7);
        #define I_ ch(II,0.5);
        #define J_ ch(JJ,0.5);
        #define K_ ch(KK,0.7);
        #define L_ ch(LL,0.5);
        #define M_ ch(MM,0.9);
        #define N_ ch(NN,0.7);
        #define O_ ch(OO,0.7);
        #define P_ ch(PP,0.7);
        #define Q_ ch(QQ,0.7);
        #define R_ ch(RR,0.7);
        #define S_ ch(SS,0.7);
        #define T_ ch(TT,0.7);
        #define U_ ch(UU,0.7);
        #define V_ ch(VV,0.7);
        #define W_ ch(WW,0.9);
        #define X_ ch(XX,0.8);
        #define Y_ ch(YY,0.8);
        #define Z_ ch(ZZ,0.7);
        #define _1 ch(_11,0.7);
        #define _2 ch(_22,0.7);
        #define _3 ch(_33,0.7);
        #define _4 ch(_44,0.7);
        #define _5 ch(_55,0.7);
        #define _6 ch(_66,0.7);
        #define _7 ch(_77,0.7);
        #define _8 ch(_88,0.7);
        #define _9 ch(_99,0.7);
        #define _0 ch(_00,0.7);
        #define _dot ch(ddot,0.3);
        #define _comma ch(comma,0.3);
        #define _exclam ch(exclam,0.3);
        #define _question ch(question,0.8);
        #define _open1 ch(open1,0.7);
        #define _close1 ch(close1,0.7);
        #define _dotdot ch(dotdot,0.3);
        #define _dotcomma ch(dotcomma,0.3);
        #define _equal ch(eequal,0.7);
        #define _add ch(aadd,0.7);
        #define _sub ch(ssub,0.7);
        #define _mul ch(mmul,0.7);
        #define _div ch(ddiv,0.7);
        #define _lt ch(lt,0.7);
        #define _gt ch(gt,0.7);
        #define _hash ch(hash,0.7);
        #define _and ch(and,0.9);
        #define _or ch(or,0.3);
        #define _und ch(und,0.7);
        #define _open2 ch(open2,0.6);
        #define _close2 ch(close2,0.6);
        #define _open3 ch(open3,0.7);
        #define _close3 ch(close3,0.7);

        //Space
        #define _ cp+=.5;

        //Markup
        #define BOLD cur.w = 1.5-cur.w;
        #define ITAL ital = 0.15-ital;
        #define RED cur.r = 0.8-cur.r;
        #define GREEN cur.g = 0.4-cur.g;
        #define BLUE cur.b = 0.5-cur.b; cur.r = 0.5-cur.r;

        //Next line
        #define crlf uv.y += 2.0; cp = 0.;

        in mat4 newproj;

        void main( ) {
          //          vec2 uv =  ((inverse(u_projection) * vec4((gl_FragCoord.xy/u_resolution.xy * 2.0 - 1.0),1.0,1.0))).xy;  // for full quad (testing)
          vec2 uv =  ((inverse(newproj) * vec4((gl_FragCoord.xy/u_resolution.xy * 2.0 - 1.0),1.0,1.0))).xy;
          float px = 1.0/u_resolution.x;

          // 0.02 - no background
          // 0.03 - just showing
          // 0.08 - full surround
          // 0.1 - major surround
          // 0.2 - max before hits edge
          // 1.0+ - full background color

          float threshold = 0.1;   // related to boldness - TODO: need to calculate this somehow

        	vec3 background = vec3(0.1,0.7,0.1);
          float italic = 0.0; //0.25;
          float boldness = 0.0;  // up to 4 is still readable
          vec3 color = vec3(0.,0.7,0.);

          float x = 0.0;
//          #define ch(l) x = l(uv-vec2(uv.y*italic,0.));
          #define loc (uv-vec2(uv.y*italic,0.))
//          #define ch(l) x = min(l(loc), min(l(loc+vec2(-px,0.0)), l(loc+vec2(px,0.0)) ));
          #define ch(l) x = l(loc);
          //#define ch(l) x = (l(loc(uv+vec2(-0.01,0.0))) + l(loc(uv+vec2(0.01,0.0)))) / 2.0;

          if (v_char < 33 || v_char > 127) discard;

          if (v_char >= 33 && v_char <= 47) {
            if (v_char == 33) ch(exclam)
            if (v_char == 34) ch(hash)  // doublequote
            if (v_char == 35) ch(hash)
            if (v_char == 36) ch(hash)    // dollar sign
            if (v_char == 37) ch(dotdot)   // percent
            if (v_char == 38) ch(and)   // ampersand
            if (v_char == 39) ch(comma)  // single quote
            if (v_char == 40) ch(open1)  // (
            if (v_char == 41) ch(close1)  // )
            if (v_char == 42) ch(mmul)   // *
            if (v_char == 43) ch(aadd)   // +
            if (v_char == 44) ch(comma)   // ,
            if (v_char == 45) ch(ssub)    // -
            if (v_char == 46) ch(ddot)   // period
            if (v_char == 47) ch(ddiv)   // slash
          }

          if (v_char >= 48 && v_char <= 57) {  // numbers
            if (v_char == 48)  ch(_00)
            if (v_char == 49)  ch(_11)
            if (v_char == 50)  ch(_22)
            if (v_char == 51)  ch(_33)
            if (v_char == 52)  ch(_44)
            if (v_char == 53)  ch(_55)
            if (v_char == 54)  ch(_66)
            if (v_char == 55)  ch(_77)
            if (v_char == 56)  ch(_88)
            if (v_char == 57)  ch(_99)
          }

          if (v_char >= 58 && v_char < 65) {
            if (v_char == 58) ch(dotdot)
            if (v_char == 59) ch(dotcomma)
            if (v_char == 60) ch(lt)
            if (v_char == 61) ch(eequal)
            if (v_char == 62) ch(gt)
            if (v_char == 63) ch(question)
            if (v_char == 64) ch(and)  // @
          }

          if (v_char >= 65 && v_char <= 90) {  // Capitals
            if (v_char == 65)  ch(AA)
            if (v_char == 66)  ch(BB)
            if (v_char == 67)  ch(CC)
            if (v_char == 68)  ch(DD)
            if (v_char == 69)  ch(EE)
            if (v_char == 70)  ch(FF)
            if (v_char == 71)  ch(GG)
            if (v_char == 72)  ch(HH)
            if (v_char == 73)  ch(II)
            if (v_char == 74)  ch(JJ)
            if (v_char == 75)  ch(KK)
            if (v_char == 76)  ch(LL)
            if (v_char == 77)  ch(MM)
            if (v_char == 78)  ch(NN)
            if (v_char == 79)  ch(OO)
            if (v_char == 80)  ch(PP)
            if (v_char == 81)  ch(QQ)
            if (v_char == 82)  ch(RR)
            if (v_char == 83)  ch(SS)
            if (v_char == 84)  ch(TT)
            if (v_char == 85)  ch(UU)
            if (v_char == 86)  ch(VV)
            if (v_char == 87)  ch(WW)
            if (v_char == 88)  ch(XX)
            if (v_char == 89)  ch(YY)
            if (v_char == 90)  ch(ZZ)
          }

          if (v_char >= 97 && v_char <= 122) {  // Lowercase
            if (v_char == 97)  ch(aa)
            if (v_char == 98)  ch(bb)
            if (v_char == 99)  ch(cc)
            if (v_char == 100)  ch(dd)
            if (v_char == 101)  ch(ee)
            if (v_char == 102)  ch(ff)
            if (v_char == 103)  ch(gg)
            if (v_char == 104)  ch(hh)
            if (v_char == 105)  ch(ii)
            if (v_char == 106)  ch(jj)
            if (v_char == 107)  ch(kk)
            if (v_char == 108)  ch(ll)
            if (v_char == 109)  ch(mm)
            if (v_char == 110)  ch(nn)
            if (v_char == 111)  ch(oo)
            if (v_char == 112)  ch(pp)
            if (v_char == 113)  ch(qq)
            if (v_char == 114)  ch(rr)
            if (v_char == 115)  ch(ss)
            if (v_char == 116)  ch(tt)
            if (v_char == 117)  ch(uu)
            if (v_char == 118)  ch(vv)
            if (v_char == 119)  ch(ww)
            if (v_char == 120)  ch(xx)
            if (v_char == 121)  ch(yy)
            if (v_char == 122)  ch(zz)
          }

          if (v_char >= 91 && v_char < 97) {
            if (v_char == 91) ch(open2)
            if (v_char == 92) ch(backslash)  // baskslash
            if (v_char == 93) ch(close2)
            if (v_char == 94) ch(hash)   // caret
            if (v_char == 95) ch(und)
            if (v_char == 96) ch(hash)   // back quote
          }

          if (v_char >= 123 && v_char < 127) {
            if (v_char == 123) ch(open3)
            if (v_char == 124) ch(or)  // baskslash
            if (v_char == 125) ch(close3)
            if (v_char == 126) ch(hash)   // tilda
          }

          float weight = 0.02+boldness*0.05;     //+0.02-0.06*cos(u_time*.4+1.);

          if (threshold >= 1.0 || x < threshold) {
              fragColor = vec4(mix(color,background,smoothstep(weight-px,weight+px, x)),1.0);
          } else {
              discard;
          }
        }  `  }
}
