import json
import re

log_path = r'C:\Users\Burak\.gemini\antigravity\brain\193fbabb-d99f-46f6-b736-7075b8e80998\.system_generated\logs\overview.txt'

with open(log_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Find the block where I made the tool call:
matches = re.findall(r'\"TargetContent\"\s*:\s*\"(.*?)\"', text, re.DOTALL)
print(f"Found {len(matches)} TargetContent chunks")
for idx, m in enumerate(matches):
    if "MOCK_USERS" in m:
        print(f"Found MOCK_USERS in chunk {idx}")
        # unescape the string
        decoded = bytes(m, "utf-8").decode("unicode_escape")
        with open(r'C:\Users\Burak\OneDrive\Desktop\doviz\recovery.txt', 'w', encoding='utf-8') as out:
            out.write(decoded)
        print("Wrote recovery.txt!")
        break
