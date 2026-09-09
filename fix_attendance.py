import re

with open('frontend/src/pages/AttendanceManagement.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix setManualStatus to map statuses correctly
old_button = '''                                   setManualStatus(selectedEmployee.status || 'PRESENT');'''

new_button = '''                                   const statusFromBackend = selectedEmployee.status || 'PRESENT';
                                   const mappedStatus = ['WORKING', 'COMPLETED'].includes(statusFromBackend) ? 'PRESENT' 
                                                      : ['PAID_LEAVE'].includes(statusFromBackend) ? 'LEAVE'
                                                      : statusFromBackend;
                                   setManualStatus(mappedStatus);'''

content = content.replace(old_button, new_button)

with open('frontend/src/pages/AttendanceManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
