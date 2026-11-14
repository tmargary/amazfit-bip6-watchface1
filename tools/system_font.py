"""Rasterize installed Segoe UI with Windows GDI; no font file is copied."""
import ctypes as C
from ctypes import wintypes as W
import os

from generate_assets import Canvas


def rasterize(text, cap_height, color, scale=3, weight=500):
    if os.name != 'nt':
        raise RuntimeError('Asset typography requires Windows and installed Segoe UI.')
    gdi = C.WinDLL('gdi32', use_last_error=True)
    class Header(C.Structure):
        _fields_ = [('size',W.DWORD),('width',W.LONG),('height',W.LONG),
                    ('planes',W.WORD),('bits',W.WORD),('compression',W.DWORD),
                    ('image_size',W.DWORD),('xppm',W.LONG),('yppm',W.LONG),
                    ('used',W.DWORD),('important',W.DWORD)]
    class Info(C.Structure):
        _fields_ = [('header',Header),('colors',W.DWORD*3)]
    gdi.CreateCompatibleDC.argtypes=[W.HDC];gdi.CreateCompatibleDC.restype=W.HDC
    gdi.CreateDIBSection.argtypes=[W.HDC,C.POINTER(Info),W.UINT,C.POINTER(C.c_void_p),W.HANDLE,W.DWORD]
    gdi.CreateDIBSection.restype=W.HBITMAP
    gdi.CreateFontW.argtypes=[C.c_int]*5+[W.DWORD]*8+[W.LPCWSTR]
    gdi.CreateFontW.restype=W.HFONT
    gdi.SelectObject.argtypes=[W.HDC,W.HGDIOBJ];gdi.SelectObject.restype=W.HGDIOBJ
    gdi.SetTextColor.argtypes=[W.HDC,W.DWORD]
    gdi.SetBkColor.argtypes=[W.HDC,W.DWORD]
    gdi.TextOutW.argtypes=[W.HDC,C.c_int,C.c_int,W.LPCWSTR,C.c_int]
    gdi.DeleteObject.argtypes=[W.HGDIOBJ]
    gdi.DeleteDC.argtypes=[W.HDC]
    dc=gdi.CreateCompatibleDC(None)
    width=max(64,round(len(text)*cap_height*scale*2))
    height=round(cap_height*scale*2.5)
    info=Info()
    info.header=Header(C.sizeof(Header),width,-height,1,32,0,0,0,0,0,0)
    bits=C.c_void_p()
    bitmap=gdi.CreateDIBSection(dc,C.byref(info),0,C.byref(bits),None,0)
    font=gdi.CreateFontW(-round(cap_height*scale*1.4),0,0,0,weight,0,0,0,1,0,0,4,0,'Segoe UI')
    if not dc or not bitmap or not font:
        raise OSError('Unable to create GDI font rasterizer')
    old_bitmap=gdi.SelectObject(dc,bitmap)
    old_font=gdi.SelectObject(dc,font)
    try:
        C.memset(bits,0,width*height*4)
        gdi.SetTextColor(dc,0xffffff)
        gdi.SetBkColor(dc,0)
        if not gdi.TextOutW(dc,0,0,text,len(text)):
            raise OSError('GDI text rendering failed')
        gdi.GdiFlush()
        pixels=C.string_at(bits,width*height*4)
        lit=[(p//4%width,p//4//width) for p in range(0,len(pixels),4) if pixels[p]]
        if not lit:
            raise RuntimeError('Font rendering produced no glyphs')
        left=min(x for x,y in lit);right=max(x for x,y in lit)
        top=min(y for x,y in lit);bottom=max(y for x,y in lit)
        out=Canvas(right-left+1,bottom-top+1)
        for y in range(out.h):
            for x in range(out.w):
                coverage=pixels[((y+top)*width+x+left)*4]
                if coverage:
                    out.rect(x,y,1,1,(*color[:3],round(coverage*color[3]/255)))
        return out
    finally:
        gdi.SelectObject(dc,old_font);gdi.SelectObject(dc,old_bitmap)
        gdi.DeleteObject(font);gdi.DeleteObject(bitmap);gdi.DeleteDC(dc)
