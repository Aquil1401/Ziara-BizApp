
import os
import re

file_path = r"g:\TechQ-Labs\Webapp\Business-Management-App\app\invoice\page.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

def extract_block(text, start_pattern, end_pattern):
    match = re.search(f"{re.escape(start_pattern)}.*?content = \((.*?)\);\s*?{re.escape(end_pattern)}", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return None

# Markers with some flexibility
p_marker = 'if (previewMode && viewingInvoice) {'
l_marker = '} else if (view === "list") {'
c_marker = '} else {'
r_marker = 'return ('

# Try specific substrings first
try:
    p_content = text.split(p_marker)[1].split(l_marker)[0].strip()
    l_content = text.split(l_marker)[1].split(c_marker)[0].strip()
    c_content = text.split(c_marker)[1].split(r_marker)[0].strip()

    def get_inner(c):
        s = c.find('(') + 1
        e = c.rfind(')')
        return c[s:e].strip()

    with open(r"g:\TechQ-Labs\Webapp\Business-Management-App\p_pure.txt", 'w', encoding='utf-8') as f: f.write(get_inner(p_content))
    with open(r"g:\TechQ-Labs\Webapp\Business-Management-App\l_pure.txt", 'w', encoding='utf-8') as f: f.write(get_inner(l_content))
    with open(r"g:\TechQ-Labs\Webapp\Business-Management-App\c_pure.txt", 'w', encoding='utf-8') as f: f.write(get_inner(c_content))
    print("EXTRACTION SUCCESSFUL.")
except Exception as e:
    print(f"Error: {e}")
