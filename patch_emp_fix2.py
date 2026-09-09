import sys

with open('frontend/src/pages/EmployeeCallAnalytics.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("? 'danger' : 'neutral'", "? 'error' : 'neutral'")

with open('frontend/src/pages/EmployeeCallAnalytics.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("EmployeeCallAnalytics.tsx fixed.")
