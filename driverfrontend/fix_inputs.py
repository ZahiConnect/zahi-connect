import re

filepaths = [
    r"c:\Users\Lenovo\OneDrive\Desktop\Bridgeon\Group Project\Zahi Connect\driverfrontend\src\pages\auth\RegisterPage.jsx",
    r"c:\Users\Lenovo\OneDrive\Desktop\Bridgeon\Group Project\Zahi Connect\driverfrontend\src\pages\dashboard\DriverDashboardPage.jsx"
]

for filepath in filepaths:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Upgrade the input / select classNames
    old_input_class = r'className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3\.5( uppercase)? outline-none focus:border-\[\#09090b\]"'
    new_input_class = r'className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 px-4 py-3.5\1 outline-none transition-colors focus:border-[#09090b] focus:bg-white text-[#09090b] font-medium placeholder-slate-400"'
    content = re.sub(old_input_class, new_input_class, content)

    # Upgrade text area
    old_textarea_class = r'className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-\[\#09090b\]"'
    new_textarea_class = r'className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 px-4 py-3 outline-none transition-colors focus:border-[#09090b] focus:bg-white text-[#09090b] font-medium placeholder-slate-400"'
    content = re.sub(old_textarea_class, new_textarea_class, content)

    # Upgrade the label classes
    old_label_class_1 = r'text-sm font-medium text-\[\#52525b\]'
    new_label_class = r'text-xs font-bold uppercase tracking-widest text-slate-500'
    content = re.sub(old_label_class_1, new_label_class, content)

    # Upgrade Upload fields
    old_upload_class = r'className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none file:mr-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-medium"'
    new_upload_class = r'className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition-colors focus:border-[#09090b] focus:bg-white file:mr-4 file:rounded-full file:border-0 file:bg-[#09090b] file:text-white file:font-bold file:px-5 file:py-2.5 hover:file:bg-zinc-800 file:transition-colors file:cursor-pointer text-[#09090b] font-medium"'
    content = re.sub(old_upload_class, new_upload_class, content)
    
    # Gap in the grid could be bigger
    content = content.replace('className="mt-6 grid gap-4 sm:grid-cols-2"', 'className="mt-6 grid gap-6 sm:grid-cols-2"')
    content = content.replace('className="grid gap-4 sm:grid-cols-2"', 'className="grid gap-6 sm:grid-cols-2"')
    content = content.replace('className="grid gap-4 sm:grid-cols-3"', 'className="grid gap-6 sm:grid-cols-3"')
    content = content.replace('className="mt-5 grid gap-4 sm:grid-cols-3"', 'className="mt-5 grid gap-6 sm:grid-cols-3"')

    # Also upgrade "mt-8 space-y-8 fade-up" to space-y-12
    content = content.replace('className="mt-8 space-y-8 fade-up"', 'className="mt-12 space-y-12 fade-up"')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        print("Updated", filepath)
