# Color Audit Report

**Generated:** 2025-08-30T22:25:01.753Z

## Executive Summary

- **Total Files Scanned:** 167
- **Files with Issues:** 34
- **Total Hardcoded Colors:** 254
- **Estimated Total Effort:** 27.5 hours

## Priority Breakdown

- **High Priority:** 0 files (0.0%)
- **Medium Priority:** 32 files (94.1%)
- **Low Priority:** 2 files (5.9%)

## Color Type Breakdown

- **Text Colors:** 80 instances (31.5%)
- **Background Colors:** 35 instances (13.8%)
- **Border Colors:** 1 instances (0.4%)
- **Semantic Colors:** 125 instances (49.2%)
- **Absolute Colors:** 13 instances (5.1%)

## Medium Priority Components

### components\timecards\supervisor-approval-queue.tsx

- **Issues:** 30
- **Estimated Effort:** 3 hours

**Line 127:** `text-green-50`
- **Suggested:** `text-green-50 (needs manual review)`
- **Type:** semantic
- **Context:** `lassName="w-12 h-12 text-green-500 mx-auto mb-4" />`

**Line 128:** `text-gray-500`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `<p className="text-gray-500">No timecards pending approval.</p>`

**Line 150:** `bg-green-600`
- **Suggested:** `bg-green-600 (needs manual review)`
- **Type:** semantic
- **Context:** `className="bg-green-600 hover:bg-green-700"`

**Line 150:** `bg-green-700`
- **Suggested:** `bg-green-700 (needs manual review)`
- **Type:** semantic
- **Context:** `"bg-green-600 hover:bg-green-700"`

**Line 169:** `text-gray-400`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="w-5 h-5 text-gray-400" />`

**Line 173:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-sm text-gray-600">`

**Line 177:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-sm text-gray-600">{timecard.projects.name}</p>}`

**Line 182:** `text-yellow-600`
- **Suggested:** `text-yellow-600 (needs manual review)`
- **Type:** semantic
- **Context:** `outline" className="text-yellow-600 border-yellow-200">`

**Line 182:** `border-yellow-200`
- **Suggested:** `border-yellow-200 (needs manual review)`
- **Type:** semantic
- **Context:** `me="text-yellow-600 border-yellow-200">`

**Line 187:** `bg-blue-50`
- **Suggested:** `bg-blue-50 (needs manual review)`
- **Type:** semantic
- **Context:** `<Badge className="bg-blue-500 text-white">Pending Review</Badge>`

**Line 187:** `text-white`
- **Suggested:** `text-primary-foreground (on colored backgrounds)`
- **Type:** absolute
- **Context:** `ssName="bg-blue-500 text-white">Pending Review</Badge>`

**Line 194:** `text-gray-400`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="w-4 h-4 text-gray-400" />`

**Line 196:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-sm text-gray-600">Hours Worked</p>`

**Line 201:** `text-gray-400`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="w-4 h-4 text-gray-400" />`

**Line 203:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-sm text-gray-600">Break Duration</p>`

**Line 208:** `text-gray-400`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="w-4 h-4 text-gray-400" />`

**Line 210:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-sm text-gray-600">Total Pay</p>`

**Line 217:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-sm text-gray-600">`

**Line 232:** `bg-yellow-50`
- **Suggested:** `bg-yellow-50 (needs manual review)`
- **Type:** semantic
- **Context:** `<div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">`

**Line 232:** `border-yellow-200`
- **Suggested:** `border-yellow-200 (needs manual review)`
- **Type:** semantic
- **Context:** `bg-yellow-50 border border-yellow-200 rounded-lg">`

**Line 234:** `text-yellow-600`
- **Suggested:** `text-yellow-600 (needs manual review)`
- **Type:** semantic
- **Context:** `className="w-4 h-4 text-yellow-600" />`

**Line 235:** `text-yellow-800`
- **Suggested:** `text-yellow-800 (needs manual review)`
- **Type:** semantic
- **Context:** `text-sm font-medium text-yellow-800">Manual Edit Flag</p>`

**Line 237:** `text-yellow-700`
- **Suggested:** `text-yellow-700 (needs manual review)`
- **Type:** semantic
- **Context:** `className="text-sm text-yellow-700">`

**Line 244:** `text-gray-700`
- **Suggested:** `text-foreground`
- **Type:** text
- **Context:** `text-sm font-medium text-gray-700">Supervisor Comments (Optional)</lab`

**Line 260:** `text-red-600`
- **Suggested:** `text-red-600 dark:text-red-400`
- **Type:** semantic
- **Context:** `className="text-red-600 border-red-200 hover:bg-red-50"`

**Line 260:** `border-red-200`
- **Suggested:** `border-red-200 (needs manual review)`
- **Type:** semantic
- **Context:** `sName="text-red-600 border-red-200 hover:bg-red-50"`

**Line 260:** `bg-red-50`
- **Suggested:** `bg-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `order-red-200 hover:bg-red-50"`

**Line 269:** `bg-green-600`
- **Suggested:** `bg-green-600 (needs manual review)`
- **Type:** semantic
- **Context:** `className="bg-green-600 hover:bg-green-700"`

**Line 269:** `bg-green-700`
- **Suggested:** `bg-green-700 (needs manual review)`
- **Type:** semantic
- **Context:** `"bg-green-600 hover:bg-green-700"`

**Line 276:** `text-gray-500`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-xs text-gray-500">`

### app\(app)\timecards\[id]\page.tsx

- **Issues:** 29
- **Estimated Effort:** 3 hours

**Line 64:** `bg-gray-500`
- **Suggested:** `bg-gray-500 (needs manual review)`
- **Type:** background
- **Context:** `return "bg-gray-500"`

**Line 66:** `bg-blue-50`
- **Suggested:** `bg-blue-50 (needs manual review)`
- **Type:** semantic
- **Context:** `return "bg-blue-500"`

**Line 68:** `bg-green-50`
- **Suggested:** `bg-green-50 (needs manual review)`
- **Type:** semantic
- **Context:** `return "bg-green-500"`

**Line 70:** `bg-red-50`
- **Suggested:** `bg-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `return "bg-red-500"`

**Line 72:** `bg-gray-500`
- **Suggested:** `bg-gray-500 (needs manual review)`
- **Type:** background
- **Context:** `return "bg-gray-500"`

**Line 95:** `bg-gray-200`
- **Suggested:** `bg-border`
- **Type:** background
- **Context:** `<div className="h-8 bg-gray-200 rounded w-1/4"></div>`

**Line 96:** `bg-gray-200`
- **Suggested:** `bg-border`
- **Type:** background
- **Context:** `div className="h-32 bg-gray-200 rounded"></div>`

**Line 97:** `bg-gray-200`
- **Suggested:** `bg-border`
- **Type:** background
- **Context:** `div className="h-64 bg-gray-200 rounded"></div>`

**Line 108:** `text-gray-500`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `<p className="text-gray-500">Timecard not found.</p>`

**Line 121:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `<p className="text-gray-600">{format(new Date(timecard.date), "E`

**Line 125:** `text-yellow-600`
- **Suggested:** `text-yellow-600 (needs manual review)`
- **Type:** semantic
- **Context:** `outline" className="text-yellow-600 border-yellow-200">`

**Line 125:** `border-yellow-200`
- **Suggested:** `border-yellow-200 (needs manual review)`
- **Type:** semantic
- **Context:** `me="text-yellow-600 border-yellow-200">`

**Line 130:** `text-white`
- **Suggested:** `text-primary-foreground (on colored backgrounds)`
- **Type:** absolute
- **Context:** `r(timecard.status)} text-white`}>{getStatusText(timecard.status)}</Bad`

**Line 147:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `text-sm font-medium text-gray-600">Name</label>`

**Line 153:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `text-sm font-medium text-gray-600">Email</label>`

**Line 160:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `text-sm font-medium text-gray-600">Project</label>`

**Line 177:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `text-sm font-medium text-gray-600">Total Hours</label>`

**Line 181:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `text-sm font-medium text-gray-600">Break Duration</label>`

**Line 185:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `text-sm font-medium text-gray-600">Pay Rate</label>`

**Line 189:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `text-sm font-medium text-gray-600">Total Pay</label>`

**Line 190:** `text-green-600`
- **Suggested:** `text-green-600 dark:text-green-400`
- **Type:** semantic
- **Context:** `"text-2xl font-bold text-green-600">${timecard.total_pay.toFixed(2)}</`

**Line 207:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `text-sm font-medium text-gray-600">Check In</label>`

**Line 211:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `text-sm font-medium text-gray-600">Check Out</label>`

**Line 219:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `text-sm font-medium text-gray-600">Break Start</label>`

**Line 223:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `text-sm font-medium text-gray-600">Break End</label>`

**Line 239:** `text-gray-700`
- **Suggested:** `text-foreground`
- **Type:** text
- **Context:** `<p className="text-gray-700">{timecard.supervisor_comments}</p>`

**Line 253:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `text-sm font-medium text-gray-600">Submitted</label>`

**Line 259:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `text-sm font-medium text-gray-600">`

**Line 264:** `text-gray-500`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-sm text-gray-500">`

### components\timecards\timecard-list.tsx

- **Issues:** 23
- **Estimated Effort:** 2.25 hours

**Line 49:** `bg-gray-500`
- **Suggested:** `bg-gray-500 (needs manual review)`
- **Type:** background
- **Context:** `return "bg-gray-500"`

**Line 51:** `bg-blue-50`
- **Suggested:** `bg-blue-50 (needs manual review)`
- **Type:** semantic
- **Context:** `return "bg-blue-500"`

**Line 53:** `bg-green-50`
- **Suggested:** `bg-green-50 (needs manual review)`
- **Type:** semantic
- **Context:** `return "bg-green-500"`

**Line 55:** `bg-red-50`
- **Suggested:** `bg-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `return "bg-red-500"`

**Line 57:** `bg-gray-500`
- **Suggested:** `bg-gray-500 (needs manual review)`
- **Type:** background
- **Context:** `return "bg-gray-500"`

**Line 80:** `text-gray-500`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `<p className="text-gray-500">No timecards found.</p>`

**Line 93:** `text-gray-400`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="w-5 h-5 text-gray-400" />`

**Line 97:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-sm text-gray-600">`

**Line 101:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-sm text-gray-600">{timecard.projects.name}</p>}`

**Line 106:** `text-yellow-600`
- **Suggested:** `text-yellow-600 (needs manual review)`
- **Type:** semantic
- **Context:** `outline" className="text-yellow-600 border-yellow-200">`

**Line 106:** `border-yellow-200`
- **Suggested:** `border-yellow-200 (needs manual review)`
- **Type:** semantic
- **Context:** `me="text-yellow-600 border-yellow-200">`

**Line 111:** `text-white`
- **Suggested:** `text-primary-foreground (on colored backgrounds)`
- **Type:** absolute
- **Context:** `r(timecard.status)} text-white`}>`

**Line 120:** `text-gray-400`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="w-4 h-4 text-gray-400" />`

**Line 122:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-sm text-gray-600">Hours Worked</p>`

**Line 127:** `text-gray-400`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="w-4 h-4 text-gray-400" />`

**Line 129:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-sm text-gray-600">Break Duration</p>`

**Line 134:** `text-gray-400`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="w-4 h-4 text-gray-400" />`

**Line 136:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-sm text-gray-600">Total Pay</p>`

**Line 143:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-sm text-gray-600">`

**Line 158:** `bg-gray-50`
- **Suggested:** `bg-muted`
- **Type:** background
- **Context:** `<div className="p-3 bg-gray-50 rounded-lg">`

**Line 159:** `text-gray-700`
- **Suggested:** `text-foreground`
- **Type:** text
- **Context:** `text-sm font-medium text-gray-700">Supervisor Comments:</p>`

**Line 160:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-sm text-gray-600">{timecard.supervisor_comments}</p>`

**Line 184:** `text-gray-500`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-xs text-gray-500">`

### app\(app)\timecards\page.tsx

- **Issues:** 14
- **Estimated Effort:** 1.5 hours

**Line 122:** `bg-gray-500`
- **Suggested:** `bg-gray-500 (needs manual review)`
- **Type:** background
- **Context:** `return "bg-gray-500"`

**Line 124:** `bg-blue-50`
- **Suggested:** `bg-blue-50 (needs manual review)`
- **Type:** semantic
- **Context:** `return "bg-blue-500"`

**Line 126:** `bg-green-50`
- **Suggested:** `bg-green-50 (needs manual review)`
- **Type:** semantic
- **Context:** `return "bg-green-500"`

**Line 128:** `bg-red-50`
- **Suggested:** `bg-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `return "bg-red-500"`

**Line 130:** `bg-gray-500`
- **Suggested:** `bg-gray-500 (needs manual review)`
- **Type:** background
- **Context:** `return "bg-gray-500"`

**Line 153:** `bg-gray-200`
- **Suggested:** `bg-border`
- **Type:** background
- **Context:** `<div className="h-8 bg-gray-200 rounded w-1/4"></div>`

**Line 154:** `bg-gray-200`
- **Suggested:** `bg-border`
- **Type:** background
- **Context:** `div className="h-10 bg-gray-200 rounded"></div>`

**Line 157:** `bg-gray-200`
- **Suggested:** `bg-border`
- **Type:** background
- **Context:** `{i} className="h-24 bg-gray-200 rounded"></div>`

**Line 179:** `bg-red-50`
- **Suggested:** `bg-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `dge className="ml-2 bg-red-500 text-white">{pendingTimecards.length}</`

**Line 179:** `text-white`
- **Suggested:** `text-primary-foreground (on colored backgrounds)`
- **Type:** absolute
- **Context:** `me="ml-2 bg-red-500 text-white">{pendingTimecards.length}</Badge>`

**Line 278:** `text-gray-500`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-sm text-gray-500">{item.project_name}</p>`

**Line 279:** `text-gray-500`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-sm text-gray-500">`

**Line 286:** `text-yellow-600`
- **Suggested:** `text-yellow-600 (needs manual review)`
- **Type:** semantic
- **Context:** `outline" className="text-yellow-600 border-yellow-200">`

**Line 286:** `border-yellow-200`
- **Suggested:** `border-yellow-200 (needs manual review)`
- **Type:** semantic
- **Context:** `me="text-yellow-600 border-yellow-200">`

### components\projects\project-form.tsx

- **Issues:** 14
- **Estimated Effort:** 1.5 hours

**Line 103:** `bg-gray-200`
- **Suggested:** `bg-border`
- **Type:** background
- **Context:** `<div className="h-4 bg-gray-200 rounded w-1/4"></div>`

**Line 104:** `bg-gray-200`
- **Suggested:** `bg-border`
- **Type:** background
- **Context:** `div className="h-10 bg-gray-200 rounded"></div>`

**Line 105:** `bg-gray-200`
- **Suggested:** `bg-border`
- **Type:** background
- **Context:** `<div className="h-4 bg-gray-200 rounded w-1/4"></div>`

**Line 106:** `bg-gray-200`
- **Suggested:** `bg-border`
- **Type:** background
- **Context:** `div className="h-10 bg-gray-200 rounded"></div>`

**Line 107:** `bg-gray-200`
- **Suggested:** `bg-border`
- **Type:** background
- **Context:** `<div className="h-4 bg-gray-200 rounded w-1/4"></div>`

**Line 108:** `bg-gray-200`
- **Suggested:** `bg-border`
- **Type:** background
- **Context:** `div className="h-20 bg-gray-200 rounded"></div>`

**Line 127:** `border-green-200`
- **Suggested:** `border-green-200 (needs manual review)`
- **Type:** semantic
- **Context:** `<Alert className="border-green-200 bg-green-50">`

**Line 127:** `bg-green-50`
- **Suggested:** `bg-green-50 (needs manual review)`
- **Type:** semantic
- **Context:** `e="border-green-200 bg-green-50">`

**Line 128:** `text-green-600`
- **Suggested:** `text-green-600 dark:text-green-400`
- **Type:** semantic
- **Context:** `className="h-4 w-4 text-green-600" />`

**Line 129:** `text-green-800`
- **Suggested:** `text-green-800 (needs manual review)`
- **Type:** semantic
- **Context:** `cription className="text-green-800">`

**Line 147:** `text-gray-900`
- **Suggested:** `text-foreground`
- **Type:** text
- **Context:** `text-lg font-medium text-gray-900">`

**Line 150:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-sm text-gray-600">`

**Line 228:** `text-gray-900`
- **Suggested:** `text-foreground`
- **Type:** text
- **Context:** `text-lg font-medium text-gray-900">`

**Line 231:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-sm text-gray-600">`

### app\(app)\talent\new\page.tsx

- **Issues:** 13
- **Estimated Effort:** 1.25 hours

**Line 155:** `border-red-50`
- **Suggested:** `border-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `rrors.first_name ? "border-red-500" : ""}`

**Line 158:** `text-red-50`
- **Suggested:** `text-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `className="text-sm text-red-500 mt-1">{errors.first_name}</p>`

**Line 167:** `border-red-50`
- **Suggested:** `border-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `errors.last_name ? "border-red-500" : ""}`

**Line 170:** `text-red-50`
- **Suggested:** `text-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `className="text-sm text-red-500 mt-1">{errors.last_name}</p>`

**Line 187:** `border-red-50`
- **Suggested:** `border-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `{errors.rep_name ? "border-red-500" : ""}`

**Line 190:** `text-red-50`
- **Suggested:** `text-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `className="text-sm text-red-500 mt-1">{errors.rep_name}</p>`

**Line 202:** `border-red-50`
- **Suggested:** `border-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `errors.rep_email ? "border-red-500" : ""}`

**Line 205:** `text-red-50`
- **Suggested:** `text-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `className="text-sm text-red-500 mt-1">{errors.rep_email}</p>`

**Line 216:** `border-red-50`
- **Suggested:** `border-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `errors.rep_phone ? "border-red-500" : ""}`

**Line 219:** `text-red-50`
- **Suggested:** `text-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `className="text-sm text-red-500 mt-1">{errors.rep_phone}</p>`

**Line 238:** `border-red-50`
- **Suggested:** `border-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `] ${errors.notes ? "border-red-500" : ""}`}`

**Line 243:** `text-red-50`
- **Suggested:** `text-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `className="text-sm text-red-500">{errors.notes}</p>`

**Line 245:** `text-gray-500`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-sm text-gray-500 ml-auto">`

### components\talent\talent-profile-form.tsx

- **Issues:** 13
- **Estimated Effort:** 1.25 hours

**Line 122:** `border-red-50`
- **Suggested:** `border-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `rrors.first_name ? "border-red-500" : ""}`

**Line 125:** `text-red-50`
- **Suggested:** `text-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `className="text-sm text-red-500 mt-1">{errors.first_name}</p>`

**Line 134:** `border-red-50`
- **Suggested:** `border-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `errors.last_name ? "border-red-500" : ""}`

**Line 137:** `text-red-50`
- **Suggested:** `text-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `className="text-sm text-red-500 mt-1">{errors.last_name}</p>`

**Line 154:** `border-red-50`
- **Suggested:** `border-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `{errors.rep_name ? "border-red-500" : ""}`

**Line 157:** `text-red-50`
- **Suggested:** `text-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `className="text-sm text-red-500 mt-1">{errors.rep_name}</p>`

**Line 169:** `border-red-50`
- **Suggested:** `border-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `errors.rep_email ? "border-red-500" : ""}`

**Line 172:** `text-red-50`
- **Suggested:** `text-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `className="text-sm text-red-500 mt-1">{errors.rep_email}</p>`

**Line 183:** `border-red-50`
- **Suggested:** `border-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `errors.rep_phone ? "border-red-500" : ""}`

**Line 186:** `text-red-50`
- **Suggested:** `text-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `className="text-sm text-red-500 mt-1">{errors.rep_phone}</p>`

**Line 205:** `border-red-50`
- **Suggested:** `border-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `] ${errors.notes ? "border-red-500" : ""}`}`

**Line 210:** `text-red-50`
- **Suggested:** `text-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `className="text-sm text-red-500">{errors.notes}</p>`

**Line 212:** `text-gray-500`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-sm text-gray-500 ml-auto">`

### components\talent\talent-project-manager.tsx

- **Issues:** 12
- **Estimated Effort:** 1.25 hours

**Line 186:** `bg-gray-200`
- **Suggested:** `bg-border`
- **Type:** background
- **Context:** `<div className="h-4 bg-gray-200 rounded w-3/4"></div>`

**Line 187:** `bg-gray-200`
- **Suggested:** `bg-border`
- **Type:** background
- **Context:** `<div className="h-8 bg-gray-200 rounded"></div>`

**Line 188:** `bg-gray-200`
- **Suggested:** `bg-border`
- **Type:** background
- **Context:** `<div className="h-4 bg-gray-200 rounded w-1/2"></div>`

**Line 203:** `border-green-200`
- **Suggested:** `border-green-200 (needs manual review)`
- **Type:** semantic
- **Context:** `<Alert className="border-green-200 bg-green-50">`

**Line 203:** `bg-green-50`
- **Suggested:** `bg-green-50 (needs manual review)`
- **Type:** semantic
- **Context:** `e="border-green-200 bg-green-50">`

**Line 204:** `text-green-600`
- **Suggested:** `text-green-600 dark:text-green-400`
- **Type:** semantic
- **Context:** `className="h-4 w-4 text-green-600" />`

**Line 205:** `text-green-800`
- **Suggested:** `text-green-800 (needs manual review)`
- **Type:** semantic
- **Context:** `cription className="text-green-800">`

**Line 226:** `text-gray-500`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `e="text-center py-6 text-gray-500">`

**Line 247:** `text-red-600`
- **Suggested:** `text-red-600 dark:text-red-400`
- **Type:** semantic
- **Context:** `className="text-red-600 border-red-200 hover:bg-red-50"`

**Line 247:** `border-red-200`
- **Suggested:** `border-red-200 (needs manual review)`
- **Type:** semantic
- **Context:** `sName="text-red-600 border-red-200 hover:bg-red-50"`

**Line 247:** `bg-red-50`
- **Suggested:** `bg-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `order-red-200 hover:bg-red-50"`

**Line 271:** `text-gray-500`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `e="text-center py-6 text-gray-500">`

### app\(app)\talent\page.tsx

- **Issues:** 11
- **Estimated Effort:** 1 hours

**Line 94:** `bg-gray-200`
- **Suggested:** `bg-border`
- **Type:** background
- **Context:** `<div className="h-8 bg-gray-200 rounded w-1/4"></div>`

**Line 95:** `bg-gray-200`
- **Suggested:** `bg-border`
- **Type:** background
- **Context:** `div className="h-10 bg-gray-200 rounded"></div>`

**Line 98:** `bg-gray-200`
- **Suggested:** `bg-border`
- **Type:** background
- **Context:** `{i} className="h-24 bg-gray-200 rounded"></div>`

**Line 123:** `text-gray-400`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `rm -translate-y-1/2 text-gray-400 w-4 h-4" />`

**Line 164:** `bg-blue-50`
- **Suggested:** `bg-blue-50 (needs manual review)`
- **Type:** semantic
- **Context:** `<Badge className="bg-blue-500 text-white">Active</Badge>`

**Line 164:** `text-white`
- **Suggested:** `text-primary-foreground (on colored backgrounds)`
- **Type:** absolute
- **Context:** `ssName="bg-blue-500 text-white">Active</Badge>`

**Line 168:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `tems-center text-sm text-gray-600">`

**Line 189:** `text-blue-600`
- **Suggested:** `text-blue-600 dark:text-blue-400`
- **Type:** semantic
- **Context:** `className="text-blue-600 border-blue-200 hover:bg-blue-50"`

**Line 189:** `border-blue-200`
- **Suggested:** `border-blue-200 (needs manual review)`
- **Type:** semantic
- **Context:** `Name="text-blue-600 border-blue-200 hover:bg-blue-50"`

**Line 189:** `bg-blue-50`
- **Suggested:** `bg-blue-50 (needs manual review)`
- **Type:** semantic
- **Context:** `rder-blue-200 hover:bg-blue-50"`

**Line 207:** `text-gray-500`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `<p className="text-gray-500">No talent found matching your crite`

### components\projects\project-detail-view.tsx

- **Issues:** 11
- **Estimated Effort:** 1 hours

**Line 364:** `text-green-400`
- **Suggested:** `text-green-400 (needs manual review)`
- **Type:** semantic
- **Context:** `text-green-600 dark:text-green-400" />`

**Line 389:** `text-green-400`
- **Suggested:** `text-green-400 (needs manual review)`
- **Type:** semantic
- **Context:** `text-green-600 dark:text-green-400" />`

**Line 414:** `text-green-400`
- **Suggested:** `text-green-400 (needs manual review)`
- **Type:** semantic
- **Context:** `text-green-600 dark:text-green-400" />`

**Line 439:** `text-green-400`
- **Suggested:** `text-green-400 (needs manual review)`
- **Type:** semantic
- **Context:** `text-green-600 dark:text-green-400" />`

**Line 453:** `text-blue-300`
- **Suggested:** `text-blue-300 (needs manual review)`
- **Type:** semantic
- **Context:** `text-blue-700 dark:text-blue-300">`

**Line 461:** `text-green-300`
- **Suggested:** `text-green-300 (needs manual review)`
- **Type:** semantic
- **Context:** `text-green-700 dark:text-green-300">`

**Line 465:** `text-green-400`
- **Suggested:** `text-green-400 (needs manual review)`
- **Type:** semantic
- **Context:** `text-green-600 dark:text-green-400">`

**Line 471:** `text-amber-300`
- **Suggested:** `text-amber-300 (needs manual review)`
- **Type:** semantic
- **Context:** `text-amber-700 dark:text-amber-300">`

**Line 475:** `text-amber-400`
- **Suggested:** `text-amber-400 (needs manual review)`
- **Type:** semantic
- **Context:** `text-amber-600 dark:text-amber-400">`

**Line 493:** `text-green-300`
- **Suggested:** `text-green-300 (needs manual review)`
- **Type:** semantic
- **Context:** `text-green-700 dark:text-green-300">`

**Line 497:** `text-green-400`
- **Suggested:** `text-green-400 (needs manual review)`
- **Type:** semantic
- **Context:** `text-green-600 dark:text-green-400">`

### components\projects\project-card.tsx

- **Issues:** 11
- **Estimated Effort:** 1 hours

**Line 67:** `bg-yellow-100`
- **Suggested:** `bg-yellow-100 (needs manual review)`
- **Type:** semantic
- **Context:** `condary" className="bg-yellow-100 text-yellow-800">Prep</Badge>`

**Line 67:** `text-yellow-800`
- **Suggested:** `text-yellow-800 (needs manual review)`
- **Type:** semantic
- **Context:** `Name="bg-yellow-100 text-yellow-800">Prep</Badge>`

**Line 69:** `bg-green-100`
- **Suggested:** `bg-green-100 (needs manual review)`
- **Type:** semantic
- **Context:** `default" className="bg-green-100 text-green-800">Active</Badge>`

**Line 69:** `text-green-800`
- **Suggested:** `text-green-800 (needs manual review)`
- **Type:** semantic
- **Context:** `sName="bg-green-100 text-green-800">Active</Badge>`

**Line 71:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `ssName="bg-gray-100 text-gray-600">Archived</Badge>`

**Line 71:** `bg-gray-100`
- **Suggested:** `bg-muted`
- **Type:** background
- **Context:** `outline" className="bg-gray-100 text-gray-600">Archived</Badge>`

**Line 79:** `text-blue-600`
- **Suggested:** `text-blue-600 dark:text-blue-400`
- **Type:** semantic
- **Context:** `rn <span className="text-blue-600 text-sm">Starts {format(startDate, '`

**Line 82:** `text-green-600`
- **Suggested:** `text-green-600 dark:text-green-400`
- **Type:** semantic
- **Context:** `rn <span className="text-green-600 text-sm">Ends {format(endDate, 'MMM`

**Line 85:** `text-gray-500`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `rn <span className="text-gray-500 text-sm">Ended {format(endDate, 'MMM`

**Line 221:** `bg-green-600`
- **Suggested:** `bg-green-600 (needs manual review)`
- **Type:** semantic
- **Context:** `className="bg-green-600 hover:bg-green-700"`

**Line 221:** `bg-green-700`
- **Suggested:** `bg-green-700 (needs manual review)`
- **Type:** semantic
- **Context:** `"bg-green-600 hover:bg-green-700"`

### app\(app)\talent\[id]\page.tsx

- **Issues:** 9
- **Estimated Effort:** 1 hours

**Line 66:** `bg-gray-200`
- **Suggested:** `bg-border`
- **Type:** background
- **Context:** `<div className="h-8 bg-gray-200 rounded w-1/4"></div>`

**Line 67:** `bg-gray-200`
- **Suggested:** `bg-border`
- **Type:** background
- **Context:** `div className="h-32 bg-gray-200 rounded"></div>`

**Line 68:** `bg-gray-200`
- **Suggested:** `bg-border`
- **Type:** background
- **Context:** `div className="h-64 bg-gray-200 rounded"></div>`

**Line 79:** `text-gray-500`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `<p className="text-gray-500">Talent profile not found.</p>`

**Line 105:** `bg-blue-50`
- **Suggested:** `bg-blue-50 (needs manual review)`
- **Type:** semantic
- **Context:** `<Badge className="bg-blue-500 text-white">`

**Line 105:** `text-white`
- **Suggested:** `text-primary-foreground (on colored backgrounds)`
- **Type:** absolute
- **Context:** `ssName="bg-blue-500 text-white">`

**Line 167:** `text-gray-500`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `<p className="text-gray-500 text-sm">No direct contact informati`

**Line 190:** `text-blue-600`
- **Suggested:** `text-blue-600 dark:text-blue-400`
- **Type:** semantic
- **Context:** `className="text-blue-600 hover:underline"`

**Line 201:** `text-blue-600`
- **Suggested:** `text-blue-600 dark:text-blue-400`
- **Type:** semantic
- **Context:** `className="text-blue-600 hover:underline"`

### components\talent\talent-location-tracker.tsx

- **Issues:** 9
- **Estimated Effort:** 1 hours

**Line 89:** `text-gray-500`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-sm text-gray-500">Last updated {formatDistanceToNow(n`

**Line 91:** `bg-green-50`
- **Suggested:** `bg-green-50 (needs manual review)`
- **Type:** semantic
- **Context:** `outline" className="bg-green-50 text-green-700 border-green-200">`

**Line 91:** `text-green-700`
- **Suggested:** `text-green-700 (needs manual review)`
- **Type:** semantic
- **Context:** `ssName="bg-green-50 text-green-700 border-green-200">`

**Line 91:** `border-green-200`
- **Suggested:** `border-green-200 (needs manual review)`
- **Type:** semantic
- **Context:** `n-50 text-green-700 border-green-200">`

**Line 96:** `text-gray-500`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `<p className="text-gray-500">No location recorded</p>`

**Line 133:** `bg-gray-50`
- **Suggested:** `bg-muted`
- **Type:** background
- **Context:** `justify-between p-3 bg-gray-50 rounded-lg">`

**Line 136:** `text-gray-500`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-sm text-gray-500">{formatDistanceToNow(new Date(updat`

**Line 139:** `text-gray-500`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `tems-center text-sm text-gray-500">`

**Line 148:** `text-gray-500`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `<p className="text-gray-500">No location history available</p>`

### components\auth\password-strength-indicator.tsx

- **Issues:** 9
- **Estimated Effort:** 1 hours

**Line 26:** `bg-red-50`
- **Suggested:** `bg-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `weak: "bg-red-500",`

**Line 27:** `bg-yellow-50`
- **Suggested:** `bg-yellow-50 (needs manual review)`
- **Type:** semantic
- **Context:** `medium: "bg-yellow-500",`

**Line 28:** `bg-green-50`
- **Suggested:** `bg-green-50 (needs manual review)`
- **Type:** semantic
- **Context:** `strong: "bg-green-500"`

**Line 52:** `text-red-600`
- **Suggested:** `text-red-600 dark:text-red-400`
- **Type:** semantic
- **Context:** `ngth === "weak" && "text-red-600",`

**Line 53:** `text-yellow-600`
- **Suggested:** `text-yellow-600 (needs manual review)`
- **Type:** semantic
- **Context:** `th === "medium" && "text-yellow-600",`

**Line 54:** `text-green-600`
- **Suggested:** `text-green-600 dark:text-green-400`
- **Type:** semantic
- **Context:** `th === "strong" && "text-green-600"`

**Line 110:** `text-green-600`
- **Suggested:** `text-green-600 dark:text-green-400`
- **Type:** semantic
- **Context:** `className="h-3 w-3 text-green-600 transition-colors duration-200 ease`

**Line 112:** `text-red-50`
- **Suggested:** `text-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `className="h-3 w-3 text-red-500 transition-colors duration-200 ease-i`

**Line 116:** `text-green-600`
- **Suggested:** `text-green-600 dark:text-green-400`
- **Type:** semantic
- **Context:** `met ? "text-green-600" : "text-muted-foreground"`

### components\projects\project-hub.tsx

- **Issues:** 8
- **Estimated Effort:** 0.75 hours

**Line 150:** `text-gray-400`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `-6 w-6 animate-spin text-gray-400" />`

**Line 220:** `text-gray-400`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `slate-y-1/2 h-4 w-4 text-gray-400" />`

**Line 269:** `text-gray-400`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `lassName="h-12 w-12 text-gray-400 mx-auto mb-4" />`

**Line 270:** `text-gray-900`
- **Suggested:** `text-foreground`
- **Type:** text
- **Context:** `text-lg font-medium text-gray-900 mb-2">`

**Line 273:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `<p className="text-gray-600 mb-6 max-w-md mx-auto">`

**Line 293:** `text-gray-400`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="h-8 w-8 text-gray-400 mx-auto mb-4" />`

**Line 294:** `text-gray-900`
- **Suggested:** `text-foreground`
- **Type:** text
- **Context:** `text-lg font-medium text-gray-900 mb-2">`

**Line 297:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `<p className="text-gray-600 mb-4">`

### app\(app)\team\page.tsx

- **Issues:** 4
- **Estimated Effort:** 0.5 hours

**Line 83:** `bg-gray-200`
- **Suggested:** `bg-border`
- **Type:** background
- **Context:** `<div className="h-8 bg-gray-200 rounded w-1/4"></div>`

**Line 86:** `bg-gray-200`
- **Suggested:** `bg-border`
- **Type:** background
- **Context:** `{i} className="h-32 bg-gray-200 rounded"></div>`

**Line 100:** `text-gray-400`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `="w-12 h-12 mx-auto text-gray-400 mb-4" />`

**Line 189:** `text-gray-400`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `="w-12 h-12 mx-auto text-gray-400 mb-4" />`

### components\auth\pending-users-table.tsx

- **Issues:** 4
- **Estimated Effort:** 0.5 hours

**Line 108:** `text-gray-400`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `="w-12 h-12 mx-auto text-gray-400 mb-4" />`

**Line 189:** `text-gray-500`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-sm text-gray-500 flex items-center">`

**Line 240:** `bg-gray-50`
- **Suggested:** `bg-muted`
- **Type:** background
- **Context:** `className="mt-4 p-4 bg-gray-50 rounded-lg">`

**Line 242:** `text-gray-600`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-sm text-gray-600">`

### components\auth\network-status-indicator.tsx

- **Issues:** 4
- **Estimated Effort:** 0.5 hours

**Line 71:** `text-green-600`
- **Suggested:** `text-green-600 dark:text-green-400`
- **Type:** semantic
- **Context:** `className="h-4 w-4 text-green-600" />`

**Line 72:** `text-green-700`
- **Suggested:** `text-green-700 (needs manual review)`
- **Type:** semantic
- **Context:** `ssName="font-medium text-green-700">`

**Line 78:** `text-green-600`
- **Suggested:** `text-green-600 dark:text-green-400`
- **Type:** semantic
- **Context:** `className="h-4 w-4 text-green-600" />`

**Line 79:** `text-green-700`
- **Suggested:** `text-green-700 (needs manual review)`
- **Type:** semantic
- **Context:** `ssName="font-medium text-green-700">`

### components\auth\approval-confirmation-dialog.tsx

- **Issues:** 4
- **Estimated Effort:** 0.5 hours

**Line 71:** `bg-gray-50`
- **Suggested:** `bg-muted`
- **Type:** background
- **Context:** `<div className="bg-gray-50 p-3 rounded-md">`

**Line 92:** `bg-green-600`
- **Suggested:** `bg-green-600 (needs manual review)`
- **Type:** semantic
- **Context:** `className="bg-green-600 hover:bg-green-700"`

**Line 92:** `bg-green-700`
- **Suggested:** `bg-green-700 (needs manual review)`
- **Type:** semantic
- **Context:** `"bg-green-600 hover:bg-green-700"`

**Line 96:** `border-white`
- **Suggested:** `border-white (needs manual review)`
- **Type:** absolute
- **Context:** `h-4 w-4 border-b-2 border-white mr-2"></div>`

### components\projects\project-input.tsx

- **Issues:** 3
- **Estimated Effort:** 0.25 hours

**Line 29:** `border-green-50`
- **Suggested:** `border-green-50 (needs manual review)`
- **Type:** semantic
- **Context:** `success && "border-green-500 focus-visible:ring-green-500",`

**Line 51:** `border-green-50`
- **Suggested:** `border-green-50 (needs manual review)`
- **Type:** semantic
- **Context:** `success && "border-green-500 focus-visible:ring-green-500",`

**Line 80:** `border-green-50`
- **Suggested:** `border-green-50 (needs manual review)`
- **Type:** semantic
- **Context:** `success && "border-green-500 focus-visible:ring-green-500",`

### components\ui\toast.tsx

- **Issues:** 2
- **Estimated Effort:** 0.25 hours

**Line 80:** `text-red-300`
- **Suggested:** `text-red-300 (needs manual review)`
- **Type:** semantic
- **Context:** `roup-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-5`

**Line 80:** `text-red-50`
- **Suggested:** `text-red-50 (needs manual review)`
- **Type:** semantic
- **Context:** `.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-40`

### components\auth\notification-test.tsx

- **Issues:** 2
- **Estimated Effort:** 0.25 hours

**Line 89:** `text-red-600`
- **Suggested:** `text-red-600 dark:text-red-400`
- **Type:** semantic
- **Context:** `="flex items-center text-red-600 text-sm">`

**Line 95:** `text-gray-500`
- **Suggested:** `text-muted-foreground`
- **Type:** text
- **Context:** `className="text-xs text-gray-500 space-y-1">`

### components\ui\sheet.tsx

- **Issues:** 1
- **Estimated Effort:** 0.25 hours

**Line 39:** `bg-black`
- **Suggested:** `bg-black (needs manual review)`
- **Type:** absolute
- **Context:** `fixed inset-0 z-50 bg-black/50",`

### components\ui\loading-spinner.tsx

- **Issues:** 1
- **Estimated Effort:** 0.25 hours

**Line 19:** `border-gray-300`
- **Suggested:** `border-border`
- **Type:** border
- **Context:** `unded-full border-2 border-gray-300 border-t-blue-600',`

### components\ui\drawer.tsx

- **Issues:** 1
- **Estimated Effort:** 0.25 hours

**Line 40:** `bg-black`
- **Suggested:** `bg-black (needs manual review)`
- **Type:** absolute
- **Context:** `fixed inset-0 z-50 bg-black/50",`

### components\ui\dialog.tsx

- **Issues:** 1
- **Estimated Effort:** 0.25 hours

**Line 41:** `bg-black`
- **Suggested:** `bg-black (needs manual review)`
- **Type:** absolute
- **Context:** `fixed inset-0 z-50 bg-black/50",`

### components\ui\button.tsx

- **Issues:** 1
- **Estimated Effort:** 0.25 hours

**Line 15:** `text-white`
- **Suggested:** `text-primary-foreground (on colored backgrounds)`
- **Type:** absolute
- **Context:** `"bg-destructive text-white shadow-xs hover:bg-destructive/90 focus`

### components\ui\badge.tsx

- **Issues:** 1
- **Estimated Effort:** 0.25 hours

**Line 17:** `text-white`
- **Suggested:** `text-primary-foreground (on colored backgrounds)`
- **Type:** absolute
- **Context:** `rent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visi`

### components\ui\alert-dialog.tsx

- **Issues:** 1
- **Estimated Effort:** 0.25 hours

**Line 39:** `bg-black`
- **Suggested:** `bg-black (needs manual review)`
- **Type:** absolute
- **Context:** `fixed inset-0 z-50 bg-black/50",`

### components\projects\project-hub-example.tsx

- **Issues:** 1
- **Estimated Effort:** 0.25 hours

**Line 55:** `bg-gray-50`
- **Suggested:** `bg-muted`
- **Type:** background
- **Context:** `sName="min-h-screen bg-gray-50 p-4">`

### components\debug\session-debug.tsx

- **Issues:** 1
- **Estimated Effort:** 0.25 hours

**Line 73:** `text-red-600`
- **Suggested:** `text-red-600 dark:text-red-400`
- **Type:** semantic
- **Context:** `<div className="text-red-600"><strong>Error:</strong> {error}</div`

### components\auth\pending-approval-page.tsx

- **Issues:** 1
- **Estimated Effort:** 0.25 hours

**Line 33:** `text-orange-400`
- **Suggested:** `text-orange-400 (needs manual review)`
- **Type:** semantic
- **Context:** `ext-orange-600 dark:text-orange-400 animate-pulse" />`

## Low Priority Components

### components\projects\__tests__\project-input.test.tsx

- **Issues:** 3
- **Estimated Effort:** 0.25 hours

**Line 28:** `border-green-50`
- **Suggested:** `border-green-50 (needs manual review)`
- **Type:** semantic
- **Context:** `input).toHaveClass('border-green-500')`

**Line 86:** `border-green-50`
- **Suggested:** `border-green-50 (needs manual review)`
- **Type:** semantic
- **Context:** `tarea).toHaveClass('border-green-500')`

**Line 137:** `border-green-50`
- **Suggested:** `border-green-50 (needs manual review)`
- **Type:** semantic
- **Context:** `input).toHaveClass('border-green-500')`

### components\auth\__tests__\approval-confirmation-dialog.test.tsx

- **Issues:** 2
- **Estimated Effort:** 0.25 hours

**Line 269:** `bg-green-600`
- **Suggested:** `bg-green-600 (needs manual review)`
- **Type:** semantic
- **Context:** `utton).toHaveClass('bg-green-600', 'hover:bg-green-700')`

**Line 269:** `bg-green-700`
- **Suggested:** `bg-green-700 (needs manual review)`
- **Type:** semantic
- **Context:** `-green-600', 'hover:bg-green-700')`

## Migration Checklist

- [ ] **components\timecards\supervisor-approval-queue.tsx** (medium priority, 30 issues, ~3h)
- [ ] **app\(app)\timecards\[id]\page.tsx** (medium priority, 29 issues, ~3h)
- [ ] **components\timecards\timecard-list.tsx** (medium priority, 23 issues, ~2.25h)
- [ ] **app\(app)\timecards\page.tsx** (medium priority, 14 issues, ~1.5h)
- [ ] **components\projects\project-form.tsx** (medium priority, 14 issues, ~1.5h)
- [ ] **app\(app)\talent\new\page.tsx** (medium priority, 13 issues, ~1.25h)
- [ ] **components\talent\talent-profile-form.tsx** (medium priority, 13 issues, ~1.25h)
- [ ] **components\talent\talent-project-manager.tsx** (medium priority, 12 issues, ~1.25h)
- [ ] **app\(app)\talent\page.tsx** (medium priority, 11 issues, ~1h)
- [ ] **components\projects\project-detail-view.tsx** (medium priority, 11 issues, ~1h)
- [ ] **components\projects\project-card.tsx** (medium priority, 11 issues, ~1h)
- [ ] **app\(app)\talent\[id]\page.tsx** (medium priority, 9 issues, ~1h)
- [ ] **components\talent\talent-location-tracker.tsx** (medium priority, 9 issues, ~1h)
- [ ] **components\auth\password-strength-indicator.tsx** (medium priority, 9 issues, ~1h)
- [ ] **components\projects\project-hub.tsx** (medium priority, 8 issues, ~0.75h)
- [ ] **app\(app)\team\page.tsx** (medium priority, 4 issues, ~0.5h)
- [ ] **components\auth\pending-users-table.tsx** (medium priority, 4 issues, ~0.5h)
- [ ] **components\auth\network-status-indicator.tsx** (medium priority, 4 issues, ~0.5h)
- [ ] **components\auth\approval-confirmation-dialog.tsx** (medium priority, 4 issues, ~0.5h)
- [ ] **components\projects\project-input.tsx** (medium priority, 3 issues, ~0.25h)
- [ ] **components\ui\toast.tsx** (medium priority, 2 issues, ~0.25h)
- [ ] **components\auth\notification-test.tsx** (medium priority, 2 issues, ~0.25h)
- [ ] **components\ui\sheet.tsx** (medium priority, 1 issues, ~0.25h)
- [ ] **components\ui\loading-spinner.tsx** (medium priority, 1 issues, ~0.25h)
- [ ] **components\ui\drawer.tsx** (medium priority, 1 issues, ~0.25h)
- [ ] **components\ui\dialog.tsx** (medium priority, 1 issues, ~0.25h)
- [ ] **components\ui\button.tsx** (medium priority, 1 issues, ~0.25h)
- [ ] **components\ui\badge.tsx** (medium priority, 1 issues, ~0.25h)
- [ ] **components\ui\alert-dialog.tsx** (medium priority, 1 issues, ~0.25h)
- [ ] **components\projects\project-hub-example.tsx** (medium priority, 1 issues, ~0.25h)
- [ ] **components\debug\session-debug.tsx** (medium priority, 1 issues, ~0.25h)
- [ ] **components\auth\pending-approval-page.tsx** (medium priority, 1 issues, ~0.25h)
- [ ] **components\projects\__tests__\project-input.test.tsx** (low priority, 3 issues, ~0.25h)
- [ ] **components\auth\__tests__\approval-confirmation-dialog.test.tsx** (low priority, 2 issues, ~0.25h)
