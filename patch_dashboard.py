import re

with open('frontend/src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_str = '''      {/* ADMIN ONLY: ATTENDANCE REMINDERS WIDGET */}'''
new_str = '''      {/* ADMIN ONLY: CALL ANALYTICS WIDGET */}
      {isAdmin && <AdminCallAnalyticsWidget />}

      {/* ADMIN ONLY: ATTENDANCE REMINDERS WIDGET */}'''

content = content.replace(old_str, new_str)

with open('frontend/src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
