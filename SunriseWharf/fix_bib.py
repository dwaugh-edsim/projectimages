import re

with open(r'E:\Antigravity\simroom\Github Repos\projectimages\SunriseWharf\sunrise_wharf.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the problematic bibliography entry
pattern = r'"title":\s*"[^"]*<a href=[^>]*>Honour of the Crown</a>[^"]*"'
replacement = '"title": "Honour of the Crown and Resource Projects"'

new_content = re.sub(pattern, replacement, content)

# Check if we found it
if new_content == content:
    print("Pattern not found, trying simpler approach")
    # Just look for the specific bad string
    bad = '"title": "\\\"<a href=\\"https://www.osler.com/en/insights/updates/resource-projects-and-the-honour-of-the-crown-more-than-just-consultation-about-a-project\\" target=\\"_blank\\" style=\\"color: var(--accent); text-decoration: underline; text-decoration-style: dotted; cursor: help;\\" title=\\"A constitutional principle requiring the government to act with integrity in all dealings with Indigenous peoples.\\">Honour of the Crown</a>\\\" and Resource Projects"'
    if bad in content:
        print("Found exact match")
        content = content.replace(bad, '"title": "Honour of the Crown and Resource Projects"')
    else:
        # Write a simpler fix - just the title portion
        print("Searching for partial match...")
        if "Honour of the Crown</a>\"" in content:
            print("Found partial match")
            content = content.replace("Honour of the Crown</a>\" and Resource Projects", "Honour of the Crown and Resource Projects")
else:
    print("Regex replacement worked")
    content = new_content

with open(r'E:\Antigravity\simroom\Github Repos\projectimages\SunriseWharf\sunrise_wharf.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")