"""Generate icon.svg from code-vault.jpg for activity bar."""
import base64

jpg_path = r'c:\Users\rafa\Pomodoro-AI\codevault\resources\code-vault.jpg'
svg_path = r'c:\Users\rafa\Pomodoro-AI\codevault\resources\icon.svg'

with open(jpg_path, 'rb') as f:
    data = f.read()

b64 = base64.b64encode(data).decode()

svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"'
    ' width="24" height="24">'
    '<image href="data:image/jpeg;base64,{b64}" width="128" height="128"/>'
    '</svg>'
).format(b64=b64)

with open(svg_path, 'w', encoding='utf-8') as f:
    f.write(svg)

print(f'SVG created, size: {len(svg)} bytes')