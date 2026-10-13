"""Align generated sprites to uniform cells; retain alpha; encode shipping WebP atlases."""
from PIL import Image
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
import argparse
parser=argparse.ArgumentParser();parser.add_argument('sources',type=Path,help='Folder containing original generated PNGs');SOURCES=parser.parse_args().sources
NILO='exec-93d29566-cbed-45de-b1ce-c72832f15eca.png'
ATLAS='exec-314f3d93-9114-4a0c-946e-e525e18f46d3.png'
WORLD='exec-42e69c19-bb8f-4c6d-a8e2-fb77c92248bb.png'
def atlas(source,cols,rows,path,cell):
    im=Image.open(source).convert('RGBA')
    result=Image.new('RGBA',(cols*cell,rows*cell))
    frames=[]
    for j in range(rows):
        for i in range(cols):
            piece=im.crop((round(i*im.width/cols),round(j*im.height/rows),round((i+1)*im.width/cols),round((j+1)*im.height/rows)))
            # Actual transparent bounds, retaining silhouettes and detached effects.
            box=piece.getchannel('A').point(lambda x:255 if x>35 else 0).getbbox()
            if not box: raise ValueError('empty sprite cell')
            piece=piece.crop(box)
            scale=min((cell-16)/piece.width,(cell-18)/piece.height)
            piece=piece.resize((round(piece.width*scale),round(piece.height*scale)),Image.Resampling.LANCZOS)
            x=i*cell+(cell-piece.width)//2;y=j*cell+cell-piece.height-8
            result.alpha_composite(piece,(x,y))
            frames.append([x,y,piece.width,piece.height])
    result.save(ROOT/path,'WEBP',quality=92,method=6)
    return frames
frames=atlas(SOURCES/NILO,8,4,'public/assets/characters/nilo.webp',256)
assets=atlas(SOURCES/ATLAS,4,4,'public/assets/environments/atlas.webp',384)
Image.open(SOURCES/WORLD).convert('RGB').save(ROOT/'public/assets/environments/grove.webp','WEBP',quality=90,method=6)
(ROOT/'public/assets/frames.json').write_text(json.dumps({'nilo':frames,'atlas':assets}))
# PWA icon uses original Nilo art, isolated from its animation sheet.
im=Image.open(ROOT/'public/assets/characters/nilo.webp'); box=frames[8];sprite=im.crop((box[0],box[1],box[0]+box[2],box[1]+box[3]))
for size in [192,512]:
    icon=Image.new('RGBA',(size,size),(7,19,28,255));sprite2=sprite.copy();sprite2.thumbnail((int(size*.8),int(size*.85)),Image.Resampling.LANCZOS);icon.alpha_composite(sprite2,((size-sprite2.width)//2,(size-sprite2.height)//2));icon.convert('RGB').save(ROOT/f'public/icons/icon-{size}.png')
print('Aligned 32 Nilo frames, 16 environment/enemy/boss assets; shipping WebP + icons.')
