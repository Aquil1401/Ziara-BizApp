
import os

file_path = r"g:\TechQ-Labs\Webapp\Business-Management-App\app\invoice\page.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# I will use the current text but surgically fix the known offsets
lines = text.splitlines()

# Audit List View (520-674)
# We found 574 (premium-card) and 575 (overflow-x) are closed by 669, 670.
# Then 671 was )}
# But where was 521 closed?
# Line 672 was </div>
# This is correct for 521.
# WAIT! What if the map at 589 was not closed correctly?
# 666: ))}
# That closes map and map(inv => (.
# Then 667: </tbody>
# 668: </table>
# 669: </div>
# 670: </div>
# 671: )}
# 672: </div>
# 673: );

# Let's check the CREATOR block (starts around 674)
# 675: <div className="p-5 pt-8 pb-28 min-h-screen">
# ...
# 921: }

# I will use a script that just prints the line around 671 to 675 and 910 to 925
# and also checks the count of <div> vs </div> in each block accurately.

def count_tags(block):
    opens = block.count("<div")
    closes = block.count("</div>")
    return opens, closes

preview_marker = 'if (previewMode && viewingInvoice) {'
list_marker = '} else if (view === "list") {'
creator_marker = '} else {'
return_marker = 'return ('

try:
    p_start = text.find(preview_marker)
    l_start = text.find(list_marker)
    c_start = text.find(creator_marker)
    r_start = text.find(return_marker)
    
    p_block = text[p_start:l_start]
    l_block = text[l_start:c_start]
    c_block = text[c_start:r_start]
    
    op, cl = count_tags(p_block)
    print(f"PREVIEW: {op} open, {cl} close = {op-cl} diff")
    
    op, cl = count_tags(l_block)
    print(f"LIST: {op} open, {cl} close = {op-cl} diff")
    
    op, cl = count_tags(c_block)
    print(f"CREATOR: {op} open, {cl} close = {op-cl} diff")
    
except Exception as e:
    print(f"Error: {e}")
