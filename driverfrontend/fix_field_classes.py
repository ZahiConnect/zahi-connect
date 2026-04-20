import re

filepaths = [
    r"c:\Users\Lenovo\OneDrive\Desktop\Bridgeon\Group Project\Zahi Connect\driverfrontend\src\pages\auth\RegisterPage.jsx",
    r"c:\Users\Lenovo\OneDrive\Desktop\Bridgeon\Group Project\Zahi Connect\driverfrontend\src\pages\dashboard\DriverDashboardPage.jsx",
]

INPUT_OLD = r'className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 px-4 py-3\.5( uppercase)? outline-none transition-colors focus:border-\[\#09090b\] focus:bg-white text-\[\#09090b\] font-medium placeholder-slate-400"'

def input_replacement(match):
    upper = match.group(1) or ""
    if upper.strip():
        return 'className="field-input uppercase"'
    return 'className="field-input"'

TEXTAREA_OLD = r'className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 px-4 py-3 outline-none transition-colors focus:border-\[\#09090b\] focus:bg-white text-\[\#09090b\] font-medium placeholder-slate-400"'
TEXTAREA_NEW = 'className="field-input"'

UPLOAD_OLD = r'className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition-colors focus:border-\[\#09090b\] focus:bg-white file:mr-4 file:rounded-full file:border-0 file:bg-\[\#09090b\] file:text-white file:font-bold file:px-5 file:py-2\.5 hover:file:bg-zinc-800 file:transition-colors file:cursor-pointer text-\[\#09090b\] font-medium"'
UPLOAD_NEW = 'className="field-upload"'

LABEL_OLD_BLOCK = r'className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500"'
LABEL_NEW_BLOCK = 'className="field-label"'
LABEL_OLD_FLEX = r'className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500"'
LABEL_NEW_FLEX = 'className="field-label flex items-center gap-2"'

CHECKBOX_OLD = r'className="mt-4 inline-flex items-center gap-3 rounded-\[22px\] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-\[\#09090b\]"'
CHECKBOX_NEW = 'className="field-check mt-4"'

# Also handle the old versions without mt-4
CHECKBOX_OLD2 = r'className="inline-flex items-center gap-3 rounded-\[22px\] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-\[\#09090b\]"'
CHECKBOX_NEW2 = 'className="field-check"'

# Section headers
SECTION_ICON_GREEN = r'className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-\[\#09090b\]"'
SECTION_ICON_GREEN_NEW = 'className="field-section-icon"'

SECTION_ICON_AMBER = r'className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"'
SECTION_ICON_AMBER_NEW = 'className="field-section-icon yellow"'

for filepath in filepaths:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # inputs
    content = re.sub(INPUT_OLD, input_replacement, content)
    # textarea
    content = re.sub(TEXTAREA_OLD, TEXTAREA_NEW, content)
    # uploads
    content = re.sub(UPLOAD_OLD, UPLOAD_NEW, content)
    # labels
    content = content.replace(LABEL_OLD_BLOCK, LABEL_NEW_BLOCK)
    content = content.replace(LABEL_OLD_FLEX, LABEL_NEW_FLEX)
    # checkboxes
    content = re.sub(CHECKBOX_OLD, CHECKBOX_NEW, content)
    content = re.sub(CHECKBOX_OLD2, CHECKBOX_NEW2, content)
    # section icons
    content = re.sub(SECTION_ICON_GREEN, SECTION_ICON_GREEN_NEW, content)
    content = re.sub(SECTION_ICON_AMBER, SECTION_ICON_AMBER_NEW, content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated:", filepath)

print("Done.")
