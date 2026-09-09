import sys

with open('backend/src/controllers/sales.controller.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
in_log_call = False

for line in lines:
    if line.startswith('exports.logCall = async (req, res) => {'):
        in_log_call = True
        new_lines.append(line)
        new_lines.append("    try {\n")
        new_lines.append("        const { callResult, customerResponse, nextFollowUp, remarks } = req.body;\n")
        new_lines.append("        const lead = await Lead.findOne({ _id: req.params.id, ...buildAccessQuery(req) });\n")
        new_lines.append("        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });\n")
        new_lines.append("\n")
        new_lines.append("        if (callResult === 'Connected') {\n")
        new_lines.append("            lead.salesStatus = 'Contacted';\n")
        new_lines.append("        }\n")
        new_lines.append("        \n")
        new_lines.append("        if (customerResponse === 'Converted') {\n")
        new_lines.append("            lead.salesStatus = 'Converted';\n")
        new_lines.append("        } else if (customerResponse === 'Not Converted') {\n")
        new_lines.append("            lead.salesStatus = 'Not Converted';\n")
        new_lines.append("        }\n")
        new_lines.append("        \n")
        new_lines.append("        lead.lastContactedAt = new Date();\n")
        new_lines.append("        if (nextFollowUp) {\n")
        new_lines.append("            lead.nextFollowUp = new Date(nextFollowUp);\n")
        new_lines.append("            await FollowUp.create({\n")
        new_lines.append("                leadId: lead._id,\n")
        new_lines.append("                assignedEmployeeId: lead.assignedEmployeeId,\n")
        new_lines.append("                type: 'Sales Follow-up',\n")
        new_lines.append("                dueDate: new Date(nextFollowUp),\n")
        new_lines.append("                notes: remarks,\n")
        new_lines.append("                priority: lead.priority || 'Medium'\n")
        new_lines.append("            });\n")
        new_lines.append("        }\n")
        new_lines.append("        await lead.save();\n")
        new_lines.append("\n")
        new_lines.append("        await LeadActivity.create({\n")
        new_lines.append("            leadId: lead._id,\n")
        new_lines.append("            employeeId: req.user.id,\n")
        new_lines.append("            activityType: 'Sales Call',\n")
        new_lines.append("            description: Logged call: ,\n")
        new_lines.append("            metadata: { callResult, response: customerResponse, remarks }\n")
        new_lines.append("        });\n")
        new_lines.append("\n")
        new_lines.append("        req.app.get('io').emit('sales:updated', { leadId: lead._id });\n")
        new_lines.append("        res.json({ success: true, lead });\n")
        new_lines.append("    } catch (err) {\n")
        new_lines.append("        console.error(err);\n")
        new_lines.append("        res.status(500).json({ success: false, message: 'Server error logging call' });\n")
        new_lines.append("    }\n")
        new_lines.append("};\n")
    elif in_log_call:
        if line.startswith('};'):
            in_log_call = False
    else:
        new_lines.append(line)

with open('backend/src/controllers/sales.controller.js', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
