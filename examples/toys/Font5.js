if (!Kit) var Kit = {};
Kit.Font5 = {
  model: "text",
  sizing: { positioning: "character", fixedAspect: true, width: 8, height: 12, scalable: true },
  styles: [{ name: "normal" }, { name: "invert" }, { name: "underline"} ],
 renderStep: {
        fragment: `// Origin: https://www.shadertoy.com/view/Mt2GWD
#define CHAR_SIZE vec2(8, 12)
#define CHAR_SPACING vec2(8, 12)

#define NORMAL 0
#define INVERT 1
#define UNDERLINE 2

int TEXT_MODE = NORMAL;

//Automatically generated from the 8x12 font sheet here:
//http://www.massmind.org/techref/datafile/charset/extractor/charset_extractor.htm

vec4 ch_spc = vec4(0x000000,0x000000,0x000000,0x000000);
vec4 ch_exc = vec4(0x003078,0x787830,0x300030,0x300000);
vec4 ch_quo = vec4(0x006666,0x662400,0x000000,0x000000);
vec4 ch_hsh = vec4(0x006C6C,0xFE6C6C,0x6CFE6C,0x6C0000);
vec4 ch_dol = vec4(0x30307C,0xC0C078,0x0C0CF8,0x303000);
vec4 ch_pct = vec4(0x000000,0xC4CC18,0x3060CC,0x8C0000);
vec4 ch_amp = vec4(0x0070D8,0xD870FA,0xDECCDC,0x760000);
vec4 ch_apo = vec4(0x003030,0x306000,0x000000,0x000000);
vec4 ch_lbr = vec4(0x000C18,0x306060,0x603018,0x0C0000);
vec4 ch_rbr = vec4(0x006030,0x180C0C,0x0C1830,0x600000);
vec4 ch_ast = vec4(0x000000,0x663CFF,0x3C6600,0x000000);
vec4 ch_crs = vec4(0x000000,0x18187E,0x181800,0x000000);
vec4 ch_com = vec4(0x000000,0x000000,0x000038,0x386000);
vec4 ch_dsh = vec4(0x000000,0x0000FE,0x000000,0x000000);
vec4 ch_per = vec4(0x000000,0x000000,0x000038,0x380000);
vec4 ch_lsl = vec4(0x000002,0x060C18,0x3060C0,0x800000);
vec4 ch_0 = vec4(0x007CC6,0xD6D6D6,0xD6D6C6,0x7C0000);
vec4 ch_1 = vec4(0x001030,0xF03030,0x303030,0xFC0000);
vec4 ch_2 = vec4(0x0078CC,0xCC0C18,0x3060CC,0xFC0000);
vec4 ch_3 = vec4(0x0078CC,0x0C0C38,0x0C0CCC,0x780000);
vec4 ch_4 = vec4(0x000C1C,0x3C6CCC,0xFE0C0C,0x1E0000);
vec4 ch_5 = vec4(0x00FCC0,0xC0C0F8,0x0C0CCC,0x780000);
vec4 ch_6 = vec4(0x003860,0xC0C0F8,0xCCCCCC,0x780000);
vec4 ch_7 = vec4(0x00FEC6,0xC6060C,0x183030,0x300000);
vec4 ch_8 = vec4(0x0078CC,0xCCEC78,0xDCCCCC,0x780000);
vec4 ch_9 = vec4(0x0078CC,0xCCCC7C,0x181830,0x700000);
vec4 ch_col = vec4(0x000000,0x383800,0x003838,0x000000);
vec4 ch_scl = vec4(0x000000,0x383800,0x003838,0x183000);
vec4 ch_les = vec4(0x000C18,0x3060C0,0x603018,0x0C0000);
vec4 ch_equ = vec4(0x000000,0x007E00,0x7E0000,0x000000);
vec4 ch_grt = vec4(0x006030,0x180C06,0x0C1830,0x600000);
vec4 ch_que = vec4(0x0078CC,0x0C1830,0x300030,0x300000);
vec4 ch_ats = vec4(0x007CC6,0xC6DEDE,0xDEC0C0,0x7C0000);
vec4 ch_A = vec4(0x003078,0xCCCCCC,0xFCCCCC,0xCC0000);
vec4 ch_B = vec4(0x00FC66,0x66667C,0x666666,0xFC0000);
vec4 ch_C = vec4(0x003C66,0xC6C0C0,0xC0C666,0x3C0000);
vec4 ch_D = vec4(0x00F86C,0x666666,0x66666C,0xF80000);
vec4 ch_E = vec4(0x00FE62,0x60647C,0x646062,0xFE0000);
vec4 ch_F = vec4(0x00FE66,0x62647C,0x646060,0xF00000);
vec4 ch_G = vec4(0x003C66,0xC6C0C0,0xCEC666,0x3E0000);
vec4 ch_H = vec4(0x00CCCC,0xCCCCFC,0xCCCCCC,0xCC0000);
vec4 ch_I = vec4(0x007830,0x303030,0x303030,0x780000);
vec4 ch_J = vec4(0x001E0C,0x0C0C0C,0xCCCCCC,0x780000);
vec4 ch_K = vec4(0x00E666,0x6C6C78,0x6C6C66,0xE60000);
vec4 ch_L = vec4(0x00F060,0x606060,0x626666,0xFE0000);
vec4 ch_M = vec4(0x00C6EE,0xFEFED6,0xC6C6C6,0xC60000);
vec4 ch_N = vec4(0x00C6C6,0xE6F6FE,0xDECEC6,0xC60000);
vec4 ch_O = vec4(0x00386C,0xC6C6C6,0xC6C66C,0x380000);
vec4 ch_P = vec4(0x00FC66,0x66667C,0x606060,0xF00000);
vec4 ch_Q = vec4(0x00386C,0xC6C6C6,0xCEDE7C,0x0C1E00);
vec4 ch_R = vec4(0x00FC66,0x66667C,0x6C6666,0xE60000);
vec4 ch_S = vec4(0x0078CC,0xCCC070,0x18CCCC,0x780000);
vec4 ch_T = vec4(0x00FCB4,0x303030,0x303030,0x780000);
vec4 ch_U = vec4(0x00CCCC,0xCCCCCC,0xCCCCCC,0x780000);
vec4 ch_V = vec4(0x00CCCC,0xCCCCCC,0xCCCC78,0x300000);
vec4 ch_W = vec4(0x00C6C6,0xC6C6D6,0xD66C6C,0x6C0000);
vec4 ch_X = vec4(0x00CCCC,0xCC7830,0x78CCCC,0xCC0000);
vec4 ch_Y = vec4(0x00CCCC,0xCCCC78,0x303030,0x780000);
vec4 ch_Z = vec4(0x00FECE,0x981830,0x6062C6,0xFE0000);
vec4 ch_lsb = vec4(0x003C30,0x303030,0x303030,0x3C0000);
vec4 ch_rsl = vec4(0x000080,0xC06030,0x180C06,0x020000);
vec4 ch_rsb = vec4(0x003C0C,0x0C0C0C,0x0C0C0C,0x3C0000);
vec4 ch_pow = vec4(0x10386C,0xC60000,0x000000,0x000000);
vec4 ch_usc = vec4(0x000000,0x000000,0x000000,0x00FF00);
vec4 ch_a = vec4(0x000000,0x00780C,0x7CCCCC,0x760000);
vec4 ch_b = vec4(0x00E060,0x607C66,0x666666,0xDC0000);
vec4 ch_c = vec4(0x000000,0x0078CC,0xC0C0CC,0x780000);
vec4 ch_d = vec4(0x001C0C,0x0C7CCC,0xCCCCCC,0x760000);
vec4 ch_e = vec4(0x000000,0x0078CC,0xFCC0CC,0x780000);
vec4 ch_f = vec4(0x00386C,0x6060F8,0x606060,0xF00000);
vec4 ch_g = vec4(0x000000,0x0076CC,0xCCCC7C,0x0CCC78);
vec4 ch_h = vec4(0x00E060,0x606C76,0x666666,0xE60000);
vec4 ch_i = vec4(0x001818,0x007818,0x181818,0x7E0000);
vec4 ch_j = vec4(0x000C0C,0x003C0C,0x0C0C0C,0xCCCC78);
vec4 ch_k = vec4(0x00E060,0x60666C,0x786C66,0xE60000);
vec4 ch_l = vec4(0x007818,0x181818,0x181818,0x7E0000);
vec4 ch_m = vec4(0x000000,0x00FCD6,0xD6D6D6,0xC60000);
vec4 ch_n = vec4(0x000000,0x00F8CC,0xCCCCCC,0xCC0000);
vec4 ch_o = vec4(0x000000,0x0078CC,0xCCCCCC,0x780000);
vec4 ch_p = vec4(0x000000,0x00DC66,0x666666,0x7C60F0);
vec4 ch_q = vec4(0x000000,0x0076CC,0xCCCCCC,0x7C0C1E);
vec4 ch_r = vec4(0x000000,0x00EC6E,0x766060,0xF00000);
vec4 ch_s = vec4(0x000000,0x0078CC,0x6018CC,0x780000);
vec4 ch_t = vec4(0x000020,0x60FC60,0x60606C,0x380000);
vec4 ch_u = vec4(0x000000,0x00CCCC,0xCCCCCC,0x760000);
vec4 ch_v = vec4(0x000000,0x00CCCC,0xCCCC78,0x300000);
vec4 ch_w = vec4(0x000000,0x00C6C6,0xD6D66C,0x6C0000);
vec4 ch_x = vec4(0x000000,0x00C66C,0x38386C,0xC60000);
vec4 ch_y = vec4(0x000000,0x006666,0x66663C,0x0C18F0);
vec4 ch_z = vec4(0x000000,0x00FC8C,0x1860C4,0xFC0000);
vec4 ch_lpa = vec4(0x001C30,0x3060C0,0x603030,0x1C0000);
vec4 ch_bar = vec4(0x001818,0x181800,0x181818,0x180000);
vec4 ch_rpa = vec4(0x00E030,0x30180C,0x183030,0xE00000);
vec4 ch_tid = vec4(0x0073DA,0xCE0000,0x000000,0x000000);
vec4 ch_lar = vec4(0x000000,0x10386C,0xC6C6FE,0x000000);

//Extracts bit b from the given number.
//Shifts bits right (num / 2^bit) then ANDs the result with 1 (mod(result,2.0)).
float extract_bit(float n, float b) {
    b = clamp(b,-1.0,24.0);
	  return floor(mod(floor(n / pow(2.0,floor(b))),2.0));
}

//Returns the pixel at uv in the given bit-packed sprite.
float sprite(vec4 spr, vec2 size, vec2 uv) {
    uv = floor(uv);
    float bit = (size.x-uv.x-1.0) + uv.y * size.x;         //Calculate the bit to extract (x + y * width) (flipped on x-axis)
    bool bounds = all(greaterThanEqual(uv,vec2(0))) && all(lessThan(uv,size));   //Clipping bound to remove garbage outside the sprite's boundaries.
    float pixels = 0.0;
    pixels += extract_bit(spr.x, bit - 72.0);
    pixels += extract_bit(spr.y, bit - 48.0);
    pixels += extract_bit(spr.z, bit - 24.0);
    pixels += extract_bit(spr.w, bit - 00.0);
    return bounds ? pixels : 0.0;
}

//Prints a character
float char(vec4 ch, vec2 uv) {
    if( TEXT_MODE == INVERT )  {
      ch = pow(2.0,24.0)-1.0-ch;    //Inverts all of the bits in the character.
    }
    if( TEXT_MODE == UNDERLINE ) {
      //Makes the bottom 8 bits all 1.
      //Shifts the bottom chunk right 8 bits to drop the lowest 8 bits,
      //then shifts it left 8 bits and adds 255 (binary 11111111).
      ch.w = floor(ch.w/256.0)*256.0 + 255.0;
    }
    float px = sprite(ch, CHAR_SIZE, uv);
    return px;
}

in mat4 newproj;

void main() {
        // vec2 uv =  (((inverse(u_projection) * vec4((gl_FragCoord.xy/u_resolution.xy * 2.0 - 1.0),1.0,1.0))).xy + 1.0) / 2.0;  // for full quad (testing)
    vec2 uv = (((inverse(newproj) * vec4((gl_FragCoord.xy/u_resolution.xy * 2.0 - 1.0),1.0,1.0))).xy + 1.0) / 2.0;
    vec2 duv = uv * CHAR_SIZE;

	float pixel = 1.0;

  #define ch(c) pixel = char(c,duv);

    if (v_char < 33 || v_char > 127) discard;

    if (v_char >= 33 && v_char <= 47) {
      if (v_char == 33) ch(ch_exc)
      if (v_char == 34) ch(ch_quo)  // doublequote
      if (v_char == 35) ch(ch_hsh)
      if (v_char == 36) ch(ch_dol)    // dollar sign
      if (v_char == 37) ch(ch_pct)   // percent
      if (v_char == 38) ch(ch_amp)   // ampersand
      if (v_char == 39) ch(ch_apo)  // single quote
      if (v_char == 40) ch(ch_lbr)  // (
      if (v_char == 41) ch(ch_rbr)  // )
      if (v_char == 42) ch(ch_ast)   // *
      if (v_char == 43) ch(ch_crs)   // +
      if (v_char == 44) ch(ch_com)   // ,
      if (v_char == 45) ch(ch_dsh)    // -
      if (v_char == 46) ch(ch_per)   // period
      if (v_char == 47) ch(ch_lsl)   // slash
    }

    if (v_char >= 48 && v_char <= 57) {  // numbers
      if (v_char == 48)  ch(ch_0)
      if (v_char == 49)  ch(ch_1)
      if (v_char == 50)  ch(ch_2)
      if (v_char == 51)  ch(ch_3)
      if (v_char == 52)  ch(ch_4)
      if (v_char == 53)  ch(ch_5)
      if (v_char == 54)  ch(ch_6)
      if (v_char == 55)  ch(ch_7)
      if (v_char == 56)  ch(ch_8)
      if (v_char == 57)  ch(ch_9)
    }

    if (v_char >= 58 && v_char < 65) {
      if (v_char == 58) ch(ch_col)
      if (v_char == 59) ch(ch_scl)
      if (v_char == 60) ch(ch_les)
      if (v_char == 61) ch(ch_equ)
      if (v_char == 62) ch(ch_grt)
      if (v_char == 63) ch(ch_que)
      if (v_char == 64) ch(ch_ats)  // @
    }

    if (v_char >= 65 && v_char <= 90) {  // Capitals
      if (v_char == 65)  ch(ch_A)
      if (v_char == 66)  ch(ch_B)
      if (v_char == 67)  ch(ch_C)
      if (v_char == 68)  ch(ch_D)
      if (v_char == 69)  ch(ch_E)
      if (v_char == 70)  ch(ch_F)
      if (v_char == 71)  ch(ch_G)
      if (v_char == 72)  ch(ch_H)
      if (v_char == 73)  ch(ch_I)
      if (v_char == 74)  ch(ch_J)
      if (v_char == 75)  ch(ch_K)
      if (v_char == 76)  ch(ch_L)
      if (v_char == 77)  ch(ch_M)
      if (v_char == 78)  ch(ch_N)
      if (v_char == 79)  ch(ch_O)
      if (v_char == 80)  ch(ch_P)
      if (v_char == 81)  ch(ch_Q)
      if (v_char == 82)  ch(ch_R)
      if (v_char == 83)  ch(ch_S)
      if (v_char == 84)  ch(ch_T)
      if (v_char == 85)  ch(ch_U)
      if (v_char == 86)  ch(ch_V)
      if (v_char == 87)  ch(ch_W)
      if (v_char == 88)  ch(ch_X)
      if (v_char == 89)  ch(ch_Y)
      if (v_char == 90)  ch(ch_Z)
    }

    if (v_char >= 97 && v_char <= 122) {  // Lowercase
      if (v_char == 97)  ch(ch_a)
      if (v_char == 98)  ch(ch_b)
      if (v_char == 99)  ch(ch_c)
      if (v_char == 100)  ch(ch_d)
      if (v_char == 101)  ch(ch_e)
      if (v_char == 102)  ch(ch_f)
      if (v_char == 103)  ch(ch_g)
      if (v_char == 104)  ch(ch_h)
      if (v_char == 105)  ch(ch_i)
      if (v_char == 106)  ch(ch_j)
      if (v_char == 107)  ch(ch_k)
      if (v_char == 108)  ch(ch_l)
      if (v_char == 109)  ch(ch_m)
      if (v_char == 110)  ch(ch_n)
      if (v_char == 111)  ch(ch_o)
      if (v_char == 112)  ch(ch_p)
      if (v_char == 113)  ch(ch_q)
      if (v_char == 114)  ch(ch_r)
      if (v_char == 115)  ch(ch_s)
      if (v_char == 116)  ch(ch_t)
      if (v_char == 117)  ch(ch_u)
      if (v_char == 118)  ch(ch_v)
      if (v_char == 119)  ch(ch_w)
      if (v_char == 120)  ch(ch_x)
      if (v_char == 121)  ch(ch_y)
      if (v_char == 122)  ch(ch_z)
    }

    if (v_char >= 91 && v_char < 97) {
      if (v_char == 91) ch(ch_lsb)
      if (v_char == 92) ch(ch_rsl)
      if (v_char == 93) ch(ch_rsb)
      if (v_char == 94) ch(ch_pow)
      if (v_char == 95) ch(ch_usc)
      if (v_char == 96) ch(ch_quo)   // back quote
    }

    if (v_char >= 123 && v_char < 127) {
      if (v_char == 123) ch(ch_lpa)
      if (v_char == 124) ch(ch_bar)
      if (v_char == 125) ch(ch_rpa)
      if (v_char == 126) ch(ch_tid)
    }

    //Shading stuff
    vec3 col = vec3(1);
    //col *= (1.-distance(mod(uv,vec2(1.0)),vec2(0.65)))*1.2;
    col *= mix(vec3(0.0),vec3(0,1,0),pixel);

    fragColor = vec4(col,0.7);

}  `  }
}
