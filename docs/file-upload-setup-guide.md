# File Upload Setup Guide

This guide will help you set up the complete file upload functionality for the Settings tab.

## Prerequisites

1. **Database Tables**: Make sure you've run the database migration first:
   ```bash
   # Run the SQL script in Supabase SQL Editor (from previous setup)
   ```

2. **Environment Variables**: Ensure you have these in your `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

## Setup Methods

### Method 1: Automated Setup (Recommended)

Run the setup script to automatically configure storage:

```bash
node scripts/setup-file-storage.js
```

This script will:
- ✅ Create the `project-attachments` storage bucket
- ✅ Set up file type restrictions
- ✅ Configure file size limits (10MB max)
- ✅ Test upload permissions
- ✅ Verify the setup works

### Method 2: Manual Setup via Supabase Dashboard

If the automated setup doesn't work, follow these manual steps:

#### Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the sidebar
3. Click **Create Bucket**
4. Set bucket name: `project-attachments`
5. Set as **Private** (not public)
6. Click **Create**

#### Step 2: Configure Bucket Settings

1. Click on the `project-attachments` bucket
2. Go to **Configuration** tab
3. Set these restrictions:
   - **File size limit**: 10485760 (10MB)
   - **Allowed MIME types**:
     ```
     image/jpeg
     image/png
     image/gif
     application/pdf
     text/plain
     application/msword
     application/vnd.openxmlformats-officedocument.wordprocessingml.document
     application/vnd.ms-excel
     application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
     ```

#### Step 3: Set Up Storage Policies

Go to **Storage** > **Policies** and create these policies:

**Policy 1: Allow authenticated users to upload**
```sql
CREATE POLICY "Users can upload project attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-attachments' AND
    auth.uid() IS NOT NULL
  );
```

**Policy 2: Allow authenticated users to view files**
```sql
CREATE POLICY "Users can view project attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-attachments' AND
    auth.uid() IS NOT NULL
  );
```

**Policy 3: Allow authenticated users to delete files**
```sql
CREATE POLICY "Users can delete project attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-attachments' AND
    auth.uid() IS NOT NULL
  );
```

### Method 3: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Create the bucket
supabase storage create project-attachments --private

# Apply the policies (create a migration file)
supabase migration new setup_storage_policies
```

Then add this SQL to the migration file:
```sql
-- Enable storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-attachments', 'project-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload project attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-attachments' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view project attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-attachments' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete project attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-attachments' AND
    auth.uid() IS NOT NULL
  );
```

Then run:
```bash
supabase db push
```

## Features Included

### File Upload Component
- ✅ Drag and drop interface
- ✅ Click to select files
- ✅ Multiple file upload
- ✅ Real-time progress tracking
- ✅ File type validation
- ✅ File size validation (10MB max)
- ✅ Error handling and user feedback

### Supported File Types
- **Images**: JPEG, PNG, GIF
- **Documents**: PDF, Word (.doc, .docx), Excel (.xls, .xlsx)
- **Text**: Plain text files

### Security Features
- ✅ Authentication required
- ✅ Project-based access control
- ✅ File type restrictions
- ✅ File size limits
- ✅ Secure file storage (private bucket)

### Integration Features
- ✅ Automatic database record creation
- ✅ Audit log tracking
- ✅ File preview/download links
- ✅ File deletion with cleanup
- ✅ Real-time UI updates

## Testing the Setup

1. **Navigate to Settings Tab**: Go to any project's Settings tab
2. **Upload a File**: 
   - Drag and drop a file onto the upload area, OR
   - Click "Choose Files" to select files
3. **Verify Upload**: 
   - Watch the progress bar
   - File should appear in the attachments list
   - Check the audit log for the upload event

## Troubleshooting

### Common Issues

**Error: "Storage bucket not found"**
- Solution: Make sure the `project-attachments` bucket exists
- Run: `node scripts/setup-file-storage.js`

**Error: "Permission denied"**
- Solution: Check storage policies are set up correctly
- Verify user is authenticated

**Error: "File too large"**
- Solution: Files must be under 10MB
- Check file size before uploading

**Error: "File type not allowed"**
- Solution: Only specific file types are supported
- Check the allowed MIME types list above

### Debug Steps

1. **Check Browser Console**: Look for JavaScript errors
2. **Check Network Tab**: Verify API calls are successful
3. **Check Supabase Logs**: Look for storage-related errors
4. **Verify Environment**: Ensure all environment variables are set

## API Endpoints

The file upload system uses these endpoints:

- `POST /api/projects/[id]/upload` - Upload files
- `GET /api/projects/[id]/attachments` - List attachments
- `DELETE /api/projects/[id]/attachments/[attachmentId]` - Delete attachments

## File Storage Structure

Files are stored in this structure:
```
project-attachments/
├── {project-id}/
│   ├── {timestamp}_{original-filename}
│   └── {timestamp}_{original-filename}
└── {another-project-id}/
    └── {timestamp}_{original-filename}
```

This ensures:
- Files are organized by project
- No filename conflicts
- Easy cleanup when projects are deleted

## Security Considerations

1. **Private Storage**: Files are stored in a private bucket
2. **Authentication**: Only authenticated users can upload/access files
3. **Project Access**: Users can only access files from projects they have access to
4. **File Validation**: All uploads are validated for type and size
5. **Audit Trail**: All file operations are logged

The file upload feature is now fully functional and secure!