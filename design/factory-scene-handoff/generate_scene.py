"""Reference generator for the CostCube factory scene (mockup F8.1.2).

Pure Python, no dependencies. Run:  python3 generate_scene.py  -> writes scene.svg
This is the source of truth for geometry, colours, draw order and animations.
Port its logic to a React/SVG component; do not ship this script.
"""
import sys
C=0.866; S=0.42; ZS=1.15; L=70; OX=0; OY=0
ROT=False
def pts(l): return ' '.join(f'{x:.1f},{y:.1f}' for x,y in l)
def iso(u,v,z=0,rel=False):
    o=(0,0) if rel else (OX,OY)
    return (o[0]+C*(u-v)*L, o[1]+S*(u+v)*L-z*ZS)
def R(u,v): return (8-u,7-v) if ROT else (u,v)
def RB(u0,v0,W,D): return (8-u0-W,7-v0-D) if ROT else (u0,v0)
def faces(u0,v0,W,D,z0,H,c,rel=False,op=1):
    f=lambda u,v,z: iso(u,v,z,rel); z1=z0+H
    top=[f(u0,v0,z1),f(u0+W,v0,z1),f(u0+W,v0+D,z1),f(u0,v0+D,z1)]
    left=[f(u0,v0+D,z0),f(u0+W,v0+D,z0),f(u0+W,v0+D,z1),f(u0,v0+D,z1)]
    right=[f(u0+W,v0,z0),f(u0+W,v0+D,z0),f(u0+W,v0+D,z1),f(u0+W,v0,z1)]
    g=f' opacity="{op}"' if op<1 else ''
    return f'<g{g}><polygon points="{pts(left)}" fill="{c[1]}"/><polygon points="{pts(right)}" fill="{c[2]}"/><polygon points="{pts(top)}" fill="{c[0]}"/></g>'
def wb(u0,v0,W,D,z0,H,c,op=1):  # world box, original coords
    a,b=RB(u0,v0,W,D); return faces(a,b,W,D,z0,H,c,False,op)
RACK=('#D3DBEA','#9AA6BD','#7F8BA3'); BOX=('#F7BE6C','#E39A3E','#C97F27'); POST=('#6E98FF','#2456E6','#1A43B8')
BLUE=('#6E98FF','#2456E6','#1A43B8'); ORNG=('#FFC977','#E8871E','#C96F0E'); LINE=('#B8D27A','#7FA83A','#668A2B')
DESK=('#F1F4F9','#C3CCDB','#AEB9CC'); YEL=('#FFD45C','#E8A912','#C98F0A'); DARK=('#3E4A63','#2C364B','#1F2737')
PAL=('#D9B582','#C9A06A','#AD8452'); WHT=('#FFFFFF','#E3E8F0','#CDD5E2'); BELT=('#5B6B8C','#45526C','#3A465C')
BEAM=('#FFB15C','#E8871E','#C96F0E'); WRAP=('#F4F7FB','#DCE3EE','#C6D0DF')
# ---------- layered items ----------
G=[]; ITEMS=[]; TOP=[]
def add(svg,u,v,orig=True):
    if orig: u,v=R(u,v)
    zone='back' if (u<0 or v<0) else ('front' if (u>8 or v>7) else 'in')
    ITEMS.append((zone,u+v,len(ITEMS),svg))
def person(x,y,vest='#FFB020',bob=False,dur='1.6s'):
    anim=f'<animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="{dur}" repeatCount="indefinite"/>' if bob else ''
    return (f'<g transform="translate({x:.1f} {y:.1f})"><ellipse cx="0" cy="0" rx="8" ry="3.5" fill="rgba(15,27,51,.18)"/><g>{anim}'
            f'<rect x="-4.5" y="-15" width="9" height="13" rx="3" fill="#2C364B"/>'
            f'<rect x="-6" y="-28" width="12" height="15" rx="4" fill="{vest}"/>'
            f'<circle cx="0" cy="-33" r="5" fill="#F2C9A0"/><path d="M-5,-35 a5,5 0 0 1 10,0 z" fill="#FFD45C"/></g></g>')
def pw(u,v,*a,**k):
    x,y=iso(*R(u,v)); add(person(x,y,*a,**k),u,v)
def forklift(load=True,tag=None):
    o=lambda *a: faces(*a,rel=True)
    s='<ellipse cx="0" cy="4" rx="26" ry="9" fill="rgba(15,27,51,.18)"/>'
    s+=o(-0.25,-0.18,0.42,0.36,0,16,YEL)+o(-0.2,-0.12,0.2,0.24,16,14,DARK)
    s+=o(-0.22,-0.15,0.03,0.03,16,26,DARK)+o(-0.22,0.12,0.03,0.03,16,26,DARK)+o(-0.24,-0.17,0.36,0.34,42,3,DARK)
    s+=o(0.17,-0.17,0.04,0.34,0,46,DARK)
    s+=(o(0.22,-0.2,0.34,0.4,8,4,PAL)+o(0.24,-0.18,0.3,0.36,12,22,BOX)) if load else (o(0.22,-0.12,0.32,0.05,4,2,DARK)+o(0.22,0.07,0.32,0.05,4,2,DARK))
    if tag:
        w=len(tag[0]+tag[1])*6.2+34
        s+=(f'<g transform="translate(0 -92)"><path d="M-30,64 l-8,0 0,8 M30,64 l8,0 0,8 M-30,104 l-8,0 0,-8 M30,104 l8,0 0,-8" stroke="#2456E6" stroke-width="2" fill="none" transform="translate(0 -6)"/>'
            f'<rect x="{-w/2:.0f}" y="-14" width="{w:.0f}" height="26" rx="8" fill="#1A43B8"/><path d="M-6,12 L0,19 L6,12 Z" fill="#1A43B8"/>'
            f'<text x="{-w/2+10:.0f}" y="4" font-family="Plus Jakarta Sans, sans-serif" font-size="12" font-weight="800" fill="#FFFFFF">{tag[0]}</text>'
            f'<text x="{-w/2+16+len(tag[0])*7.2:.0f}" y="4" font-family="Plus Jakarta Sans, sans-serif" font-size="11" font-weight="600" fill="#C9D8FF">{tag[1]}</text></g>')
    return s
def jack():
    o=lambda *a: faces(*a,rel=True)
    s='<ellipse cx="0" cy="2" rx="24" ry="8" fill="rgba(15,27,51,.15)"/>'
    s+=o(-0.2,-0.2,0.4,0.4,0,4,PAL)+o(-0.18,-0.18,0.36,0.36,4,26,BOX)
    dx,dy=iso(-0.45,0,0,True) if not ROT else iso(0.45,0,0,True)
    return s+person(dx,dy+6)
def tree(u,v,s=1.0):
    x,y=iso(u,v); r=14*s
    add(f'<g transform="translate({x:.1f} {y:.1f})"><ellipse cx="0" cy="0" rx="{12*s:.0f}" ry="{5*s:.0f}" fill="rgba(15,27,51,.15)"/><rect x="-2.5" y="{-22*s:.0f}" width="5" height="{22*s:.0f}" rx="2" fill="#9B7A57"/><circle cy="{-22*s-r+4:.0f}" r="{r:.0f}" fill="#5FB585"/><circle cx="{-r*.35:.0f}" cy="{-22*s-r*1.3+4:.0f}" r="{r*.5:.0f}" fill="#86CFA3"/></g>',u,v,orig=False)
def car(u,v,c):
    add(faces(u,v,0.5,0.28,0,12,c)+faces(u+0.1,v+0.03,0.28,0.22,12,9,('#DDE7F7','#9FB2D1','#8BA0C2')),u+0.25,v+0.14,orig=False)
def truck(u,v,body=WHT,cab=BLUE,boxes=0,along='u',brand=True):
    # original coords; trailer along u from u..u+2.4, width 1.0 in v
    s=''
    a=R(u,v)
    s+=wb(u+0.15,v+0.05,0.25,0.9,0,10,DARK)
    s+=wb(u,v,2.4,1.0,10,62,body)
    cu=u-0.6
    s+=wb(cu,v+0.05,0.6,0.9,6,46,cab)+wb(cu+0.02,v+0.07,0.56,0.86,52,6,DARK)
    s+=wb(u+1.7,v+0.05,0.25,0.9,0,10,DARK)
    if brand:
        uu,vv=RB(u+0.4,v,1.6,1.0)
        p=[iso(uu+0.05,vv+1.0,30),iso(uu+1.55,vv+1.0,30),iso(uu+1.55,vv+1.0,60),iso(uu+0.05,vv+1.0,60)]
        s+=f'<polygon points="{pts(p)}" fill="#2456E6" opacity=".9"/>'
    add(s,u+1.2,v+0.5)
# ---------- world ----------
def zc(c,r):
    if r==3 or c==2: return '#DCE1EA'
    if c<2: return '#FAD6AE' if r<3 else '#BFD2FF'
    return '#DFF0B5' if r<3 else '#B5E3D1'

GR=('#8ED3A8','#5FB585','#4E9C70'); CONT=[('#6E98FF','#2456E6','#1A43B8'),('#FFC977','#E8871E','#C96F0E'),('#C7D2E3','#93A3BD','#7C8DA9'),('#9ED9C2','#3FAE84','#2F8F6A')]
def ground():
    g=[]
    def orect(u0,v0,u1,v1,f,extra=''):
        q=[R(u0,v0),R(u1,v0),R(u1,v1),R(u0,v1)]
        g.append(f'<polygon points="{pts([iso(*p) for p in q])}" fill="{f}" {extra}/>')
    def oline(a,b,col,w,dash=''):
        p,q=iso(*R(*a)),iso(*R(*b)); d=f' stroke-dasharray="{dash}"' if dash else ''
        g.append(f'<line x1="{p[0]:.1f}" y1="{p[1]:.1f}" x2="{q[0]:.1f}" y2="{q[1]:.1f}" stroke="{col}" stroke-width="{w}"{d}/>')
    orect(-40,-40,40,40,'#C6E3B8')
    orect(-5.2,-3.0,8.4,9.2,'#E6EAF1')
    # roads
    orect(-7.6,-40,-5.4,40,'#BFC7D3'); oline((-6.5,-40),(-6.5,40),'#FFFFFF',3,'16 14')
    orect(9.8,-40,12.0,40,'#BFC7D3'); oline((10.9,-40),(10.9,40),'#FFFFFF',3,'16 14')
    orect(-40,10.2,40,12.4,'#BFC7D3'); oline((-40,11.3),(40,11.3),'#FFFFFF',3,'16 14')
    orect(-40,-5.6,40,-3.6,'#BFC7D3'); oline((-40,-4.6),(40,-4.6),'#FFFFFF',3,'16 14')
    orect(-5.4,-0.9,-5.2,8.8,'#BFC7D3')
    # sidewalks
    for a_ in [(-5.4,-3.6,-5.2,10.2),(8.4,-3.6,9.8,-3.3),(-5.2,9.2,9.8,9.5)]: pass
    # yards
    def yard(v0,v1):
        orect(-5.2,v0,0,v1,'#D3D9E3')
        vv=v0+0.2
        while vv<=v1-0.2:
            oline((-4.8,vv),(-0.3,vv),'#F2B53A',2.5); vv+=1.25
    yard(-0.6,3.0); yard(3.8,7.8)
    # car park (front, v>7)
    orect(0.2,7.4,8.2,9.0,'#D3D9E3')
    for k in range(0,17): oline((0.4+k*0.48,7.5),(0.4+k*0.48,8.15),'#FFFFFF',2)
    # charging / container area (v<0)
    orect(0.5,-2.8,8.2,-0.3,'#D3D9E3')
    for k in range(5): orect(5.0+k*0.62,-1.25,5.5+k*0.62,-0.45,'none','stroke="#F2B53A" stroke-width="2"')
    # hall floor slab edge
    orect(-0.08,-0.08,8.08,7.08,'#B9C4D6')
    for r in range(7):
        for c in range(8):
            q=[R(c,r),R(c+1,r),R(c+1,r+1),R(c,r+1)]
            g.append(f'<polygon points="{pts([iso(*p) for p in q])}" fill="{zc(c,r)}" stroke="#FFFFFF" stroke-width="2"/>')
    for a_,b_ in [((2.5,0.1),(2.5,6.9)),((0.1,3.5),(1.9,3.5)),((3.1,3.5),(7.9,3.5))]: oline(a_,b_,'#FFFFFF',3,'12 9')
    for a_,b_ in [((2.1,0),(2.1,7)),((2.9,0),(2.9,7))]: oline(a_,b_,'#F2B53A',2)
    return ''.join(g)
def hedge(u0,v0,W,D): add(wb(u0,v0,W,D,0,10,GR),u0+W/2,v0+D/2)
def scenery():
    import random; rnd=random.Random(4)
    # tree belts beyond roads
    for k in range(-30,30):
        for line_ in [(-9.0,None),(13.4,None),(None,13.8),(None,-7.0),(-10.6,None),(15.0,None),(None,15.4),(None,-8.6)]:
            u,v=line_
            uu=u if u is not None else k*1.1+rnd.uniform(-.3,.3); vv=v if v is not None else k*1.1+rnd.uniform(-.3,.3)
            tree(*R(uu+rnd.uniform(-.3,.3) if u is not None else uu, vv+rnd.uniform(-.3,.3) if v is not None else vv),rnd.uniform(.9,1.3))
    # near trees + hedges
    for p in [(-1.0,3.4),(-2.4,3.4),(-3.8,3.4),(9.0,1.0),(9.0,3.2),(9.0,5.4),(9.1,7.8),(-4.6,8.6),(-2.6,8.7),(8.9,-2.0),(-4.6,-2.2),(-2.8,-2.4)]:
        tree(*R(*p),1.15)
    hedge(8.6,0,0.4,7.0); hedge(0.2,9.0,8.0,0.3)
    # cars
    cols=[('#F7F9FC','#D5DCE8','#BFC9D9'),('#FF8A8A','#E5484D','#C2383C'),('#6E98FF','#2456E6','#1A43B8'),('#FFD45C','#E8A912','#C98F0A'),('#C7D2E3','#93A3BD','#7C8DA9')]
    for i,k in enumerate([0,1,3,4,5,7,9,10,12,13,15]):
        u=0.45+k*0.48; c=cols[i%5]
        add(wb(u,7.6,0.36,0.52,0,11,c)+wb(u+0.03,7.72,0.3,0.28,11,8,('#DDE7F7','#9FB2D1','#8BA0C2')),u+0.18,7.86)
    # containers + pallet stacks + charging forklifts
    for i,(u,c) in enumerate([(0.8,CONT[0]),(2.2,CONT[1]),(0.8,CONT[2])]):
        z=0 if i<2 else 40
        add(wb(u,-2.5,1.3,0.8,z,40,c)+''.join(wb(u+0.1+j*0.15,-1.71,0.04,0.01,z+4,32,(c[2],c[2],c[2])) for j in range(8)),u+0.65,-2.1)
    for i in range(4): add(wb(3.7+i*0.0,-2.4+i*0.5,0.36,0.36,0,4,PAL)+wb(3.72,-2.38+i*0.5,0.32,0.32,4,22,WRAP)+wb(3.72,-2.38+i*0.5,0.32,0.32,26,22,WRAP),3.9,-2.2+i*0.5)
    for k in range(5):
        x,y=iso(*R(5.25+k*0.62,-0.85)); add(f'<g transform="translate({x:.1f} {y:.1f})">{forklift(False)}</g>',5.25+k*0.62,-0.85)
        add(wb(5.1+k*0.62,-1.55,0.3,0.12,0,26,('#E3E8F0','#AEB9CC','#93A3BD'))+wb(5.15+k*0.62,-1.44,0.2,0.01,14,6,('#1FA25A','#1FA25A','#1FA25A')),5.25+k*0.62,-1.5)
    # guard house + barrier at road entry
    add(wb(-4.9,-0.4,0.6,0.6,0,34,WHT)+wb(-4.95,-0.45,0.7,0.7,34,4,BLUE),-4.6,-0.1)
def hall_contents():
    # assembly line (+ moving boxes)
    s=wb(3.4,1.3,4.2,0.4,0,22,BELT)+wb(3.4,1.3,4.2,0.4,22,2,LINE)
    pth='M'+' L'.join(f'{x:.1f},{y:.1f}' for x,y in [iso(*R(u,1.5),24) for u in (3.5,7.5)])
    s+=f'<path id="belt{TAG}" d="{pth}" fill="none"/>'
    for i in range(5): s+=f'<g>{faces(-0.13,-0.13,0.26,0.26,0,14,BOX,True)}<animateMotion dur="10s" begin="-{i*2}s" repeatCount="indefinite"><mpath href="#belt{TAG}"/></animateMotion></g>'
    add(s,5.5,1.5)
    for i in range(3): add(wb(2.75,1.0+i*0.36,0.3,0.3,0,4,PAL)+wb(2.77,1.02+i*0.36,0.26,0.26,4,20,BOX),2.9,1.15+i*0.36)
    for u,d in [(4.1,'1.4s'),(5.4,'1.7s'),(6.7,'1.5s')]: pw(u,2.05,'#FFB020',True,d)
    add(wb(4.15,2.45,0.7,0.4,0,20,DESK)+wb(4.3,2.52,0.3,0.24,20,14,BOX),4.5,2.65)
    pw(4.5,3.0,'#7FD1C4',True,'1.2s')
    # wrapped pallets near packing
    for i in range(2): add(wb(5.3+i*0.42,2.5,0.36,0.36,0,4,PAL)+wb(5.32+i*0.42,2.52,0.32,0.32,4,24,WRAP),5.5+i*0.42,2.7)
    # forklift B
    fb='M'+' L'.join(f'{x:.1f},{y:.1f}' for x,y in [iso(*R(u,v)) for u,v in [(4.5,3.25),(2.5,3.25),(2.5,1.3),(0.5,1.3),(0.5,1.3),(2.5,1.3),(2.5,3.25),(4.5,3.25)]])
    add(f'<path id="fb{TAG}" d="{fb}" fill="none" stroke="#2456E6" stroke-width="2" stroke-dasharray="3 7" opacity=".45"/><g>{forklift(True)}<animateMotion dur="14s" repeatCount="indefinite"><mpath href="#fb{TAG}"/></animateMotion></g>',2.5,3.3)
    for i in range(2): add(wb(0.3,0.3+i*0.45,0.36,0.36,0,4,PAL)+wb(0.32,0.32+i*0.45,0.32,0.32,4,22,BOX),0.5,0.5+i*0.45)
    def rack(u0,v0):
        s=''
        for z in (0,32,64): s+=wb(u0,v0,2.6,0.42,z+2,4,BEAM)
        for z in (6,38):
            u=u0+0.06
            while u+0.6<=u0+2.55: s+=wb(u+0.03,v0+0.04,0.56,0.34,z,24,BOX); u+=0.62
        s+=wb(u0+0.06,v0+0.04,0.56,0.34,70,24,BOX)+wb(u0+0.7,v0+0.04,0.56,0.34,70,24,WRAP)
        for u in (u0,u0+1.28,u0+2.54): s+=wb(u,v0,0.05,0.05,0,96,POST)+wb(u,v0+0.37,0.05,0.05,0,96,POST)
        return s
    add(rack(4.2,4.4),5.5,4.6)
    fa='M'+' L'.join(f'{x:.1f},{y:.1f}' for x,y in [iso(*R(u,5.3)) for u in (1.3,2.5,5.4,5.4,2.5,1.3)])
    add(f'<path id="fa{TAG}" d="{fa}" fill="none" stroke="#2456E6" stroke-width="2" stroke-dasharray="3 7" opacity=".45"/><g>{forklift(True,SEL)}<animateMotion dur="11s" repeatCount="indefinite"><mpath href="#fa{TAG}"/></animateMotion></g>',5.3,5.2)
    add(rack(4.2,5.9),5.5,6.1)
    for i in range(3): add(wb(1.15,4.35+i*0.45,0.36,0.36,0,4,PAL)+wb(1.17,4.37+i*0.45,0.32,0.32,4,22,BOX),1.3,4.5+i*0.45)
    # charging bay inside, back corner
    for i in range(2):
        x,y=iso(*R(6.6+i*0.6,0.45)); add(f'<g transform="translate({x:.1f} {y:.1f})">{forklift(False)}</g>',6.6+i*0.6,0.45)
    # trucks + yard
    truck(-2.6,4.5,boxes=2)
    for i in range(2): add(wb(-0.9+i*0.45,4.7,0.36,0.36,14,22,BOX),-0.7+i*0.45,4.9)
    truck(-2.6,1.6,body=WHT,cab=('#FFC977','#E8871E','#C96F0E'))
    truck(-4.0,6.4,brand=False)
    jp='M'+' L'.join(f'{x:.1f},{y:.1f}' for x,y in [iso(*R(u,5.15)) for u in (-0.4,1.0,1.0,-0.4)])
    add(f'<path id="jk{TAG}" d="{jp}" fill="none"/><g>{jack()}<animateMotion dur="7s" repeatCount="indefinite"><mpath href="#jk{TAG}"/></animateMotion></g>',0.3,5.15)
    pw(0.4,6.3,'#FFB020',True,'2s')
    # yard: outside forklift waiting + pallets
    for i in range(3): add(wb(-1.4+i*0.45,3.2,0.36,0.36,0,4,PAL)+wb(-1.38+i*0.45,3.22,0.32,0.32,4,22,WRAP),-1.2+i*0.45,3.4)
LS=1.0
def lab(u,v,z,n,t,warn=False):
    x,y=iso(*R(u,v),z); w=len(t)*6.6+40
    return f'<g transform="translate({x:.1f} {y:.1f}) scale({LS}) translate({-x:.1f} {-y:.1f})">'+_lab(x,y,w,n,t,warn)+'</g>'
def _lab(x,y,w,n,t,warn):
    bc='#E8871E' if warn else '#2456E6'
    return (f'<g><rect x="{x-w/2:.1f}" y="{y-26:.1f}" width="{w:.1f}" height="24" rx="12" fill="#FFFFFF" stroke="{bc}" stroke-width="1.5"/>'
            f'<circle cx="{x-w/2+13:.1f}" cy="{y-14:.1f}" r="8.5" fill="{bc}"/><text x="{x-w/2+13:.1f}" y="{y-10.3:.1f}" text-anchor="middle" font-family="Plus Jakarta Sans, system-ui, sans-serif" font-size="10" font-weight="800" fill="#FFFFFF">{n}</text>'
            f'<text x="{x-w/2+26:.1f}" y="{y-10:.1f}" font-family="Plus Jakarta Sans, system-ui, sans-serif" font-size="11.5" font-weight="700" fill="#0F1B33">{t}</text></g>')
# ---------- walls (final coords) ----------
DOORS=[(0.7,1.4,ORNG,True),(1.7,2.4,ORNG,False),(4.55,5.45,BLUE,True),(5.75,6.45,BLUE,False)]
def seg(a,b,col,w,op=1,dash=''):
    d=f' stroke-dasharray="{dash}"' if dash else ''
    return f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{col}" stroke-width="{w}" opacity="{op}"{d}/>'
def wall(axis,fix,a,b,H,kind,doors=()):
    # axis 'u': plane u=fix, spans v a..b ; 'v': plane v=fix spans u a..b
    P=(lambda t,z: iso(fix,t,z)) if axis=='u' else (lambda t,z: iso(t,fix,z))
    s=''
    outer=[P(a,0),P(b,0),P(b,H),P(a,H)]
    holes=[[P(d0,0),P(d1,0),P(d1,min(H,62)),P(d0,min(H,62))] for d0,d1,c,op in doors if op]
    d='M'+' L'.join(f'{x:.1f},{y:.1f}' for x,y in outer)+' Z'+''.join(' M'+' L'.join(f'{x:.1f},{y:.1f}' for x,y in h)+' Z' for h in holes)
    if kind=='solid':
        s+=f'<path d="{d}" fill="#E9EDF4" fill-rule="evenodd"/>'
        t=a+0.2
        while t<b:
            if not any(d0<=t<=d1 for d0,d1,c,op in doors if op): s+=seg(P(t,0),P(t,H-10),'#C9D2E0',1.2)
            t+=0.2
        s+=f'<polygon points="{pts([P(a,H-10),P(b,H-10),P(b,H),P(a,H)])}" fill="#2456E6"/>'
        s+=f'<polygon points="{pts([P(a,0),P(b,0),P(b,6),P(a,6)])}" fill="#B9C4D6"/>'
    elif kind=='glass':
        s+=f'<path d="{d}" fill="#DCE7FF" fill-opacity=".14" fill-rule="evenodd"/>'
        s+=f'<polygon points="{pts([P(a,H-8),P(b,H-8),P(b,H),P(a,H)])}" fill="#2456E6" fill-opacity=".85"/>'
        s+=f'<polygon points="{pts([P(a,0),P(b,0),P(b,10),P(a,10)])}" fill="#AEB9CC" fill-opacity=".55"/>'
        t=a
        while t<=b+1e-6:
            s+=seg(P(t,0),P(t,H),'#2456E6',2.2 if a<t<b else 3.5,.7); t+=1
        for k in range(int(a),int(b),2):
            s+=seg(P(k+0.3,18),P(k+0.7,H-16),'#FFFFFF',5,.22)
    elif kind=='low':
        s+=f'<path d="{d}" fill="#E9EDF4" fill-rule="evenodd"/>'
        s+=f'<polygon points="{pts([P(a,H-5),P(b,H-5),P(b,H),P(a,H)])}" fill="#2456E6"/>'
    for d0,d1,c,op in doors:
        fr=[P(d0,0),P(d1,0),P(d1,min(H,62)),P(d0,min(H,62))]
        if op:
            s+=f'<polygon points="{pts(fr)}" fill="none" stroke="{c[1]}" stroke-width="3.5"/>'
            if H>62: s+=f'<polygon points="{pts([P(d0,52),P(d1,52),P(d1,62),P(d0,62)])}" fill="{c[2]}"/>'
        else:
            s+=f'<polygon points="{pts(fr)}" fill="{c[1]}" stroke="{c[2]}" stroke-width="2"/>'
            for z in range(8,min(H,62),8): s+=seg(P(d0,z),P(d1,z),c[2],1)
    return s
def build(rot,H,front_kind,back_kind,sel=None,tag='a'):
    global ROT,ITEMS,TAG,SEL
    ROT=rot; ITEMS=[]; TAG=tag; SEL=sel
    gnd=ground(); scenery(); hall_contents()
    # doors in final coords
    if rot: dd=[(7-b,7-a,c,op) for a,b,c,op in DOORS]; dock=('u',8)
    else: dd=DOORS; dock=('u',0)
    backs=[('u',0),('v',0)]; fronts=[('u',8),('v',7)]
    def W(ax,fx,kind):
        span=(0,7) if ax=='u' else (0,8)
        doors=dd if (ax,fx)==dock else ()
        return wall(ax,fx,span[0],span[1],H,kind,doors)
    srt=lambda z: ''.join(s for zz,d,i,s in sorted(ITEMS,key=lambda t:(t[1],t[2])) if zz==z)
    out=gnd+srt('back')+''.join(W(a,f,back_kind) for a,f in backs)+srt('in')+''.join(W(a,f,front_kind) for a,f in fronts)+srt('front')
    return out


LS=1.0
def labels():
    return ''.join([lab(0.0,5.0,95,1,'Unloading · 2 people'),lab(5.5,4.9,118,2,'Put away'),lab(5.5,1.5,60,3,'Assembly · queue 3',True),lab(4.5,2.65,60,4,'Packing'),lab(0.3,0.9,80,5,'Loading')])

if __name__=='__main__':
    # F8.1.2: original orientation, low cutaway walls (26 px), no selection
    scene=build(False,26,'low','low',None,'a')
    LS=0.8
    vb="-470 -110 1000 574"   # camera crop = zoom level
    open('scene.svg','w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="1440" height="826" preserveAspectRatio="xMidYMid slice" style="background:#C6E3B8">{scene}{labels()}</svg>')
    print('wrote scene.svg')
