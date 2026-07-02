import numpy as np, py360convert
from PIL import Image

# --- load the equirectangular image (2:1 ratio required) ---
equi = np.array(Image.open('public/eso0932a.jpg').convert('RGB'))

# --- split into 6 faces (top-up) ---
faces = py360convert.e2c(equi, face_w=2048, cube_format='dict', mode='cubic')

def I(a): return Image.fromarray(a)

# --- 4 walls: corrections from visual testing ---
I(faces['F']).rotate(90,  expand=True).save('public/skybox/px.png')  # +X
I(faces['B']).rotate(-90, expand=True).save('public/skybox/nx.png')  # -X
I(faces['R']).rotate(180).save('public/skybox/py.png')               # +Y
I(faces['L']).save('public/skybox/ny.png')                           # -Y

# --- ceiling / floor: rotation to adjust if needed ---
I(faces['U']).save('public/skybox/pz.png')   # +Z  ceiling
I(faces['D']).save('public/skybox/nz.png')   # -Z  floor

print('6 faces generated in public/skybox/')
