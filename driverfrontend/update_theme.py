import os

frontend_dir = r"c:\Users\Lenovo\OneDrive\Desktop\Bridgeon\Group Project\Zahi Connect\driverfrontend\src"

replacements = {
    '#163025': '#09090b',    # Dark text
    '#1e2d26': '#52525b',    # Label text (slate-600 equivalent)
    '[rgba(34,64,53,0.14)]': 'slate-200',
    '[rgba(34,64,53,0.12)]': 'slate-200',
    '[rgba(34,64,53,0.16)]': 'slate-200',
    '#d48032': '#09090b',    # Focus ring / accent (make it dark)
    '#5d6d63': 'slate-500',  # Descriptions
    '#6a7a71': 'slate-400',
    '#809187': 'slate-400',
    '#425148': 'slate-600',
    '#8f4e17': 'amber-600',  # Eyebrow / links (make it a cool amber/yellow-brown)
    '#edf4ef': 'slate-100',  # Backgrounds of icons
    '#1f5d4a': '#09090b',    # Dark accents on backgrounds
    '#fff3e7': 'amber-50',   # Warm backgrounds
    '#efd2bc': 'red-200',    # Errors
    '#fff4ec': 'red-50',
    'rounded-[22px]': 'rounded-xl',
    'rounded-[20px]': 'rounded-xl',
    'rounded-[28px]': 'rounded-2xl',
    'rounded-[30px]': 'rounded-2xl',
    'rounded-[34px]': 'rounded-3xl',
    'rounded-[36px]': 'rounded-3xl',
    'rounded-[38px]': 'rounded-3xl',
    'rounded-[40px]': 'rounded-3xl',
    'border-[rgba(212,128,50,0.24)]': 'border-slate-200',
    '#b45722': '#ef4444',    # Offline button red
    'text-[#8f4e17]': 'text-amber-600',
    'bg-[#163025]': 'bg-[#09090b]',
    'text-[#163025]': 'text-[#09090b]',
    'text-white disabled': 'text-white disabled'
}

def process_file(filepath):
    if not filepath.endswith(('.jsx', '.js')): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for old, new in replacements.items():
        if old in new_content:
            new_content = new_content.replace(old, new)
            
    # Fix the focus border color explicitly to match tailwind arbitrary to standard
    new_content = new_content.replace('focus:border-slate-200', 'focus:border-[#09090b]')
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(frontend_dir):
    for str_file in files:
        process_file(os.path.join(root, str_file))

print("Theme update complete.")
