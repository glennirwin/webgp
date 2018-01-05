if (!Kit) var Kit = {};
Kit.Font0 = {
      model: "QuadShader",
      textures: { iChannel0: "data/font0.png",
                  iChannel1: "data/tex05.jpg",
                  iChannel2: "data/tex01.jpg" },
 renderStep: {
        fragment: `
#define FONT_EFFECTS
#define AUTO_FONT_SPACING
#define FONT_SAMPLER u_iChannel0

// --------------- 8< --------------- 8< --------------- 8< --------------- 8< ---------------
// SDF Font Printing - https://www.shadertoy.com/view/ldfcDr#
// Creative Commons CC0 1.0 Universal (CC-0)

// Font characters
const uint
   	// HTML Entity Names

    _SP = 0x20u,		// ' '
    _EXCL = 0x21u, 		// '!'
    _QUOT = 0x22u, 		// '"'
    _NUM = 0x23u,  		// '#'
    _DOLLAR = 0x24u, 	// '$'
    _PERCNT = 0x25u, 	// '%'
    _AMP = 0x26u, 		// '&'
    _APOS = 0x27u,		// '''
    _LPAR = 0x28u, 		// '('
    _RPAR= 0x29u, 		// ')'
    _AST = 0x2Au,		// '*'
    _PLUS = 0x2Bu,		// '+'
    _COMMA = 0x2Cu,		// ','
    _MINUS = 0x2Du,		// '-'
    _PERIOD = 0x2Eu,	// '.'
    _SOL = 0x2Fu,		// '/'

    _0 = 0x30u, _1 = 0x31u, _2 = 0x32u, _3 = 0x33u, _4 = 0x34u,
    _5 = 0x35u, _6 = 0x36u, _7 = 0x37u, _8 = 0x38u, _9 = 0x39u,

    _COLON = 0x3Au,		// ':'
    _SEMI = 0x3Bu,		// ';'
    _LT = 0x3Cu,		// '<'
    _EQUALS = 0x3Du,	// '='
    _GT = 0x3Eu,		// '>'
    _QUEST = 0x3Fu,		// '?'
    _COMAT = 0x40u,		// '@'

    _A = 0x41u, _B = 0x42u, _C = 0x43u, _D = 0x44u, _E = 0x45u,
    _F = 0x46u, _G = 0x47u, _H = 0x48u, _I = 0x49u, _J = 0x4Au,
    _K = 0x4Bu, _L = 0x4Cu, _M = 0x4Du, _N = 0x4Eu, _O = 0x4Fu,
    _P = 0x50u, _Q = 0x51u, _R = 0x52u, _S = 0x53u, _T = 0x54u,
    _U = 0x55u, _V = 0x56u, _W = 0x57u, _X = 0x58u, _Y = 0x59u,
    _Z = 0x5Au,

    _LSQB = 0x5Bu,		// '['
    _BSOL = 0x5Cu,		// '\'
    _RSQB = 0x5Du,		// ']'
    _CIRC = 0x5Eu,		// '^'
    _LOWBAR = 0x5Fu,	// '_'
    _GRAVE = 0x60u,		// '\`'

    _a = 0x61u, _b = 0x62u, _c = 0x63u, _d = 0x64u, _e = 0x65u,
    _f = 0x66u, _g = 0x67u, _h = 0x68u, _i = 0x69u, _j = 0x6Au,
    _k = 0x6Bu, _l = 0x6Cu, _m = 0x6Du, _n = 0x6Eu, _o = 0x6Fu,
    _p = 0x70u, _q = 0x71u, _r = 0x72u, _s = 0x73u, _t = 0x74u,
    _u = 0x75u, _v = 0x76u, _w = 0x77u, _x = 0x78u, _y = 0x79u,
    _z = 0x7Au,

	_LCUB = 0x7Bu,		// '{'
    _VERBAR = 0x7Cu,	// '|'
    _RCUB = 0x7Du,		// '}'
    _TILDE = 0x7Eu,		// '~'


    _EOL = 0x1000u, 	// End of Line - Carriage Return & Line Feed
    _BOLDON = 0x1001u,	// Special
    _BOLDOFF = 0x1002u,	// Special
    _ITALON = 0x1003u,	// Special
    _ITALOFF = 0x1004u	// Special
;


vec4 SampleCharacterTex( uint iChar, vec2 vCharUV )
{
    uvec2 iChPos = uvec2( iChar % 16u, iChar / 16u );
    vec2 vUV = (vec2(iChPos) + vCharUV) / 16.0f;
    return textureLod( FONT_SAMPLER, vUV, 0.0 );
}

vec4 SampleCharacter( uint iChar, vec2 vCharUV )
{
    uvec2 iChPos = uvec2( iChar % 16u, iChar / 16u );
    vec2 vClampedCharUV = clamp(vCharUV, vec2(0.01), vec2(0.99));
    vec2 vUV = (vec2(iChPos) + vClampedCharUV) / 16.0f;

    vec4 vSample;

    float l = length( (vClampedCharUV - vCharUV) );

#if 0
    // Simple but not efficient - samples texture for each character
    // Extends distance field beyond character boundary
    vSample = textureLod( FONT_SAMPLER, vUV, 0.0 );
    vSample.gb = vSample.gb * 2.0f - 1.0f;
    vSample.a -= 0.5f+1.0/256.0;
    vSample.w += l * 0.75;
#else
    // Skip texture sample when not in character boundary
    // Ok unless we have big shadows / outline / font weight
    if ( l > 0.01f )
    {
        vSample.rgb = vec3(0);
		vSample.w = 2000000.0;
    }
    else
    {
		vSample = textureLod( FONT_SAMPLER, vUV, 0.0 );
        vSample.gb = vSample.gb * 2.0f - 1.0f;
        vSample.a -= 0.5f + 1.0/256.0;
    }
#endif

    return vSample;
}

#ifndef AUTO_FONT_SPACING
float CharExtentsLeft( uint iChar )
{
    if ( iChar < 32u )
    {
        return 0.1f;
    }

    switch( iChar )
    {
        case _EXCL:  case _APOS: case _PERIOD: case _COMMA: case _COLON: case _SEMI: return 0.4f;
        case _l: return 0.325f;
        case _A: case _Y: case _Q: case _w:case _W: case _m: case _M: return 0.25f;
    }
	return 0.3f;
}

float CharWidth( uint iChar )
{
    if ( iChar < 32u )
    {
        return 0.8f;
    }

    switch( iChar )
    {
        case _EXCL: case _APOS: case _PERIOD: case _COMMA: case _COLON: case _SEMI: return 0.2f;
        case _1: case _j: return 0.3f;
        case _l: return 0.35f;
        case _A: case _Y: case _Q: case _w: case _W: case _m: case _M: return 0.5f;
    }

    return 0.4f;
}
#endif

struct CharExtents
{
    float left;
    float width;
};

// Auto font spacing adapted from Klems shader: https://www.shadertoy.com/view/MsfyDN
float CharVerticalPos(uint iChar, vec2 vUV)
{
    vec4 vSample = SampleCharacterTex(iChar, vUV);
    float dist = vSample.a - (127.0/255.0);
    dist *= vSample.g * 2.0 - 1.0;
    return vUV.x - dist;
}

CharExtents GetCharExtents( uint iChar )
{
    CharExtents result;

#ifdef AUTO_FONT_SPACING
    result.left = CharVerticalPos( iChar, vec2(0.02, 0.5) );
    float right = CharVerticalPos( iChar, vec2(0.98, 0.5) );
    result.width = right - result.left;
#else
    result.left = CharExtentsLeft( iChar );
    result.width = CharWidth( iChar );
#endif

    if ( iChar == _SP )
    {
        result.left = 0.3f;
        result.width = 0.4f;
    }
    return result;
}

struct PrintState
{
    vec2 vCanvasOrigin;

    // print position
    vec2 vStart;
    vec2 vPos;
    vec2 vPixelSize;
    bool EOL;

    // result
    float fDistance;
#ifdef FONT_EFFECTS
    float fShadowDistance;
    vec2 vNormal;
#endif
};

void MoveTo( inout PrintState state, vec2 vPos )
{
    state.vStart = state.vCanvasOrigin - vPos;
    state.vPos = state.vStart;
    state.EOL = false;
}

void ClearPrintResult( inout PrintState state )
{
    state.fDistance = 1000000.0;
#ifdef FONT_EFFECTS
    state.fShadowDistance = 1000000.0;
    state.vNormal = vec2(0.0);
#endif
}

PrintState PrintState_InitCanvas( vec2 vCoords, vec2 vPixelSize )
{
    PrintState state;
    state.vCanvasOrigin = vCoords;
    state.vPixelSize = vPixelSize;

    MoveTo( state, vec2(0) );

    ClearPrintResult( state );

    return state;
}

struct LayoutStyle
{
    vec2 vSize;
    float fLineGap;
    float fAdvancement;
    bool bItalic;
    bool bBold;
#ifdef FONT_EFFECTS
    bool bShadow;
    vec2 vShadowOffset;
#endif
};

LayoutStyle LayoutStyle_Default()
{
    LayoutStyle style;
    style.vSize = vec2(16.0f, 16.0f);
    style.fLineGap = 0.1f;
    style.fAdvancement = 0.1f;
    style.bItalic = false;
    style.bBold = false;
#ifdef FONT_EFFECTS
    style.vShadowOffset = vec2(0);
    style.bShadow = false;
#endif
    return style;
}

struct RenderStyle
{
    vec3 vFontColor;
    float fFontWeight;
#ifdef FONT_EFFECTS
    vec3 vOutlineColor;
    vec3 vHighlightColor;
    float fOutlineWeight;
    float fBevelWeight;
    float fShadowSpread;
    float fShadowStrength;
    vec2 vLightDir;
#endif
};

RenderStyle RenderStyle_Default( vec3 vFontColor )
{
    RenderStyle style;
    style.vFontColor = vFontColor;
    style.fFontWeight = 0.0f;
#ifdef FONT_EFFECTS
    style.vOutlineColor = vec3(1);
    style.vHighlightColor = vec3(0);
    style.fOutlineWeight = 0.0f;
    style.fBevelWeight = 0.0f;
    style.fShadowSpread = 0.0f;
    style.fShadowStrength = 0.0f;
    style.vLightDir = vec2(-1.0f, -0.5f );
#endif
    return style;
}

void PrintEndCurrentLine( inout PrintState state, const LayoutStyle style )
{
    // Apply CR
    state.vPos.x = state.vStart.x;

    // advance Y position to bottom of descender based on current font size.
    float fFontDescent = 0.15f;
	state.vPos.y -= style.vSize.y * fFontDescent;
}

void PrintBeginNextLine( inout PrintState state, const LayoutStyle style )
{
    // move Y position to baseline based on current font size
    float fFontAscent = 0.65f;
	state.vPos.y -= style.vSize.y * (fFontAscent + style.fLineGap);
}

void PrintEOL( inout PrintState state, const LayoutStyle style )
{
    if ( state.EOL )
    {
        PrintBeginNextLine( state, style );
    }
    PrintEndCurrentLine( state, style );
    state.EOL = true;
}

void PrintCh( inout PrintState state, inout LayoutStyle style, const uint iChar )
{
    if ( iChar == _EOL )
    {
        PrintEOL( state, style );
        return;
    }
    else
    if ( iChar == _BOLDON )
    {
        style.bBold = true;
        return;
    }
    else
    if ( iChar == _BOLDOFF )
    {
        style.bBold = false;
        return;
    }
    else
    if ( iChar == _ITALON )
    {
        style.bItalic = true;
        return;
    }
    else
    if ( iChar == _ITALOFF )
    {
        style.bItalic = false;
        return;
    }

    if ( state.EOL )
    {
        PrintBeginNextLine( state, style );
		state.EOL = false;
    }

    vec2 vUV = (state.vPos / style.vSize);

    /*if ( (vUV.y > -0.1) && (vUV.y < 0.1) && (abs(vUV.x) < 0.02 || abs(vUV.x - CharWidth(iChar)) < 0.02) )
    {
        state.fDistance = -10.0;
    }*/

	CharExtents extents = GetCharExtents( iChar );
    vUV.y += 0.8f; // Move baseline
    vUV.x += extents.left - style.fAdvancement;

    if ( style.bItalic )
    {
    	vUV.x += (1.0 - vUV.y) * -0.4f;
    }

    vec3 v = SampleCharacter( iChar, vUV ).agb;
    if ( style.bBold )
    {
    	v.x -= 0.025f;
    }

    if ( v.x < state.fDistance )
    {
        state.fDistance = v.x;
#ifdef FONT_EFFECTS
        state.vNormal = v.yz;
#endif
    }

#ifdef FONT_EFFECTS
    if ( style.bShadow )
    {
        float fShadowDistance = SampleCharacter( iChar, vUV - style.vShadowOffset ).a;
        if ( style.bBold )
        {
            fShadowDistance -= 0.025f;
        }

        if ( fShadowDistance < state.fShadowDistance )
        {
            state.fShadowDistance = fShadowDistance;
        }
    }
#endif

    state.vPos.x -= style.vSize.x * (extents.width + style.fAdvancement);
}

float GetFontBlend( PrintState state, LayoutStyle style, float size )
{
    float fFeatherDist = 1.0f * length(state.vPixelSize / style.vSize);
    float f = clamp( (size-state.fDistance + fFeatherDist * 0.5f) / fFeatherDist, 0.0, 1.0);
    return f;
}

void RenderFont( in PrintState state, in LayoutStyle style, in RenderStyle renderStyle, inout vec3 color )
{
#ifdef FONT_EFFECTS
    if ( style.bShadow )
    {
        float fSize = renderStyle.fFontWeight + renderStyle.fOutlineWeight;
        float fBlendShadow = clamp( (state.fShadowDistance - fSize - renderStyle.fShadowSpread * 0.5) / -renderStyle.fShadowSpread, 0.0, 1.0);
        color.rgb = mix( color.rgb, vec3(0.0), fBlendShadow * renderStyle.fShadowStrength);
    }

    if ( renderStyle.fOutlineWeight > 0.0f )
    {
        float fBlendOutline = GetFontBlend( state, style, renderStyle.fFontWeight + renderStyle.fOutlineWeight );
        color.rgb = mix( color.rgb, renderStyle.vOutlineColor, fBlendOutline);
    }
#endif

    float f = GetFontBlend( state, style, renderStyle.fFontWeight );

    vec3 vCol = renderStyle.vFontColor;

#ifdef FONT_EFFECTS
    if ( renderStyle.fBevelWeight > 0.0f )
    {
        float fBlendBevel = GetFontBlend( state, style, renderStyle.fFontWeight - renderStyle.fBevelWeight );
        float NdotL = dot( state.vNormal, normalize(renderStyle.vLightDir ) );
        float shadow = 1.0 - clamp(-NdotL, 0.0, 1.0f);
        float highlight = clamp(NdotL, 0.0, 1.0f);
        highlight = pow( highlight, 10.0f);
        vCol = mix( vCol, vCol * shadow + renderStyle.vHighlightColor * highlight, 1.0 - fBlendBevel);
    }
#endif

    color.rgb = mix( color.rgb, vCol, f);
}

#define ARRAY_PRINT(STATE, STYLE, CHAR_ARRAY ) { for (int i=0; i<CHAR_ARRAY.length(); i++) PrintCh( STATE, STYLE, CHAR_ARRAY[i] ); }

void Print( inout PrintState state, LayoutStyle style, uint value )
{
	uint place = 1000000000u;

    bool leadingZeros = true;
    while( place > 0u )
    {
        uint digit = (value / place) % 10u;
        if ( place == 1u || digit != 0u )
        {
            leadingZeros = false;
        }

        if (!leadingZeros)
        {
            PrintCh( state, style, _0 + digit );
        }
        place = place / 10u;
    }
}

void Print( inout PrintState state, LayoutStyle style, int value )
{
    if ( value < 0 )
    {
        PrintCh( state, style, _MINUS );
        value = -value;
    }

    Print ( state, style, uint(value) );
}

void Print( inout PrintState state, LayoutStyle style, float value, int decimalPlaces )
{
    if ( value < 0.0f )
    {
        PrintCh( state, style, _MINUS );
    }
    value = abs(value);

    int placeIndex = 10;

    bool leadingZeros = true;
    while( placeIndex >= -decimalPlaces )
    {
        float place = pow(10.0f, float(placeIndex) );
        float digitValue = floor( value / place );
        value -= digitValue * place;


        uint digit = min( uint( digitValue ), 9u );

        if ( placeIndex == -1 )
        {
            PrintCh( state, style, _PERIOD );
        }

        if ( placeIndex == 0 || digit != 0u )
        {
            leadingZeros = false;
        }

        if ( !leadingZeros )
        {
        	PrintCh( state, style, _0 + digit );
        }

        placeIndex--;
    }
}

// --------------- 8< --------------- 8< --------------- 8< --------------- 8< ---------------


void PrintMessage( inout PrintState state, LayoutStyle style )
{
    uint strA[] = uint[] ( _H, _e, _l, _l, _o, _COMMA, _SP, _w, _o, _r, _l, _d, _PERIOD, _EOL );
    ARRAY_PRINT( state, style, strA );

    uint strB[] = uint[] ( _ITALON, _A, _B, _C, _1, _2, _3, _ITALOFF, _EOL );
    ARRAY_PRINT( state, style, strB );

    uint strC[] = uint[] ( _BOLDON, _A, _B, _C, _1, _2, _3, _BOLDOFF, _SP );
    ARRAY_PRINT( state, style, strC );
}


void main() {
  vec2 vCanvasCoord = ((inverse(u_projection) * vec4((vec2( gl_FragCoord.x, u_resolution.y - 1.0f - gl_FragCoord.y )/u_resolution * 2.0 - 1.0),1.0,1.0)).xy+1.0)/2.0 * u_resolution;
//  vec2 vCanvasCoord = ((inverse(u_projection) * vec4((vec2( gl_FragCoord.x, u_resolution.y - 1.0f - gl_FragCoord.y )/u_resolution * 2.0 - 1.0),1.0,1.0)).xy+1.0)/2.0;
    fragColor = vec4(1);
    fragColor.rgb = texture(u_iChannel2, vCanvasCoord.xy * 0.005).bgr * 0.3 + 0.7;


///////////////////////////
// Example Usage
///////////////////////////

    vec2 vCanvasPixelSize = vec2(1.7);

	bool bScaleWithResolution = true;

    if ( bScaleWithResolution )
    {
    	vCanvasCoord = vCanvasCoord * vec2(400.0, 300.0) / u_resolution;
    	   vCanvasPixelSize =  vec2(400.0, 300.0) / u_resolution;  //u_resolution.xy*u_viewport.zw/2.0;  //

  //      vec2 dVdx = dFdx(vCanvasCoord);
  //      vec2 dVdy = dFdy(vCanvasCoord);
  //      vCanvasPixelSize = vec2( length(vec2(dVdx.x, dVdy.x) ), length(vec2(dVdx.y, dVdy.y) ) );
    }

    PrintState state = PrintState_InitCanvas( vCanvasCoord, vCanvasPixelSize );

    LayoutStyle style = LayoutStyle_Default();
    //style.vSize = vec2(48.0f, 64.0f);

    // Without this line the print position specifies the baseline
    // with this line we advance by the ascent and line gap
    PrintBeginNextLine(state, style);

    uint str[] = uint[] ( _D, _e, _f, _a, _u, _l, _t, _SP, _S, _t, _y, _l, _e, _PERIOD, _EOL );
    ARRAY_PRINT( state, style, str );

    Print( state, style, int(u_date.x) );
    PrintCh( state, style, _MINUS );
    Print( state, style, int(u_date.y) + 1 );
    PrintCh( state, style, _MINUS );
    Print( state, style, int(u_date.z) );
    PrintCh( state, style, _COMMA );
    PrintCh( state, style, _SP );
    Print( state, style, int(mod(u_date.w / (60.0 * 60.0), 24.0)) );
    PrintCh( state, style, _COLON );
    Print( state, style, int(mod(u_date.w / 60.0, 60.0)) );
    PrintCh( state, style, _COMMA );
    PrintCh( state, style, _SP );
    Print( state, style, u_time, 3 );
    PrintEOL( state, style );

    RenderStyle renderStyle = RenderStyle_Default( vec3(0.0) );
    RenderFont( state, style, renderStyle, fragColor.rgb );

////////////////////////////

    ClearPrintResult( state );

    uint strB[] = uint[] ( _T, _H, _E, _SP, _Q, _U, _I, _C, _K, _SP, _B, _R, _O, _W, _N, _SP, _F, _O, _X, _SP, _J, _U, _M, _P, _S, _SP, _O, _V, _E, _R, _SP, _T, _H, _E, _SP, _L, _A, _Z, _Y, _SP, _D, _O, _G, _PERIOD, _EOL );
    ARRAY_PRINT( state, style, strB );
    uint strC[] = uint[] ( _T, _h, _e, _SP, _q, _u, _i, _c, _k, _SP, _b, _r, _o, _w, _n, _SP, _f, _o, _x, _SP, _j, _u, _m, _p, _s, _SP, _o, _v, _e, _r, _SP, _t, _h, _e, _SP, _l, _a, _z, _y, _SP, _d, _o, _g, _PERIOD, _EOL );
    ARRAY_PRINT( state, style, strC );
    uint strD[] = uint[] ( _T, _h, _e, _SP, _BOLDON, _q, _u, _i, _c, _k, _BOLDOFF,_SP, _b, _r, _o, _w, _n, _SP, _f, _o, _x, _SP, _BOLDON, _ITALON, _j, _u, _m, _p, _s, _ITALOFF, _BOLDOFF, _SP, _o, _v, _e, _r, _SP, _t, _h, _e, _SP, _ITALON, _l, _a, _z, _y, _ITALOFF, _SP, _d, _o, _g, _PERIOD, _EOL );
    ARRAY_PRINT( state, style, strD );

    RenderFont( state, style, renderStyle, fragColor.rgb );
    ClearPrintResult( state );

    style.vSize = vec2(64.0f, 64.0f) * 0.6;
    style.fAdvancement = 0.15;

#ifdef FONT_EFFECTS
    style.vShadowOffset = vec2(0.075, 0.1);
    style.bShadow = true;
#endif

    PrintMessage( state, style );

    renderStyle.vFontColor = texture(u_iChannel1, vCanvasCoord.xy * 0.005).rgb;

    renderStyle.fFontWeight = 0.02f;
#ifdef FONT_EFFECTS
    renderStyle.vOutlineColor = vec3(0.0, 0.0, 0.0);
    renderStyle.vHighlightColor = vec3(1.0, 1.0, 1.0);
    renderStyle.fOutlineWeight = 0.02f;
    renderStyle.fBevelWeight = 0.05f;
    renderStyle.fShadowSpread = 0.15f;
    renderStyle.fShadowStrength = 0.0f;
    renderStyle.vLightDir = vec2(-1.0f, -0.5f );
#endif

    RenderFont( state, style, renderStyle, fragColor.rgb );

    ClearPrintResult( state );

#ifdef FONT_EFFECTS
    renderStyle.fShadowSpread = 0.1f;
    renderStyle.fShadowStrength = 0.6f;
#endif

    PrintMessage( state, style );
    RenderFont( state, style, renderStyle, fragColor.rgb );

    ClearPrintResult( state );

	style.vSize *= 1.5;

    //MoveTo( state, vec2(100, 100) );
    PrintMessage( state, style );

    renderStyle.fFontWeight = 0.0f;
    renderStyle.vFontColor = vec3(0.4, 0.7, 1.0);

#ifdef FONT_EFFECTS
    renderStyle.vOutlineColor = vec3(0.0, 0.0, 0.0);
    renderStyle.vHighlightColor = vec3(0.0);
    renderStyle.fOutlineWeight = 0.05;
    renderStyle.fBevelWeight = 0.0;
#endif

    RenderFont( state, style, renderStyle, fragColor.rgb );
}

`  }
}
