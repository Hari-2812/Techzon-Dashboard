import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Replace uppercase exact matches
    content = re.sub(r'\bNOT CLOCKED IN\b', 'NOT LOGGED IN', content)
    content = re.sub(r'\bNOT CLOCKED OUT\b', 'NOT LOGGED OUT', content)
    content = re.sub(r'\bCLOCKED IN\b', 'LOGGED IN', content)
    content = re.sub(r'\bCLOCKED OUT\b', 'LOGGED OUT', content)
    content = re.sub(r'\bCLOCK IN\b', 'LOGIN', content)
    content = re.sub(r'\bCLOCK OUT\b', 'LOGOUT', content)
    
    # Replace title case exact matches
    content = re.sub(r'\bNot Clocked In\b', 'Not Logged In', content)
    content = re.sub(r'\bNot Clocked Out\b', 'Not Logged Out', content)
    content = re.sub(r'\bClocked In\b', 'Logged In', content)
    content = re.sub(r'\bClocked Out\b', 'Logged Out', content)
    content = re.sub(r'\bClock In\b', 'Login', content)
    content = re.sub(r'\bClock Out\b', 'Logout', content)
    
    # Replace lowercase/mixed cases in normal text (using negative lookarounds to avoid camelCase or snake_case like clockIn, clock_in)
    # We want to match "clock in" but not "clockIn"
    content = re.sub(r'(?<![a-zA-Z])clock in(?![a-zA-Z])', 'login', content)
    content = re.sub(r'(?<![a-zA-Z])clock out(?![a-zA-Z])', 'logout', content)
    content = re.sub(r'(?<![a-zA-Z])clocked in(?![a-zA-Z])', 'logged in', content)
    content = re.sub(r'(?<![a-zA-Z])clocked out(?![a-zA-Z])', 'logged out', content)
    content = re.sub(r'(?<![a-zA-Z])not clocked in(?![a-zA-Z])', 'not logged in', content)

    # Some special fixes for backend reminder emails
    content = content.replace("clock in immediately", "login immediately")
    content = content.replace("clock in because", "login because")
    
    # Fix for tooltip or attributes like "Clock In" that might be handled by the Title Case rule above

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")

def main():
    dirs_to_check = [
        r'd:\project\Techzon Dashboard\frontend\src',
        r'd:\project\Techzon Dashboard\backend\src'
    ]
    
    for d in dirs_to_check:
        for root, dirs, files in os.walk(d):
            for file in files:
                if file.endswith(('.js', '.jsx', '.ts', '.tsx', '.json', '.html')):
                    process_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
