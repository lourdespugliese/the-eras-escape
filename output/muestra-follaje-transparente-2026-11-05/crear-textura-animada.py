"""Bake a looping flutter animation from the generated transparent foliage art."""
from pathlib import Path
import math
from PIL import Image, ImageOps

root=Path(__file__).parent
source=Image.open(root/'hojas-recortadas.png').convert('RGBA').resize((512,512),Image.Resampling.LANCZOS)
alpha=source.getchannel('A')
transparent_fraction=sum(alpha.histogram()[:128])/(512*512)
assert transparent_fraction>0.10, 'La textura no tiene suficientes huecos transparentes'
size=512
tiled=Image.new('RGBA',(size*3,size*3))
for ty in range(3):
    for tx in range(3): tiled.paste(source,(tx*size,ty*size))
frames=[]
for i in range(24):
    t=i*2*math.pi/24
    # A periodic, spatially varying field bends little groups instead of scrolling the whole image.
    def point(x,y):
        dx=3*math.sin(t+y*2*math.pi/128)+1.5*math.sin(2*t+x*2*math.pi/256+y*2*math.pi/256)
        dy=1.8*math.sin(t+x*2*math.pi/128+0.7)+math.sin(2*t+y*2*math.pi/256)
        return x+dx+size,y+dy+size
    mesh=[]
    for y in range(0,size,16):
        for x in range(0,size,16):
            quad=point(x,y)+point(x,y+16)+point(x+16,y+16)+point(x+16,y)
            mesh.append(((x,y,x+16,y+16),quad))
    rgba=tiled.transform((size,size),Image.Transform.MESH,mesh,Image.Resampling.BICUBIC)
    # GIF uses binary transparency; the texture is a cutout, not a translucent solid pane.
    indices=ImageOps.grayscale(rgba).point(lambda v:max(1,v))
    indices.paste(0,(0,0),rgba.getchannel('A').point(lambda v:255 if v<128 else 0))
    frame=Image.new('P',(size,size))
    frame.paste(indices)
    frame.putpalette([c for v in range(256) for c in (v,v,v)])
    frame.info['transparency']=0
    frames.append(frame)
frames[0].save(root/'hojas-animadas.gif',save_all=True,append_images=frames[1:],duration=125,loop=0,transparency=0,disposal=2,optimize=False)
gif=Image.open(root/'hojas-animadas.gif')
assert gif.n_frames==24
print({'frames':gif.n_frames,'transparent_fraction':round(transparent_fraction,3),'bytes':(root/'hojas-animadas.gif').stat().st_size})
