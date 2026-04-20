import os
import re

frontend_dir = r"c:\Users\Lenovo\OneDrive\Desktop\Bridgeon\Group Project\Zahi Connect\driverfrontend\src"

def fix_brackets_in_file(filepath):
    if not filepath.endswith(('.jsx', '.js')): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    # Replace bg-[xxx] with bg-xxx
    new_content = re.sub(r'bg-\[([a-zA-Z]+-\d+)\]', r'bg-\1', new_content)
    # Replace text-[xxx] with text-xxx
    new_content = re.sub(r'text-\[([a-zA-Z]+-\d+)\]', r'text-\1', new_content)
    # Replace border-[xxx] with border-xxx
    new_content = re.sub(r'border-\[([a-zA-Z]+-\d+)\]', r'border-\1', new_content)
    
    # Also clean up any lingering bad tokens
    new_content = new_content.replace('text-[slate-500]', 'text-slate-500')
    new_content = new_content.replace('bg-[slate-100]', 'bg-slate-100')
    new_content = new_content.replace('text-[amber-600]', 'text-amber-600')
    new_content = new_content.replace('bg-[amber-50]', 'bg-amber-50')
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")

for root, _, files in os.walk(frontend_dir):
    for str_file in files:
        fix_brackets_in_file(os.path.join(root, str_file))

print("Bracket fix complete.")
