import codecs

with codecs.open(r'c:\Users\Burak\OneDrive\Desktop\doviz\temp.js', 'r', 'utf-8', errors='replace') as f:
    temp_lines = f.readlines()

# Extract the lines from /* --- STATE & MOCK DATA --- */ up to (but not including) /* --- PORTFOLIO FUNCTIONS --- */
start_idx = -1
end_idx = -1
for i, line in enumerate(temp_lines):
    if '/* --- STATE & MOCK DATA --- */' in line:
        start_idx = i
    if '/* --- PORTFOLIO FUNCTIONS --- */' in line:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    code_to_insert = "".join(temp_lines[start_idx:end_idx])
    
    with codecs.open(r'c:\Users\Burak\OneDrive\Desktop\doviz\index.html', 'r', 'utf-8', errors='replace') as f:
        html_lines = f.readlines()
        
    # Find the corrupted part
    html_start = -1
    for i, line in enumerate(html_lines):
        if '/* --- STATE & MOCK DATA --- */' in line:
            # check if next line has "remaining script"
            if i + 1 < len(html_lines) and 'remaining script' in html_lines[i+1]:
                html_start = i
                break
                
    if html_start != -1:
        # replace html_start to html_start+2 with code_to_insert
        html_lines[html_start:html_start+2] = [code_to_insert]
        with codecs.open(r'c:\Users\Burak\OneDrive\Desktop\doviz\index.html', 'w', 'utf-8') as f:
            f.writelines(html_lines)
        print("Success: Recovered missing code.")
    else:
        print("Error: Could not find corrupted part in index.html")
else:
    print("Error: Could not find markers in temp.js")
