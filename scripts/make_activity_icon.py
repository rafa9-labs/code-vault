"""Generate the activity bar SVG icon for CodeVault."""
import os

svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="2" width="18" height="20" rx="2"/>
  <circle cx="12" cy="12" r="4.5"/>
  <path d="M9.5 10.5l-1.2 1.5 1.2 1.5"/>
  <path d="M14.5 10.5l1.2 1.5-1.2 1.5"/>
  <line x1="3" y1="6" x2="5" y2="6"/>
  <line x1="19" y1="6" x2="21" y2="6"/>
  <line x1="3" y1="18" x2="5" y2="18"/>
  <line x1="19" y1="18" x2="21" y2="18"/>
  <rect x="2" y="8" width="1.5" height="2" rx="0.5"/>
  <rect x="2" y="14" width="1.5" height="2" rx="0.5"/>
</svg>"""

out = os.path.join(os.path.dirname(__file__), '..', 'resources', 'icon.svg')
with open(out, 'w', encoding='utf-8') as f:
    f.write(svg)
print(f'SVG written to {out}')