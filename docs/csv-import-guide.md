# CSV Import Guide for Talent Management

## Overview

The CSV import functionality allows administrators and authorized users to bulk import talent records from spreadsheet files. This feature streamlines the process of adding multiple talent profiles to the system at once.

## Access Requirements

The CSV import feature is available to users with the following roles:
- **Admin**: Full access to import functionality
- **In-House**: Full access to import functionality  
- **Supervisor**: Can import talent records
- **Coordinator**: Can import talent records
- **Talent Escort**: No access to import functionality

## How to Use CSV Import

### 1. Access the Import Feature

1. Navigate to the **Talent Management** page
2. Click the **Import CSV** button in the top-right corner
3. The CSV Import dialog will open

### 2. Prepare Your CSV File

#### Required Columns
Your CSV file must include the following required fields:
- **First Name**: Talent's first name (1-50 characters)
- **Last Name**: Talent's last name (1-50 characters)
- **Representative Name**: Name of talent's representative (1-100 characters)
- **Representative Email**: Valid email address for the representative
- **Representative Phone**: Valid US phone number (various formats accepted)

#### Optional Columns
- **Notes**: Additional information about the talent (max 1000 characters)

#### Supported Phone Formats
The system accepts these phone number formats:
- `(555) 123-4567`
- `555-123-4567`
- `555 123 4567`
- `5551234567`
- `+1 (555) 123-4567`

### 3. Download Template (Optional)

Click **Download Template** to get a sample CSV file with the correct column headers and example data.

### 4. Upload and Auto-Detection

1. **Upload File**: Select your CSV file using the file picker
2. **Automatic Field Detection**: The system automatically detects and maps your CSV columns
   - **Flexible matching**: Recognizes many variations of field names
   - **Case insensitive**: `FirstName`, `first_name`, `FIRST_NAME` all work
   - **Space/underscore flexible**: `First Name`, `First_Name`, `firstname` all work
   - **Representative field variations**: `Rep Name`, `Representative Name`, `Agent Name` all work
   - **Required fields**: first_name, last_name, rep_name, rep_email, rep_phone
   - **Optional fields**: notes

### 5. Preview and Validate

1. **Automatic Preview**: After upload, you'll immediately see the preview
2. **Field Detection Status**: View which fields were automatically detected
3. **Data Validation**: Review the preview showing:
   - **Valid Records**: Green badges show records that will be imported
   - **Invalid Records**: Red badges show records with validation errors
   - **Missing Fields**: Red alert if required fields couldn't be detected
4. Fix any issues in your CSV file if needed and re-upload

### 6. Import Records

1. Click **Import X Records** to proceed with valid records
2. Wait for the import process to complete
3. Review the import results:
   - **Successful**: Number of records successfully imported
   - **Failed**: Number of records that failed (if any)
   - **Error Details**: Specific error messages for failed records

## Validation Rules

### Required Field Validation
- **First Name**: Must be 1-50 characters, letters/spaces/hyphens/apostrophes only
- **Last Name**: Must be 1-50 characters, letters/spaces/hyphens/apostrophes only
- **Representative Name**: Must be 1-100 characters
- **Representative Email**: Must be valid email format
- **Representative Phone**: Must be valid US phone number format

### Data Integrity Checks
- **Duplicate Emails**: Representative emails must be unique within the import batch
- **Existing Records**: System checks for existing talent with same representative email
- **Character Limits**: All text fields have maximum length restrictions

## Error Handling

### Common Validation Errors
1. **Missing Required Fields**: Ensure all required columns are mapped and contain data
2. **Invalid Email Format**: Check email addresses follow standard format (user@domain.com)
3. **Invalid Phone Format**: Use supported US phone number formats
4. **Duplicate Emails**: Remove duplicate representative emails from your CSV
5. **Character Limits**: Ensure text doesn't exceed maximum lengths

### Import Failures
- Records with validation errors are skipped during import
- Valid records are still imported even if some records fail
- Detailed error messages help identify and fix issues

## Best Practices

### CSV File Preparation
1. **Use UTF-8 Encoding**: Ensures special characters display correctly
2. **Clean Data**: Remove extra spaces, check for typos
3. **Consistent Formatting**: Use consistent phone number and name formats
4. **Test Small Batches**: Import a few records first to verify format

### Data Quality
1. **Verify Representative Information**: Ensure contact details are current and accurate
2. **Unique Representatives**: Each talent should have a unique representative email
3. **Complete Information**: Fill in all available fields for better record keeping

### Import Strategy
1. **Backup First**: Export existing talent data before large imports
2. **Staged Imports**: Import in smaller batches for easier error management
3. **Verify Results**: Review imported records after completion

## Troubleshooting

### File Upload Issues
- **File Format**: Only CSV files are supported
- **File Size**: Large files may take longer to process
- **Encoding**: Use UTF-8 encoding for special characters

### Field Detection Problems
- **Flexible Headers**: Use any variation of field names - the system is very flexible
- **Supported Variations**: `FirstName`, `First Name`, `first_name`, `FIRSTNAME` all work
- **Missing Fields**: If required fields can't be detected, you'll see a clear error message
- **Extra Columns**: Additional columns in CSV are ignored and won't cause issues

### Import Errors
- **Permission Denied**: Check user role has import permissions
- **Database Errors**: Contact system administrator for database issues
- **Network Issues**: Retry import if connection problems occur

## Security and Compliance

### Data Protection
- All imported data is encrypted in transit and at rest
- Import activities are logged for audit purposes
- Only authorized users can access import functionality

### Audit Trail
- System logs all import activities with user identification
- Import results are tracked for compliance reporting
- Failed imports are logged with error details

## API Integration

For developers integrating with the CSV import functionality:

### Endpoint
```
POST /api/talent/bulk-import
```

### Request Format
```json
{
  "talent": [
    {
      "first_name": "John",
      "last_name": "Doe", 
      "rep_name": "Jane Smith",
      "rep_email": "jane.smith@agency.com",
      "rep_phone": "(555) 123-4567",
      "notes": "Optional notes"
    }
  ]
}
```

### Response Format
```json
{
  "successful": 1,
  "failed": 0,
  "errors": [],
  "data": [...],
  "message": "Successfully imported 1 talent records"
}
```

## Support

For additional help with CSV imports:
1. Use the **Download Template** feature for correct format
2. Start with small test imports to verify your data format
3. Contact your system administrator for technical issues
4. Review this guide for common solutions to import problems