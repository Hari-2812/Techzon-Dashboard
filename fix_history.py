import re

with open('frontend/src/pages/EmployeeAttendanceHistory.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix handleEditClick to map statuses correctly
old_handle_edit = '''    const handleEditClick = (record: any) => {
        setSelectedRecord(record);
        setEditStatus(record.status || 'PRESENT');'''

new_handle_edit = '''    const handleEditClick = (record: any) => {
        setSelectedRecord(record);
        const mappedStatus = ['WORKING', 'COMPLETED'].includes(record.status) ? 'PRESENT' 
                           : ['PAID_LEAVE'].includes(record.status) ? 'LEAVE'
                           : record.status || 'PRESENT';
        setEditStatus(mappedStatus);'''

content = content.replace(old_handle_edit, new_handle_edit)

with open('frontend/src/pages/EmployeeAttendanceHistory.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
