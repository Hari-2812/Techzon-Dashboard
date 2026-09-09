import sys

with open('frontend/src/pages/EmployeeCallAnalytics.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

kpi_old = '''            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <Card className="p-4 border-t-4 border-blue-500 shadow-sm text-center">
                    <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1 uppercase">Total Calls</p>
                    <p className="text-2xl font-black text-[var(--color-text-primary)]">{summary.totalCalls}</p>
                </Card>
                <Card className="p-4 border-t-4 border-green-500 shadow-sm text-center">
                    <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1 uppercase">Connected</p>
                    <p className="text-2xl font-black text-green-600">{summary.connectedCalls}</p>
                </Card>
                <Card className="p-4 border-t-4 border-red-500 shadow-sm text-center">
                    <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1 uppercase">Not Connected</p>
                    <p className="text-2xl font-black text-red-600">{summary.notConnectedCalls}</p>
                </Card>
                <Card className="p-4 border-t-4 border-orange-500 shadow-sm text-center">
                    <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1 uppercase">Follow-ups</p>
                    <p className="text-2xl font-black text-orange-600">{summary.followUps}</p>
                </Card>
                <Card className="p-4 border-t-4 border-purple-500 shadow-sm text-center">
                    <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1 uppercase">Converted</p>
                    <p className="text-2xl font-black text-purple-600">{summary.conversions}</p>
                </Card>
                <Card className="p-4 border-t-4 border-gray-500 shadow-sm text-center">
                    <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1 uppercase">Not Converted</p>
                    <p className="text-2xl font-black text-gray-600">{summary.notConverted}</p>
                </Card>
                <Card className="p-4 border-t-4 border-teal-500 shadow-sm text-center">
                    <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1 uppercase">Conversion Rate</p>
                    <p className="text-2xl font-black text-teal-600">{summary.conversionRate}%</p>
                </Card>
            </div>'''

kpi_new = '''            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
                <Card className="p-4 border-t-4 border-blue-500 shadow-sm text-center flex flex-col justify-center items-center">
                    <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1 uppercase">Total Calls</p>
                    <p className="text-3xl font-black text-[var(--color-text-primary)]">{summary.totalCalls}</p>
                </Card>
                <Card className="p-4 border-t-4 border-green-500 shadow-sm text-center">
                    <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1 uppercase">Connected ({summary.connectionRate}%)</p>
                    <p className="text-3xl font-black text-green-600">{summary.connectedCalls}</p>
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                         <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold">Call Back: {summary.callBackCalls}</span>
                    </div>
                </Card>
                <Card className="p-4 border-t-4 border-red-500 shadow-sm text-center">
                    <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1 uppercase">Not Connected</p>
                    <p className="text-3xl font-black text-red-600">{summary.notConnectedCalls}</p>
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">No Ans: {summary.noAnswerCalls}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">Busy: {summary.busyCalls}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">Wrong #: {summary.wrongNumberCalls}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">Failed: {summary.failedCalls}</span>
                    </div>
                </Card>
                <Card className="p-4 border-t-4 border-purple-500 shadow-sm text-center">
                    <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1 uppercase">Conversions</p>
                    <p className="text-3xl font-black text-purple-600">{summary.conversions}</p>
                    <p className="text-xs text-gray-500 font-semibold mt-1">Rate: {summary.conversionRate}%</p>
                </Card>
            </div>'''

if kpi_old in content:
    content = content.replace(kpi_old, kpi_new)

table_old = '''                                    <TableCell>
                                        <Badge variant={['Connected', 'Interested', 'Not Interested', 'Call Back Later'].includes(record.callResult) ? 'success' : 'neutral'}>
                                            {record.callResult}
                                        </Badge>
                                    </TableCell>'''

table_new = '''                                    <TableCell>
                                        <Badge variant={record.callResult === 'Connected' ? 'success' : record.callResult === 'CALL_COMPLETED' ? 'success' : record.callResult === 'No Answer' ? 'warning' : record.callResult === 'Busy' ? 'warning' : record.callResult === 'Wrong Number' ? 'danger' : record.callResult === 'Failed' ? 'danger' : 'neutral'}>
                                            {record.callResult === 'CALL_COMPLETED' ? 'Completed / Unknown' : record.callResult}
                                        </Badge>
                                    </TableCell>'''

if table_old in content:
    content = content.replace(table_old, table_new)

with open('frontend/src/pages/EmployeeCallAnalytics.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("EmployeeCallAnalytics.tsx patched.")
