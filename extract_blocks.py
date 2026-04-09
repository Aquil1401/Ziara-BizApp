
import os

file_path = r"g:\TechQ-Labs\Webapp\Business-Management-App\app\invoice\page.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Markers
p_marker = 'if (previewMode && viewingInvoice) {'
l_marker = '} else if (view === "list") {'
c_marker = '} else {'
r_marker = 'return ('

p_start = text.find(p_marker) + len(p_marker)
l_start = text.find(l_marker)
l_start_content = l_start + len(l_marker)
c_start = text.find(c_marker)
c_start_content = c_start + len(c_marker)
r_start = text.find(r_marker)

preview_block = text[p_start:l_start].strip()
list_block = text[l_start_content:c_start].strip()
creator_block = text[c_start_content:r_start].strip()

# Clean up assignments
# preview_block is likely "content = (<> ... </>" 
# We need to extract the part between content = ( and );
def extract_inner(block):
    start = block.find('content = (') + len('content = (')
    end = block.rfind(');')
    if end == -1: end = len(block)
    return block[start:end].strip()

p_inner = extract_inner(preview_block)
l_inner = extract_inner(list_block)
c_inner = extract_inner(creator_block)

with open(r"g:\TechQ-Labs\Webapp\Business-Management-App\p_pure.txt", 'w', encoding='utf-8') as f: f.write(p_inner)
with open(r"g:\TechQ-Labs\Webapp\Business-Management-App\l_pure.txt", 'w', encoding='utf-8') as f: f.write(l_inner)
with open(r"g:\TechQ-Labs\Webapp\Business-Management-App\c_pure.txt", 'w', encoding='utf-8') as f: f.write(c_inner)

print("BLOCKS EXTRACTED.")
