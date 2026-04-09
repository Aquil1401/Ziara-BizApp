
import re

file_path = r"g:\TechQ-Labs\Webapp\Business-Management-App\app\invoice\page.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Helper to find unbalanced tags in a block
def audit_jsx(content, name):
    print(f"--- Auditing {name} ---")
    # Finding tags (very simple regex)
    open_tags = re.findall(r'<([a-zA-Z0-9]+)(\s|>)', content)
    close_tags = re.findall(r'</([a-zA-Z0-9]+)>', content)
    
    counts = {}
    for t, _ in open_tags:
        counts[t] = counts.get(t, 0) + 1
    for t in close_tags:
        counts[t] = counts.get(t, 0) - 1
        
    for tag, diff in counts.items():
        if diff != 0:
            print(f"Tag <{tag}> is unbalanced: {diff} extra open tags" if diff > 0 else f"Tag <{tag}> is unbalanced: {-diff} extra close tags")

# Split by the main blocks
try:
    preview_block = text.split('if (previewMode && viewingInvoice) {')[1].split('} else if (view === "list") {')[0]
    list_block = text.split('} else if (view === "list") {')[1].split('} else {')[0]
    creator_block = text.split('} else {')[1].split('return (')[0]
    return_block = text.split('return (')[1].rsplit('}', 1)[0]
    
    audit_jsx(preview_block, "PREVIEW")
    audit_jsx(list_block, "LIST")
    audit_jsx(creator_block, "CREATOR")
    audit_jsx(return_block, "RETURN")
except Exception as e:
    print(f"Error splitting file: {e}")
