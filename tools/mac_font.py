"""Core Text glyph masks using macOS frameworks and Python's standard library.

Helvetica Neue is installed with macOS. It is intentionally different from the
Windows Segoe UI renderer. Only rasterized PNGs enter the watch package.
"""
import ctypes as C
import math

from generate_assets import Canvas


def framework(name):
    return C.CDLL(f'/System/Library/Frameworks/{name}.framework/{name}')


def bind(lib, name, result, *args):
    fn = getattr(lib, name)
    fn.restype, fn.argtypes = result, list(args)
    return fn


P, D, I = C.c_void_p, C.c_double, C.c_long
cf, ct, cg = (framework(name) for name in ('CoreFoundation', 'CoreText', 'CoreGraphics'))
string = bind(cf, 'CFStringCreateWithCString', P, P, C.c_char_p, C.c_uint32)
release = bind(cf, 'CFRelease', None, P)
dictionary = bind(cf, 'CFDictionaryCreate', P, P, C.POINTER(P), C.POINTER(P), I, P, P)
attributed = bind(cf, 'CFAttributedStringCreate', P, P, P, P)
font_create = bind(ct, 'CTFontCreateWithName', P, P, D, P)
cap_size = bind(ct, 'CTFontGetCapHeight', D, P)
line_create = bind(ct, 'CTLineCreateWithAttributedString', P, P)
line_size = bind(ct, 'CTLineGetTypographicBounds', D, P, C.POINTER(D), C.POINTER(D), C.POINTER(D))
line_draw = bind(ct, 'CTLineDraw', None, P, P)
gray = bind(cg, 'CGColorSpaceCreateDeviceGray', P)
gray_release = bind(cg, 'CGColorSpaceRelease', None, P)
bitmap = bind(cg, 'CGBitmapContextCreate', P, P, C.c_size_t, C.c_size_t,
              C.c_size_t, C.c_size_t, P, C.c_uint32)
context_release = bind(cg, 'CGContextRelease', None, P)
fill = bind(cg, 'CGContextSetGrayFillColor', None, P, D, D)
position = bind(cg, 'CGContextSetTextPosition', None, P, D, D)
transform_scale = bind(cg, 'CGContextScaleCTM', None, P, D, D)
smoothing = bind(cg, 'CGContextSetShouldSmoothFonts', None, P, C.c_bool)
font_key = P.in_dll(ct, 'kCTFontAttributeName')
color_key = P.in_dll(ct, 'kCTForegroundColorFromContextAttributeName')
true = P.in_dll(cf, 'kCFBooleanTrue')


def rasterize(text, cap_height, color, scale=3, weight=500):
    owned = []
    context = space = None

    def own(value):
        if not value:
            raise RuntimeError('Core Text could not create a font rendering resource')
        owned.append(value)
        return value

    try:
        name = own(string(None, b'HelveticaNeue-Medium' if weight >= 600
                          else b'HelveticaNeue', 0x08000100))
        probe = own(font_create(name, 100, None))
        font = own(font_create(name, cap_height * scale * 100 / cap_size(probe), None))
        value = own(string(None, text.encode('utf-8'), 0x08000100))
        attrs = own(dictionary(None, (P * 2)(font_key, color_key),
                               (P * 2)(font, true), 2, None, None))
        run = own(attributed(None, value, attrs))
        line = own(line_create(run))
        ascent, descent, leading = D(), D(), D()
        advance = line_size(line, C.byref(ascent), C.byref(descent), C.byref(leading))
        pad = math.ceil(cap_height * scale)
        width = math.ceil(advance) + 2 * pad
        height = math.ceil(ascent.value + descent.value) + 2 * pad
        pixels = (C.c_ubyte * (width * height))()
        space = gray()
        context = bitmap(pixels, width, height, 8, width, space, 0)
        if not context:
            raise RuntimeError('Core Graphics could not create a grayscale bitmap')
        smoothing(context, False)
        fill(context, 1, 1)
        # Helvetica Neue's degree/unit pair is wider than Segoe UI. A fixed
        # horizontal scale keeps all glyphs consistent and within existing cells.
        transform_scale(context, 0.9, 1)
        position(context, pad, pad + descent.value)
        line_draw(line, context)
        lit = [i for i, coverage in enumerate(pixels) if coverage]
        if not lit:
            raise ValueError(f'Font rendering produced no glyphs for {text!r}')
        left, right = min(i % width for i in lit), max(i % width for i in lit)
        top, bottom = min(i // width for i in lit), max(i // width for i in lit)
        if left == 0 or top == 0 or right == width - 1 or bottom == height - 1:
            raise ValueError(f'Font bitmap clipped {text!r}')
        out = Canvas(right - left + 1, bottom - top + 1)
        for y in range(out.h):
            for x in range(out.w):
                coverage = pixels[(top + y) * width + left + x]
                if coverage:
                    out.rect(x, y, 1, 1, (*color[:3], round(coverage * color[3] / 255)))
        return out
    finally:
        if context:
            context_release(context)
        if space:
            gray_release(space)
        for value in reversed(owned):
            release(value)
