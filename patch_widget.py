import sys

with open('frontend/src/components/ui/AdminCallAnalyticsWidget.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

header_old = '''                            <TableHead className="text-center">Connected</TableHead>'''
header_new = '''                            <TableHead className="text-center">Connected</TableHead>
                            <TableHead className="text-center">Not Connected</TableHead>'''

if header_old in content:
    content = content.replace(header_old, header_new)

body_old = '''                                <TableCell className="text-center font-medium text-green-700">{emp.connectedCalls}</TableCell>'''
body_new = '''                                <TableCell className="text-center font-medium text-green-700">
                                    {emp.connectedCalls} <span className="text-[10px] text-gray-400 block font-normal">CB: {emp.callBackCalls || 0}</span>
                                </TableCell>
                                <TableCell className="text-center font-medium text-red-500">
                                    {(emp.totalCalls - emp.connectedCalls)}
                                    <span className="text-[10px] text-gray-400 block font-normal text-nowrap">NA: {emp.noAnswerCalls || 0} | B: {emp.busyCalls || 0}</span>
                                </TableCell>'''

if body_old in content:
    content = content.replace(body_old, body_new)

with open('frontend/src/components/ui/AdminCallAnalyticsWidget.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("AdminCallAnalyticsWidget.tsx patched.")
